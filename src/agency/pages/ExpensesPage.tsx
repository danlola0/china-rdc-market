import React, { useMemo, useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { BranchSelect } from './BranchSelect';
import { Download, Paperclip, Pencil, Plus, Receipt, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyExpense, Currency, ExpenseCategory, PaymentMethod } from '../types';
import { BarList, btn, Card, CHART_COLORS, ColumnChart, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader, PaymentMethodPicker, StatCard, Pagination, usePagination } from '../ui';
import {
  compressImage,
  downloadCSV,
  EXPENSE_CATEGORY_LABELS,
  formatDate,
  formatMoney,
  fromUSD,
  lastMonths,
  monthKey,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  toUSD,
  todayISO,
} from '../utils';

const ExpenseForm: React.FC<{ open: boolean; initial: Partial<AgencyExpense>; onClose: () => void }> = ({ open, initial, onClose }) => {
  const { saveExpense, members, defaultBranchId } = useWorkspace();
  const { addToast } = useApp();
  const [form, setForm] = useState<Partial<AgencyExpense>>(initial);
  React.useEffect(() => {
    if (open) setForm(initial);
  }, [initial, open]);

  const onReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      try {
        setForm((f) => ({ ...f, receipt: { name: file.name, dataUrl: '' } }));
        const dataUrl = await compressImage(file, 1000, 0.6);
        setForm((f) => ({ ...f, receipt: { name: file.name, dataUrl } }));
      } catch (err: any) {
        addToast(err.message, 'error');
      }
    } else {
      // En démonstration, seul le nom des fichiers non-image (PDF…) est conservé
      setForm((f) => ({ ...f, receipt: { name: file.name } }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await saveExpense({ ...form, date: form.date || todayISO(), description: form.description || EXPENSE_CATEGORY_LABELS[form.category as ExpenseCategory] || '', amount: Number(form.amount) })) onClose();
  };

  return (
    <Modal
      open={open}
      title={form.id ? 'Modifier la dépense' : 'Nouvelle dépense'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="expense-form">
            Enregistrer
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" hint="Aujourd’hui si vide">
          <input type="date" className={inputClass} value={form.date || ''} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Catégorie">
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Montant" required>
          <NumberInput className={inputClass} value={form.amount} onChange={(v) => setForm({ ...form, amount: v as any })} required placeholder="Ex. 150" />
        </Field>
        <Field label="Devise">
          <select className={inputClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
            <option value="USD">USD — Dollar américain</option>
            <option value="CDF">CDF — Franc congolais</option>
            <option value="CNY">CNY — Yuan chinois</option>
          </select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <input className={inputClass} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Facultatif" />
        </Field>
        <BranchSelect label="Succursale" value={form.branchId ?? defaultBranchId} onChange={(id) => setForm({ ...form, branchId: id })} restrictToMine />
        <Field label="Responsable">
          <select className={inputClass} value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}>
            {members
              .filter((m) => m.status !== 'invited')
              .map((m) => (
                <option key={m.id}>{m.fullName}</option>
              ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <PaymentMethodPicker value={form.paymentMethod} onChange={(v: PaymentMethod) => setForm({ ...form, paymentMethod: v })} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <label className={`${btn.secondary} cursor-pointer`}>
            <Upload className="w-4 h-4" /> Justificatif
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onReceipt} />
          </label>
          {form.receipt && (
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Paperclip className="w-3.5 h-3.5" /> {form.receipt.name}
              <button type="button" className="ml-1 text-rose-600 hover:underline" onClick={() => setForm({ ...form, receipt: undefined })}>
                retirer
              </button>
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
};

export const ExpensesPage: React.FC = () => {
  const { expenses, settings, can, currentMember, deleteExpense, logActivity } = useWorkspace();
  const currency = settings.defaultCurrency;
  const money = (usd: number) => formatMoney(fromUSD(usd, currency), currency);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const [method, setMethod] = useState<'all' | PaymentMethod>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AgencyExpense>>({});
  const [deleting, setDeleting] = useState<AgencyExpense | null>(null);
  const [receipt, setReceipt] = useState<AgencyExpense['receipt'] | null>(null);

  // Dépenses de la période et de la catégorie choisies (avant le filtre par mode de paiement)
  const inPeriod = useMemo(
    () =>
      expenses.filter(
        (e) => (!from || e.date >= from) && (!to || e.date <= to) && (category === 'all' || e.category === category)
      ),
    [expenses, from, to, category]
  );
  const filtered = useMemo(() => inPeriod.filter((e) => method === 'all' || e.paymentMethod === method), [inPeriod, method]);

  const today = todayISO();
  const thisMonth = monthKey(today);
  const usd = (e: AgencyExpense) => toUSD(e.amount, e.currency);
  const totalToday = expenses.filter((e) => e.date === today).reduce((s, e) => s + usd(e), 0);
  const totalMonth = expenses.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + usd(e), 0);
  const totalFiltered = filtered.reduce((s, e) => s + usd(e), 0);

  const monthly = lastMonths(12).map((m) => ({
    label: m.label,
    values: { expenses: fromUSD(expenses.filter((e) => monthKey(e.date) === m.key).reduce((s, e) => s + usd(e), 0), currency) },
  }));
  const byCategory = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[])
    .map((c) => ({ label: EXPENSE_CATEGORY_LABELS[c], value: filtered.filter((e) => e.category === c).reduce((s, e) => s + usd(e), 0) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const methodsShown: PaymentMethod[] = [
    ...PAYMENT_METHOD_OPTIONS.map((o) => o.value),
    ...(Array.from(new Set(expenses.map((e) => e.paymentMethod))).filter(
      (m) => !PAYMENT_METHOD_OPTIONS.some((o) => o.value === m)
    ) as PaymentMethod[]),
  ];
  const byMethod = methodsShown.map((m) => {
    const rows = inPeriod.filter((e) => e.paymentMethod === m);
    return { method: m, count: rows.length, total: rows.reduce((sum, e) => sum + usd(e), 0) };
  });

  const openCreate = () => {
    setEditing({
      date: today,
      category: 'transport',
      currency,
      paymentMethod: 'cash',
      responsibleName: currentMember?.fullName,
      description: '',
    });
    setFormOpen(true);
  };

  const exportCsv = () => {
    downloadCSV(
      'depenses.csv',
      ['Date', 'Catégorie', 'Description', 'Montant', 'Devise', 'Responsable', 'Paiement', 'Justificatif'],
      filtered.map((e) => [e.date, EXPENSE_CATEGORY_LABELS[e.category], e.description, e.amount, e.currency, e.responsibleName, PAYMENT_METHOD_LABELS[e.paymentMethod], e.receipt?.name || ''])
    );
    logActivity('expenses', 'a exporté l’historique des dépenses');
  };

  const pager = usePagination(filtered);

  return (
    <>
      <PageHeader
        title="Dépenses"
        subtitle={`Montants convertis en ${currency} au taux indicatif pour les totaux`}
        actions={
          <>
            {can('expenses', 'export') && (
              <button className={btn.secondary} onClick={exportCsv} disabled={!filtered.length}>
                <Download className="w-4 h-4" /> Exporter
              </button>
            )}
            {can('expenses', 'create') && (
              <button className={btn.primary} onClick={openCreate}>
                <Plus className="w-4 h-4" /> Nouvelle dépense
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Aujourd’hui" value={money(totalToday)} />
        <StatCard label="Ce mois-ci" value={money(totalMonth)} />
        <StatCard label="Période filtrée" value={money(totalFiltered)} hint={`${filtered.length} dépense(s)`} />
        <StatCard label="Catégorie principale" value={byCategory[0]?.label || '—'} hint={byCategory[0] ? money(byCategory[0].value) : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Dépenses mensuelles — 12 derniers mois" className="lg:col-span-2">
          <ColumnChart
            ariaLabel="Dépenses mensuelles"
            data={monthly}
            series={[{ key: 'expenses', label: 'Dépenses', color: CHART_COLORS.secondary }]}
            formatValue={(n) => formatMoney(n, currency)}
          />
        </Card>
        <Card title="Par catégorie (période filtrée)">
          <BarList items={byCategory} formatValue={money} color={CHART_COLORS.secondary} />
        </Card>
      </div>

      <Card
        title="Par mode de paiement (période filtrée)"
        actions={
          method !== 'all' && (
            <button className="text-xs text-slate-500 hover:text-slate-800 underline" onClick={() => setMethod('all')}>
              Tous les modes
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Filtrer par mode de paiement">
          {byMethod.map(({ method: m, count, total }) => {
            const active = method === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => setMethod(active ? 'all' : m)}
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  active ? 'border-[#123B70] bg-[#123B70] text-white' : 'border-slate-200 bg-white hover:border-[#123B70]'
                }`}
              >
                <div className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-800'}`}>{PAYMENT_METHOD_LABELS[m]}</div>
                <div className={`mt-1 text-sm font-bold tabular-nums ${active ? 'text-white' : 'text-slate-900'}`}>{money(total)}</div>
                <div className={`text-[10px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>{count} dépense(s)</div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Cliquez sur un mode de paiement pour n’afficher que ses dépenses dans l’historique.</p>
      </Card>

      <Card title="Historique">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Field label="Du" className="sm:w-40">
            <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Au" className="sm:w-40">
            <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Catégorie" className="sm:w-48">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="all">Toutes</option>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode de paiement" className="sm:w-48">
            <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="all">Tous</option>
              {methodsShown.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          {(from || to || category !== 'all' || method !== 'all') && (
            <button
              className="sm:self-end text-xs text-slate-500 hover:text-slate-800 underline pb-2"
              onClick={() => {
                setFrom('');
                setTo('');
                setCategory('all');
                setMethod('all');
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Aucune dépense" text="Aucune dépense ne correspond à ces filtres." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Responsable</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Paiement</th>
                    <th className="px-3 py-2 font-semibold text-right">Montant</th>
                    <th className="px-5 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pager.items.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{formatDate(e.date)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-900">{e.description}</div>
                        <div className="text-[11px] text-slate-400">
                          {EXPENSE_CATEGORY_LABELS[e.category]}
                          <span className="md:hidden"> · {PAYMENT_METHOD_LABELS[e.paymentMethod]}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-slate-600">{e.responsibleName}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-slate-600">{PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">{formatMoney(e.amount, e.currency)}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          {e.receipt && (
                            <button className={btn.icon} title={`Justificatif : ${e.receipt.name}`} onClick={() => setReceipt(e.receipt!)}>
                              <Paperclip className="w-4 h-4" />
                            </button>
                          )}
                          {can('expenses', 'edit') && (
                            <button
                              className={btn.icon}
                              title="Modifier"
                              onClick={() => {
                                setEditing(e);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {can('expenses', 'delete') && (
                            <button className={btn.icon} title="Supprimer" onClick={() => setDeleting(e)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      <ExpenseForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer la dépense"
        text={`« ${deleting?.description} » (${deleting ? formatMoney(deleting.amount, deleting.currency) : ''}) sera supprimée.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteExpense(deleting.id)}
      />
      <Modal open={!!receipt} title={`Justificatif — ${receipt?.name || ''}`} onClose={() => setReceipt(null)}>
        {receipt?.dataUrl ? (
          <img src={receipt.dataUrl} alt={receipt.name} className="max-w-full rounded-lg border border-slate-200" />
        ) : (
          <p className="text-slate-600">
            Fichier « {receipt?.name} » enregistré. L’aperçu des documents non-image sera disponible avec le stockage de fichiers (Supabase Storage).
          </p>
        )}
      </Modal>
    </>
  );
};
