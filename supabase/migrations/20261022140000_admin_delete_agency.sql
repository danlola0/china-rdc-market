-- Suppression définitive d'une agence par l'administrateur de la plateforme.
-- Supprime aussi, par cascade : membres, clients, dépenses, colis, paramètres, dossier,
-- articles, devis, commandes, conversations et journal de l'agence.
-- Les fichiers (photos d'articles, documents) sont supprimés par l'application avant cet appel.
create or replace function public.admin_delete_agency(p_agency uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if not is_platform_admin() then
    raise exception 'Réservé à l''administrateur de la plateforme';
  end if;
  select name into v_name from agencies where id = p_agency;
  if v_name is null then
    raise exception 'Agence introuvable';
  end if;

  -- Le contrôle « au moins un propriétaire » ne doit pas bloquer la suppression complète
  perform set_config('asep.bypass_member_guard', 'on', true);
  delete from agencies where id = p_agency;
  perform set_config('asep.bypass_member_guard', 'off', true);
  return v_name;
exception when others then
  perform set_config('asep.bypass_member_guard', 'off', true);
  raise;
end;
$$;

revoke execute on function public.admin_delete_agency(uuid) from public, anon;
grant execute on function public.admin_delete_agency(uuid) to authenticated;
