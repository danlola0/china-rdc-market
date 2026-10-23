-- =====================================================================
-- Agences partenaires (sociétés différentes, chacune son abonnement)
-- Une agence confie un colis à une agence partenaire (ex. livreur à Kinshasa).
-- Le partenaire voit seulement les informations utiles à la livraison
-- (pas de prix, pas de paiements, pas de téléphone client) et met à jour le statut.
-- =====================================================================

-- Code partenaire (à communiquer à l'autre agence)
alter table public.agencies add column if not exists partner_code text;
update public.agencies set partner_code = upper(substr(md5(random()::text || id::text), 1, 8)) where partner_code is null;
alter table public.agencies alter column partner_code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
alter table public.agencies alter column partner_code set not null;
create unique index if not exists agencies_partner_code_key on public.agencies (partner_code);

create table public.agency_partnerships (
  id uuid primary key default gen_random_uuid(),
  requester_agency_id uuid not null references public.agencies (id) on delete cascade,
  partner_agency_id uuid not null references public.agencies (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_agency_id <> partner_agency_id)
);
create unique index agency_partnerships_pair on public.agency_partnerships (least(requester_agency_id, partner_agency_id), greatest(requester_agency_id, partner_agency_id));
alter table public.agency_partnerships enable row level security;
-- Aucun accès direct : tout passe par les fonctions ci-dessous
revoke all on public.agency_partnerships from anon, authenticated;

create or replace function public.are_partners(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from agency_partnerships
    where status = 'accepted'
      and ((requester_agency_id = p_a and partner_agency_id = p_b) or (requester_agency_id = p_b and partner_agency_id = p_a))
  );
$$;

-- Colis confié à un partenaire
alter table public.agency_shipments add column if not exists partner_agency_id uuid references public.agencies (id) on delete set null;
grant update (partner_agency_id) on public.agency_shipments to authenticated;

create or replace function public.check_shipment_partner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.partner_agency_id is not null
     and (tg_op = 'INSERT' or new.partner_agency_id is distinct from old.partner_agency_id)
     and not are_partners(new.agency_id, new.partner_agency_id) then
    raise exception 'Cette agence n''est pas (ou plus) votre partenaire';
  end if;
  return new;
end;
$$;
create trigger check_shipment_partner before insert or update on public.agency_shipments
  for each row execute function public.check_shipment_partner();
revoke execute on function public.check_shipment_partner() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Gestion des partenariats (droit « paramètres » de l'agence)
-- ---------------------------------------------------------------------
create or replace function public.request_partnership(p_agency uuid, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_partner agencies%rowtype;
begin
  if not has_agency_permission(p_agency, 'settings', 'edit') then
    raise exception 'Action non autorisée';
  end if;
  select * into v_partner from agencies where partner_code = upper(trim(p_code));
  if not found then
    raise exception 'Aucune agence ne correspond à ce code partenaire';
  end if;
  if v_partner.id = p_agency then
    raise exception 'C''est le code de votre propre agence';
  end if;
  if exists (select 1 from agency_partnerships
              where least(requester_agency_id, partner_agency_id) = least(p_agency, v_partner.id)
                and greatest(requester_agency_id, partner_agency_id) = greatest(p_agency, v_partner.id)
                and status <> 'declined') then
    raise exception 'Une demande ou un partenariat existe déjà avec cette agence';
  end if;
  delete from agency_partnerships
   where least(requester_agency_id, partner_agency_id) = least(p_agency, v_partner.id)
     and greatest(requester_agency_id, partner_agency_id) = greatest(p_agency, v_partner.id);
  insert into agency_partnerships (requester_agency_id, partner_agency_id) values (p_agency, v_partner.id);
  return v_partner.name;
end;
$$;

create or replace function public.respond_partnership(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v agency_partnerships%rowtype;
begin
  select * into v from agency_partnerships where id = p_id;
  if not found or not has_agency_permission(v.partner_agency_id, 'settings', 'edit') then
    raise exception 'Demande introuvable';
  end if;
  update agency_partnerships
     set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
   where id = p_id;
end;
$$;

create or replace function public.end_partnership(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v agency_partnerships%rowtype;
begin
  select * into v from agency_partnerships where id = p_id;
  if not found or not (has_agency_permission(v.requester_agency_id, 'settings', 'edit') or has_agency_permission(v.partner_agency_id, 'settings', 'edit')) then
    raise exception 'Partenariat introuvable';
  end if;
  -- Les colis déjà confiés reviennent à l'agence d'origine
  update agency_shipments set partner_agency_id = null
   where (agency_id = v.requester_agency_id and partner_agency_id = v.partner_agency_id)
      or (agency_id = v.partner_agency_id and partner_agency_id = v.requester_agency_id);
  delete from agency_partnerships where id = p_id;
end;
$$;

-- Partenariats d'une agence, avec les coordonnées de l'autre agence
create or replace function public.list_partnerships(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_agency_member(p_agency) then
    raise exception 'Action non autorisée';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'status', p.status,
      'direction', case when p.requester_agency_id = p_agency then 'outgoing' else 'incoming' end,
      'createdAt', p.created_at,
      'respondedAt', p.responded_at,
      'agencyId', o.id,
      'agencyName', o.name,
      'agencyCity', o.city,
      'agencyCountry', o.country,
      'agencyPhone', o.phone_we_chat,
      'agencyLogo', o.logo
    ) order by p.created_at desc)
    from agency_partnerships p
    join agencies o on o.id = case when p.requester_agency_id = p_agency then p.partner_agency_id else p.requester_agency_id end
    where p_agency in (p.requester_agency_id, p.partner_agency_id)
  ), '[]'::jsonb);
end;
$$;

-- Colis confiés à cette agence par ses partenaires (informations de livraison uniquement)
create or replace function public.partner_shipments(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_agency_permission(p_agency, 'freight', 'view') then
    raise exception 'Action non autorisée';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'trackingRef', s.tracking_ref,
      'trackingToken', s.tracking_token,
      'description', s.description,
      'customerName', s.customer_name,
      'weightKg', s.weight_kg,
      'volumeCbm', s.volume_cbm,
      'packages', s.packages,
      'mode', s.mode,
      'originCity', s.origin_city,
      'destinationCity', s.destination_city,
      'status', s.status,
      'createdAt', s.created_at,
      'updatedAt', s.updated_at,
      'fromAgencyName', a.name,
      'fromAgencyPhone', a.phone_we_chat,
      'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'actorName', e.actor_name, 'createdAt', e.created_at) order by e.created_at)
                            from agency_shipment_events e where e.shipment_id = s.id), '[]'::jsonb)
    ) order by s.updated_at desc)
    from agency_shipments s
    join agencies a on a.id = s.agency_id
    where s.partner_agency_id = p_agency and are_partners(s.agency_id, p_agency)
  ), '[]'::jsonb);
