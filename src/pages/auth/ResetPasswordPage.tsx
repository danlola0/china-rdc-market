import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AuthCard, AuthField, authInput, SubmitButton } from './AuthCard';

/** Page ouverte depuis le lien « mot de passe oublié » : Supabase y ouvre une session temporaire */
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, isAuthenticated, authReady, addToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      addToast('Les deux mots de passe ne correspondent pas.', 'error');
      return;
    }
    setLoading(true);
    const ok = await updatePassword(password);
    setLoading(false);
    if (ok) navigate('/');
  };

  return (
    <AuthCard title="Choisir votre mot de passe" subtitle="Après une invitation ou un mot de passe oublié, choisissez ici votre mot de passe pour accéder à ASEP MARKET.">
      {authReady && !isAuthenticated ? (
        <p className="text-sm text-slate-600 text-center">
          Ce lien a expiré ou a déjà été utilisé.{' '}
          <Link to="/auth/forgot-password" className="font-semibold text-[#123B70] hover:underline">
            Demander un nouveau lien
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthField label="Nouveau mot de passe" hint="8 caractères minimum.">
            <input type="password" autoComplete="new-password" minLength={8} className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </AuthField>
          <AuthField label="Confirmer le mot de passe">
            <input type="password" autoComplete="new-password" minLength={8} className={authInput} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </AuthField>
          <SubmitButton loading={loading}>Enregistrer</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
};
