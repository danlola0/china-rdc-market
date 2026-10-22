import { fromRow, supabase, toRow } from '../../lib/supabase';

/** Informations légales d'une agence (table agency_verifications, jamais publique) */
export interface AgencyVerification {
  agencyId: string;
  legalName: string;
  registrationNumber: string;
  nationalId: string;
  taxNumber: string;
  managerName: string;
  managerIdType: string;
  managerIdNumber: string;
  submittedAt: string | null;
  reviewNote: string;
  reviewedAt: string | null;
}

export type DocumentType = 'registration' | 'manager_id' | 'tax' | 'other';

export interface AgencyDocument {
  id: string;
  agencyId: string;
  docType: DocumentType;
  filePath: string;
  fileName: string;
  uploadedAt: string;
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  registration: 'RCCM ou licence commerciale',
  manager_id: 'Pièce d’identité du responsable',
  tax: 'Attestation fiscale (NIF)',
  other: 'Autre document',
};

/** Aucun document n'est obligatoire : le dossier d'identification est facultatif */
export const REQUIRED_DOCUMENTS: DocumentType[] = [];

export const ID_TYPES = ['Passeport', 'Carte d’électeur', 'Carte d’identité', 'Permis de conduire'];

const BUCKET = 'agency-documents';
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const check = <T,>(res: { data: T; error: any }): T => {
  if (res.error) throw res.error;
  return res.data;
};

export const getVerification = async (agencyId: string): Promise<AgencyVerification | null> => {
  const row = check(await supabase.from('agency_verifications').select('*').eq('agency_id', agencyId).maybeSingle());
  return row ? fromRow<AgencyVerification>(row) : null;
};

export const saveVerification = async (agencyId: string, data: Partial<AgencyVerification>, submit = false) => {
  const payload = toRow(
    { ...data, ...(submit ? { submittedAt: new Date().toISOString() } : {}), updatedAt: new Date().toISOString() },
    ['agencyId', 'reviewNote', 'reviewedAt']
  );
  const existing = await getVerification(agencyId);
  if (existing) check(await supabase.from('agency_verifications').update(payload).eq('agency_id', agencyId));
  else check(await supabase.from('agency_verifications').insert({ ...payload, agency_id: agencyId }));
};

export const listDocuments = async (agencyId: string): Promise<AgencyDocument[]> => {
  const rows = check(await supabase.from('agency_documents').select('*').eq('agency_id', agencyId).order('uploaded_at'));
  return (rows || []).map((r: any) => fromRow<AgencyDocument>(r));
};

export const validateFile = (file: File) => {
  if (!ALLOWED.includes(file.type)) return 'Format accepté : PDF, JPG, PNG ou WEBP.';
  if (file.size > MAX_SIZE) return 'Fichier trop lourd (5 Mo maximum).';
  return null;
};

export const uploadDocument = async (agencyId: string, docType: DocumentType, file: File) => {
  const problem = validateFile(file);
  if (problem) throw new Error(problem);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${agencyId}/${docType}-${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }));
  const row = check(
    await supabase
      .from('agency_documents')
      .insert({ agency_id: agencyId, doc_type: docType, file_path: path, file_name: file.name })
      .select()
      .single()
  );
  return fromRow<AgencyDocument>(row);
};

export const removeDocument = async (doc: AgencyDocument) => {
  check(await supabase.from('agency_documents').delete().eq('id', doc.id));
  await supabase.storage.from(BUCKET).remove([doc.filePath]);
};

/** Lien temporaire (10 minutes) pour ouvrir un document privé */
export const documentUrl = async (doc: AgencyDocument) => {
  const data = check(await supabase.storage.from(BUCKET).createSignedUrl(doc.filePath, 600));
  return data!.signedUrl;
};

export const resubmitApplication = async (agencyId: string) => {
  check(await supabase.rpc('resubmit_agency_application', { p_agency: agencyId }));
};
