import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AuthCard, AuthField, authInput, SubmitButton } from './AuthCard';
import { PasswordInput } from '../../components/common/PasswordInput';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Page demandée avant la redirection vers la connexion
  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await signIn(email.trim(), password);
    setLoading(false);
    // La redirection vers le bon espace est faite par GuestOnly dès que le profil est chargé
    if (ok && from) navigate(from, { replace: true });
  };

  return (
    <AuthCard title="Connexion" subtitle="Accédez à vos devis, commandes, messages et à l’espace de votre agence.">
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="Email">
          <input type="email" autoComplete="email" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </AuthField>
        <AuthField label="Mot de passe">
          <PasswordInput autoComplete="current-password" className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </AuthField>
        <div className="text-right">
          <Link to="/auth/forgot-password" className="text-xs text-[#123B70] hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton loading={loading}>Se connecter</SubmitButton>
      </form>
      <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
        <p className="text-center">Pas encore de compte ? Choisissez votre profil :</p>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/auth/register-buyer" className="text-center px-3 py-2 rounded-lg border border-slate-200 hover:border-[#123B70] hover:bg-blue-50">
            <span className="block font-semibold text-[#123B70]">Créer un compte acheteur</span>
            <span className="block text-[10px] text-slate-500">Pour acheter</span>
          </Link>
          <Link to="/auth/register-agency" className="text-center px-3 py-2 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50">
            <span className="block font-semibold text-amber-800">Créer un compte agence</span>
            <span className="block text-[10px] text-slate-500">Pour vendre</span>
          </Link>
        </div>
      </div>
    </AuthCard>
  );
};
