import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AuthCard, AuthField, authInput, CheckEmail, SubmitButton } from './AuthCard';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await requestPasswordReset(email.trim());
    setLoading(false);
    if (ok) setSent(true);
  };

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Recevez un lien pour choisir un nouveau mot de passe.">
      {sent ? (
        <CheckEmail email={email.trim()} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthField label="Email du compte">
            <input type="email" autoComplete="email" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </AuthField>
          <SubmitButton loading={loading}>Envoyer le lien</SubmitButton>
        </form>
      )}
      <p className="pt-4 border-t border-slate-100 text-center text-xs">
        <Link to="/auth/login" className="font-semibold text-[#123B70] hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
};
