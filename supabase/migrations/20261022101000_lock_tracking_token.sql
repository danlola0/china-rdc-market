-- Un « revoke » sur une seule colonne n'a pas d'effet quand le droit UPDATE est donné sur toute la table.
-- On retire donc UPDATE sur la table et on le redonne colonne par colonne, sauf tracking_token et agency_id.
revoke update on public.agency_shipments from anon, authenticated;
grant update (
  tracking_ref, customer_id, customer_name, description, weight_kg, volume_cbm, mode,
  origin_city, destination_city, rate_type, rate, estimated_cost, payments, photos, status, updated_at
) on public.agency_shipments to authenticated;
