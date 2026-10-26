-- =====================================================================
-- Espace Admin : supprimer des lignes du journal d'activité
-- (le journal reste non modifiable pour les agences elles-mêmes)
-- =====================================================================

create or replace function public.admin_delete_activity(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  delete from agency_activity where id = any (coalesce(p_ids, '{}'));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Tout effacer (pour une agence, ou pour toutes si p_agency est vide)
create or replace function public.admin_clear_activity(p_agency uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  delete from agency_activity where p_agency is null or agency_id = p_agency;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.admin_delete_activity(uuid[]) from public, anon;
revoke execute on function public.admin_clear_activity(uuid) from public, anon;
grant execute on function public.admin_delete_activity(uuid[]) to authenticated;
grant execute on function public.admin_clear_activity(uuid) to authenticated;
