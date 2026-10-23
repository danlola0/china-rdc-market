-- =====================================================================
-- Règles d'accès des succursales : c'est l'agence principale (siège) qui décide.
-- 1. Paramètres de l'agence, abonnement, succursales et partenariats :
--    réservés au propriétaire et aux membres « toutes succursales ».
-- 2. Un responsable de succursale ne gère que le personnel de sa succursale
--    et ne peut pas donner plus de droits qu'il n'en a lui-même.
-- =====================================================================

create or replace function public.has_agency_permission(p_agency uuid, p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or exists (
    select 1 from public.agency_members m
    where m.agency_id = p_agency
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and (m.role = 'owner' or coalesce(m.permissions -> p_module, '[]'::jsonb) ? p_action)
      -- Les modules de l'agence entière restent au siège
      and (p_module not in ('settings', 'subscription') or m.role = 'owner' or m.branch_id is null)
  );
$$;

create or replace function public.guard_agency_members()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_caller agency_members%rowtype;
  v_caller_role text;
  v_agency uuid := coalesce(new.agency_id, old.agency_id);
begin
  if current_setting('asep.bypass_member_guard', true) = 'on' then
    return coalesce(new, old);
  end if;

  if public.is_platform_admin() then
    v_caller_role := 'owner';
  else
    select * into v_caller from agency_members
     where agency_id = v_agency and profile_id = auth.uid() and status = 'active';
    v_caller_role := v_caller.role;
  end if;

  if v_caller_role is distinct from 'owner' then
    if (tg_op in ('UPDATE', 'DELETE') and old.role = 'owner') or (tg_op in ('INSERT', 'UPDATE') and new.role = 'owner') then
      raise exception 'Seul un propriétaire peut gérer un propriétaire';
    end if;
  end if;

  -- Responsable de succursale : uniquement son personnel, jamais plus de droits que les siens
  if v_caller_role is distinct from 'owner' and v_caller.id is not null and v_caller.branch_id is not null
     and auth.uid() is not null then
    if tg_op in ('UPDATE', 'DELETE') and old.branch_id is distinct from v_caller.branch_id then
      raise exception 'Vous ne pouvez gérer que le personnel de votre succursale';
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      if new.branch_id is distinct from v_caller.branch_id then
        raise exception 'Vous ne pouvez rattacher un employé qu''à votre succursale';
      end if;
      if (tg_op = 'INSERT' or new.permissions is distinct from old.permissions)
         and exists (
           select 1
             from jsonb_each(case when jsonb_typeof(new.permissions) = 'object' then new.permissions else '{}'::jsonb end) p(module, actions),
                  jsonb_array_elements_text(case when jsonb_typeof(p.actions) = 'array' then p.actions else '[]'::jsonb end) a(action)
            where not coalesce(v_caller.permissions -> p.module, '[]'::jsonb) ? a.action
         ) then
        raise exception 'Vous ne pouvez pas donner des droits que vous n''avez pas';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.profile_id = auth.uid()
     and (new.role <> old.role or new.permissions <> old.permissions or new.status <> old.status
          or new.branch_id is distinct from old.branch_id) then
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
revoke execute on function public.guard_agency_members() from public, anon, authenticated;
