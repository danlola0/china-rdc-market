-- =====================================================================
-- Factures personnalisées des agences (une facture par client)
-- Numéro automatique par agence et par année : FAC-2026-0001
-- Droit « Factures » (module invoices).
-- =====================================================================

create table public.agency_invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  branch_id uuid references public.agency_branches (id) on delete set null,
  seq integer not null default 0,
  number text not null default '',
  customer_id uuid references public.agency_customers (id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_address text not null default '',
  shipment_id uuid references public.agency_shipments (id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'USD' check (currency in ('USD', 'CDF', 'CNY')),
  items jsonb not null default '[]',
  discount numeric(16, 2) not null default 0 check (discount >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  total numeric(16, 2) not null default 0,
  amount_paid numeric(16, 2) not null default 0 check (amount_paid >= 0),
  payment_method text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'paid', 'cancelled')),
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index agency_invoices_number on public.agency_invoices (agency_id, number);
create index on public.agency_invoices (agency_id, issue_date);

-- Numéro automatique (sans doublon, même si deux factures sont créées en même temps)
create or replace function public.number_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_year text := to_char(coalesce(new.issue_date, current_date), 'YYYY');
begin
  perform pg_advisory_xact_lock(hashtext('invoice:' || new.agency_id::text || v_year));
  select coalesce(max(seq), 0) + 1 into new.seq
    from agency_invoices where agency_id = new.agency_id and number like 'FAC-' || v_year || '-%';
  new.number := 'FAC-' || v_year || '-' || lpad(new.seq::text, 4, '0');
  if new.branch_id is null then
    select id into new.branch_id from agency_branches where agency_id = new.agency_id and is_headquarters;
  end if;
  return new;
end;
$$;
create trigger number_invoice before insert on public.agency_invoices
  for each row execute function public.number_invoice();
revoke execute on function public.number_invoice() from public, anon, authenticated;

alter table public.agency_invoices enable row level security;
create policy agency_invoices_select on public.agency_invoices for select
  using (public.has_agency_permission(agency_id, 'invoices', 'view') and public.has_branch_access(agency_id, branch_id));
create policy agency_invoices_insert on public.agency_invoices for insert
  with check (public.has_agency_permission(agency_id, 'invoices', 'create') and public.has_branch_access(agency_id, branch_id));
create policy agency_invoices_update on public.agency_invoices for update
  using (public.has_agency_permission(agency_id, 'invoices', 'edit') and public.has_branch_access(agency_id, branch_id))
  with check (public.has_agency_permission(agency_id, 'invoices', 'edit') and public.has_branch_access(agency_id, branch_id));
create policy agency_invoices_delete on public.agency_invoices for delete
  using (public.has_agency_permission(agency_id, 'invoices', 'delete') and public.has_branch_access(agency_id, branch_id));
revoke all on public.agency_invoices from anon;
grant select, insert, delete on public.agency_invoices to authenticated;
-- Le numéro et l'agence ne se modifient jamais
grant update (branch_id, customer_id, customer_name, customer_phone, customer_email, customer_address, shipment_id, issue_date, due_date,
              currency, items, discount, tax_rate, total, amount_paid, payment_method, status, notes, updated_at)
  on public.agency_invoices to authenticated;

-- Personnalisation des factures (pied de page, coordonnées bancaires, conditions)
alter table public.agency_settings add column if not exists invoice_settings jsonb not null default '{}';
grant update (invoice_settings) on public.agency_settings to authenticated;

-- Suppression d'une succursale : ses factures passent au siège
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
  update agency_invoices set branch_id = v_hq where branch_id = old.id;
  update agency_shipments set origin_branch_id = v_hq where origin_branch_id = old.id;
  update agency_shipments set destination_branch_id = null where destination_branch_id = old.id;
  return old;
end;
$$;

-- Droit « Factures » pour les rôles existants (le propriétaire a déjà tout)
select set_config('asep.bypass_member_guard', 'on', true);
update agency_members set permissions = permissions || '{"invoices": ["view", "create", "edit", "delete", "export"]}'::jsonb
 where role in ('manager', 'accountant') and not (permissions ? 'invoices');
update agency_members set permissions = permissions || '{"invoices": ["view", "create", "edit"]}'::jsonb
 where role = 'sales' and not (permissions ? 'invoices');
select set_config('asep.bypass_member_guard', 'off', true);
