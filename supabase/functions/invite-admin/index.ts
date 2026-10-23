// Fonction serveur : invite (ou nomme) un administrateur de la plateforme ASEP MARKET.
// - Vérifie que la personne qui appelle est déjà administrateur.
// - Si l'email a déjà un compte : lui donne les droits d'administrateur.
// - Sinon : crée le compte et envoie un email d'invitation pour choisir le mot de passe.
// La clé de service n'existe que sur le serveur Supabase (variable d'environnement).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1. La personne qui appelle doit être administrateur
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminError } = await caller.rpc('is_platform_admin');
  if (adminError || isAdmin !== true) return json({ error: 'Réservé à l’administrateur de la plateforme' }, 403);

  // 2. Données envoyées
  let body: { email?: string; fullName?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Requête invalide' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const fullName = (body.fullName ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Adresse email invalide' }, 400);
  if (!fullName) return json({ error: 'Le nom est obligatoire' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 3. Compte déjà existant : on le nomme administrateur
  const { data: existing } = await admin.from('profiles').select('id, is_admin').ilike('email', email).maybeSingle();
  if (existing) {
    if (existing.is_admin) return json({ status: 'already_admin' });
    const { error } = await admin.from('profiles').update({ is_admin: true }).eq('id', existing.id);
    if (error) return json({ error: error.message }, 500);
    return json({ status: 'promoted' });
  }

  // 4. Nouveau compte : invitation par email (la personne choisit son mot de passe)
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, account_type: 'buyer' },
    redirectTo: body.redirectTo,
  });
  if (error || !data.user) return json({ error: error?.message ?? 'Invitation impossible' }, 400);

  // Le profil est créé par le déclencheur handle_new_user ; on lui donne les droits d'administrateur
  const { error: promoteError } = await admin.from('profiles').update({ is_admin: true, full_name: fullName }).eq('id', data.user.id);
  if (promoteError) return json({ error: promoteError.message }, 500);

  return json({ status: 'invited' });
});
