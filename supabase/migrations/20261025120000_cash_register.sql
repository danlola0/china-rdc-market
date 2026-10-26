-- =====================================================================
-- Caisse de l'agence : recettes (entrées d'argent) par monnaie
-- - Entrées automatiques : paiements encaissés sur les colis (jsonb payments,
--   avec désormais une devise : USD par défaut, CDF ou CNY)
-- - Entrées manuelles : table agency_incomes (vente, commission, acompte…)
-- Droit « Caisse » (module cash) : propriétaire, et membres autorisés.
-- =====================================================================

create table public.agency_incomes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  branch_id uuid references public.agency_branches (id) on delete set null,
  date date not null default current_date,
  amount numeric(16, 2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'CDF', 'CNY')),
  category text not null default 'other' check (category in ('freight', 'sale', 'commission', 'deposit', 'service', 'other')),
  description text not null default '',
  customer_name text not null default '',
  payment_method text not null default 'cash',
  recorded_by text not null default '',
  created_at timestamptz not null default now()
);
create index on public.agency_incomes (agency_id, date);

alter table public.agency_incomes enable row level security;
create policy agency_incomes_select on public.agency_incomes for select
  using (public.has_agency_permission(agency_id, 'cash', 'view') and public.has_branch_access(agency_id, branch_id));
create policy agency_incomes_insert on public.agency_incomes for insert
  with check (public.has_agency_permission(agency_id, 'cash', 'create') and public.has_branch_access(agency_id, branch_id));
create policy agency_incomes_update on public.agency_incomes for update
  using (public.has_agency_permission(agency_id, 'cash', 'edit') and public.has_branch_access(agency_id, branch_id))
  with check (public.has_agency_permission(agency_id, 'cash', 'edit') and public.has_branch_access(agency_id, branch_id));
create policy agency_incomes_delete on public.agency_incomes for delete
  using (public.has_agency_permission(agency_id, 'cash', 'delete') and public.has_branch_access(agency_id, branch_id));
revoke all on public.agency_incomes from anon;
grant select, insert, update, delete on public.agency_incomes to authenticated;

-- Succursale de rattachement par défaut : le siège
create or replace function public.default_income_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.branch_id is null then
    select id into new.branch_id from agency_branches where agency_id = new.agency_id and is_headquarters;
  end if;
  return new;
end;
$$;
create trigger default_income_branch before insert on public.agency_incomes
  for each row execute function public.default_income_branch();
revoke execute on function public.default_income_branch() from public, anon, authenticated;

-- Suppression d'une succursale : ses recettes passent au siège
create or replace function public.reassign_branch_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hq uuid;
begin
  if old.is_headquarters then
    if exists (select 1 from agencies where id = old.agency_id) then
      raise exception 'Le siège ne peut pas être supprimé';
    end if;
    return old;
  end if;
  select id into v_hq from agency_branches where agency_id = old.agency_id and is_headquarters;
  perform set_config('asep.bypass_member_guard', 'on', true);
  update agency_members set branch_id = v_hq where branch_id = old.id;
  perform set_config('asep.bypass_member_guard', 'off', true);
  update agency_customers set branch_id = v_hq where branch_id = old.id;
  update agency_expenses set branch_id = v_hq where branch_id = old.id;
  update agency_incomes set branch_id = v_hq where branch_id = old.id;
  update agency_shipments set origin_branch_id = v_hq where origin_branch_id = old.id;
  update agency_shipments set destination_branch_id = null where destination_branch_id = old.id;
  return old;
end;
$$;

-- Le propriétaire a tous les droits ; on donne la Caisse aux comptables existants
select set_config('asep.bypass_member_guard', 'on', true);
update agency_members
   set permissions = permissions || '{"cash": ["view", "create", "edit", "delete", "export"]}'::jsonb
 where role = 'accountant' and not (permissions ? 'cash');
update agency_members
   set permissions = permissions || '{"cash": ["view"]}'::jsonb
 where role = 'manager' and not (permissions ? 'cash');
select set_config('asep.bypass_member_guard', 'off', true);

-- Page de suivi publique : paiements convertis en USD (taux indicatifs de l'application)
create or replace function public.payment_usd(p jsonb)
returns numeric language sql immutable set search_path = public as $$
  select coalesce((p ->> 'amount')::numeric, 0) / case coalesce(p ->> 'currency', 'USD') when 'CDF' then 2850 when 'CNY' then 7.1 else 1 end;
$$;

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
    'amountDue', s.estimated_cost,
    'amountPaid', round(coalesce((select sum(public.payment_usd(p)) from jsonb_array_elements(s.payments) p), 0), 2),
    'paymentMethods', coalesce((select jsonb_agg(distinct p ->> 'method') from jsonb_array_elements(s.payments) p where p ->> 'method' is not null), '[]'::jsonb),
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
