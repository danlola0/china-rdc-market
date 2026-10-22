import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage } from '../../lib/supabase';
import { Agency } from '../../types';
import {
  AgencyDocument,
  AgencyVerification,
  DOCUMENT_LABELS,
  documentUrl,
  getVerification,
  listDocuments,
  REQUIRED_DOCUMENTS,
} from '../../agency/services/verificationService';

/** Fiche de vérification d'une agence pour l'administrateur */
export const AgencyReview: React.FC<{ agency: Agency }> = ({ agency }) => {
  const { approveAgency, rejectAgency, addToast } = useApp();
  const [verification, setVerification] = useState<AgencyVerification | null>(null);
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    Promise.all([getVerification(agency.id), listDocuments(agency.id)])
      .then(([v, d]) => {
        setVerification(v);
        setDocuments(d);
      })
      .catch((e) => console.error(e));
  }, [agency.id]);

  const missing = REQUIRED_DOCUMENTS.filter((t) => !documents.some((d) => d.docType === t));

  const open = async (doc: AgencyDocument) => {
    try {
      window.open(await documentUrl(doc), '_blank', 'noopener');
    } catch (e) {
      addToast(errorMessage(e), 'error');
    }
  };

  const row = (label: string, value?: string) => (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900 break-words">{value || '—'}</dd>
    </div>
  );

  return (
    <div className="py-5 space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <div className="font-bold text-sm text-slate-900">{agency.name}</div>
          <div className="text-slate-500">
            {agency.city}
            {(agency as any).country ? `, ${(agency as any).country}` : ''} · {agency.email} · {agency.phoneWeChat}
          </div>
        </div>
        {verification?.submittedAt && (
          <span className="text-amber-800 bg-amber-100 font-semibold px-2 py-0.5 rounded text-[10px] self-start">
            Dossier reçu le {new Date(verification.submittedAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {verification ? (
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
          {row('Raison sociale', verification.legalName)}
          {row('RCCM / licence', verification.registrationNumber)}
          {row('Id. Nat.', verification.nationalId)}
          {row('NIF', verification.taxNumber)}
          {row('Responsable', verification.managerName)}
          {row('Pièce d’identité', [verification.managerIdType, verification.managerIdNumber].filter(Boolean).join(' n° '))}
          {row('Adresse', agency.address)}
        </dl>
      ) : (
        <p className="p-3 bg-rose-50 text-rose-700 rounded-lg">Aucune information légale fournie.</p>
      )}

      <div>
        <div className="font-semibold text-slate-700 mb-1">Pièces justificatives</div>
        {documents.length === 0 ? (
          <p className="text-slate-400">Aucun document.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {documents.map((d) => (
              <li key={d.id}>
                <button onClick={() => open(d)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[#123B70]">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {DOCUMENT_LABELS[d.docType]}
                </button>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && <p className="mt-1 text-rose-600">Manquant : {missing.map((t) => DOCUMENT_LABELS[t]).join(', ')}.</p>}
      </div>

      {agency.description && <p className="text-slate-500 leading-relaxed">{agency.description}</p>}

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Motif du refus, visible par l’agence (ex. : copie du RCCM illisible)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => rejectAgency(agency.id, note.trim())}
              disabled={!note.trim()}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-lg"
            >
              Confirmer le refus
            </button>
            <button onClick={() => setRejecting(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => approveAgency(agency.id)} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Valider l’agence
          </button>
          <button onClick={() => setRejecting(true)} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center gap-1.5">
            <X className="w-4 h-4" /> Refuser
          </button>
        </div>
      )}
    </div>
  );
};
