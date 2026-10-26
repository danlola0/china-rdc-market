import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, Copy, Crown, KeyRound, MessageCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage, supabase } from '../../lib/supabase';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { SubscriptionPlan, SubscriptionStatus } from '../types';
import { Badge, btn, Field, inputClass, PageHeader } from '../ui';
import { formatDate, formatMoney, fromUSD, whatsappUrl } from '../utils';
import {
  localDateTime,
  PaymentAccounts,
  PLAN_INFO,
  remainingLabel,
  SUBSCRIPTION_METHODS,
  subscriptionMethodLabel,
  TRIAL_HOURS,
} from '../subscription';

/** Formules (utilisées aussi par l'Espace Admin) */
export const PLANS: { key: SubscriptionPlan; name: string; price: string; features: string[] }[] = (Object.keys(PLAN_INFO) as SubscriptionPlan[]).map((key) => ({
  key,
  name: PLAN_INFO[key].name,
  price: `${PLAN_INFO[key].price.toLocaleString('fr-FR')} $ ${PLAN_INFO[key].period}`,
  features: PLAN_INFO[key].features,
}));

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; cls: string }> = {
  trial: { label: 'Essai gratuit', cls: 'bg-blue-100 text-blue-800' },
  active: { label: 'Actif', cls: 'bg-emerald-100 text-emerald-800' },
  expired: { label: 'Expiré', cls: 'bg-rose-100 text-rose-700' },
  suspended: { label: 'Suspendu', cls: 'bg-slate-200 text-slate-700' },
};

/** Montant équivalent (taux indicatifs) selon le mode : CDF pour le Mobile Money RDC, CNY pour Alipay / WeChat */
const localAmount = (method: string, usd: number) => {
  if (['mpesa', 'orange_money', 'airtel_money', 'illico_cash'].includes(method)) return `soit environ ${formatMoney(fromUSD(usd, 'CDF'), 'CDF')}`;
  if (['alipay', 'wechat_pay'].includes(method)) return `soit environ ${formatMoney(fromUSD(usd, 'CNY'), 'CNY')}`;
  return '';
};

/** Étapes à suivre pour chaque mode de paiement */
const STEPS: Record<string, string[]> = {
  mobile: [
    'Ouvrez votre application ou le menu {m} sur votre téléphone.',
    'Choisissez « Envoyer de l’argent » (ou « Paiement »).',
    'Saisissez le numéro ASEP ci-dessous et le montant indiqué.',
    'Validez avec votre code secret, puis gardez le SMS de confirmation (sa référence).',
  ],
  bank: [
    'Faites un virement ou un dépôt au compte ASEP ci-dessous chez Equity Bank.',
    'Indiquez le motif de paiement ci-dessous.',
    'Gardez le bordereau ou la référence du virement.',
  ],
  china: [
    'Ouvrez {m} et choisissez « Transférer » (ou scannez le QR code fourni par ASEP).',
    'Envoyez le montant au compte ASEP ci-dessous.',
    'Gardez la capture d’écran de la transaction.',
  ],
  cash: [
    'Présentez-vous au bureau ASEP (ou chez un agent agréé) avec le montant.',
    'Indiquez le nom de votre agence et la formule choisie.',
    'Vous recevez un reçu et votre code d’activation.',
  ],
};
const stepsFor = (method: string) =>
  (method === 'cash' ? STEPS.cash : method === 'equity_bank' ? STEPS.bank : ['alipay', 'wechat_pay'].includes(method) ? STEPS.china : STEPS.mobile).map((x) =>
    x.replace('{m}', subscriptionMethodLabel(method))
  );

