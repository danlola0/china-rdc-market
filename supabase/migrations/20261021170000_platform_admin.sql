-- =====================================================================
-- Administrateur de la plateforme : accès à toutes les agences,
-- gestion des abonnements, des utilisateurs et des administrateurs.
-- =====================================================================

-- 1. L'administrateur a tous les droits dans toutes les agences (support / gestion)
create or replace function public.is_agency_member(p_agency uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or exists (
    select 1 from public.agency_members
    where agency_id = p_agency and profile_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.has_agency_permission(p_agency uuid, p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or exists (
    select 1 from public.agency_members m
    where m.agency_id = p_agency
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and (m.role = 'owner' or coalesce(m.permissions -> p_module, '[]'::jsonb) ? p_action)
  );
$$;

-- Le contrôle des membres traite l'administrateur comme un propriétaire
create or replace function public.guard_agency_members()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_agency uuid := coalesce(new.agency_id, old.agency_id);
begin
  if current_setting('asep.bypass_member_guard', true) = 'on' then
    return coalesce(new, old);
  end if;

  if public.is_platform_admin() then
    v_caller_role := 'owner';
  else
    select role into v_caller_role from agency_members
     where agency_id = v_agency and profile_id = auth.uid() and status = 'active';
  end if;

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

-- 2. Création d'agence : comptes agence et administrateur (agence validée d'office si créée par l'admin)
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
  v_admin boolean := public.is_platform_admin();
begin
  if v_uid is null then
    raise exception 'Connexion requise';
  end if;
  if not v_admin and not exists (select 1 from profiles where id = v_uid and account_type = 'agency') then
    raise exception 'Seul un compte agence peut inscrire une agence. Créez un compte agence.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom de l''agence est obligatoire';
  end if;

  perform set_config('asep.bypass_member_guard', 'on', true);

  insert into agencies (name, city, email, phone_we_chat, whatsapp, description, created_by, verified_status)
  values (trim(p_name), p_city, coalesce(p_email, ''), coalesce(p_phone, ''), coalesce(p_phone, ''), coalesce(p_description, ''), v_uid,
          case when v_admin then 'verified' else 'pending' end)
  returning id into v_id;

  insert into agency_members (agency_id, profile_id, full_name, email, phone, role, status, joined_at)
  values (v_id, v_uid, coalesce(nullif(trim(p_owner_name), ''), 'Propriétaire'), coalesce(p_email, ''), coalesce(p_phone, ''), 'owner', 'active', now());

  perform set_config('asep.bypass_member_guard', 'off', true);

  insert into agency_settings (agency_id) values (v_id);

  insert into agency_activity (agency_id, actor_id, actor_name, module, description)
  values (v_id, v_uid, coalesce(nullif(trim(p_owner_name), ''), 'Propriétaire'), 'settings',
          case when v_admin then 'a inscrit l''agence (administrateur ASEP)' else 'a créé l''espace de l''agence' end);

  return v_id;
exception when others then
  perform set_config('asep.bypass_member_guard', 'off', true);
  raise;
end;
$$;

-- 3. Abonnements : gérés par l'administrateur ; l'agence peut seulement demander une formule
alter table public.agency_settings
  add column if not exists subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'expired', 'suspended')),
  add column if not exists subscription_expires_at date,
  add column if not exists subscription_note text not null default '',
  add column if not exists requested_plan text check (requested_plan in ('standard', 'gold', 'enterprise')),
  add column if not exists requested_at timestamptz;

revoke update on public.agency_settings from anon, authenticated;
grant update (country, primary_color, accent_color, default_currency, freight_rates, notifications, display, requested_plan, requested_at)
  on public.agency_settings to authenticated;

create or replace function public.admin_set_subscription(
  p_agency uuid,
  p_plan text,
  p_status text,
  p_expires_at date,
  p_note text default ''
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  update agency_settings
     set plan = p_plan,
         subscription_status = p_status,
         subscription_expires_at = p_expires_at,
         subscription_note = coalesce(p_note, ''),
         requested_plan = case when requested_plan = p_plan then null else requested_plan end,
         requested_at = case when requested_plan = p_plan then null else requested_at end
   where agency_id = p_agency;
  if not found then
    insert into agency_settings (agency_id, plan, subscription_status, subscription_expires_at, subscription_note)
    values (p_agency, p_plan, p_status, p_expires_at, coalesce(p_note, ''));
  end if;
end;
$$;

-- 4. Utilisateurs : liste complète et gestion des administrateurs
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  city text,
  account_type text,
  is_admin boolean,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  agencies text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  return query
    select p.id, p.email, p.full_name, p.phone, p.city, p.account_type, p.is_admin, u.created_at,
           u.email_confirmed_at, u.last_sign_in_at,
           coalesce((select string_agg(a.name || ' (' || m.role || ')', ', ' order by a.name)
                       from agency_members m join agencies a on a.id = m.agency_id
                      where m.profile_id = p.id), '')
      from profiles p
      join auth.users u on u.id = p.id
     order by u.created_at desc;
end;
$$;

create or replace function public.admin_set_platform_admin(p_user uuid, p_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  if p_user = auth.uid() and not p_value then
    raise exception 'Vous ne pouvez pas retirer vos propres droits d''administrateur';
  end if;
  update profiles set is_admin = p_value where id = p_user;
end;
$$;

-- 5. Journal global (lecture seule) : déjà couvert par is_agency_member pour l'administrateur

revoke execute on function public.admin_set_subscription(uuid, text, text, date, text) from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_platform_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_subscription(uuid, text, text, date, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_platform_admin(uuid, boolean) to authenticated;
