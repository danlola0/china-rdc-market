import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DRC_CITIES } from '../../data/referenceData';
import { AuthCard, AuthField, authInput, CheckEmail, SubmitButton } from './AuthCard';

export const RegisterBuyerPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useApp();
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', phone: '', city: DRC_CITIES[0], password: '' });
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signUp({ ...form, email: form.email.trim(), country: 'RD Congo', accountType: 'buyer' });
    setLoading(false);
    if (!res.ok) return;
    if (res.needsConfirmation) setSentTo(form.email.trim());
    else navigate('/buyer');
  };

  return (
    <AuthCard title="Créer un compte acheteur" subtitle="Compte réservé aux acheteurs : commerçants, importateurs et entreprises qui achètent. Inscription gratuite." wide>
      <p className="-mt-2 text-center text-[11px] text-slate-500">
        Vous êtes une agence ou un fournisseur ?{' '}
        <Link to="/auth/register-agency" className="font-semibold text-amber-800 hover:underline">
          Créez plutôt un compte agence
        </Link>
      </p>
      {sentTo ? (
        <CheckEmail email={sentTo} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <AuthField label="Nom complet *">
              <input className={authInput} autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
            </AuthField>
            <AuthField label="Entreprise">
              <input className={authInput} autoComplete="organization" value={form.companyName} onChange={set('companyName')} />
            </AuthField>
            <AuthField label="Téléphone">
              <input className={authInput} autoComplete="tel" placeholder="+243 …" value={form.phone} onChange={set('phone')} />
            </AuthField>
            <AuthField label="Ville *">
              <select className={authInput} value={form.city} onChange={set('city')}>
                {DRC_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </AuthField>
          </div>
          <AuthField label="Email *">
            <input type="email" autoComplete="email" className={authInput} value={form.email} onChange={set('email')} required />
          </AuthField>
          <AuthField label="Mot de passe *" hint="8 caractères minimum.">
            <input type="password" autoComplete="new-password" minLength={8} className={authInput} value={form.password} onChange={set('password')} required />
          </AuthField>
          <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
        </form>
      )}
      <p className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Déjà inscrit ?{' '}
        <Link to="/auth/login" className="font-semibold text-[#123B70] hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
};
