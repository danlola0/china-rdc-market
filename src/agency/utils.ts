import {
  CustomerStatus,
  Currency,
  ExpenseCategory,
  PaymentMethod,
  ShipmentMode,
  ShipmentStatus,
} from './types';

/** Taux indicatifs pour convertir les montants en une devise commune (démonstration uniquement) */
export const FX_PER_USD: Record<Currency, number> = { USD: 1, CDF: 2850, CNY: 7.1 };

export const toUSD = (amount: number, currency: Currency) => amount / FX_PER_USD[currency];
/** Montant d'un paiement en USD (les anciens paiements sans devise sont en USD) */
export const paymentUSD = (p: { amount: number; currency?: Currency }) => toUSD(p.amount, p.currency || 'USD');
export const CURRENCY_LABELS: Record<Currency, string> = { USD: 'USD — Dollar américain', CDF: 'CDF — Franc congolais', CNY: 'CNY — Yuan chinois' };
export const fromUSD = (amountUSD: number, currency: Currency) => amountUSD * FX_PER_USD[currency];

export const formatMoney = (amount: number, currency: Currency = 'USD', compact = false) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact || currency === 'CDF' ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(amount);

export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n);

export const formatDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Clé AAAA-MM d'une date */
export const monthKey = (iso: string) => iso.slice(0, 7);

/** Les `count` derniers mois (du plus ancien au plus récent) */
export const lastMonths = (count: number) => {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') });
  }
  return out;
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Transport',
  salaries: 'Salaires',
  rent: 'Loyer',
  internet: 'Internet',
  electricity: 'Électricité',
  supplies: 'Fournitures',
  customs: 'Douane',
  other: 'Autres charges',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  alipay: 'Alipay',
  wechat_pay: 'WeChat Pay',
  cash: 'Espèces',
  bank: 'Virement bancaire',
  card: 'Carte bancaire',
  mobile_money: 'Mobile Money',
  wechat_alipay: 'WeChat Pay / Alipay',
};

/** Modes de paiement proposés à la saisie (les anciennes valeurs restent seulement affichées) */
export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; group: string }[] = [
  { value: 'mpesa', group: 'Mobile Money RDC' },
  { value: 'orange_money', group: 'Mobile Money RDC' },
  { value: 'airtel_money', group: 'Mobile Money RDC' },
  { value: 'alipay', group: 'Paiement Chine' },
  { value: 'wechat_pay', group: 'Paiement Chine' },
  { value: 'cash', group: 'Autres' },
  { value: 'bank', group: 'Autres' },
  { value: 'card', group: 'Autres' },
];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  registered: 'Enregistré',
  preparing: 'En préparation',
  in_transit: 'En transit',
  arrived: 'Arrivé à destination',
  delivered: 'Livré',
};

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  'registered',
  'preparing',
  'in_transit',
  'arrived',
  'delivered',
];

export const SHIPMENT_STATUS_STYLES: Record<ShipmentStatus, string> = {
  registered: 'bg-slate-100 text-slate-700',
  preparing: 'bg-amber-100 text-amber-800',
  in_transit: 'bg-blue-100 text-blue-800',
  arrived: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

export const SHIPMENT_MODE_LABELS: Record<ShipmentMode, string> = {
  air: 'Aérien',
  sea: 'Maritime',
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  prospect: 'Prospect',
  active: 'Actif',
  vip: 'VIP',
  inactive: 'Inactif',
};

export const CUSTOMER_STATUS_STYLES: Record<CustomerStatus, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-800',
  vip: 'bg-amber-100 text-amber-800',
  inactive: 'bg-rose-100 text-rose-700',
};

export const CHINA_DEPARTURE_CITIES = [
  'Guangzhou',
  'Yiwu',
  'Shenzhen',
  'Ningbo',
  'Foshan',
  'Shanghai',
  'Dongguan',
  'Hangzhou',
];

export const DRC_DESTINATIONS = [
  'Kinshasa',
  'Lubumbashi',
  'Matadi',
  'Goma',
  'Kisangani',
  'Kolwezi',
  'Bukavu',
  'Boma',
  'Mbuji-Mayi',
];

/** Référence de suivi unique (fictive), ex. GZ-SEA-2610-4F7K */
export const generateTrackingRef = (agencyName: string, mode: ShipmentMode, existing: string[]) => {
  const prefix = (agencyName.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'AG').toUpperCase();
  const d = new Date();
  const datePart = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  let ref = '';
  do {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    ref = `${prefix}-${mode === 'air' ? 'AIR' : 'SEA'}-${datePart}-${rand}`;
  } while (existing.includes(ref));
  return ref;
};

export const computeFreightCost = (rateType: 'kg' | 'cbm', rate: number, weightKg: number, volumeCbm: number) =>
  Math.round((rateType === 'kg' ? rate * weightKg : rate * volumeCbm) * 100) / 100;

/** Réduit une image avant stockage local (le localStorage est limité à quelques Mo) */
export const compressImage = (file: File, maxSize = 640, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non pris en charge'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

/** Télécharge un tableau au format CSV (séparateur ; pour Excel en français) */
export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- Suivi client par WhatsApp ----------

/** Lien public de suivi d'un colis (aucun compte nécessaire) */
export const trackingLink = (token?: string) => (token ? `${window.location.origin}/suivi/${token}` : '');

/**
 * Numéro au format international pour WhatsApp (chiffres uniquement).
 * Un numéro local RDC (0812345678) devient 243812345678.
 */
export const whatsappNumber = (phone: string) => {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) digits = '243' + digits.slice(1);
  return digits;
};

/** Ouvre WhatsApp avec le message déjà rédigé (vers le numéro du client s'il est connu) */
export const whatsappUrl = (phone: string, message: string) => {
  const number = whatsappNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};
