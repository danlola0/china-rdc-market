-- =====================================================================
-- Centre de notifications (cloche) : chaque utilisateur reçoit ses alertes,
-- peut les marquer comme lues et les supprimer. Elles sont créées par la base
-- (déclencheurs) : impossible d'en fabriquer pour quelqu'un d'autre.
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  agency_id uuid references public.agencies (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- Destinataires
-- ---------------------------------------------------------------------

-- Membres actifs d'une agence ayant accès au module (et à la succursale le cas échéant),
-- si l'agence n'a pas désactivé ce type d'alerte. L'auteur de l'action est exclu.
create or replace function public.notify_agency(
  p_agency uuid, p_module text, p_setting text, p_type text, p_title text, p_body text, p_link text,
  p_branches uuid[] default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_setting is not null and exists (
    select 1 from agency_settings s where s.agency_id = p_agency and (s.notifications ->> p_setting) = 'false'
  ) then
    return;
  end if;
  insert into notifications (user_id, agency_id, type, title, body, link)
  select distinct m.profile_id, p_agency, p_type, p_title, coalesce(p_body, ''), coalesce(p_link, '')
    from agency_members m
   where m.agency_id = p_agency
     and m.status = 'active'
     and m.profile_id is not null
     and m.profile_id is distinct from auth.uid()
     and (m.role = 'owner' or coalesce(m.permissions -> p_module, '[]'::jsonb) ? 'view')
     and (p_branches is null or m.role = 'owner' or m.branch_id is null or m.branch_id = any (p_branches));
end;
$$;

create or replace function public.notify_user(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  select p_user, p_type, p_title, coalesce(p_body, ''), coalesce(p_link, '')
   where p_user is not null and p_user is distinct from auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------

-- Commandes : nouvelle commande pour l'agence, changement de statut pour l'acheteur
create or replace function public.notify_orders()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify_agency(new.agency_id, 'orders', 'newOrder', 'order', 'Nouvelle commande ' || new.order_number,
      new.buyer_name || ' · ' || new.product_name || ' × ' || new.quantity, '/agency/orders');
  elsif new.status is distinct from old.status then
    perform notify_user(new.buyer_id, 'order', 'Commande ' || new.order_number || ' mise à jour',
      new.product_name || ' · nouveau statut : ' || replace(new.status, '_', ' '), '/buyer/orders');
  end if;
  return new;
end;
$$;
create trigger notify_orders after insert or update of status on public.orders
  for each row execute function public.notify_orders();

-- Demandes de devis : nouvelle demande pour l'agence, réponse pour l'acheteur
create or replace function public.notify_rfqs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify_agency(new.agency_id, 'orders', 'newOrder', 'rfq', 'Nouvelle demande de devis ' || new.rfq_number,
      new.buyer_name || ' · ' || new.product_name || ' × ' || new.quantity, '/agency/orders?tab=rfqs');
  elsif new.status is distinct from old.status and new.status in ('quoted', 'declined') then
    perform notify_user(new.buyer_id, 'rfq',
      case when new.status = 'quoted' then 'Devis reçu pour ' || new.product_name else 'Demande de devis refusée' end,
      new.agency_name || ' · ' || new.rfq_number, '/buyer/rfqs');
  elsif new.status is distinct from old.status and new.status = 'accepted' then
    perform notify_agency(new.agency_id, 'orders', 'newOrder', 'rfq', 'Devis accepté ' || new.rfq_number,
      new.buyer_name || ' · ' || new.product_name, '/agency/orders?tab=rfqs');
  end if;
  return new;
end;
$$;
create trigger notify_rfqs after insert or update of status on public.rfqs
  for each row execute function public.notify_rfqs();

-- Messages : l'acheteur ou l'agence reçoit une alerte
create or replace function public.notify_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c conversations%rowtype;
begin
  select * into c from conversations where id = new.conversation_id;
  if not found then return new; end if;
  if new.sender = 'buyer' then
    perform notify_agency(c.agency_id, 'conversations', 'newMessage', 'message', 'Nouveau message de ' || c.buyer_name,
      left(coalesce(nullif(new.text, ''), 'Pièce jointe'), 140), '/agency/conversations');
  else
    perform notify_user(c.buyer_id, 'message', 'Nouveau message de ' || c.agency_name,
      left(coalesce(nullif(new.text, ''), 'Pièce jointe'), 140), '/messages');
  end if;
  return new;
end;
$$;
create trigger notify_messages after insert on public.messages
  for each row execute function public.notify_messages();

-- Colis : changement de statut (succursales concernées + agence partenaire)
create or replace function public.notify_shipment_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s agency_shipments%rowtype;
  v_label text;
begin
  select * into s from agency_shipments where id = new.shipment_id;
  if not found then return new; end if;
  v_label := case new.status
    when 'registered' then 'Enregistré' when 'preparing' then 'En préparation' when 'in_transit' then 'En transit'
    when 'arrived' then 'Arrivé' when 'delivered' then 'Livré' else new.status end;
  perform notify_agency(s.agency_id, 'freight', 'shipmentUpdate', 'shipment', 'Colis ' || s.tracking_ref || ' : ' || v_label,
    s.customer_name || coalesce(' · ' || nullif(new.note, ''), '') || coalesce(' · ' || nullif(new.actor_name, ''), ''),
    '/agency/parcels', array_remove(array[s.origin_branch_id, s.destination_branch_id], null));
  if s.partner_agency_id is not null and are_partners(s.agency_id, s.partner_agency_id) then
    perform notify_agency(s.partner_agency_id, 'freight', 'shipmentUpdate', 'shipment', 'Colis partenaire ' || s.tracking_ref || ' : ' || v_label,
      s.customer_name, '/agency/parcels');
  end if;
  return new;
end;
$$;
create trigger notify_shipment_events after insert on public.agency_shipment_events
  for each row execute function public.notify_shipment_events();

-- Colis confié à un partenaire
create or replace function public.notify_shipment_partner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_from text;
begin
  if new.partner_agency_id is not null and new.partner_agency_id is distinct from old.partner_agency_id then
    select name into v_from from agencies where id = new.agency_id;
    perform notify_agency(new.partner_agency_id, 'freight', 'shipmentUpdate', 'shipment', 'Nouveau colis confié par ' || v_from,
      new.tracking_ref || ' · ' || new.origin_city || ' → ' || new.destination_city, '/agency/parcels');
  end if;
  return new;
end;
$$;
create trigger notify_shipment_partner after insert or update of partner_agency_id on public.agency_shipments
  for each row execute function public.notify_shipment_partner();

-- Partenariats : demande reçue, demande acceptée
create or replace function public.notify_partnerships()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if tg_op = 'INSERT' then
    select name into v_name from agencies where id = new.requester_agency_id;
    perform notify_agency(new.partner_agency_id, 'settings', null, 'partner', 'Demande de partenariat',
      v_name || ' souhaite travailler avec vous.', '/agency/partners');
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    select name into v_name from agencies where id = new.partner_agency_id;
    perform notify_agency(new.requester_agency_id, 'settings', null, 'partner', 'Partenariat accepté',
      v_name || ' a accepté votre demande.', '/agency/partners');
  end if;
  return new;
end;
$$;
create trigger notify_partnerships after insert or update of status on public.agency_partnerships
  for each row execute function public.notify_partnerships();

-- Agences : nouvelle inscription pour l'administrateur, décision pour l'agence
create or replace function public.notify_agency_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.verified_status = 'pending' then
      insert into notifications (user_id, type, title, body, link)
      select p.id, 'admin', 'Nouvelle agence à valider', new.name || coalesce(' · ' || nullif(new.city, ''), ''), '/admin'
        from profiles p where p.is_admin and p.id is distinct from auth.uid();
    end if;
  elsif new.verified_status is distinct from old.verified_status and new.verified_status <> 'pending' then
    perform notify_agency(new.id, 'dashboard', null, 'verification',
      case when new.verified_status in ('verified', 'gold') then 'Agence validée' else 'Validation de l''agence refusée' end,
      case when new.verified_status in ('verified', 'gold') then 'Vos articles sont visibles dans le catalogue.' else 'Consultez la page Paramètres pour compléter votre dossier.' end,
      '/agency');
  end if;
  return new;
end;
$$;
create trigger notify_agency_verification after insert or update of verified_status on public.agencies
  for each row execute function public.notify_agency_verification();

-- Ces fonctions ne sont appelées que par les déclencheurs
revoke execute on function public.notify_agency(uuid, text, text, text, text, text, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_orders() from public, anon, authenticated;
revoke execute on function public.notify_rfqs() from public, anon, authenticated;
revoke execute on function public.notify_messages() from public, anon, authenticated;
revoke execute on function public.notify_shipment_events() from public, anon, authenticated;
revoke execute on function public.notify_shipment_partner() from public, anon, authenticated;
revoke execute on function public.notify_partnerships() from public, anon, authenticated;
revoke execute on function public.notify_agency_verification() from public, anon, authenticated;
