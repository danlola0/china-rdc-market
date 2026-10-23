-- Dimensions des colis (en centimètres) et nombre de cartons.
-- Le volume (volume_cbm) reste la valeur de référence pour le calcul du fret.
alter table public.agency_shipments
  add column if not exists length_cm numeric(10, 2),
  add column if not exists width_cm numeric(10, 2),
  add column if not exists height_cm numeric(10, 2),
  add column if not exists packages integer not null default 1 check (packages > 0);

grant update (length_cm, width_cm, height_cm, packages) on public.agency_shipments to authenticated;
