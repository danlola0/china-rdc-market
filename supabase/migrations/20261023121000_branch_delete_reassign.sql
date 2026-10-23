-- À la suppression d'une succursale, tout est rattaché au siège :
-- ses employés restent limités (au siège) au lieu d'obtenir l'accès à toutes les succursales.
create or replace function public.reassign_branch_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hq uuid;
begin
  if old.is_headquarters then
    -- Le siège n'est supprimé qu'avec l'agence elle-même (suppression en cascade)
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
  update agency_shipments set origin_branch_id = v_hq where origin_branch_id = old.id;
  update agency_shipments set destination_branch_id = null where destination_branch_id = old.id;
  return old;
end;
$$;

create trigger reassign_branch_before_delete before delete on public.agency_branches
  for each row execute function public.reassign_branch_before_delete();
revoke execute on function public.reassign_branch_before_delete() from public, anon, authenticated;
