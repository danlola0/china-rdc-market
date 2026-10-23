import { fromRow, supabase } from '../../lib/supabase';
import { AgencyActivity, AgencyBranch, AgencyMember, AgencySettings, SubscriptionPlan, SubscriptionStatus } from '../../agency/types';

/** Accès réservés à l'administrateur de la plateforme (contrôlés par la base : is_platform_admin) */

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  accountType: 'buyer' | 'agency';
  isAdmin: boolean;
  createdAt: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  agencies: string;
}

const check = <T,>(res: { data: T; error: any }): T => {
  if (res.error) throw res.error;
  return res.data;
};

export const listUsers = async (): Promise<PlatformUser[]> =>
  (check(await supabase.rpc('admin_list_users')) || []).map((r: any) => fromRow<PlatformUser>(r));

export const setPlatformAdmin = async (userId: string, value: boolean) => {
  check(await supabase.rpc('admin_set_platform_admin', { p_user: userId, p_value: value }));
};

export const listAllSettings = async (): Promise<AgencySettings[]> =>
  (check(await supabase.from('agency_settings').select('*')) || []).map((r: any) => ({ ...fromRow<AgencySettings>(r), id: r.agency_id }));

export const listAllMembers = async (): Promise<AgencyMember[]> =>
  (check(await supabase.from('agency_members').select('*')) || []).map((r: any) => fromRow<AgencyMember>(r));

export const listActivity = async (limit = 200): Promise<AgencyActivity[]> =>
  (check(await supabase.from('agency_activity').select('*').order('created_at', { ascending: false }).limit(limit)) || []).map((r: any) =>
    fromRow<AgencyActivity>(r)
  );

export const setSubscription = async (
  agencyId: string,
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  expiresAt: string | null,
  note: string
) => {
  check(
    await supabase.rpc('admin_set_subscription', {
      p_agency: agencyId,
      p_plan: plan,
      p_status: status,
      p_expires_at: expiresAt || null,
      p_note: note,
    })
  );
};

/** Envoie à l'utilisateur un email pour choisir un nouveau mot de passe (les mots de passe ne sont jamais lisibles) */
export const sendPasswordReset = async (email: string) => {
  check(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` }));
};

/** Ouvre l'espace d'une agence en tant qu'administrateur */
export const openAgencyWorkspace = (profileId: string, agencyId: string) => {
  try {
    localStorage.setItem(`asep_ws_active_agency_${profileId}`, agencyId);
  } catch {
    // stockage indisponible : l'agence pourra être choisie dans le sélecteur
  }
};

/**
 * Supprime définitivement une agence et tout ce qui lui appartient.
 * Les fichiers (photos d'articles et documents du dossier) sont retirés du stockage d'abord.
 */
export const deleteAgency = async (agencyId: string, productImages: string[]) => {
  // Photos d'articles stockées dans « product-images »
  const marker = '/storage/v1/object/public/product-images/';
  const imagePaths = productImages.filter((u) => u.includes(marker)).map((u) => decodeURIComponent(u.split(marker)[1]));
  if (imagePaths.length) await supabase.storage.from('product-images').remove(imagePaths);

  // Documents du dossier d'identification
  const docs = check(await supabase.from('agency_documents').select('file_path').eq('agency_id', agencyId)) || [];
  const docPaths = (docs as any[]).map((d) => d.file_path);
  if (docPaths.length) await supabase.storage.from('agency-documents').remove(docPaths);

  return check(await supabase.rpc('admin_delete_agency', { p_agency: agencyId })) as string;
};

/**
 * Invite une personne comme administrateur (fonction serveur « invite-admin »).
 * Compte existant : il est nommé administrateur. Sinon : email d'invitation pour choisir le mot de passe.
 */
export const inviteAdmin = async (email: string, fullName: string) => {
  const { data, error } = await supabase.functions.invoke('invite-admin', {
    body: { email, fullName, redirectTo: `${window.location.origin}/auth/reset-password` },
  });
  if (error) {
    // Message renvoyé par la fonction, s'il existe
    const detail = await (error as any).context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  return (data as { status: 'invited' | 'promoted' | 'already_admin' }).status;
};

/** Succursales de toutes les agences (l'administrateur voit tout) */
export const listAllBranches = async () =>
  (check(await supabase.from('agency_branches').select('*').order('created_at')) || []).map((r: any) => fromRow<AgencyBranch>(r));

/** Nombre de succursales autorisées en plus du siège (fixé par l'administrateur) */
export const setBranchQuota = async (agencyId: string, max: number) => {
  check(await supabase.rpc('admin_set_branch_quota', { p_agency: agencyId, p_max: max }));
};