const PaymentInstructions: React.FC<{
  method: string;
  amountUSD: number;
  planName: string;
  agencyName: string;
  account?: { number: string; name: string; note: string };
  whatsapp?: string;
  isAdmin: boolean;
  onCopy: (text: string) => void;
}> = ({ method, amountUSD, planName, agencyName, account, whatsapp, isAdmin, onCopy }) => {
  const m = SUBSCRIPTION_METHODS.find((x) => x.key === method);
  const motif = `ASEP ${planName} — ${agencyName}`.trim();
  return (
    <div className="rounded-xl border-2 border-[#123B70]/15 bg-white overflow-hidden text-xs">
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: m?.color || '#123B70' }}>
        <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-black text-[11px] shrink-0">
          {(m?.label || '')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Payer par {m?.label}</div>
          <div className="text-[11px] opacity-90">{m?.group}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black">{amountUSD.toLocaleString('fr-FR')} $</div>
          {localAmount(method, amountUSD) && <div className="text-[10px] opacity-90">{localAmount(method, amountUSD)}</div>}
        </div>
      </div>

      <div className="p-4 grid md:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-slate-800 mb-1.5">Comment payer</div>
          <ol className="space-y-1.5">
            {stepsFor(method).map((step, i) => (
              <li key={i} className="flex gap-2 text-slate-600">
                <span className="w-5 h-5 rounded-full bg-[#123B70] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <div>
            <div className="font-semibold text-slate-800 mb-1.5">{method === 'cash' ? 'Adresse du bureau ASEP' : `Compte ${m?.label} d’ASEP`}</div>
            {account?.number ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-sm">{account.number}</span>
                  <button type="button" className={btn.secondary} onClick={() => onCopy(account.number)}>
                    <Copy className="w-4 h-4" /> Copier
                  </button>
                </div>
                {account.name && <div className="text-slate-600">Au nom de : <strong>{account.name}</strong></div>}
                {account.note && <div className="text-slate-500">{account.note}</div>}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                <div>
                  {method === 'cash'
                    ? 'L’adresse du bureau ASEP n’est pas encore indiquée.'
                    : `Le numéro ${m?.label} d’ASEP n’est pas encore indiqué.`}{' '}
                  {whatsapp ? 'Demandez-le à ASEP sur WhatsApp.' : 'Contactez ASEP pour l’obtenir.'}
                </div>
                {isAdmin && (
                  <Link to="/admin" className="inline-block font-semibold underline">
                    Administrateur : renseigner les coordonnées (Espace Admin → Abonnements)
                  </Link>
                )}
                {whatsapp && (
                  <a
                    href={whatsappUrl(whatsapp, `Bonjour ASEP, je souhaite payer l’abonnement ${planName} (${amountUSD} $) par ${m?.label} pour l’agence « ${agencyName} ». Pouvez-vous m’indiquer le numéro de paiement ?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold"
                  >
                    <MessageCircle className="w-4 h-4" /> Demander sur WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-800 mb-1">Motif à indiquer</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-800">{motif}</span>
              <button type="button" className={btn.icon} title="Copier le motif" onClick={() => onCopy(motif)}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubscriptionPage: React.FC = () => {
  const { addToast, profile } = useApp();
  const isAdmin = !!profile?.isAdmin;
  const { settings, can, logActivity, access, activeAgency, activeAgencyId, requestSubscription, reloadWorkspace } = useWorkspace();
  const canEdit = can('subscription', 'edit');
  const [plan, setPlan] = useState<SubscriptionPlan>(settings.requestedPlan || (settings.plan === 'standard' && access.state !== 'trial' ? 'standard' : 'gold'));
  const [method, setMethod] = useState<string>(settings.requestedMethod || 'mpesa');
  const [reference, setReference] = useState(settings.requestedReference || '');
  const [accounts, setAccounts] = useState<PaymentAccounts>({});
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'' | 'request' | 'code'>('');

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'payment_accounts')
      .maybeSingle()
      .then(({ data }) => setAccounts(((data?.value as PaymentAccounts) || {}) as PaymentAccounts));
  }, []);

  const info = PLAN_INFO[plan];
  const account = accounts.accounts?.[method];
  const stateLabel =
    access.state === 'trial' ? 'Essai gratuit' : access.state === 'active' ? 'Actif' : access.state === 'suspended' ? 'Suspendu' : settings.subscriptionStatus === 'trial' ? 'Essai terminé' : 'Expiré';
  const stateCls = access.state === 'trial' ? SUBSCRIPTION_STATUS.trial.cls : access.active ? SUBSCRIPTION_STATUS.active.cls : SUBSCRIPTION_STATUS.expired.cls;

  const sendRequest = async () => {
    setBusy('request');
    const ok = await requestSubscription({ requestedPlan: plan, requestedMethod: method, requestedReference: reference.trim() });
    setBusy('');
    if (ok) {
      await logActivity('subscription', `a demandé la formule « ${info.name} » (${subscriptionMethodLabel(method)})`);
      addToast('Demande envoyée à ASEP. Vous recevrez votre code d’activation après vérification du paiement.', 'success');
    }
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgencyId || !code.trim()) return;
    setBusy('code');
    const { data, error } = await supabase.rpc('redeem_subscription_code', { p_agency: activeAgencyId, p_code: code.trim() });
    setBusy('');
    if (error) {
      addToast(errorMessage(error), 'error');
      return;
    }
    const res = data as { plan: SubscriptionPlan; endsAt: string | null };
    await logActivity('subscription', `a activé la formule « ${PLAN_INFO[res.plan].name} » avec un code`);
    setCode('');
    await reloadWorkspace();
    addToast(
      res.endsAt ? `Formule ${PLAN_INFO[res.plan].name} activée jusqu’au ${localDateTime(new Date(res.endsAt))}.` : `Formule ${PLAN_INFO[res.plan].name} activée à vie. Merci !`,
      'success'
    );
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copié.', 'success');
    } catch {
      addToast('Copie impossible.', 'error');
    }
  };

  const proofMessage =
    `Bonjour ASEP, je viens de payer l’abonnement ${info.name} (${info.price.toLocaleString('fr-FR')} $) pour l’agence « ${activeAgency?.name || ''} »` +
    ` par ${subscriptionMethodLabel(method)}${reference.trim() ? ` (référence : ${reference.trim()})` : ''}. Merci de m’envoyer mon code d’activation.`;

  return (
    <>
      <PageHeader title="Abonnement" subtitle={`Essai gratuit de ${TRIAL_HOURS} heures, puis abonnement Standard, Premium ou Achat complet.`} />

      {/* État actuel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-500">Formule</div>
          <div className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
            {access.state === 'trial' ? 'Essai (accès complet)' : PLAN_INFO[settings.plan]?.name}
            {access.premium && access.state !== 'trial' && <Crown className="w-4 h-4 text-amber-500" />}
          </div>
        </div>
        <div>
          <div className="text-slate-500">État</div>
          <Badge className={stateCls}>{stateLabel}</Badge>
        </div>
        <div>
          <div className="text-slate-500">{access.state === 'trial' ? 'Fin de l’essai' : 'Valable jusqu’au'}</div>
          <div className="font-semibold text-slate-900">
            {access.lifetime ? 'À vie' : access.endsAt ? localDateTime(access.endsAt) : settings.subscriptionExpiresAt ? formatDate(settings.subscriptionExpiresAt) : '—'}
          </div>
          {access.active && access.endsAt && <div className="text-[11px] text-slate-500">Il reste {remainingLabel(access.endsAt)}</div>}
        </div>
      </div>

      {!access.active && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <strong>{settings.subscriptionStatus === 'trial' ? 'Votre essai gratuit de 72 heures est terminé.' : 'Votre abonnement a expiré.'}</strong> Vos données sont conservées :
          choisissez une formule, payez, puis saisissez le code d’activation reçu d’ASEP pour retrouver l’accès.
        </div>
      )}

      {/* Code d'activation */}
      {canEdit && (
        <form onSubmit={redeem} className="bg-gradient-to-r from-[#123B70] to-[#1d4f8f] rounded-xl p-5 text-white flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <KeyRound className="w-4 h-4 text-amber-300" /> J’ai reçu mon code d’activation
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5">Après votre paiement (même en espèces), ASEP vous envoie un code du type ASEP-XXXX-XXXX.</p>
          </div>
          <div className="flex gap-2 md:w-96">
            <input
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono uppercase tracking-wider text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ASEP-XXXX-XXXX"
              aria-label="Code d’activation"
              maxLength={20}
            />
            <button className="px-4 py-2 rounded-lg bg-[#FF8A00] hover:bg-[#e57c00] font-bold text-xs cursor-pointer disabled:opacity-50" disabled={busy === 'code' || code.trim().length < 8}>
              {busy === 'code' ? 'Vérification…' : 'Activer'}
            </button>
          </div>
        </form>
      )}

      {/* 1. Formule */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-2">1. Choisissez votre formule</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(Object.keys(PLAN_INFO) as SubscriptionPlan[]).map((k) => {
            const p = PLAN_INFO[k];
            const selected = plan === k;
            const current = access.state === 'active' && settings.plan === k;
            return (
              <button
                type="button"
                key={k}
                onClick={() => setPlan(k)}
                className={`text-left bg-white rounded-2xl p-5 border flex flex-col cursor-pointer transition-all ${
                  selected ? 'border-[#123B70] ring-2 ring-[#123B70]/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {p.name} {p.premium && <Crown className="w-4 h-4 text-amber-500" />}
                  </h3>
                  {current ? (
                    <span className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Votre formule</span>
                  ) : (
                    selected && <CheckCircle2 className="w-5 h-5 text-[#123B70]" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-900">{p.price.toLocaleString('fr-FR')} $</span>
                  <span className="text-xs text-slate-500"> {p.period}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Paiement */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">2. Payez {info.price.toLocaleString('fr-FR')} $ ({info.name})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Mode de paiement">
          {SUBSCRIPTION_METHODS.map((m) => (
            <button
              type="button"
              key={m.key}
              role="radio"
              aria-checked={method === m.key}
              onClick={() => setMethod(m.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                method === m.key ? 'border-[#123B70] bg-blue-50 ring-1 ring-[#123B70]/30' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: m.color }}>
                {m.label
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-900 truncate">{m.label}</span>
                <span className="block text-[10px] text-slate-400 truncate">{m.group}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Informations de paiement du mode choisi */}
        <PaymentInstructions
          method={method}
          amountUSD={info.price}
          planName={info.name}
          agencyName={activeAgency?.name || ''}
          account={account}
          whatsapp={accounts.whatsapp}
          isAdmin={isAdmin}
          onCopy={copy}
        />

        {canEdit ? (
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label="Référence de la transaction" hint="Facultatif : numéro reçu par SMS, reçu bancaire…">
              <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. MP241025.1234.A56789" />
            </Field>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button className={btn.primary} onClick={sendRequest} disabled={busy === 'request'}>
                <ShieldCheck className="w-4 h-4" /> {busy === 'request' ? 'Envoi…' : 'J’ai payé, prévenir ASEP'}
              </button>
              {accounts.whatsapp && (
                <a
                  href={whatsappUrl(accounts.whatsapp, proofMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold"
                >
                  <MessageCircle className="w-4 h-4" /> Envoyer la preuve sur WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">Seul le propriétaire de l’agence peut gérer l’abonnement.</p>
        )}

        {settings.requestedPlan && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            Demande « {PLAN_INFO[settings.requestedPlan].name} » envoyée
            {settings.requestedAt ? ` le ${formatDate(settings.requestedAt)}` : ''}
            {settings.requestedMethod ? ` (${subscriptionMethodLabel(settings.requestedMethod)})` : ''}. ASEP vérifie le paiement et vous envoie votre code.
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Les heures sont affichées dans le fuseau horaire de votre appareil : l’essai et l’abonnement se terminent au même instant pour tous (Kinshasa, Chine, Angola…).
      </p>
    </>
  );
};
