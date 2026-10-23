import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DRC_CITIES } from '../../data/referenceData';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]';

/** Profil de l'acheteur : modifiable et enregistré dans la base (table profiles) */
export const BuyerProfileForm: React.FC = () => {
  const { profile, updateProfile, updatePassword, addToast } = useApp();
  const [form, setForm] = useState({ fullName: '', companyName: '', city: '', country: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ password: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName,
      companyName: profile.companyName,
      city: profile.city,
      country: profile.country || 'RD Congo',
      phone: profile.phone,
    });
  }, [profile]);

  if (!profile) return null;

  const changed =
    form.fullName !== profile.fullName ||
    form.companyName !== profile.companyName ||
    form.city !== profile.city ||
    form.country !== (profile.country || 'RD Congo') ||
    form.phone !== profile.phone;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      addToast('Le nom complet est obligatoire.', 'error');
      return;
    }
    setSaving(true);
    await updateProfile({
      fullName: form.fullName.trim(),
      companyName: form.companyName.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
    });
    setSaving(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.password.length < 8) {
      addToast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
      return;
    }
    if (pwd.password !== pwd.confirm) {
      addToast('Les deux mots de passe ne correspondent pas.', 'error');
      return;
    }
    setSavingPwd(true);
    const ok = await updatePassword(pwd.password);
    setSavingPwd(false);
    if (ok) setPwd({ password: '', confirm: '' });
  };

  const cities = DRC_CITIES.includes(form.city) || !form.city ? DRC_CITIES : [form.city, ...DRC_CITIES];

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-slate-500 mb-1">Nom complet *</span>
            <input className={inputCls} autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Société / Nom commercial</span>
            <input className={inputCls} autoComplete="organization" value={form.companyName} onChange={set('companyName')} />
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Ville principale en RDC</span>
            <select className={inputCls} value={form.city} onChange={set('city')}>
              <option value="">— Choisir —</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Téléphone / WhatsApp</span>
            <input className={inputCls} autoComplete="tel" placeholder="+243 …" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Pays</span>
            <input className={inputCls} autoComplete="country-name" value={form.country} onChange={set('country')} />
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Email (identifiant de connexion)</span>
            <input className={`${inputCls} bg-slate-50 text-slate-500`} value={profile.email} readOnly />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!changed || saving}
            className="px-4 py-2 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
          {changed && !saving && (
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800 underline"
              onClick={() =>
                setForm({
                  fullName: profile.fullName,
                  companyName: profile.companyName,
                  city: profile.city,
                  country: profile.country || 'RD Congo',
                  phone: profile.phone,
                })
              }
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <form onSubmit={changePassword} className="pt-6 border-t border-slate-100 space-y-4 text-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Changer le mot de passe</h3>
          <p className="text-slate-500">8 caractères minimum.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-slate-500 mb-1">Nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" minLength={8} className={inputCls} value={pwd.password} onChange={(e) => setPwd({ ...pwd, password: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-slate-500 mb-1">Confirmer le mot de passe</span>
            <input type="password" autoComplete="new-password" minLength={8} className={inputCls} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          </label>
        </div>
        <button
          type="submit"
          disabled={!pwd.password || savingPwd}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
        >
          {savingPwd ? 'Mise à jour…' : 'Changer le mot de passe'}
        </button>
      </form>
    </div>
  );
};
