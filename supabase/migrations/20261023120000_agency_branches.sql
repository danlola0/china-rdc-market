-- =====================================================================
-- Succursales d'une agence (même société, mêmes données partagées)
-- Ex. : siège à Guangzhou + succursales à Kinshasa et Luanda.
-- - Un seul abonnement (l'agence) ; l'administrateur fixe le nombre de succursales autorisées.
-- - Employé rattaché à une succursale : il voit les données de sa succursale
--   et les colis envoyés vers elle. Employé sans succursale (et propriétaire) : il voit tout.
-- =====================================================================

create table public.agency_branches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  city text not null default '',
  country text not null default '',
  phone text not null default '',
  address text not null default '',
  is_headquarters boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index agency_branches_one_hq on public.agency_branches (agency_id) where is_headquarters;
create index on public.agency_branches (agency_id);

-- Nombre de succursales autorisées EN PLUS du siège (fixé par l'administrateur)
alter table public.agencies add column if not exists max_branches integer not null default 0 check (max_branches >= 0);

-- Rattachements
alter table public.agency_members add column if not exists branch_id uuid references public.agency_branches (id) on delete set null;
alter table public.agency_customers add column if not exists branch_id uuid references public.agency_branches (id) on delete set null;
alter table public.agency_expenses add column if not exists branch_id uuid references public.agency_branches (id) on delete set null;
alter table public.agency_shipments
  add column if not exists origin_branch_id uuid references public.agency_branches (id) on delete set null,
  add column if not exists destination_branch_id uuid references public.agency_branches (id) on delete set null;
grant update (origin_branch_id, destination_branch_id) on public.agency_shipments to authenticated;

-- Siège créé automatiquement pour chaque agence (existante et future)
insert into public.agency_branches (agency_id, name, city, country, phone, address, is_headquarters)
select a.id, 'Siège', a.city, coalesce(a.country, ''), a.phone_we_chat, a.address, true
from public.agencies a
where not exists (select 1 from public.agency_branches b where b.agency_id = a.id and b.is_headquarters);

create or replace function public.create_headquarters_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into agency_branches (agency_id, name, city, country, phone, address, is_headquarters)
  values (new.id, 'Siège', new.city, coalesce(new.country, ''), new.phone_we_chat, new.address, true);
  return new;
end;
$$;
create trigger create_headquarters_branch after insert on public.agencies
  for each row execute function public.create_headquarters_branch();
revoke execute on function public.create_headquarters_branch() from public, anon, authenticated;

-- Les données existantes sont rattachées au siège
update public.agency_customers c set branch_id = b.id from public.agency_branches b
 where b.agency_id = c.agency_id and b.is_headquarters and c.branch_id is null;
update public.agency_expenses e set branch_id = b.id from public.agency_branches b
 where b.agency_id = e.agency_id and b.is_headquarters and e.branch_id is null;
update public.agency_shipments s set origin_branch_id = b.id from public.agency_branches b
 where b.agency_id = s.agency_id and b.is_headquarters and s.origin_branch_id is null;

-- ---------------------------------------------------------------------
-- Accès par succursale
-- ---------------------------------------------------------------------
-- true si l'utilisateur peut voir les données de cette succursale de l'agence
create or replace function public.has_branch_access(p_agency uuid, p_branch uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or exists (
    select 1 from public.agency_members m
    where m.agency_id = p_agency and m.profile_id = auth.uid() and m.status = 'active'
      and (m.role = 'owner' or m.branch_id is null or m.branch_id = p_branch)
  );
$$;

-- true si l'utilisateur voit toutes les succursales (siège, propriétaire, administrateur)
create or replace function public.has_all_branches(p_agency uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or exists (
    select 1 from public.agency_members m
    where m.agency_id = p_agency and m.profile_id = auth.uid() and m.status = 'active'
      and (m.role = 'owner' or m.branch_id is null)
  );
$$;

-- Clients
drop policy if exists agency_customers_select on public.agency_customers;
drop policy if exists agency_customers_select_freight on public.agency_customers;
drop policy if exists agency_customers_insert on public.agency_customers;
drop policy if exists agency_customers_update on public.agency_customers;
drop policy if exists agency_customers_delete on public.agency_customers;
create policy agency_customers_select on public.agency_customers for select
  using ((public.has_agency_permission(agency_id, 'customers', 'view') or public.has_agency_permission(agency_id, 'freight', 'create'))
         and public.has_branch_access(agency_id, branch_id));
create policy agency_customers_insert on public.agency_customers for insert
  with check (public.has_agency_permission(agency_id, 'customers', 'create') and public.has_branch_access(agency_id, branch_id));
create policy agency_customers_update on public.agency_customers for update
  using (public.has_agency_permission(agency_id, 'customers', 'edit') and public.has_branch_access(agency_id, branch_id))
  with check (public.has_agency_permission(agency_id, 'customers', 'edit') and public.has_branch_access(agency_id, branch_id));
create policy agency_customers_delete on public.agency_customers for delete
  using (public.has_agency_permission(agency_id, 'customers', 'delete') and public.has_branch_access(agency_id, branch_id));

-- Dépenses
drop policy if exists agency_expenses_select on public.agency_expenses;
drop policy if exists agency_expenses_insert on public.agency_expenses;
drop policy if exists agency_expenses_update on public.agency_expenses;
drop policy if exists agency_expenses_delete on public.agency_expenses;
create policy agency_expenses_select on public.agency_expenses for select
  using (public.has_agency_permission(agency_id, 'expenses', 'view') and public.has_branch_access(agency_id, branch_id));
create policy agency_expenses_insert on public.agency_expenses for insert
  with check (public.has_agency_permission(agency_id, 'expenses', 'create') and public.has_branch_access(agency_id, branch_id));
create policy agency_expenses_update on public.agency_expenses for update
  using (public.has_agency_permission(agency_id, 'expenses', 'edit') and public.has_branch_access(agency_id, branch_id))
  with check (public.has_agency_permission(agency_id, 'expenses', 'edit') and public.has_branch_access(agency_id, branch_id));
create policy agency_expenses_delete on public.agency_expenses for delete
  using (public.has_agency_permission(agency_id, 'expenses', 'delete') and public.has_branch_access(agency_id, branch_id));

-- Colis : visibles par la succursale de départ ET par celle d'arrivée
drop policy if exists agency_shipments_select on public.agency_shipments;
drop policy if exists agency_shipments_insert on public.agency_shipments;
drop policy if exists agency_shipments_update on public.agency_shipments;
drop policy if exists agency_shipments_delete on public.agency_shipments;
create policy agency_shipments_select on public.agency_shipments for select
  using (public.has_agency_permission(agency_id, 'freight', 'view')
         and (public.has_branch_access(agency_id, origin_branch_id) or public.has_branch_access(agency_id, destination_branch_id)));
create policy agency_shipments_insert on public.agency_shipments for insert
  with check (public.has_agency_permission(agency_id, 'freight', 'create') and public.has_branch_access(agency_id, origin_branch_id));
create policy agency_shipments_update on public.agency_shipments for update
  using (public.has_agency_permission(agency_id, 'freight', 'edit')
         and (public.has_branch_access(agency_id, origin_branch_id) or public.has_branch_access(agency_id, destination_branch_id)))
  with check (public.has_agency_permission(agency_id, 'freight', 'edit')
         and (public.has_branch_access(agency_id, origin_branch_id) or public.has_branch_access(agency_id, destination_branch_id)));
create policy agency_shipments_delete on public.agency_shipments for delete
  using (public.has_agency_permission(agency_id, 'freight', 'delete') and public.has_branch_access(agency_id, origin_branch_id));

-- Historique des colis : visible si le colis l'est
drop policy if exists shipment_events_select on public.agency_shipment_events;
create policy shipment_events_select on public.agency_shipment_events for select
  using (public.has_agency_permission(agency_id, 'freight', 'view')
         and exists (select 1 from public.agency_shipments s where s.id = shipment_id));

-- ---------------------------------------------------------------------
-- Succursales : lecture par les membres, gestion par le siège (paramètres)
-- ---------------------------------------------------------------------
alter table public.agency_branches enable row level security;
create policy branches_select on public.agency_branches for select
  using (public.is_agency_member(agency_id));
create policy branches_insert on public.agency_branches for insert
  with check (public.has_agency_permission(agency_id, 'settings', 'edit') and public.has_all_branches(agency_id) and not is_headquarters);
create policy branches_update on public.agency_branches for update
  using (public.has_agency_permission(agency_id, 'settings', 'edit') and public.has_all_branches(agency_id))
  with check (public.has_agency_permission(agency_id, 'settings', 'edit') and public.has_all_branches(agency_id));
create policy branches_delete on public.agency_branches for delete
  using (public.has_agency_permission(agency_id, 'settings', 'edit') and public.has_all_branches(agency_id) and not is_headquarters);

revoke update on public.agency_branches from anon, authenticated;
grant update (name, city, country, phone, address) on public.agency_branches to authenticated;

-- Quota de succursales fixé par l'administrateur
create or replace function public.check_branch_quota()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.is_headquarters then
    return new;
  end if;
  select max_branches into v_max from agencies where id = new.agency_id;
  select count(*) into v_count from agency_branches where agency_id = new.agency_id and not is_headquarters;
  if v_count >= coalesce(v_max, 0) then
    raise exception 'Nombre maximal de succursales atteint (%). Contactez ASEP pour en ajouter.', coalesce(v_max, 0);
  end if;
  return new;
end;
$$;
create trigger check_branch_quota before insert on public.agency_branches
  for each row execute function public.check_branch_quota();
revoke execute on function public.check_branch_quota() from public, anon, authenticated;

create or replace function public.admin_set_branch_quota(p_agency uuid, p_max integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  if p_max < 0 then
    raise exception 'Valeur invalide';
  end if;
  update agencies set max_branches = p_max where id = p_agency;
end;
$$;
revoke execute on function public.admin_set_branch_quota(uuid, integer) from public, anon;
grant execute on function public.admin_set_branch_quota(uuid, integer) to authenticated;

-- Suivi public : contact de la succursale qui livre (si renseignée)
create or replace function public.public_track_shipment(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'trackingRef', s.tracking_ref,
    'description', s.description,
    'mode', s.mode,
    'originCity', s.origin_city,
    'destinationCity', s.destination_city,
    'status', s.status,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at,
    'customerFirstName', split_part(coalesce(s.customer_name, ''), ' ', 1),
    'agencyName', a.name,
    'agencyPhone', coalesce(nullif(db.phone, ''), a.phone_we_chat),
    'agencyLogo', a.logo,
    'deliveryBranch', case when db.is_headquarters then null else nullif(trim(db.name || ' ' || db.city), '') end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'createdAt', e.created_at) order by e.created_at)
        from agency_shipment_events e
       where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from agency_shipments s
  join agencies a on a.id = s.agency_id
  left join agency_branches db on db.id = s.destination_branch_id
  where s.tracking_token = p_token;
$$;
