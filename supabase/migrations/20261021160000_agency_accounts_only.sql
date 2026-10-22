-- Seul un compte de type « agence » peut inscrire une agence.
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
  if not exists (select 1 from profiles where id = v_uid and account_type = 'agency') then
    raise exception 'Seul un compte agence peut inscrire une agence. Créez un compte agence.';
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

  perform set_config('asep.bypass_member_guard', 'off', true);

  insert into agency_settings (agency_id) values (v_id);

  insert into agency_activity (agency_id, actor_id, actor_name, module, description)
  values (v_id, v_uid, coalesce(nullif(trim(p_owner_name), ''), 'Propriétaire'), 'settings', 'a créé l''espace de l''agence');

  return v_id;
exception when others then
  perform set_config('asep.bypass_member_guard', 'off', true);
  raise;
end;
$$;
