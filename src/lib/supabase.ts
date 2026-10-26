import { createClient } from '@supabase/supabase-js';

// Valeurs publiques du projet (Settings → API). La clé « anon / publishable » est conçue pour
// être exposée dans le navigateur : la sécurité repose sur les règles RLS de la base.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase n’est pas configuré : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local (voir .env.example).'
  );
}

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Convertit une clé camelCase en snake_case (targetPriceUSD → target_price_usd) */
export const toSnakeKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** Convertit une clé snake_case en camelCase (target_price_usd → targetPriceUSD) */
export const toCamelKey = (key: string) => {
  const camel = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return camel.endsWith('Usd') ? camel.slice(0, -3) + 'USD' : camel;
};

/** Ligne de la base → objet du frontend (clés de premier niveau uniquement ; le JSON imbriqué est conservé) */
export const fromRow = <T,>(row: Record<string, any>): T => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) out[toCamelKey(k)] = typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && NUMERIC_KEYS.has(k) ? Number(v) : v;
  return out as T;
};

/** Objet du frontend → ligne de la base (les valeurs undefined sont ignorées) */
export const toRow = (obj: Record<string, any>, omit: string[] = []) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || omit.includes(k)) continue;
    out[toSnakeKey(k)] = v === '' && k.endsWith('Id') ? null : v;
  }
  return out;
};

// Colonnes numeric que PostgREST peut renvoyer sous forme de texte
const NUMERIC_KEYS = new Set([
  'rating',
  'price_min',
  'price_max',
  'amount',
  'weight_kg',
  'volume_cbm',
  'rate',
  'estimated_cost',
  'target_price_usd',
  'quoted_price_usd',
  'quoted_shipping_usd',
  'unit_price_usd',
  'shipping_usd',
  'total_usd',
  'product_price',
  'length_cm',
  'width_cm',
  'height_cm',
  'discount',
  'tax_rate',
  'total',
  'amount_paid',
]);

/** Message d'erreur lisible à partir d'une erreur Supabase */
export const errorMessage = (e: any) => {
  const msg: string = e?.message || String(e);
  if (/row-level security/i.test(msg)) return 'Action refusée par les règles d’accès de la base.';
  if (/Invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(msg)) return 'Confirmez d’abord votre adresse email (lien reçu par email).';
  if (/User already registered/i.test(msg)) return 'Un compte existe déjà avec cette adresse email.';
  if (/Password should be at least/i.test(msg)) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (/rate limit/i.test(msg)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return msg;
};
