-- =====================================================================
-- L'acheteur peut modifier la quantité de sa commande tant qu'elle est
-- « en attente » (avant que l'agence ne lance la production).
-- Le prix unitaire est recalculé selon les paliers de l'article.
-- =====================================================================

create or replace function public.update_order_quantity(p_order uuid, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  p products%rowtype;
  v_unit numeric;
  v_total numeric;
  v_min integer := 1;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.buyer_id is distinct from auth.uid() then
    raise exception 'Commande introuvable';
  end if;
  if o.status <> 'en_attente' then
    raise exception 'La production a commencé : contactez l''agence pour modifier la commande';
  end if;

  select * into p from products where id = o.product_id;
  if found then
    v_min := greatest(p.moq, 1);
  end if;
  if p_quantity is null or p_quantity < v_min then
    raise exception 'La quantité minimale de commande est de %', v_min;
  end if;

  if found then
    v_unit := case
      when p_quantity <= v_min * 5 then coalesce(nullif(p.price_max, 0), p.price_min)
      when p_quantity <= v_min * 20 then round((p.price_min + coalesce(nullif(p.price_max, 0), p.price_min)) / 2, 1)
      else p.price_min
    end;
  else
    v_unit := o.unit_price_usd; -- article retiré : on garde le prix convenu
  end if;
  v_total := round(p_quantity * v_unit + o.shipping_usd, 2);

  update orders set quantity = p_quantity, unit_price_usd = v_unit, total_usd = v_total where id = p_order;

  if p_quantity <> o.quantity then
    perform notify_agency(o.agency_id, 'orders', 'newOrder', 'order', 'Commande ' || o.order_number || ' modifiée',
      o.buyer_name || ' · quantité ' || o.quantity || ' → ' || p_quantity || ' · ' || o.product_name, '/agency/orders');
  end if;

  return jsonb_build_object('quantity', p_quantity, 'unitPriceUSD', v_unit, 'totalUSD', v_total);
end;
$$;

revoke execute on function public.update_order_quantity(uuid, integer) from public, anon;
grant execute on function public.update_order_quantity(uuid, integer) to authenticated;
