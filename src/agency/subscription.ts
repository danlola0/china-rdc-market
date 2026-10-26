import { AgencySettings, SubscriptionPlan } from './types';

/**
 * Formules d'abonnement (les clés de la base sont conservées :
 * standard = Standard, gold = Premium, enterprise = Achat complet).
 */
export const PLAN_INFO: Record<SubscriptionPlan, { name: string; price: number; period: string; premium: boolean; features: string[] }> = {
  standard: {
    name: 'Standard',
    price: 50,
    period: '/ mois',
    premium: false,
    features: [
      'Tout l’espace agence : articles, commandes, clients, fret, suivi des colis, caisse, rapports',
      'Messagerie et WhatsApp avec les clients',
      'Personnel et permissions',
      'Sans les rubriques Succursales et Partenaires',
    ],
  },
  gold: {
    name: 'Premium',
    price: 100,
    period: '/ mois',
    premium: true,
    features: ['Tout le Standard', 'Succursales (Kinshasa, Angola…)', 'Agences partenaires', 'Accès complet à la plateforme'],
  },
  enterprise: {
    name: 'Achat complet',
    price: 2800,
    period: 'paiement unique',
    premium: true,
    features: ['Tout le Premium', 'Sans abonnement : payé une seule fois', 'Accès à vie'],
  },
};

/** Durée de l'essai gratuit */
export const TRIAL_HOURS = 72;

/** Rubriques réservées à Premium / Achat complet */
export const PREMIUM_PATHS = ['/agency/branches', '/agency/partners'];

export type AccessState = 'trial' | 'active' | 'expired' | 'suspended';

export interface SubscriptionAccess {
  state: AccessState;
  /** L'agence peut utiliser l'application */
  active: boolean;
  /** Succursales et partenaires ouverts */
  premium: boolean;
  /** Fin de l'essai ou de l'abonnement (null : sans fin) */
  endsAt: Date | null;
  lifetime: boolean;
}

/**
 * État d'accès calculé comme dans la base (agency_is_active / agency_is_premium).
 * Les dates sont des instants : la fin est identique partout, affichée dans le fuseau de chacun.
 */
export const subscriptionAccess = (s: AgencySettings, now = new Date()): SubscriptionAccess => {
  if (s.subscriptionStatus === 'active') {
    const endsAt = s.subscriptionEndsAt ? new Date(s.subscriptionEndsAt) : null;
    const active = !endsAt || endsAt > now;
    return { state: active ? 'active' : 'expired', active, premium: active && s.plan !== 'standard', endsAt, lifetime: !endsAt && s.plan === 'enterprise' };
  }
  if (s.subscriptionStatus === 'trial') {
    const endsAt = s.trialEndsAt ? new Date(s.trialEndsAt) : null;
    const active = !endsAt || endsAt > now;
    return { state: active ? 'trial' : 'expired', active, premium: active, endsAt, lifetime: false };
  }
  return { state: s.subscriptionStatus, active: false, premium: false, endsAt: null, lifetime: false };
};

/** « 2 j 5 h 12 min » */
export const remainingLabel = (endsAt: Date, now = new Date()) => {
  let min = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 60000));
  const d = Math.floor(min / 1440);
  min -= d * 1440;
  const h = Math.floor(min / 60);
  min -= h * 60;
  return [d ? `${d} j` : '', h ? `${h} h` : '', `${min} min`].filter(Boolean).join(' ');
};

/** Date et heure dans le fuseau de l'utilisateur, avec le nom du fuseau */
export const localDateTime = (d: Date) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} (heure de ${tz.replace(/^.*\//, '').replace(/_/g, ' ')})`;
};

/** Modes de paiement acceptés pour l'abonnement */
export const SUBSCRIPTION_METHODS: { key: string; label: string; group: string; color: string }[] = [
  { key: 'mpesa', label: 'M-Pesa', group: 'Mobile Money RDC', color: '#E60000' },
  { key: 'orange_money', label: 'Orange Money', group: 'Mobile Money RDC', color: '#FF7900' },
  { key: 'airtel_money', label: 'Airtel Money', group: 'Mobile Money RDC', color: '#E40000' },
  { key: 'illico_cash', label: 'Illico Cash', group: 'Mobile Money RDC', color: '#0B7A3E' },
  { key: 'equity_bank', label: 'Equity Bank', group: 'Banque', color: '#A32A29' },
  { key: 'alipay', label: 'Alipay', group: 'Paiement Chine', color: '#1677FF' },
  { key: 'wechat_pay', label: 'WeChat Pay', group: 'Paiement Chine', color: '#07C160' },
  { key: 'cash', label: 'Espèces', group: 'Au bureau ASEP', color: '#475569' },
];

export const subscriptionMethodLabel = (key?: string | null) => SUBSCRIPTION_METHODS.find((m) => m.key === key)?.label || key || '';

/** Coordonnées de paiement d'ASEP (platform_settings.payment_accounts) */
export interface PaymentAccounts {
  whatsapp?: string;
  accounts?: Record<string, { number: string; name: string; note: string }>;
}
