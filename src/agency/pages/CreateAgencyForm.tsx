import React, { useState } from 'react';
import { CheckCircle2, FileUp, X } from 'lucide-react';
import { Agency } from '../../types';
import { useApp } from '../../context/AppContext';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { CHINA_DEPARTURE_CITIES, DRC_DESTINATIONS } from '../utils';
import { btn, Field, inputClass } from '../ui';
import { DOCUMENT_LABELS, DocumentType, ID_TYPES, REQUIRED_DOCUMENTS, validateFile } from '../services/verificationService';

const COUNTRIES = ['Chine', 'RD Congo'];

const Section: React.FC<{ number: number; title: string; text?: string; children: React.ReactNode }> = ({ number, title, text, children }) => (
  <fieldset className="border-t border-slate-100 pt-5">
    <legend className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <span className="w-6 h-6 rounded-full bg-[#123B70] text-white text-xs flex items-center justify-center">{number}</span>
      {title}
    </legend>
    {text && <p className="mt-1 text-[11px] text-slate-500">{text}</p>}
    <div className="mt-4">{children}</div>
  </fieldset>
);

/** Dossier d'inscription d'une agence : informations, identification légale, responsable, pièces justificatives */
export const CreateAgencyForm: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const { createAgency } = useWorkspace();
  const { profile, addToast } = useApp();
  const [form, setForm] = useState({
    name: profile?.accountType === 'agency' ? profile.companyName : '',
    country: 'Chine',
    city: CHINA_DEPARTURE_CITIES.includes(profile?.city || '') ? profile!.city : 'Guangzhou',
    address: '',
    ownerName: profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    description: '',
  });
  const [legal, setLegal] = useState({
    legalName: '',
    registrationNumber: '',
    nationalId: '',
    taxNumber: '',
    managerName: profile?.fullName || '',
    managerIdType: ID_TYPES[0],
    managerIdNumber: '',
  });
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [accepted, setAccepted] = useState(false);
  const [progress, setProgress] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setL = (k: keyof typeof legal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setLegal((f) => ({ ...f, [k]: e.target.value }));

  const cities = form.country === 'RD Congo' ? DRC_DESTINATIONS : CHINA_DEPARTURE_CITIES;
  const isDrc = form.country === 'RD Congo';

  const pickFile = (type: DocumentType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      addToast(problem, 'error');
      return;
    }
    setFiles((f) => ({ ...f, [type]: file }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // L'administrateur peut inscrire une agence sans joindre les pièces (à compléter ensuite)
    const missing = profile?.isAdmin ? [] : REQUIRED_DOCUMENTS.filter((d) => !files[d]);
    if (missing.length) {
      addToast(`Document manquant : ${missing.map((d) => DOCUMENT_LABELS[d]).join(', ')}.`, 'error');
      return;
    }
    const ok = await createAgency(
      {
        ...form,
        city: form.city as Agency['city'],
        verification: legal,
        documents: (Object.entries(files) as [DocumentType, File][]).map(([docType, file]) => ({ docType, file })),
      },
      setProgress
    );
    setProgress('');
    if (ok) onDone?.();
  };

  const DocInput: React.FC<{ type: DocumentType; required?: boolean }> = ({ type, required }) => {
    const file = files[type];
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800">
            {DOCUMENT_LABELS[type]}
            {required && !profile?.isAdmin ? <span className="text-rose-500"> *</span> : <span className="text-slate-400 font-normal"> (facultatif)</span>}
          </div>
          {file ? (
            <div className="text-[11px] text-emerald-700 flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {file.name}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">PDF, JPG ou PNG — 5 Mo maximum</div>
          )}
        </div>
        {file ? (
          <button type="button" className={btn.icon} onClick={() => setFiles((f) => ({ ...f, [type]: undefined }))} aria-label="Retirer le fichier">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <label className={`${btn.secondary} cursor-pointer shrink-0`}>
            <FileUp className="w-4 h-4" /> Choisir
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={pickFile(type)} />
          </label>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6 text-xs">
      <Section number={1} title="Votre agence" text="Ces informations seront visibles sur la fiche publique de l’agence.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom commercial de l’agence" required className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Pays d’enregistrement" required>
            <select
              className={inputClass}
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, city: e.target.value === 'RD Congo' ? DRC_DESTINATIONS[0] : CHINA_DEPARTURE_CITIES[0] }))}
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Ville" required>
            <select className={inputClass} value={form.city} onChange={set('city')}>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Adresse professionnelle" className="sm:col-span-2">
            <input className={inputClass} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Email professionnel" required>
            <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Téléphone / WhatsApp" required>
            <input className={inputClass} value={form.phone} onChange={set('phone')} required placeholder={isDrc ? '+243 …' : '+86 …'} />
          </Field>
          <Field label="Présentation de l’agence" className="sm:col-span-2">
            <textarea rows={3} className={inputClass} value={form.description} onChange={set('description')} placeholder="Produits, services, délais, langues parlées…" />
          </Field>
        </div>
      </Section>

      <Section number={2} title="Identification légale (facultatif)" text="Vous pouvez remplir ces informations maintenant ou plus tard dans Paramètres. Elles restent confidentielles : seuls votre agence et l’administrateur ASEP peuvent les voir.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Raison sociale (nom légal)" className="sm:col-span-2">
            <input className={inputClass} value={legal.legalName} onChange={setL('legalName')} />
          </Field>
          <Field label={isDrc ? 'Numéro RCCM' : 'Numéro RCCM ou licence commerciale'}>
            <input className={`${inputClass} font-mono`} value={legal.registrationNumber} onChange={setL('registrationNumber')} placeholder={isDrc ? 'CD/KIN/RCCM/…' : ''} />
          </Field>
          <Field label="Identification nationale (Id. Nat.)" hint={isDrc ? undefined : 'Si l’agence est enregistrée en RDC'}>
            <input className={`${inputClass} font-mono`} value={legal.nationalId} onChange={setL('nationalId')} />
          </Field>
          <Field label="Numéro d’impôt (NIF)">
            <input className={`${inputClass} font-mono`} value={legal.taxNumber} onChange={setL('taxNumber')} />
          </Field>
        </div>
      </Section>

      <Section number={3} title="Responsable de l’agence (facultatif)">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Nom complet">
            <input className={inputClass} value={legal.managerName} onChange={(e) => {
              setLegal((l) => ({ ...l, managerName: e.target.value }));
              setForm((f) => ({ ...f, ownerName: e.target.value }));
            }} />
          </Field>
          <Field label="Type de pièce d’identité">
            <select className={inputClass} value={legal.managerIdType} onChange={setL('managerIdType')}>
              {ID_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Numéro de la pièce">
            <input className={`${inputClass} font-mono`} value={legal.managerIdNumber} onChange={setL('managerIdNumber')} />
          </Field>
        </div>
      </Section>

      <Section number={4} title="Pièces justificatives (facultatif)" text="Ajoutez-les maintenant ou plus tard dans Paramètres. Elles sont stockées de façon privée et aident ASEP à vérifier votre agence plus vite.">
        <div className="space-y-2">
          <DocInput type="registration" />
          <DocInput type="manager_id" />
          <DocInput type="tax" />
          <DocInput type="other" />
        </div>
      </Section>

      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#123B70]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        J’accepte que les informations et documents fournis soient vérifiés par ASEP MARKET.
      </label>

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-900">
        {profile?.isAdmin ? (
          <>Inscription par l’administrateur : l’agence est <strong>validée immédiatement</strong> et vous en devenez propriétaire. Invitez ensuite le vrai responsable dans « Personnel & Permissions » avec le rôle Propriétaire.</>
        ) : (
          <>
            Après l’envoi, vous accédez tout de suite à votre espace agence pour préparer vos articles et votre équipe. Votre agence et vos
            articles seront visibles par les acheteurs <strong>après validation du dossier</strong> par l’administrateur.
          </>
        )}
      </div>

      <button type="submit" className={btn.primary} disabled={!!progress}>
        {progress || 'Envoyer le dossier de mon agence'}
      </button>
    </form>
  );
};
