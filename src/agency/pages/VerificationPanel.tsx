import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileUp, ShieldAlert, ShieldCheck, ShieldQuestion, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage } from '../../lib/supabase';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { btn, Card, Field, inputClass } from '../ui';
import { formatDate } from '../utils';
import {
  AgencyDocument,
  AgencyVerification,
  DOCUMENT_LABELS,
  DocumentType,
  documentUrl,
  getVerification,
  ID_TYPES,
  listDocuments,
  removeDocument,
  REQUIRED_DOCUMENTS,
  resubmitApplication,
  saveVerification,
  uploadDocument,
} from '../services/verificationService';

const STATUS = {
  pending: { icon: ShieldQuestion, cls: 'bg-amber-50 border-amber-200 text-amber-900', title: 'Dossier en cours de vérification', text: 'ASEP vérifie vos informations. Votre agence sera visible par les acheteurs après validation.' },
  verified: { icon: ShieldCheck, cls: 'bg-emerald-50 border-emerald-200 text-emerald-900', title: 'Agence vérifiée', text: 'Votre agence et vos articles sont visibles sur le site.' },
  gold: { icon: ShieldCheck, cls: 'bg-emerald-50 border-emerald-200 text-emerald-900', title: 'Agence vérifiée', text: 'Votre agence et vos articles sont visibles sur le site.' },
  rejected: { icon: ShieldAlert, cls: 'bg-rose-50 border-rose-200 text-rose-900', title: 'Dossier refusé', text: 'Corrigez les éléments demandés ci-dessous puis renvoyez votre dossier.' },
} as const;

export const VerificationPanel: React.FC = () => {
  const { addToast, refreshData } = useApp();
  const { activeAgency, can } = useWorkspace();
  const [verification, setVerification] = useState<Partial<AgencyVerification>>({});
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [busy, setBusy] = useState(false);

  const agencyId = activeAgency?.id;
  const status = activeAgency?.verifiedStatus || 'pending';
  const locked = status === 'verified' || status === 'gold';
  const editable = can('settings', 'edit') && !locked;

  const load = useCallback(async () => {
    if (!agencyId) return;
    try {
      const [v, d] = await Promise.all([getVerification(agencyId), listDocuments(agencyId)]);
      setVerification(v || { managerIdType: ID_TYPES[0] });
      setDocuments(d);
    } catch (e) {
      console.error(e);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!activeAgency || !agencyId) return null;
  const s = STATUS[status as keyof typeof STATUS] || STATUS.pending;
  const missing = REQUIRED_DOCUMENTS.filter((t) => !documents.some((d) => d.docType === t));

  const run = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) addToast(success, 'success');
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onUpload = (type: DocumentType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => {
      await uploadDocument(agencyId, type, file);
      await load();
    }, 'Document ajouté.');
  };

  const open = (doc: AgencyDocument) =>
    run(async () => {
      window.open(await documentUrl(doc), '_blank', 'noopener');
    });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await saveVerification(agencyId, verification, true);
      if (status === 'rejected') {
        await resubmitApplication(agencyId);
        await refreshData();
      }
      await load();
    }, status === 'rejected' ? 'Dossier renvoyé pour vérification.' : 'Dossier enregistré.');
  };

  const set = (k: keyof AgencyVerification) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setVerification((v) => ({ ...v, [k]: e.target.value }));

  return (
    <Card title="Dossier d’identification de l’agence (facultatif)">
      <div id="dossier" className={`p-3 rounded-lg border flex gap-3 ${s.cls}`}>
        <s.icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold">{s.title}</p>
          <p className="mt-0.5">{s.text}</p>
          {status === 'rejected' && verification.reviewNote && (
            <p className="mt-2 p-2 bg-white/70 rounded">
              <strong>Motif :</strong> {verification.reviewNote}
            </p>
          )}
          {verification.submittedAt && <p className="mt-1 opacity-80">Dossier envoyé le {formatDate(verification.submittedAt)}</p>}
        </div>
      </div>

      <form onSubmit={save} className="mt-5 space-y-4 text-xs">
        <fieldset disabled={!editable || busy} className="grid sm:grid-cols-2 gap-4">
          <Field label="Raison sociale" className="sm:col-span-2">
            <input className={inputClass} value={verification.legalName || ''} onChange={set('legalName')} />
          </Field>
          <Field label="Numéro RCCM ou licence commerciale">
            <input className={`${inputClass} font-mono`} value={verification.registrationNumber || ''} onChange={set('registrationNumber')} />
          </Field>
          <Field label="Identification nationale (Id. Nat.)">
            <input className={`${inputClass} font-mono`} value={verification.nationalId || ''} onChange={set('nationalId')} />
          </Field>
          <Field label="Numéro d’impôt (NIF)">
            <input className={`${inputClass} font-mono`} value={verification.taxNumber || ''} onChange={set('taxNumber')} />
          </Field>
          <Field label="Responsable">
            <input className={inputClass} value={verification.managerName || ''} onChange={set('managerName')} />
          </Field>
          <Field label="Type de pièce d’identité">
            <select className={inputClass} value={verification.managerIdType || ID_TYPES[0]} onChange={set('managerIdType')}>
              {ID_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Numéro de la pièce">
            <input className={`${inputClass} font-mono`} value={verification.managerIdNumber || ''} onChange={set('managerIdNumber')} />
          </Field>
        </fieldset>

        <div>
          <h3 className="text-[11px] font-semibold text-slate-700 mb-2">Pièces justificatives</h3>
          <ul className="space-y-2">
            {(Object.keys(DOCUMENT_LABELS) as DocumentType[]).map((type) => {
              const docs = documents.filter((d) => d.docType === type);
              return (
                <li key={type} className="p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">
                      {DOCUMENT_LABELS[type]}
                      {REQUIRED_DOCUMENTS.includes(type) && <span className="text-rose-500"> *</span>}
                    </span>
                    {editable && (
                      <label className={`${btn.secondary} cursor-pointer`}>
                        <FileUp className="w-4 h-4" /> Ajouter
                        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload(type)} disabled={busy} />
                      </label>
                    )}
                  </div>
                  {docs.length === 0 ? (
                    <p className="mt-1 text-[11px] text-slate-400">Aucun document</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => open(d)} className="text-[#123B70] hover:underline inline-flex items-center gap-1 truncate">
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {d.fileName}
                          </button>
                          {editable && (
                            <button
                              type="button"
                              className={btn.icon}
                              title="Supprimer"
                              onClick={() => run(async () => {
                                await removeDocument(d);
                                await load();
                              }, 'Document supprimé.')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <p className="mt-2 text-[11px] text-rose-600">Documents obligatoires manquants : {missing.map((t) => DOCUMENT_LABELS[t]).join(', ')}.</p>
          )}
        </div>

        {editable && (
          <button className={btn.primary} disabled={busy || missing.length > 0}>
            {status === 'rejected' ? 'Renvoyer mon dossier' : 'Enregistrer le dossier'}
          </button>
        )}
        {locked && <p className="text-[11px] text-slate-500">Dossier validé : pour modifier ces informations, contactez ASEP.</p>}
      </form>
    </Card>
  );
};
