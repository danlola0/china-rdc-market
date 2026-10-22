import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CHINESE_CITIES } from '../../data/referenceData';
import { AuthCard, AuthField, authInput, CheckEmail, SubmitButton } from './AuthCard';

const STEPS = [
  'Créez votre compte agence (ci-dessous) et confirmez votre email.',
  'Connectez-vous et présentez votre agence (RCCM et documents facultatifs).',
  'ASEP vérifie votre dossier (en général sous 48 h ouvrées).',
  'Une fois validée, votre agence et vos articles sont visibles par les acheteurs.',
];

const DOCUMENTS = [
  'Numéro RCCM (RDC) ou licence commerciale (Chine), avec sa copie',
  'Pièce d’identité du responsable (passeport, carte d’électeur…)',
  'Id. Nat. et NIF si l’agence est enregistrée en RDC',
  'Adresse professionnelle et numéro WhatsApp',
];

export const RegisterAgencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useApp();
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    city: CHINESE_CITIES[1],
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signUp({ ...form, email: form.email.trim(), country: 'Chine', accountType: 'agency' });
    setLoading(false);
    if (!res.ok) return;
    if (res.needsConfirmation) setSentTo(form.email.trim());
    else navigate('/agency');
  };

  return (
    <AuthCard
      title="Créer un compte agence"
      subtitle="Compte réservé aux agences, fournisseurs et transitaires qui vendent aux acheteurs de RDC. Votre agence est publiée après validation par ASEP."
      wide
    >
      <p className="-mt-2 text-center text-[11px] text-slate-500">
        Vous souhaitez seulement acheter ?{' '}
        <Link to="/auth/register-buyer" className="font-semibold text-[#123B70] hover:underline">
          Créez plutôt un compte acheteur
        </Link>
      </p>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="font-semibold text-slate-800 mb-2">Comment ça se passe</p>
          <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
            {STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="font-semibold text-amber-900 mb-2 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4" /> Documents utiles (facultatifs)
          </p>
          <ul className="space-y-1.5 text-amber-900 list-disc list-inside">
            {DOCUMENTS.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      {sentTo ? (
        <CheckEmail email={sentTo} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <AuthField label="Votre nom complet (responsable) *">
              <input className={authInput} autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
            </AuthField>
            <AuthField label="Nom de l’agence *">
              <input className={authInput} autoComplete="organization" value={form.companyName} onChange={set('companyName')} required />
            </AuthField>
            <AuthField label="Ville principale *">
              <select className={authInput} value={form.city} onChange={set('city')}>
                {CHINESE_CITIES.filter((c) => c !== 'Toutes les villes').map((c) => (
                  <option key={c}>{c}</option>
                ))}
                <option>Kinshasa</option>
                <option>Lubumbashi</option>
              </select>
            </AuthField>
            <AuthField label="Téléphone / WhatsApp *">
              <input className={authInput} autoComplete="tel" value={form.phone} onChange={set('phone')} required />
            </AuthField>
          </div>
          <AuthField label="Email professionnel *">
            <input type="email" autoComplete="email" className={authInput} value={form.email} onChange={set('email')} required />
          </AuthField>
          <AuthField label="Mot de passe *" hint="8 caractères minimum.">
            <input type="password" autoComplete="new-password" minLength={8} className={authInput} value={form.password} onChange={set('password')} required />
          </AuthField>
          <SubmitButton loading={loading}>Créer mon compte agence</SubmitButton>
        </form>
      )}

      <p className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Vous êtes employé d’une agence déjà inscrite ? Ne créez pas d’agence : demandez au responsable de vous inviter, puis créez votre
        compte avec l’email de l’invitation. Déjà inscrit ?{' '}
        <Link to="/auth/login" className="font-semibold text-[#123B70] hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
};
