import React, { useEffect, useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Agency } from '../../types';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencySettings, Currency } from '../types';
import { btn, Card, Field, inputClass, PageHeader } from '../ui';
import { CHINA_DEPARTURE_CITIES, compressImage } from '../utils';
import { VerificationPanel } from './VerificationPanel';
import { isInlineImage, uploadProductImage } from '../../lib/productImages';
import { AgencyLogo } from '../../components/common/AgencyImages';

const Toggle: React.FC<{ label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({ label, checked, disabled, onChange }) => (
  <label className="flex items-center justify-between gap-4 py-2 text-xs text-slate-700">
    {label}
    <input type="checkbox" className="w-4 h-4 accent-[#123B70]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

export const SettingsPage: React.FC = () => {
  const { addToast } = useApp();
  const { activeAgency, settings, saveSettings, updateAgencyProfile, can, logActivity } = useWorkspace();
  const readOnly = !can('settings', 'edit');

  const [profile, setProfile] = useState<Partial<Agency>>({});
  const [prefs, setPrefs] = useState<AgencySettings>(settings);

  // Recharge le formulaire à chaque changement d'agence : aucun réglage n'est partagé entre agences
  useEffect(() => {
    if (!activeAgency) return;
    setProfile({
      name: activeAgency.name,
      logo: activeAgency.logo,
      banner: activeAgency.banner,
      address: activeAgency.address,
      city: activeAgency.city,
      phoneWeChat: activeAgency.phoneWeChat,
      email: activeAgency.email,
      description: activeAgency.description,
    });
  }, [activeAgency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPrefs(settings), [settings]);

  const upload = (key: 'logo' | 'banner') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await compressImage(file, key === 'logo' ? 256 : 1200, 0.75);
      setProfile((p) => ({ ...p, [key]: url }));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    // Logo et couverture : envoyés comme images (adresse courte) plutôt qu'en texte dans la fiche
    const branding: Partial<Agency> = {};
    for (const key of ['logo', 'banner'] as const) {
      const value = profile[key];
      if (value && isInlineImage(value) && activeAgency) {
        try {
          branding[key] = await uploadProductImage(activeAgency.id, value);
        } catch {
          // Envoi impossible : l'image reste enregistrée telle quelle
        }
      }
    }
    await updateAgencyProfile({ ...profile, ...branding, whatsapp: profile.phoneWeChat });
    setProfile((cur) => ({ ...cur, ...branding }));
    await saveSettings(prefs);
    await logActivity('settings', 'a mis à jour les paramètres de l’agence');
    addToast('Paramètres enregistrés pour cette agence.', 'success');
  };

  if (!activeAgency) return null;

  return (
    <>
    <form onSubmit={save} className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle={`Réglages propres à ${activeAgency.name} — ils n’affectent aucune autre agence.`}
        actions={!readOnly && <button className={btn.primary}>Enregistrer</button>}
      />
      {readOnly && <p className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600">Consultation seule : votre rôle ne permet pas de modifier les paramètres.</p>}

      <fieldset disabled={readOnly} className="space-y-6">
        <Card title="Identité">
          <div className="space-y-4">
            <div
              className="h-28 rounded-xl bg-slate-100 bg-cover bg-center border border-slate-200 relative"
              style={profile.banner ? { backgroundImage: `url("${profile.banner}")` } : { background: prefs.primaryColor }}
            >
              <AgencyLogo src={profile.logo} name={profile.name || activeAgency.name} className="absolute -bottom-6 left-4 w-16 h-16 rounded-xl object-cover bg-white border-4 border-white shadow" />
            </div>
            {(!profile.logo || !profile.banner) && (
              <p className="pt-6 text-[11px] text-amber-700">
                Ajoutez {!profile.logo && !profile.banner ? 'votre logo et une photo de couverture' : !profile.logo ? 'votre logo' : 'une photo de couverture'} : ils s’affichent sur la
                fiche de votre agence, vos articles et vos factures.
              </p>
            )}
            <div className={`flex flex-wrap gap-2 ${!profile.logo || !profile.banner ? '' : 'pt-6'}`}>
              <label className={`${btn.secondary} cursor-pointer`}>
                <Upload className="w-4 h-4" /> Logo
                <input type="file" accept="image/*" className="hidden" onChange={upload('logo')} />
              </label>
              <label className={`${btn.secondary} cursor-pointer`}>
                <Upload className="w-4 h-4" /> Bannière
                <input type="file" accept="image/*" className="hidden" onChange={upload('banner')} />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom commercial" required>
                <input className={inputClass} value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea rows={3} className={inputClass} value={profile.description || ''} onChange={(e) => setProfile({ ...profile, description: e.target.value })} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Coordonnées">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Adresse professionnelle" className="sm:col-span-2">
                <input className={inputClass} value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
              </Field>
              <Field label="Ville">
                <select className={inputClass} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value as Agency['city'] })}>
                  {CHINA_DEPARTURE_CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pays">
                <input className={inputClass} value={prefs.country} onChange={(e) => setPrefs({ ...prefs, country: e.target.value })} />
              </Field>
              <Field label="Téléphone / WeChat" className="sm:col-span-2">
                <input className={inputClass} value={profile.phoneWeChat || ''} onChange={(e) => setProfile({ ...profile, phoneWeChat: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Apparence">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Couleur principale">
                <input type="color" className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer" value={prefs.primaryColor} onChange={(e) => setPrefs({ ...prefs, primaryColor: e.target.value })} />
              </Field>
              <Field label="Couleur d’accent">
                <input type="color" className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer" value={prefs.accentColor} onChange={(e) => setPrefs({ ...prefs, accentColor: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: prefs.primaryColor }}>
                Aperçu principal
              </span>
              <span className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: prefs.accentColor }}>
                Aperçu accent
              </span>
            </div>
          </Card>

          <Card title="Devise et tarifs de fret">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Devise par défaut">
                <select className={inputClass} value={prefs.defaultCurrency} onChange={(e) => setPrefs({ ...prefs, defaultCurrency: e.target.value as Currency })}>
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                  <option value="CNY">CNY</option>
                </select>
              </Field>
              <Field label="Aérien (USD / kg)">
                <NumberInput
                  className={inputClass}
                  value={prefs.freightRates.airPerKg}
                  onChange={(v) => setPrefs({ ...prefs, freightRates: { ...prefs.freightRates, airPerKg: parseFloat(v) || 0 } })}
                />
              </Field>
              <Field label="Maritime (USD / CBM)">
                <NumberInput
                  className={inputClass}
                  value={prefs.freightRates.seaPerCbm}
                  onChange={(v) => setPrefs({ ...prefs, freightRates: { ...prefs.freightRates, seaPerCbm: parseFloat(v) || 0 } })}
                />
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Les tarifs pré-remplissent les nouveaux colis et restent modifiables colis par colis.</p>
          </Card>

          <Card title="Notifications et affichage">
            <div className="divide-y divide-slate-100">
              <Toggle label="Nouvelle commande" checked={prefs.notifications.newOrder} onChange={(v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, newOrder: v } })} />
              <Toggle label="Nouveau message" checked={prefs.notifications.newMessage} onChange={(v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, newMessage: v } })} />
              <Toggle label="Changement de statut d’un colis" checked={prefs.notifications.shipmentUpdate} onChange={(v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, shipmentUpdate: v } })} />
              <Toggle label="Rapport hebdomadaire par email" checked={prefs.notifications.weeklyReport} onChange={(v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, weeklyReport: v } })} />
              <Toggle label="Tableaux compacts" checked={prefs.display.compactTables} onChange={(v) => setPrefs({ ...prefs, display: { ...prefs.display, compactTables: v } })} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Les notifications seront envoyées une fois le backend connecté.</p>
          </Card>
        </div>
      </fieldset>
    </form>
    <VerificationPanel />
    </>
  );
};
