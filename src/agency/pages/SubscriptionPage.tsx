import React from 'react';
import { Check, Clock } from 'lucide-react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { SubscriptionPlan, SubscriptionStatus } from '../types';
import { Badge, btn, PageHeader } from '../ui';
import { formatDate } from '../utils';

export const PLANS: { key: SubscriptionPlan; name: string; price: string; features: string[] }[] = [
  {
    key: 'standard',
    name: 'Standard',
    price: '0 $',
    features: ['10 articles publiés', '3 employés', 'Messagerie avec les acheteurs', 'Suivi des expéditions'],
  },
  {
    key: 'gold',
    name: 'Gold Supplier',
    price: '1 200 $ / an',
    features: ['Articles illimités', '15 employés', 'Badge fournisseur vérifié', 'Rapports et exports', 'Mise en avant sur le catalogue'],
  },
  {
    key: 'enterprise',
    name: 'Entreprise',
    price: '2 800 $ / an',
    features: ['Tout le pack Gold', 'Employés illimités', 'Plusieurs agences', 'Accompagnement dédié', 'Présence aux foires de Kinshasa'],
  },
];

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; cls: string }> = {
  trial: { label: 'Période d’essai', cls: 'bg-blue-100 text-blue-800' },
  active: { label: 'Actif', cls: 'bg-emerald-100 text-emerald-800' },
  expired: { label: 'Expiré', cls: 'bg-rose-100 text-rose-700' },
  suspended: { label: 'Suspendu', cls: 'bg-slate-200 text-slate-700' },
};

export const SubscriptionPage: React.FC = () => {
  const { settings, saveSettings, can, logActivity } = useWorkspace();
  const status = SUBSCRIPTION_STATUS[settings.subscriptionStatus] || SUBSCRIPTION_STATUS.trial;
  const current = PLANS.find((p) => p.key === settings.plan);

  const request = async (plan: SubscriptionPlan) => {
    await saveSettings({ requestedPlan: plan, requestedAt: new Date().toISOString() });
    await logActivity('subscription', `a demandé la formule « ${PLANS.find((p) => p.key === plan)?.name} »`);
  };

  return (
    <>
      <PageHeader title="Abonnement" subtitle="Votre formule est activée par ASEP après réception du paiement." />

      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-xs text-slate-500">Formule actuelle</div>
          <div className="text-lg font-extrabold text-slate-900">{current?.name}</div>
        </div>
        <div className="text-xs">
          <div className="text-slate-500">État</div>
          <Badge className={status.cls}>{status.label}</Badge>
        </div>
        <div className="text-xs">
          <div className="text-slate-500">Valable jusqu’au</div>
          <div className="font-semibold text-slate-900">{settings.subscriptionExpiresAt ? formatDate(settings.subscriptionExpiresAt) : '—'}</div>
        </div>
      </div>

      {settings.requestedPlan && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          Demande de passage à la formule « {PLANS.find((p) => p.key === settings.requestedPlan)?.name} » envoyée
          {settings.requestedAt ? ` le ${formatDate(settings.requestedAt)}` : ''}. ASEP vous contactera pour le paiement.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = settings.plan === p.key;
          const isRequested = settings.requestedPlan === p.key;
          return (
            <div key={p.key} className={`bg-white rounded-2xl p-6 border ${isCurrent ? 'border-[#123B70] ring-2 ring-[#123B70]/15' : 'border-slate-200'} flex flex-col`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">{p.name}</h2>
                {isCurrent && <span className="text-[10px] font-semibold text-white bg-[#123B70] px-2 py-0.5 rounded-full">Formule actuelle</span>}
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">{p.price}</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {can('subscription', 'edit') && !isCurrent && (
                <button className={`${btn.primary} mt-6`} onClick={() => request(p.key)} disabled={isRequested}>
                  {isRequested ? 'Demande envoyée' : 'Demander cette formule'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
