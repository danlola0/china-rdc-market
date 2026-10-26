-- Commande directe : prix unitaire selon les paliers de quantité affichés sur la fiche article
create or replace function public.place_order(
  p_product uuid,
  p_quantity integer,
  p_city text,
  p_address text default '',
  p_phone text default '',
  p_shipping_mode text default 'Fret Maritime (Conteneur)',
  p_note text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p products%rowtype;
  a agencies%rowtype;
  v_buyer profiles%rowtype;
  v_unit numeric;
  v_order uuid;
  v_number text;
  v_address text;
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous pour passer une commande';
  end if;
  select * into p from products where id = p_product;
  if not found or p.status <> 'active' then
    raise exception 'Article introuvable ou retiré du catalogue';
  end if;
  select * into a from agencies where id = p.agency_id;
  if a.verified_status not in ('verified', 'gold') then
    raise exception 'Cette agence n''est pas encore validée : utilisez la demande de devis';
  end if;
  if exists (select 1 from agency_members m where m.agency_id = p.agency_id and m.profile_id = auth.uid() and m.status = 'active') then
    raise exception 'Vous ne pouvez pas commander un article de votre propre agence';
  end if;
  if not p.in_stock then
    raise exception 'Cet article est en rupture de stock';
  end if;
  if p_quantity is null or p_quantity < greatest(p.moq, 1) then
    raise exception 'La quantité minimale de commande est de % %', greatest(p.moq, 1), p.unit;
  end if;
  if coalesce(trim(p_city), '') = '' then
    raise exception 'Indiquez la ville de livraison';
  end if;

  select * into v_buyer from profiles where id = auth.uid();
  -- Prix par palier, comme affiché sur la fiche : jusqu'à 5 × MOQ, jusqu'à 20 × MOQ, au-delà
  v_unit := case
    when p_quantity <= greatest(p.moq, 1) * 5 then coalesce(nullif(p.price_max, 0), p.price_min)
    when p_quantity <= greatest(p.moq, 1) * 20 then round((p.price_min + coalesce(nullif(p.price_max, 0), p.price_min)) / 2, 1)
    else p.price_min
  end;
  v_number := 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0');
  v_address := trim(both ' ·' from concat_ws(' · ',
    nullif(trim(p_address), ''),
    case when coalesce(trim(p_phone), '') <> '' then 'Tél. ' || trim(p_phone) end,
    case when coalesce(trim(p_note), '') <> '' then 'Note : ' || left(trim(p_note), 500) end));

  insert into orders (
    order_number, product_id, product_name, product_image, agency_id, agency_name,
    buyer_id, buyer_name, quantity, unit_price_usd, shipping_usd, total_usd,
    destination_city, delivery_address, tracking_number, shipping_mode, estimated_delivery_date, timeline
  ) values (
    v_number, p.id, p.name, coalesce(p.images[1], ''), p.agency_id, a.name,
    auth.uid(), coalesce(nullif(v_buyer.full_name, ''), v_buyer.email, 'Acheteur'),
    p_quantity, v_unit, 0, round(p_quantity * v_unit, 2),
    trim(p_city), v_address, '',
    case when p_shipping_mode ilike '%aérien%' then 'Fret Aérien Express' else 'Fret Maritime (Conteneur)' end,
    current_date + greatest(p.lead_time_days, 0) + case when p_shipping_mode ilike '%aérien%' then 10 else 45 end,
    jsonb_build_array(
      jsonb_build_object('status', 'en_attente', 'title', 'Commande passée', 'date', to_char(current_date, 'YYYY-MM-DD'), 'completed', true),
      jsonb_build_object('status', 'en_production', 'title', 'En production', 'date', '', 'completed', false),
      jsonb_build_object('status', 'expedie_chine', 'title', 'Expédiée depuis la Chine', 'date', '', 'completed', false),
      jsonb_build_object('status', 'transit_maritime', 'title', 'Transit', 'date', '', 'completed', false),
      jsonb_build_object('status', 'douane_matadi', 'title', 'Dédouanement', 'date', '', 'completed', false),
      jsonb_build_object('status', 'arrive_kinshasa', 'title', 'Arrivée en RDC', 'date', '', 'completed', false),
      jsonb_build_object('status', 'livre', 'title', 'Livrée', 'date', '', 'completed', false)
    )
  ) returning id into v_order;

  return jsonb_build_object('id', v_order, 'orderNumber', v_number, 'totalUSD', round(p_quantity * v_unit, 2));
end;
$$;

