-- =====================================================================
-- Abonnements des agences
-- Formules (clés existantes conservées) :
--   standard   = Standard      50 $ / mois  (tout sauf Succursales et Partenaires)
--   gold       = Premium      100 $ / mois  (tout)
--   enterprise = Achat complet 1 500 $, sans abonnement (tout, à vie)
-- Essai gratuit : 72 heures exactes après la création de l'agence. Les dates
-- sont des instants (timestamptz) : la fin est la même partout dans le monde,
-- chaque utilisateur la voit dans son propre fuseau horaire.
-- Activation : code généré par l'administrateur après paiement, saisi par l'agence.
-- =====================================================================

alter table public.agency_settings
  add column if not exists trial_ends_at timestamptz default (now() + interval '72 hours'),
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists requested_method text,
  add column if not exists requested_reference text not null default '';

-- Agences existantes : essai de 72 h à partir de maintenant (personne n'est bloqué par la mise à jour)
update public.agency_settings set trial_ends_at = now() + interval '72 hours' where trial_ends_at is null or subscription_status = 'trial';
-- Abonnements déjà actifs : fin à minuit (heure de Kinshasa) le jour indiqué ; achat complet sans fin
update public.agency_settings
   set subscription_ends_at = case
         when plan = 'enterprise' then null
         when subscription_expires_at is not null then ((subscription_expires_at + 1)::timestamp at time zone 'Africa/Kinshasa')
         else null end
 where subscription_status = 'active';

grant update (requested_method, requested_reference) on public.agency_settings to authenticated;

-- ---------------------------------------------------------------------
-- État d'accès d'une agence
-- ---------------------------------------------------------------------
create or replace function public.agency_is_active(p_agency uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
             when s.subscription_status = 'active' then s.subscription_ends_at is null or s.subscription_ends_at > now()
             when s.subscription_status = 'trial' then coalesce(s.trial_ends_at, now() + interval '1 second') > now()
             else false
           end
      from agency_settings s where s.agency_id = p_agency
  ), true);
$$;

