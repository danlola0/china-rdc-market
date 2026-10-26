-- =====================================================================
-- Téléphone des clients pour le bouton WhatsApp des commandes :
-- quand le client n'a pas saisi de numéro à la commande, l'agence voit
-- celui de son compte acheteur (ou, à défaut, celui de sa dernière demande
-- de devis). Uniquement pour les clients qui ont commandé ou demandé un
-- devis à cette agence, et pour les membres ayant accès aux commandes.
-- =====================================================================

create or replace function public.agency_buyer_phones(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_agency_permission(p_agency, 'orders', 'view') then
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
            select buyer_id from orders where agency_id = p_agency
            union
            select buyer_id from rfqs where agency_id = p_agency
          ) x
          left join profiles p on p.id = x.buyer_id
      ) b
     where b.phone is not null
  ), '{}'::jsonb);
end;
$$;

revoke execute on function public.agency_buyer_phones(uuid) from public, anon;
grant execute on function public.agency_buyer_phones(uuid) to authenticated;
