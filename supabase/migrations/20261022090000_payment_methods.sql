-- Modes de paiement des dépenses : ajout de M-Pesa, Orange Money, Airtel Money, Alipay et WeChat Pay.
-- Les anciennes valeurs (mobile_money, wechat_alipay) restent acceptées pour les dépenses déjà enregistrées.
alter table public.agency_expenses drop constraint if exists agency_expenses_payment_method_check;
alter table public.agency_expenses add constraint agency_expenses_payment_method_check
  check (payment_method in (
    'cash', 'bank', 'card',
    'mpesa', 'orange_money', 'airtel_money',
    'alipay', 'wechat_pay',
    'mobile_money', 'wechat_alipay'
  ));
