-- =====================================================================
-- Dossier d'identification des agences (RCCM, identité du responsable…)
-- Les informations sensibles sont dans une table séparée, jamais publique.
-- =====================================================================

alter table public.agencies add column if not exists country text not null default 'Chine';
grant update (country) on public.agencies to authenticated;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- Informations légales de l'agence
create table public.agency_verifications (
  agency_id uuid primary key references public.agencies (id) on delete cascade,
  legal_name text not null default '',
  registration_number text not null default '', -- RCCM (RDC) ou licence commerciale (Chine)
  national_id text not null default '',         -- Id. Nat.
  tax_number text not null default '',          -- NIF
  manager_name text not null default '',
  manager_id_type text not null default '',     -- passeport, carte d'électeur, carte d'identité…
  manager_id_number text not null default '',
  submitted_at timestamptz,
  review_note text not null default '',
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Pièces justificatives (fichiers dans le bucket privé « agency-documents »)
create table public.agency_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  doc_type text not null check (doc_type in ('registration', 'manager_id', 'tax', 'other')),
  file_path text not null unique,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);
create index on public.agency_documents (agency_id);

alter table public.agency_verifications enable row level security;
alter table public.agency_documents enable row level security;

-- L'agence (droit « paramètres ») et l'administrateur peuvent consulter
create policy verifications_select on public.agency_verifications for select
  using (public.has_agency_permission(agency_id, 'settings', 'view') or public.is_platform_admin());
create policy verifications_insert on public.agency_verifications for insert
  with check (public.has_agency_permission(agency_id, 'settings', 'edit'));
create policy verifications_update on public.agency_verifications for update
  using (public.has_agency_permission(agency_id, 'settings', 'edit'))
  with check (public.has_agency_permission(agency_id, 'settings', 'edit'));

-- L'agence ne peut pas écrire elle-même la décision de l'administrateur
revoke update on public.agency_verifications from anon, authenticated;
grant update (legal_name, registration_number, national_id, tax_number, manager_name, manager_id_type, manager_id_number, submitted_at, updated_at)
  on public.agency_verifications to authenticated;
revoke insert on public.agency_verifications from anon;

create policy documents_select on public.agency_documents for select
  using (public.has_agency_permission(agency_id, 'settings', 'view') or public.is_platform_admin());
create policy documents_insert on public.agency_documents for insert
  with check (public.has_agency_permission(agency_id, 'settings', 'edit'));
create policy documents_delete on public.agency_documents for delete
  using (public.has_agency_permission(agency_id, 'settings', 'edit')
         and exists (select 1 from public.agencies a where a.id = agency_id and a.verified_status <> 'verified'));
revoke update on public.agency_documents from anon, authenticated;

-- ---------------------------------------------------------------------
-- Stockage privé des pièces : <agency_id>/<fichier>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-documents', 'agency-documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy agency_documents_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agency-documents'
    and public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit')
  );
create policy agency_documents_read on storage.objects for select to authenticated
  using (
    bucket_id = 'agency-documents'
    and (
      public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'settings', 'view')
      or public.is_platform_admin()
    )
  );
create policy agency_documents_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'agency-documents'
    and public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit')
  );

-- ---------------------------------------------------------------------
-- Décision de l'administrateur, avec motif (remplace la version sans motif)
-- ---------------------------------------------------------------------
drop function if exists public.set_agency_status(uuid, text);

create or replace function public.set_agency_status(p_agency uuid, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  if p_status not in ('verified', 'gold', 'pending', 'rejected') then
    raise exception 'Statut inconnu';
  end if;
  update agencies set verified_status = p_status where id = p_agency;
  insert into agency_verifications (agency_id, review_note, reviewed_at)
  values (p_agency, coalesce(p_note, ''), now())
  on conflict (agency_id) do update set review_note = excluded.review_note, reviewed_at = excluded.reviewed_at;
end;
$$;

revoke execute on function public.set_agency_status(uuid, text, text) from public, anon;
grant execute on function public.set_agency_status(uuid, text, text) to authenticated;

-- Après un refus, un nouveau dépôt du dossier repasse l'agence « en attente »
create or replace function public.resubmit_agency_application(p_agency uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_agency_permission(p_agency, 'settings', 'edit') then
    raise exception 'Action non autorisée';
  end if;
  update agencies set verified_status = 'pending' where id = p_agency and verified_status = 'rejected';
  update agency_verifications set submitted_at = now(), updated_at = now() where agency_id = p_agency;
end;
$$;

revoke execute on function public.resubmit_agency_application(uuid) from public, anon;
grant execute on function public.resubmit_agency_application(uuid) to authenticated;