-- Premium : essai en cours, Premium ou Achat complet
create or replace function public.agency_is_premium(p_agency uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.agency_is_active(p_agency) and coalesce((
    select s.subscription_status = 'trial' or s.plan in ('gold', 'enterprise')
      from agency_settings s where s.agency_id = p_agency
  ), true);
$$;

-- Abonnement expiré : seule la rubrique Abonnement reste accessible (pour se réabonner)
create or replace function public.has_agency_permission(p_agency uuid, p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or (
    exists (
      select 1 from public.agency_members m
      where m.agency_id = p_agency
        and m.profile_id = auth.uid()
        and m.status = 'active'
        and (m.role = 'owner' or coalesce(m.permissions -> p_module, '[]'::jsonb) ? p_action)
        and (p_module not in ('settings', 'subscription') or m.role = 'owner' or m.branch_id is null)
    )
    and (p_module = 'subscription' or public.agency_is_active(p_agency))
  );
$$;

-- Succursales et partenaires : réservés à Premium / Achat complet (ou essai)
create or replace function public.require_premium_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_headquarters and not is_platform_admin() and not agency_is_premium(new.agency_id) then
    raise exception 'Les succursales sont réservées aux formules Premium et Achat complet';
  end if;
  return new;
end;
$$;
create trigger require_premium_branch before insert on public.agency_branches
  for each row execute function public.require_premium_branch();

create or replace function public.require_premium_partnership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_platform_admin() then return new; end if;
  if tg_op = 'INSERT' and not agency_is_premium(new.requester_agency_id) then
    raise exception 'Les partenariats sont réservés aux formules Premium et Achat complet';
  end if;
  if tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' and not agency_is_premium(new.partner_agency_id) then
    raise exception 'Les partenariats sont réservés aux formules Premium et Achat complet';
  end if;
  return new;
end;
$$;
create trigger require_premium_partnership before insert or update on public.agency_partnerships
  for each row execute function public.require_premium_partnership();

-- ---------------------------------------------------------------------
-- Activation manuelle par l'administrateur (date de fin → minuit, heure de Kinshasa)
-- ---------------------------------------------------------------------
create or replace function public.admin_set_subscription(
  p_agency uuid, p_plan text, p_status text, p_expires_at date, p_note text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_ends timestamptz := case
    when p_plan = 'enterprise' and p_status = 'active' then null
    when p_expires_at is not null then ((p_expires_at + 1)::timestamp at time zone 'Africa/Kinshasa')
    else null end;
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  update agency_settings
     set plan = p_plan,
         subscription_status = p_status,
         subscription_expires_at = case when p_plan = 'enterprise' and p_status = 'active' then null else p_expires_at end,
         subscription_ends_at = v_ends,
         subscription_note = coalesce(p_note, ''),
         requested_plan = case when requested_plan = p_plan then null else requested_plan end,
         requested_at = case when requested_plan = p_plan then null else requested_at end
   where agency_id = p_agency;
  if not found then
    insert into agency_settings (agency_id, plan, subscription_status, subscription_expires_at, subscription_ends_at, subscription_note)
    values (p_agency, p_plan, p_status, p_expires_at, v_ends, coalesce(p_note, ''));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Codes d'activation
-- ---------------------------------------------------------------------
create table public.subscription_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan text not null check (plan in ('standard', 'gold', 'enterprise')),
  months integer check (months is null or months between 1 and 36),
  agency_id uuid references public.agencies (id) on delete cascade,
  amount_usd numeric(12, 2) not null default 0,
  payment_method text not null default 'cash',
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked boolean not null default false,
  redeemed_at timestamptz,
  redeemed_agency_id uuid references public.agencies (id) on delete set null,
  redeemed_by uuid references public.profiles (id) on delete set null
);
alter table public.subscription_codes enable row level security;
create policy subscription_codes_admin on public.subscription_codes for select using (public.is_platform_admin());
revoke all on public.subscription_codes from anon, authenticated;
grant select on public.subscription_codes to authenticated;

create or replace function public.admin_generate_subscription_code(
  p_plan text, p_months integer, p_agency uuid, p_amount numeric, p_method text, p_note text default ''
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_hex text;
  v_raw text;
  v_code text;
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  if p_plan not in ('standard', 'gold', 'enterprise') then
    raise exception 'Formule inconnue';
  end if;
  if p_plan <> 'enterprise' and (p_months is null or p_months < 1 or p_months > 36) then
    raise exception 'Durée invalide (1 à 36 mois)';
  end if;
  loop
    -- 8 caractères tirés d'un générateur cryptographique (sans 0/O/1/I pour éviter les confusions)
    v_hex := replace(gen_random_uuid()::text, '-', '');
    v_raw := '';
    for i in 1..8 loop
      v_raw := v_raw || substr(v_alphabet, (('x' || substr(v_hex, i * 2 - 1, 2))::bit(8)::int % 32) + 1, 1);
    end loop;
    v_code := 'ASEP-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
    exit when not exists (select 1 from subscription_codes where code = v_code);
  end loop;
  insert into subscription_codes (code, plan, months, agency_id, amount_usd, payment_method, note, created_by)
  values (v_code, p_plan, case when p_plan = 'enterprise' then null else p_months end, p_agency,
          coalesce(p_amount, 0), coalesce(nullif(p_method, ''), 'cash'), coalesce(p_note, ''), auth.uid());
  return v_code;
end;
$$;

create or replace function public.admin_revoke_subscription_code(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  update subscription_codes set revoked = true where id = p_id and redeemed_at is null;
  if not found then
    raise exception 'Code introuvable ou déjà utilisé';
  end if;
end;
$$;

-- L'agence saisit son code : la formule est activée immédiatement
create or replace function public.redeem_subscription_code(p_agency uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c subscription_codes%rowtype;
  s agency_settings%rowtype;
  v_start timestamptz;
  v_ends timestamptz;
begin
  if not exists (
    select 1 from agency_members m
     where m.agency_id = p_agency and m.profile_id = auth.uid() and m.status = 'active'
       and (m.role = 'owner' or coalesce(m.permissions -> 'subscription', '[]'::jsonb) ? 'edit')
  ) and not is_platform_admin() then
    raise exception 'Seul le propriétaire (ou un membre autorisé) peut activer un abonnement';
  end if;

  select * into c from subscription_codes
   where code = upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'))
   for update;
  if not found or c.revoked then
    raise exception 'Code invalide. Vérifiez la saisie ou contactez ASEP.';
  end if;
  if c.redeemed_at is not null then
    raise exception 'Ce code a déjà été utilisé';
  end if;
  if c.agency_id is not null and c.agency_id <> p_agency then
    raise exception 'Ce code a été généré pour une autre agence';
  end if;

  select * into s from agency_settings where agency_id = p_agency;
  if c.plan = 'enterprise' then
    v_ends := null;
  else
    -- Renouvellement : on prolonge à partir de la fin actuelle si l'abonnement est encore valable
    v_start := case
      when s.subscription_status = 'active' and s.plan = c.plan and s.subscription_ends_at > now() then s.subscription_ends_at
      else now() end;
    v_ends := v_start + make_interval(months => c.months);
  end if;

  update agency_settings
     set plan = c.plan,
         subscription_status = 'active',
         subscription_ends_at = v_ends,
         subscription_expires_at = (v_ends at time zone 'Africa/Kinshasa')::date,
         subscription_note = 'Code ' || c.code,
         requested_plan = null,
         requested_at = null,
         requested_method = null,
         requested_reference = ''
   where agency_id = p_agency;
  if not found then
    insert into agency_settings (agency_id, plan, subscription_status, subscription_ends_at, subscription_expires_at, subscription_note)
    values (p_agency, c.plan, 'active', v_ends, (v_ends at time zone 'Africa/Kinshasa')::date, 'Code ' || c.code);
  end if;

  update subscription_codes set redeemed_at = now(), redeemed_agency_id = p_agency, redeemed_by = auth.uid() where id = c.id;

  insert into notifications (user_id, type, title, body, link)
  select p.id, 'admin', 'Code d''abonnement utilisé', c.code || ' · ' || (select name from agencies where id = p_agency), '/admin'
    from profiles p where p.is_admin and p.id is distinct from auth.uid();

  return jsonb_build_object('plan', c.plan, 'endsAt', v_ends);
end;
$$;

-- ---------------------------------------------------------------------
-- Demande d'abonnement : l'administrateur est prévenu
-- ---------------------------------------------------------------------
create or replace function public.notify_subscription_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.requested_plan is not null and (new.requested_plan is distinct from old.requested_plan or new.requested_reference is distinct from old.requested_reference) then
    insert into notifications (user_id, type, title, body, link)
    select p.id, 'admin', 'Demande d''abonnement',
           (select name from agencies where id = new.agency_id) || ' · ' ||
           case new.requested_plan when 'standard' then 'Standard' when 'gold' then 'Premium' else 'Achat complet' end ||
           coalesce(' · ' || nullif(new.requested_method, ''), '') || coalesce(' · réf. ' || nullif(new.requested_reference, ''), ''),
           '/admin'
      from profiles p where p.is_admin;
  end if;
  return new;
end;
$$;
create trigger notify_subscription_request after update of requested_plan, requested_reference on public.agency_settings
  for each row execute function public.notify_subscription_request();

-- ---------------------------------------------------------------------
-- Coordonnées de paiement d'ASEP (modifiables par l'administrateur)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
create policy platform_settings_read on public.platform_settings for select using (auth.uid() is not null);
create policy platform_settings_admin on public.platform_settings for all using (public.is_platform_admin()) with check (public.is_platform_admin());
revoke all on public.platform_settings from anon;
grant select, insert, update on public.platform_settings to authenticated;
insert into public.platform_settings (key, value) values ('payment_accounts', '{}') on conflict do nothing;

revoke execute on function public.agency_is_active(uuid) from public, anon;
revoke execute on function public.agency_is_premium(uuid) from public, anon;
grant execute on function public.agency_is_active(uuid) to authenticated;
grant execute on function public.agency_is_premium(uuid) to authenticated;
revoke execute on function public.require_premium_branch() from public, anon, authenticated;
revoke execute on function public.require_premium_partnership() from public, anon, authenticated;
revoke execute on function public.notify_subscription_request() from public, anon, authenticated;
revoke execute on function public.admin_generate_subscription_code(text, integer, uuid, numeric, text, text) from public, anon;
revoke execute on function public.admin_revoke_subscription_code(uuid) from public, anon;
revoke execute on function public.redeem_subscription_code(uuid, text) from public, anon;
grant execute on function public.admin_generate_subscription_code(text, integer, uuid, numeric, text, text) to authenticated;
grant execute on function public.admin_revoke_subscription_code(uuid) to authenticated;
grant execute on function public.redeem_subscription_code(uuid, text) to authenticated;
