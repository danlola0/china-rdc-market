-- =====================================================================
-- ASEP MARKET — schéma initial Supabase
-- Marketplace (agences, catalogue, devis, commandes, messagerie, favoris)
-- + espace agence multi-tenant (membres, clients, dépenses, fret, paramètres).
-- L'isolation entre agences et les permissions sont imposées par RLS.
-- Convention : colonnes en snake_case ; le frontend les convertit en camelCase.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Profils (1 par compte Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  country text not null default '',
  company_name text not null default '',
  account_type text not null default 'buyer' check (account_type in ('buyer', 'agency')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, city, country, company_name, account_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    case when new.raw_user_meta_data ->> 'account_type' = 'agency' then 'agency' else 'buyer' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Agences
-- ---------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chinese_name text,
  city text not null,
  province text not null default '',
  logo text not null default '',
  banner text not null default '',
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  verified_status text not null default 'pending' check (verified_status in ('verified', 'gold', 'pending', 'rejected')),
  response_time text not null default '',
  main_categories text[] not null default '{}',
  year_established integer not null default extract(year from now()),
  employee_count text not null default '',
  business_license text not null default '',
  phone_we_chat text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  description text not null default '',
  francophone_support boolean not null default true,
  total_products integer not null default 0,
  export_markets text[] not null default '{RD Congo}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Espace agence : membres et permissions
-- permissions = matrice { "module": ["view","create","edit","delete","export"] }
-- ---------------------------------------------------------------------
create table public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade, -- null tant que l'invitation n'est pas acceptée
  full_name text not null,
  email text not null,
  phone text not null default '',
  role text not null check (role in ('owner', 'manager', 'accountant', 'freight_agent', 'sales', 'stock_manager')),
  status text not null default 'invited' check (status in ('active', 'inactive', 'invited')),
  permissions jsonb not null default '{}',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (agency_id, email)
);
create index agency_members_profile_idx on public.agency_members (profile_id);

create or replace function public.is_agency_member(p_agency uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency and profile_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.has_agency_permission(p_agency uuid, p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agency_members m
    where m.agency_id = p_agency
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and (m.role = 'owner' or coalesce(m.permissions -> p_module, '[]'::jsonb) ? p_action)
  );
$$;

-- ---------------------------------------------------------------------
-- Données internes des agences
-- ---------------------------------------------------------------------
create table public.agency_customers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid references public.profiles (id) on delete set null,
  name text not null,
  company text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  address text not null default '',
  status text not null default 'prospect' check (status in ('prospect', 'active', 'vip', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index on public.agency_customers (agency_id);

create table public.agency_expenses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  date date not null,
  amount numeric(16, 2) not null check (amount >= 0),
  currency text not null check (currency in ('USD', 'CDF', 'CNY')),
  category text not null check (category in ('transport', 'salaries', 'rent', 'internet', 'electricity', 'supplies', 'customs', 'other')),
  description text not null,
  responsible_name text not null default '',
  payment_method text not null check (payment_method in ('cash', 'bank', 'mobile_money', 'wechat_alipay', 'card')),
  receipt jsonb,
  created_at timestamptz not null default now()
);
create index on public.agency_expenses (agency_id, date);

create table public.agency_shipments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  tracking_ref text not null unique,
  customer_id uuid references public.agency_customers (id) on delete set null,
  customer_name text not null,
  description text not null,
  weight_kg numeric(12, 2) not null default 0,
  volume_cbm numeric(12, 3) not null default 0,
  mode text not null check (mode in ('air', 'sea')),
  origin_city text not null,
  destination_city text not null,
  rate_type text not null check (rate_type in ('kg', 'cbm')),
  rate numeric(12, 2) not null default 0,
  estimated_cost numeric(14, 2) not null default 0,
  payments jsonb not null default '[]',
  photos text[] not null default '{}',
  status text not null default 'registered' check (status in ('registered', 'preparing', 'in_transit', 'arrived', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.agency_shipments (agency_id, status);

create table public.agency_shipment_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  shipment_id uuid not null references public.agency_shipments (id) on delete cascade,
  status text not null,
  note text not null default '',
  actor_name text not null default '',
  created_at timestamptz not null default now()
);
create index on public.agency_shipment_events (shipment_id);

create table public.agency_settings (
  agency_id uuid primary key references public.agencies (id) on delete cascade,
  country text not null default 'Chine',
  primary_color text not null default '#123B70',
  accent_color text not null default '#FF8A00',
  default_currency text not null default 'USD' check (default_currency in ('USD', 'CDF', 'CNY')),
  freight_rates jsonb not null default '{"airPerKg": 10, "seaPerCbm": 220}',
  notifications jsonb not null default '{"newOrder": true, "newMessage": true, "shipmentUpdate": true, "weeklyReport": false}',
  display jsonb not null default '{"compactTables": false, "showMarketplaceOrders": true}',
  plan text not null default 'standard' check (plan in ('standard', 'gold', 'enterprise'))
);

create table public.agency_activity (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null default auth.uid(),
  actor_name text not null,
  module text not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index on public.agency_activity (agency_id, created_at desc);

-- ---------------------------------------------------------------------
-- Marketplace : catalogue, devis, commandes, messagerie, favoris
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agency_name text not null default '',
  agency_city text not null default '',
  name text not null,
  short_desc text not null default '',
  description text not null default '',
  category text not null,
  subcategory text not null default '',
  images text[] not null default '{}',
  price_min numeric(12, 2) not null default 0,
  price_max numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  moq integer not null default 1,
  unit text not null default 'pièce',
  lead_time_days integer not null default 7,
  specifications jsonb not null default '{}',
  variants jsonb not null default '[]',
  in_stock boolean not null default true,
  rating numeric(3, 2) not null default 0,
  reviews_count integer not null default 0,
  featured boolean not null default false,
  new_arrival boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactif', 'pending_review')),
  created_at timestamptz not null default now()
);
create index on public.products (agency_id);

create sequence public.rfq_number_seq;
create sequence public.order_number_seq;

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  rfq_number text not null unique default ('RFQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rfq_number_seq')::text, 5, '0')),
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_image text not null default '',
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agency_name text not null default '',
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  buyer_name text not null default '',
  buyer_email text not null default '',
  buyer_phone text not null default '',
  buyer_city text not null default '',
  quantity integer not null check (quantity > 0),
  target_price_usd numeric(12, 2),
  notes text not null default '',
  delivery_port text not null,
  status text not null default 'pending' check (status in ('pending', 'quoted', 'accepted', 'declined')),
  quoted_price_usd numeric(12, 2),
  quoted_shipping_usd numeric(12, 2),
  quote_valid_until date,
  agency_notes text,
  created_at timestamptz not null default now()
);
create index on public.rfqs (agency_id);
create index on public.rfqs (buyer_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  date date not null default current_date,
  rfq_id uuid references public.rfqs (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_image text not null default '',
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agency_name text not null default '',
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  buyer_name text not null default '',
  quantity integer not null,
  unit_price_usd numeric(12, 2) not null,
  shipping_usd numeric(12, 2) not null default 0,
  total_usd numeric(14, 2) not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'en_production', 'expedie_chine', 'transit_maritime', 'douane_matadi', 'arrive_kinshasa', 'livre')),
  destination_city text not null default '',
  delivery_address text not null default '',
  tracking_number text not null default '',
  shipping_mode text not null default 'Fret Maritime (Conteneur)',
  estimated_delivery_date date,
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.orders (agency_id);
create index on public.orders (buyer_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agency_name text not null default '',
  agency_city text not null default '',
  agency_avatar text not null default '',
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  buyer_name text not null default '',
  buyer_city text not null default '',
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  unread_count integer not null default 0,
  product_id uuid references public.products (id) on delete set null,
  product_name text,
  product_image text,
  product_price numeric(12, 2),
  created_at timestamptz not null default now(),
  unique (agency_id, buyer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('buyer', 'agency')),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null default '',
  attachment jsonb,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- =====================================================================
-- Fonctions métier (SECURITY DEFINER = exécutées avec des droits étendus,
-- mais elles vérifient elles-mêmes qui appelle)
-- =====================================================================

-- Création d'une agence : l'appelant en devient propriétaire
create or replace function public.create_agency(
  p_name text,
  p_city text,
  p_email text,
  p_phone text,
  p_description text,
  p_owner_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Connexion requise';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom de l''agence est obligatoire';
  end if;

  perform set_config('asep.bypass_member_guard', 'on', true);

  insert into agencies (name, city, email, phone_we_chat, whatsapp, description, created_by)
  values (trim(p_name), p_city, coalesce(p_email, ''), coalesce(p_phone, ''), coalesce(p_phone, ''), coalesce(p_description, ''), v_uid)
  returning id into v_id;

  insert into agency_members (agency_id, profile_id, full_name, email, phone, role, status, joined_at)
  values (v_id, v_uid, coalesce(nullif(trim(p_owner_name), ''), 'Propriétaire'), coalesce(p_email, ''), coalesce(p_phone, ''), 'owner', 'active', now());

  insert into agency_settings (agency_id) values (v_id);

  insert into agency_activity (agency_id, actor_id, actor_name, module, description)
  values (v_id, v_uid, coalesce(nullif(trim(p_owner_name), ''), 'Propriétaire'), 'settings', 'a créé l''espace de l''agence');

  return v_id;
end;
$$;

-- Rattache les invitations en attente au compte connecté (même adresse email)
create or replace function public.claim_agency_invitations()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  perform set_config('asep.bypass_member_guard', 'on', true);
  update agency_members
     set profile_id = auth.uid(), status = 'active', joined_at = now()
   where profile_id is null
     and status = 'invited'
     and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Validation d'une agence par l'administrateur de la plateforme
create or replace function public.set_agency_status(p_agency uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  update agencies set verified_status = p_status where id = p_agency;
end;
$$;

-- Acceptation d'un devis par l'acheteur : crée la commande
create or replace function public.accept_rfq(p_rfq uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r rfqs%rowtype;
  v_order uuid;
  v_unit numeric;
  v_ship numeric;
  v_steps jsonb;
begin
  select * into r from rfqs where id = p_rfq for update;
  if not found or r.buyer_id <> auth.uid() then
    raise exception 'Devis introuvable';
  end if;
  if r.status = 'accepted' then
    raise exception 'Ce devis a déjà été accepté';
  end if;
  if r.quoted_price_usd is null then
    raise exception 'L''agence n''a pas encore chiffré ce devis';
  end if;

  v_unit := r.quoted_price_usd;
  v_ship := coalesce(r.quoted_shipping_usd, 0);
  v_steps := jsonb_build_array(
    jsonb_build_object('status', 'en_attente', 'title', 'Commande confirmée', 'date', to_char(current_date, 'YYYY-MM-DD'), 'completed', true),
    jsonb_build_object('status', 'en_production', 'title', 'En production', 'date', '', 'completed', false),
    jsonb_build_object('status', 'expedie_chine', 'title', 'Expédiée depuis la Chine', 'date', '', 'completed', false),
    jsonb_build_object('status', 'transit_maritime', 'title', 'Transit', 'date', '', 'completed', false),
    jsonb_build_object('status', 'douane_matadi', 'title', 'Dédouanement', 'date', '', 'completed', false),
    jsonb_build_object('status', 'arrive_kinshasa', 'title', 'Arrivée en RDC', 'date', '', 'completed', false),
    jsonb_build_object('status', 'livre', 'title', 'Livrée', 'date', '', 'completed', false)
  );

  insert into orders (
    order_number, rfq_id, product_id, product_name, product_image, agency_id, agency_name,
    buyer_id, buyer_name, quantity, unit_price_usd, shipping_usd, total_usd,
    destination_city, delivery_address, tracking_number, shipping_mode, estimated_delivery_date, timeline
  ) values (
    'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0'),
    r.id, r.product_id, r.product_name, r.product_image, r.agency_id, r.agency_name,
    r.buyer_id, r.buyer_name, r.quantity, v_unit, v_ship, round(r.quantity * v_unit + v_ship, 2),
    r.buyer_city, r.buyer_city, '',
    case when r.delivery_port ilike '%aérien%' then 'Fret Aérien Express' else 'Fret Maritime (Conteneur)' end,
    current_date + 35, v_steps
  ) returning id into v_order;

  update rfqs set status = 'accepted' where id = r.id;
  return v_order;
end;
$$;

-- =====================================================================
-- Déclencheurs
-- =====================================================================

-- Protège la gestion des membres : seul un propriétaire gère un propriétaire,
-- personne ne modifie ses propres droits, l'agence garde un propriétaire actif.
create or replace function public.guard_agency_members()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_agency uuid := coalesce(new.agency_id, old.agency_id);
begin
  if current_setting('asep.bypass_member_guard', true) = 'on' then
    return coalesce(new, old);
  end if;

  select role into v_caller_role from agency_members
   where agency_id = v_agency and profile_id = auth.uid() and status = 'active';

  if v_caller_role is distinct from 'owner' then
    if (tg_op in ('UPDATE', 'DELETE') and old.role = 'owner') or (tg_op in ('INSERT', 'UPDATE') and new.role = 'owner') then
      raise exception 'Seul un propriétaire peut gérer un propriétaire';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.profile_id = auth.uid()
     and (new.role <> old.role or new.permissions <> old.permissions or new.status <> old.status) then
    raise exception 'Vous ne pouvez pas modifier vos propres droits';
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and not exists (
       select 1 from agency_members
        where agency_id = v_agency and role = 'owner' and status = 'active' and id <> old.id
     ) then
    raise exception 'L''agence doit conserver au moins un propriétaire actif';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger guard_agency_members
  before insert or update or delete on public.agency_members
  for each row execute function public.guard_agency_members();

-- Recopie le nom et la ville de l'agence sur ses articles
create or replace function public.sync_agency_products()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name or new.city is distinct from old.city then
    update products set agency_name = new.name, agency_city = new.city where agency_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_agency_products
  after update on public.agencies
  for each row execute function public.sync_agency_products();

-- Complète automatiquement nom et ville de l'agence sur un nouvel article
create or replace function public.fill_product_agency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select name, city into new.agency_name, new.agency_city from agencies where id = new.agency_id;
  return new;
end;
$$;

create trigger fill_product_agency
  before insert on public.products
  for each row execute function public.fill_product_agency();

-- Tient à jour le nombre d'articles de l'agence
create or replace function public.count_agency_products()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update agencies a set total_products = (select count(*) from products p where p.agency_id = a.id)
   where a.id = coalesce(new.agency_id, old.agency_id);
  return null;
end;
$$;

create trigger count_agency_products
  after insert or delete on public.products
  for each row execute function public.count_agency_products();

-- Dernier message d'une conversation
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations
     set last_message = coalesce(nullif(new.text, ''), new.attachment ->> 'title', 'Pièce jointe'),
         last_message_at = new.created_at,
         unread_count = unread_count + 1
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Empêche un acheteur de modifier les champs chiffrés par l'agence (et inversement)
create or replace function public.guard_rfq_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.buyer_id <> old.buyer_id or new.agency_id <> old.agency_id or new.quantity <> old.quantity then
    raise exception 'Champs non modifiables';
  end if;
  -- L'acheteur ne peut pas modifier l'offre chiffrée par l'agence
  if not public.has_agency_permission(old.agency_id, 'orders', 'edit')
     and (new.quoted_price_usd is distinct from old.quoted_price_usd
          or new.quoted_shipping_usd is distinct from old.quoted_shipping_usd
          or new.quote_valid_until is distinct from old.quote_valid_until
          or new.agency_notes is distinct from old.agency_notes) then
    raise exception 'Seule l''agence peut modifier son offre';
  end if;
  return new;
end;
$$;

create trigger guard_rfq_update
  before update on public.rfqs
  for each row execute function public.guard_rfq_update();

-- =====================================================================
-- Droits de colonnes (en plus des policies)
-- =====================================================================
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, city, country, company_name) on public.profiles to authenticated;

revoke insert, update on public.agencies from anon, authenticated;
grant update (
  name, chinese_name, city, province, logo, banner, response_time, main_categories, year_established,
  employee_count, business_license, phone_we_chat, whatsapp, email, address, description,
  francophone_support, export_markets
) on public.agencies to authenticated;

revoke update on public.orders from anon, authenticated;
grant update (status, timeline, tracking_number, estimated_delivery_date) on public.orders to authenticated;
revoke insert on public.orders from anon, authenticated;

revoke update on public.rfqs from anon, authenticated;
grant update (status, quoted_price_usd, quoted_shipping_usd, quote_valid_until, agency_notes) on public.rfqs to authenticated;

revoke update on public.conversations from anon, authenticated;
grant update (unread_count) on public.conversations to authenticated;

revoke update, delete on public.messages from anon, authenticated;

revoke insert, update, delete on public.agency_activity from anon;
revoke update, delete on public.agency_activity from authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.agency_customers enable row level security;
alter table public.agency_expenses enable row level security;
alter table public.agency_shipments enable row level security;
alter table public.agency_shipment_events enable row level security;
alter table public.agency_settings enable row level security;
alter table public.agency_activity enable row level security;
alter table public.products enable row level security;
alter table public.rfqs enable row level security;
alter table public.orders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;

-- Profils
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Agences : annuaire public des agences validées
create policy agencies_select on public.agencies for select
  using (verified_status in ('verified', 'gold') or public.is_agency_member(id) or created_by = auth.uid() or public.is_platform_admin());
create policy agencies_update on public.agencies for update
  using (public.has_agency_permission(id, 'settings', 'edit'))
  with check (public.has_agency_permission(id, 'settings', 'edit'));

-- Membres
create policy members_select on public.agency_members for select
  using (public.is_agency_member(agency_id) or profile_id = auth.uid());
create policy members_insert on public.agency_members for insert
  with check (public.has_agency_permission(agency_id, 'staff', 'create'));
create policy members_update on public.agency_members for update
  using (public.has_agency_permission(agency_id, 'staff', 'edit'))
  with check (public.has_agency_permission(agency_id, 'staff', 'edit'));
create policy members_delete on public.agency_members for delete
  using (public.has_agency_permission(agency_id, 'staff', 'delete'));

-- Tables internes : mêmes règles par module
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('agency_customers', 'customers'),
      ('agency_expenses', 'expenses'),
      ('agency_shipments', 'freight')
    ) as v(tbl, module)
  loop
    execute format('create policy %I on public.%I for select using (public.has_agency_permission(agency_id, %L, ''view''))', t.tbl || '_select', t.tbl, t.module);
    execute format('create policy %I on public.%I for insert with check (public.has_agency_permission(agency_id, %L, ''create''))', t.tbl || '_insert', t.tbl, t.module);
    execute format('create policy %I on public.%I for update using (public.has_agency_permission(agency_id, %L, ''edit'')) with check (public.has_agency_permission(agency_id, %L, ''edit''))', t.tbl || '_update', t.tbl, t.module, t.module);
    execute format('create policy %I on public.%I for delete using (public.has_agency_permission(agency_id, %L, ''delete''))', t.tbl || '_delete', t.tbl, t.module);
  end loop;
end $$;

-- Le fret a aussi besoin de la liste des clients pour enregistrer un colis
create policy agency_customers_select_freight on public.agency_customers for select
  using (public.has_agency_permission(agency_id, 'freight', 'create'));

create policy shipment_events_select on public.agency_shipment_events for select
  using (public.has_agency_permission(agency_id, 'freight', 'view'));
create policy shipment_events_insert on public.agency_shipment_events for insert
  with check (public.has_agency_permission(agency_id, 'freight', 'create') or public.has_agency_permission(agency_id, 'freight', 'edit'));
create policy shipment_events_delete on public.agency_shipment_events for delete
  using (public.has_agency_permission(agency_id, 'freight', 'delete'));

create policy settings_select on public.agency_settings for select
  using (public.is_agency_member(agency_id));
create policy settings_update on public.agency_settings for update
  using (public.has_agency_permission(agency_id, 'settings', 'edit') or public.has_agency_permission(agency_id, 'subscription', 'edit'))
  with check (public.has_agency_permission(agency_id, 'settings', 'edit') or public.has_agency_permission(agency_id, 'subscription', 'edit'));

create policy activity_select on public.agency_activity for select
  using (public.is_agency_member(agency_id));
create policy activity_insert on public.agency_activity for insert
  with check (public.is_agency_member(agency_id) and actor_id = auth.uid());

-- Catalogue : public pour les agences validées
create policy products_select on public.products for select
  using (
    (status = 'active' and exists (select 1 from public.agencies a where a.id = agency_id and a.verified_status in ('verified', 'gold')))
    or public.is_agency_member(agency_id)
    or public.is_platform_admin()
  );
create policy products_insert on public.products for insert
  with check (public.has_agency_permission(agency_id, 'products', 'create'));
create policy products_update on public.products for update
  using (public.has_agency_permission(agency_id, 'products', 'edit'))
  with check (public.has_agency_permission(agency_id, 'products', 'edit'));
create policy products_delete on public.products for delete
  using (public.has_agency_permission(agency_id, 'products', 'delete') or public.is_platform_admin());

-- Devis
create policy rfqs_select on public.rfqs for select
  using (buyer_id = auth.uid() or public.has_agency_permission(agency_id, 'orders', 'view') or public.is_platform_admin());
create policy rfqs_insert on public.rfqs for insert
  with check (buyer_id = auth.uid());
create policy rfqs_update_agency on public.rfqs for update
  using (public.has_agency_permission(agency_id, 'orders', 'edit'))
  with check (public.has_agency_permission(agency_id, 'orders', 'edit'));
create policy rfqs_update_buyer on public.rfqs for update
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid() and status in ('declined', 'pending', 'quoted'));

-- Commandes (créées uniquement par accept_rfq)
create policy orders_select on public.orders for select
  using (buyer_id = auth.uid() or public.has_agency_permission(agency_id, 'orders', 'view') or public.is_platform_admin());
create policy orders_update on public.orders for update
  using (public.has_agency_permission(agency_id, 'orders', 'edit'))
  with check (public.has_agency_permission(agency_id, 'orders', 'edit'));

-- Messagerie
create policy conversations_select on public.conversations for select
  using (buyer_id = auth.uid() or public.has_agency_permission(agency_id, 'conversations', 'view'));
create policy conversations_insert on public.conversations for insert
  with check (buyer_id = auth.uid());
create policy conversations_update on public.conversations for update
  using (buyer_id = auth.uid() or public.has_agency_permission(agency_id, 'conversations', 'view'));

create policy messages_select on public.messages for select
  using (exists (
    select 1 from public.conversations c
     where c.id = conversation_id
       and (c.buyer_id = auth.uid() or public.has_agency_permission(c.agency_id, 'conversations', 'view'))
  ));
create policy messages_insert on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (
           (sender = 'buyer' and c.buyer_id = auth.uid())
           or (sender = 'agency' and public.has_agency_permission(c.agency_id, 'conversations', 'create'))
         )
    )
  );

-- Favoris
create policy favorites_all on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- Temps réel pour la messagerie
-- =====================================================================
alter publication supabase_realtime add table public.messages, public.conversations;

-- Exécution des fonctions métier réservée aux utilisateurs connectés
revoke execute on function public.create_agency(text, text, text, text, text, text) from public, anon;
revoke execute on function public.claim_agency_invitations() from public, anon;
revoke execute on function public.set_agency_status(uuid, text) from public, anon;
revoke execute on function public.accept_rfq(uuid) from public, anon;
grant execute on function public.create_agency(text, text, text, text, text, text) to authenticated;
grant execute on function public.claim_agency_invitations() to authenticated;
grant execute on function public.set_agency_status(uuid, text) to authenticated;
grant execute on function public.accept_rfq(uuid) to authenticated;
