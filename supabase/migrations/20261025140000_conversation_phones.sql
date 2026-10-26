-- =====================================================================
-- Bouton WhatsApp dans les conversations : l'agence obtient aussi le
-- téléphone des acheteurs qui lui ont écrit (accès « Conversations »).
-- =====================================================================

create or replace function public.agency_buyer_phones(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_orders boolean := has_agency_permission(p_agency, 'orders', 'view');
  v_convs boolean := has_agency_permission(p_agency, 'conversations', 'view');
begin
  if not v_orders and not v_convs then
    raise exception 'Action non autorisée';
  end if;
  return coalesce((
    select jsonb_object_agg(b.buyer_id, b.phone)
      from (
        select x.buyer_id,
               coalesce(
                 nullif(trim(p.phone), ''),
                 (select nullif(trim(r.buyer_phone), '') from rfqs r
                   where r.agency_id = p_agency and r.buyer_id = x.buyer_id and coalesce(trim(r.buyer_phone), '') <> ''
                   order by r.created_at desc limit 1)
               ) as phone
          from (
            select buyer_id from orders where v_orders and agency_id = p_agency
            union
            select buyer_id from rfqs where v_orders and agency_id = p_agency
            union
            select buyer_id from conversations where v_convs and agency_id = p_agency
          ) x
          left join profiles p on p.id = x.buyer_id
      ) b
     where b.phone is not null
  ), '{}'::jsonb);
end;
$$;
