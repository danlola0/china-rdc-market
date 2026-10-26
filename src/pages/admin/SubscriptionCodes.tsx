import React, { useCallback, useEffect, useState } from 'react';
import { Ban, Copy, KeyRound, MessageCircle, Save, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage, supabase } from '../../lib/supabase';
import { Agency } from '../../types';
import { AgencySettings, SubscriptionPlan } from '../../agency/types';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, Modal, Pagination, usePagination } from '../../agency/ui';
import { formatDateTime, formatMoney, whatsappUrl } from '../../agency/utils';
import { PaymentAccounts, PLAN_INFO, SUBSCRIPTION_METHODS, subscriptionMethodLabel } from '../../agency/subscription';
import { NumberInput } from '../../components/common/NumberInput';

interface SubscriptionCode {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  months: number | null;
  agency_id: string | null;
  amount_usd: number;
  payment_method: string;
  note: string;
  created_at: string;
  revoked: boolean;
  redeemed_at: string | null;
  redeemed_agency_id: string | null;
}

const MONTH_OPTIONS = [1, 3, 6, 12];

/** Fenêtre de génération d'un code (préremplie depuis une demande d'abonnement) */
export const GenerateCodeModal: React.FC<{
  open: boolean;
  agencies: Agency[];
  prefill?: { agencyId?: string; plan?: SubscriptionPlan; method?: string | null };
  onClose: () => void;
  onGenerated: () => void;
}> = ({ open, agencies, prefill, onClose, onGenerated }) => {
  const { addToast } = useApp();
  const [form, setForm] = useState({ agencyId: '', plan: 'standard' as SubscriptionPlan, months: 1, method: 'mpesa', amount: '', note: '' });
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const plan = prefill?.plan || 'standard';
    setForm({ agencyId: prefill?.agencyId || '', plan, months: 1, method: prefill?.method || 'mpesa', amount: String(PLAN_INFO[plan].price), note: '' });
    setCode(null);
  }, [open, prefill]);

  const setPlanOrMonths = (plan: SubscriptionPlan, months: number) =>
    setForm((f) => ({ ...f, plan, months, amount: String(plan === 'enterprise' ? PLAN_INFO.enterprise.price : PLAN_INFO[plan].price * months) }));

  const agency = agencies.find((a) => a.id === form.agencyId);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_generate_subscription_code', {
      p_plan: form.plan,
      p_months: form.plan === 'enterprise' ? null : form.months,
      p_agency: form.agencyId || null,
      p_amount: parseFloat(form.amount) || 0,
      p_method: form.method,
      p_note: form.note,
    });
    setBusy(false);
    if (error) return addToast(errorMessage(error), 'error');
    setCode(data as string);
    onGenerated();
  };

  const message = code
    ? `Bonjour${agency ? ` ${agency.name}` : ''}, merci pour votre paiement. Votre code d’activation ASEP MARKET (${PLAN_INFO[form.plan].name}${
        form.plan === 'enterprise' ? ', accès à vie' : `, ${form.months} mois`
      }) : ${code}\nSaisissez-le dans Espace agence → Abonnement → « J’ai reçu mon code d’activation ».`
    : '';

  return (
    <Modal open={open} title="Générer un code d’activation" onClose={onClose} size="lg">
      {code ? (
        <div className="space-y-4 text-center">
          <KeyRound className="w-10 h-10 mx-auto text-amber-500" />
          <div className="text-xs text-slate-500">Code à envoyer à l’agence</div>
          <div className="text-2xl font-black font-mono tracking-widest text-[#123B70] select-all">{code}</div>
          <div className="text-xs text-slate-600">
            {PLAN_INFO[form.plan].name} · {form.plan === 'enterprise' ? 'à vie' : `${form.months} mois`} · {formatMoney(parseFloat(form.amount) || 0)} ·{' '}
            {subscriptionMethodLabel(form.method)}
            {agency ? ` · réservé à ${agency.name}` : ' · utilisable par une seule agence'}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              className={btn.secondary}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message);
                  addToast('Message et code copiés.', 'success');
                } catch {
                  addToast('Copie impossible.', 'error');
                }
              }}
            >
              <Copy className="w-4 h-4" /> Copier le message
            </button>
            <a
              href={whatsappUrl(agency?.phoneWeChat || '', message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold"
            >
              <MessageCircle className="w-4 h-4" /> Envoyer sur WhatsApp
            </a>
            <button className={btn.primary} onClick={onClose}>
              Terminé
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={generate} className="grid sm:grid-cols-2 gap-4">
          <Field label="Agence" hint="Facultatif : réserver le code à une agence" className="sm:col-span-2">
            <select className={inputClass} value={form.agencyId} onChange={(e) => setForm({ ...form, agencyId: e.target.value })}>
              <option value="">— Toute agence (le premier qui le saisit) —</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Formule">
            <select className={inputClass} value={form.plan} onChange={(e) => setPlanOrMonths(e.target.value as SubscriptionPlan, form.months)}>
              {(Object.keys(PLAN_INFO) as SubscriptionPlan[]).map((k) => (
                <option key={k} value={k}>
                  {PLAN_INFO[k].name} — {PLAN_INFO[k].price.toLocaleString('fr-FR')} $ {PLAN_INFO[k].period}
                </option>
              ))}
            </select>
          </Field>
          {form.plan !== 'enterprise' ? (
            <Field label="Durée">
              <select className={inputClass} value={form.months} onChange={(e) => setPlanOrMonths(form.plan, Number(e.target.value))}>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} mois
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Durée">
              <input className={inputClass} value="À vie (sans abonnement)" disabled />
            </Field>
          )}
          <Field label="Mode de paiement reçu">
            <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {SUBSCRIPTION_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Montant reçu (USD)">
            <NumberInput className={inputClass} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ex. référence M-Pesa, reçu n°…" />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btn.secondary} onClick={onClose}>
              Annuler
            </button>
            <button className={btn.primary} disabled={busy}>
              <KeyRound className="w-4 h-4" /> {busy ? 'Génération…' : 'Générer le code'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/** Coordonnées de paiement affichées aux agences sur leur page Abonnement */
const PaymentAccountsEditor: React.FC = () => {
  const { addToast } = useApp();
  const [value, setValue] = useState<PaymentAccounts>({ accounts: {} });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'payment_accounts')
      .maybeSingle()
      .then(({ data }) => setValue({ accounts: {}, ...((data?.value as PaymentAccounts) || {}) }));
  }, []);

  const setAccount = (key: string, field: 'number' | 'name' | 'note', v: string) =>
    setValue((cur) => ({
      ...cur,
      accounts: { ...cur.accounts, [key]: { number: '', name: '', note: '', ...cur.accounts?.[key], [field]: v } },
    }));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('platform_settings').upsert({ key: 'payment_accounts', value, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) addToast(errorMessage(error), 'error');
    else addToast('Coordonnées de paiement enregistrées : les agences les voient sur leur page Abonnement.', 'success');
  };

  return (
    <Card
      title="Coordonnées de paiement d’ASEP"
      actions={
        <button className={btn.primary} onClick={save} disabled={busy}>
          <Save className="w-4 h-4" /> {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      }
    >
      <p className="text-xs text-slate-500 mb-3">Affichées aux agences quand elles choisissent un mode de paiement. Laissez vide un mode que vous n’utilisez pas.</p>
      <Field label="Numéro WhatsApp d’ASEP (réception des preuves de paiement)">
        <input className={inputClass} value={value.whatsapp || ''} onChange={(e) => setValue({ ...value, whatsapp: e.target.value })} placeholder="+243 …" />
      </Field>
      <div className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-lg">
        {SUBSCRIPTION_METHODS.map((m) => (
          <div key={m.key} className="p-3 grid sm:grid-cols-[140px_1fr_1fr_1fr] gap-2 items-center text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} /> {m.label}
            </div>
            <input
              className={inputClass}
              value={value.accounts?.[m.key]?.number || ''}
              onChange={(e) => setAccount(m.key, 'number', e.target.value)}
              placeholder={m.key === 'cash' ? 'Adresse du bureau' : m.key === 'equity_bank' ? 'N° de compte' : 'Numéro / identifiant'}
              aria-label={`${m.label} : numéro`}
            />
            <input className={inputClass} value={value.accounts?.[m.key]?.name || ''} onChange={(e) => setAccount(m.key, 'name', e.target.value)} placeholder="Au nom de" aria-label={`${m.label} : titulaire`} />
            <input className={inputClass} value={value.accounts?.[m.key]?.note || ''} onChange={(e) => setAccount(m.key, 'note', e.target.value)} placeholder="Instructions (facultatif)" aria-label={`${m.label} : instructions`} />
          </div>
        ))}
      </div>
    </Card>
  );
};

/** Section « Codes d'activation » de l'onglet Abonnements */
export const SubscriptionCodes: React.FC<{
  agencies: Agency[];
  settingsOf: (agencyId: string) => AgencySettings | undefined;
  onChanged: () => void;
}> = ({ agencies, settingsOf, onChanged }) => {
  const { addToast } = useApp();
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ agencyId?: string; plan?: SubscriptionPlan; method?: string | null }>({});
  const [revoking, setRevoking] = useState<SubscriptionCode | null>(null);
  const pager = usePagination(codes);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('subscription_codes').select('*').order('created_at', { ascending: false });
    if (error) addToast(errorMessage(error), 'error');
    else setCodes((data || []) as SubscriptionCode[]);
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const name = (id: string | null) => agencies.find((a) => a.id === id)?.name || '—';
  const requests = agencies.filter((a) => settingsOf(a.id)?.requestedPlan);

  const openFor = (a?: Agency) => {
    const s = a ? settingsOf(a.id) : undefined;
    setPrefill(a ? { agencyId: a.id, plan: s?.requestedPlan || undefined, method: s?.requestedMethod } : {});
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {requests.length > 0 && (
        <Card title={`Demandes d’abonnement à traiter (${requests.length})`}>
          <ul className="divide-y divide-slate-100 text-xs">
            {requests.map((a) => {
              const s = settingsOf(a.id)!;
              return (
                <li key={a.id} className="py-2.5 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {PLAN_INFO[s.requestedPlan!].name} · {PLAN_INFO[s.requestedPlan!].price.toLocaleString('fr-FR')} $ · {subscriptionMethodLabel(s.requestedMethod) || 'mode non précisé'}
                      {s.requestedReference ? ` · réf. ${s.requestedReference}` : ''}
                      {s.requestedAt ? ` · ${formatDateTime(s.requestedAt)}` : ''}
                    </div>
                  </div>
                  <button className={btn.primary} onClick={() => openFor(a)}>
                    <KeyRound className="w-4 h-4" /> Paiement reçu : générer le code
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card
        title="Codes d’activation"
        actions={
          <button className={btn.primary} onClick={() => openFor()}>
            <KeyRound className="w-4 h-4" /> Générer un code
          </button>
        }
      >
        <p className="text-xs text-slate-500 mb-3">
          Après un paiement (Mobile Money, Alipay, WeChat, Equity Bank ou espèces), générez un code et envoyez-le à l’agence : elle le saisit dans sa page Abonnement et
          l’accès est activé immédiatement. Chaque code ne sert qu’une fois.
        </p>
        {codes.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun code généré" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Formule</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Paiement</th>
                    <th className="px-3 py-2 font-semibold">État</th>
                    <th className="px-5 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pager.items.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-2.5">
                        <div className="font-mono font-bold text-slate-900">{c.code}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(c.created_at)}
                          {c.agency_id ? ` · pour ${name(c.agency_id)}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {PLAN_INFO[c.plan].name}
                        <div className="text-[11px] text-slate-400">{c.plan === 'enterprise' ? 'À vie' : `${c.months} mois`}</div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {formatMoney(Number(c.amount_usd))}
                        <div className="text-[11px] text-slate-400">{subscriptionMethodLabel(c.payment_method)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.redeemed_at ? (
                          <>
                            <Badge className="bg-emerald-100 text-emerald-800">Utilisé</Badge>
                            <div className="text-[11px] text-slate-400">
                              {name(c.redeemed_agency_id)} · {formatDateTime(c.redeemed_at)}
                            </div>
                          </>
                        ) : c.revoked ? (
                          <Badge className="bg-slate-200 text-slate-600">Annulé</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">Disponible</Badge>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {!c.redeemed_at && !c.revoked && (
                          <div className="flex justify-end gap-1">
                            <button
                              className={btn.icon}
                              title="Copier le code"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(c.code);
                                  addToast('Code copié.', 'success');
                                } catch {
                                  addToast('Copie impossible.', 'error');
                                }
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button className={btn.icon} title="Annuler ce code" onClick={() => setRevoking(c)}>
                              <Ban className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pager={pager} />
          </>
        )}
      </Card>

      <PaymentAccountsEditor />

      <GenerateCodeModal
        open={open}
        agencies={agencies}
        prefill={prefill}
        onClose={() => setOpen(false)}
        onGenerated={() => {
          load();
          onChanged();
        }}
      />
      <ConfirmDialog
        open={!!revoking}
        title="Annuler le code"
        text={`Le code ${revoking?.code} ne pourra plus être utilisé.`}
        confirmLabel="Annuler le code"
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (!revoking) return;
          const { error } = await supabase.rpc('admin_revoke_subscription_code', { p_id: revoking.id });
          if (error) addToast(errorMessage(error), 'error');
          else addToast('Code annulé.', 'info');
          load();
        }}
      />
    </div>
  );
};