end;
$$;

-- Mise à jour du statut par l'agence partenaire
create or replace function public.partner_update_shipment_status(p_shipment uuid, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  s agency_shipments%rowtype;
  v_actor text;
begin
  select * into s from agency_shipments where id = p_shipment;
  if not found or s.partner_agency_id is null
     or not has_agency_permission(s.partner_agency_id, 'freight', 'edit')
     or not are_partners(s.agency_id, s.partner_agency_id) then
    raise exception 'Colis introuvable';
  end if;
  if p_status not in ('registered', 'preparing', 'in_transit', 'arrived', 'delivered') then
    raise exception 'Statut inconnu';
  end if;
  select coalesce(nullif(p.full_name, ''), p.email) || ' (' || a.name || ')' into v_actor
    from profiles p, agencies a where p.id = auth.uid() and a.id = s.partner_agency_id;
  update agency_shipments set status = p_status, updated_at = now() where id = p_shipment;
  insert into agency_shipment_events (agency_id, shipment_id, status, note, actor_name)
  values (s.agency_id, p_shipment, p_status, coalesce(p_note, ''), coalesce(v_actor, 'Agence partenaire'));
end;
$$;

revoke execute on function public.request_partnership(uuid, text) from public, anon;
revoke execute on function public.respond_partnership(uuid, boolean) from public, anon;
revoke execute on function public.end_partnership(uuid) from public, anon;
revoke execute on function public.list_partnerships(uuid) from public, anon;
revoke execute on function public.partner_shipments(uuid) from public, anon;
revoke execute on function public.partner_update_shipment_status(uuid, text, text) from public, anon;
revoke execute on function public.are_partners(uuid, uuid) from public, anon;
grant execute on function public.request_partnership(uuid, text) to authenticated;
grant execute on function public.respond_partnership(uuid, boolean) to authenticated;
grant execute on function public.end_partnership(uuid) to authenticated;
grant execute on function public.list_partnerships(uuid) to authenticated;
grant execute on function public.partner_shipments(uuid) to authenticated;
grant execute on function public.partner_update_shipment_status(uuid, text, text) to authenticated;
grant execute on function public.are_partners(uuid, uuid) to authenticated;
