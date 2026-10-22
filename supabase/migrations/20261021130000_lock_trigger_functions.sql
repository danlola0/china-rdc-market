-- Les fonctions de déclencheur ne doivent pas être appelables via l'API (/rest/v1/rpc).
-- Les déclencheurs continuent de fonctionner : PostgreSQL ne vérifie pas EXECUTE quand un trigger se déclenche.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_agency_members() from public, anon, authenticated;
revoke execute on function public.sync_agency_products() from public, anon, authenticated;
revoke execute on function public.fill_product_agency() from public, anon, authenticated;
revoke execute on function public.count_agency_products() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;
revoke execute on function public.guard_rfq_update() from public, anon, authenticated;
