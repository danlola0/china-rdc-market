-- =====================================================================
-- Commandes côté agence :
-- - « Discuter » : ouvre (ou crée) la conversation avec l'acheteur d'une
--   commande ou d'une demande de devis, comme sur Alibaba
-- - « Supprimer » : suppression d'une commande (droit Commandes → Supprimer),
--   l'acheteur est prévenu
-- =====================================================================

create or replace function public.agency_open_conversation(p_agency uuid, p_buyer uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  a agencies%rowtype;
  b profiles%rowtype;
  v_product record;
begin
  if not has_agency_permission(p_agency, 'conversations', 'view') then
    raise exception 'Votre rôle ne permet pas d''accéder aux conversations';
  end if;
  -- Seulement avec un acheteur qui a déjà commandé ou demandé un devis à l'agence
  if not exists (select 1 from orders where agency_id = p_agency and buyer_id = p_buyer)
     and not exists (select 1 from rfqs where agency_id = p_agency and buyer_id = p_buyer) then
    raise exception 'Cet acheteur n''a pas encore commandé auprès de votre agence';
  end if;

  select id into v_id from conversations where agency_id = p_agency and buyer_id = p_buyer;
  if found then
    -- Discussion effacée de notre côté : elle redevient visible
    update conversations set agency_cleared_at = null where id = v_id and agency_cleared_at is not null
       and not exists (select 1 from messages m where m.conversation_id = v_id and m.created_at > conversations.agency_cleared_at);
    return v_id;
  end if;

  select * into a from agencies where id = p_agency;
  select * into b from profiles where id = p_buyer;
  -- Article de la dernière commande, pour le bandeau de la conversation
  select o.product_id, o.product_name, o.product_image, o.unit_price_usd into v_product
    from orders o where o.agency_id = p_agency and o.buyer_id = p_buyer order by o.created_at desc limit 1;

  insert into conversations (agency_id, agency_name, agency_city, agency_avatar, buyer_id, buyer_name, buyer_city,
                             product_id, product_name, product_image, product_price, last_message, unread_count)
  values (p_agency, a.name, a.city, coalesce(a.logo, ''), p_buyer, coalesce(nullif(b.full_name, ''), b.email, 'Acheteur'),
          coalesce(b.city, ''), v_product.product_id, v_product.product_name, v_product.product_image, v_product.unit_price_usd, '', 0)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where id = p_order;
  if not found or not has_agency_permission(o.agency_id, 'orders', 'delete') then
    raise exception 'Commande introuvable ou action non autorisée';
  end if;
  delete from orders where id = p_order;
  perform notify_user(o.buyer_id, 'order', 'Commande ' || o.order_number || ' supprimée',
    o.agency_name || ' a supprimé la commande « ' || o.product_name || ' ». Écrivez-lui pour plus d''informations.', '/messages');
end;
$$;

revoke execute on function public.agency_open_conversation(uuid, uuid) from public, anon;
revoke execute on function public.delete_order(uuid) from public, anon;
grant execute on function public.agency_open_conversation(uuid, uuid) to authenticated;
grant execute on function public.delete_order(uuid) to authenticated;
