-- Correctif : le numéro, l'agence et la date de création d'une facture ne se modifient jamais
revoke update on public.agency_invoices from authenticated;
grant update (branch_id, customer_id, customer_name, customer_phone, customer_email, customer_address, shipment_id, issue_date, due_date,
              currency, items, discount, tax_rate, total, amount_paid, payment_method, status, notes, updated_at)
  on public.agency_invoices to authenticated;
