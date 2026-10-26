-- Page de suivi publique : état du paiement (fret, payé, reste, modes de paiement)
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
    'agencyPhone', coalesce(nullif(db.phone, ''), a.phone_we_chat),
    'agencyLogo', a.logo,
    -- Paiement : montant du fret, déjà payé, modes utilisés
    'amountDue', s.estimated_cost,
    'amountPaid', coalesce((select sum((p ->> 'amount')::numeric) from jsonb_array_elements(s.payments) p), 0),
    'paymentMethods', coalesce((select jsonb_agg(distinct p ->> 'method') from jsonb_array_elements(s.payments) p where p ->> 'method' is not null), '[]'::jsonb),
    'deliveryBranch', case when db.is_headquarters then null else nullif(trim(db.name || ' ' || db.city), '') end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'createdAt', e.created_at) order by e.created_at)
        from agency_shipment_events e
       where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from agency_shipments s
  join agencies a on a.id = s.agency_id
  left join agency_branches db on db.id = s.destination_branch_id
  where s.tracking_token = p_token;
$$;
