-- =====================================================================
-- Suivi de colis pour les clients (sans compte)
-- Chaque colis reçoit un jeton secret : le lien /suivi/<jeton> permet au client
-- de voir l'avancement de SON colis, et rien d'autre (ni prix, ni autres clients).
-- =====================================================================

alter table public.agency_shipments
  add column if not exists tracking_token uuid not null default gen_random_uuid();

create unique index if not exists agency_shipments_tracking_token_key on public.agency_shipments (tracking_token);

-- Le jeton n'est jamais modifiable depuis l'application
revoke update (tracking_token) on public.agency_shipments from anon, authenticated;

create or replace function public.public_track_shipment(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'trackingRef', s.tracking_ref,
    'description', s.description,
    'mode', s.mode,
    'originCity', s.origin_city,
    'destinationCity', s.destination_city,
    'status', s.status,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at,
    'customerFirstName', split_part(coalesce(s.customer_name, ''), ' ', 1),
    'agencyName', a.name,
    'agencyPhone', a.phone_we_chat,
    'agencyLogo', a.logo,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'createdAt', e.created_at) order by e.created_at)
        from agency_shipment_events e
       where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from agency_shipments s
  join agencies a on a.id = s.agency_id
  where s.tracking_token = p_token;
$$;

revoke execute on function public.public_track_shipment(uuid) from public;
grant execute on function public.public_track_shipment(uuid) to anon, authenticated;
