import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildXlsx, downloadBlob } from '../../lib/xlsx';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyIncome, Currency, IncomeCategory, PaymentMethod } from '../types';
import {
  BarList,
  btn,
  Card,
  CHART_COLORS,
  ColumnChart,
  ConfirmDialog,
  CurrencySelect,
  EmptyState,
  Field,
  inputClass,
  Modal,
  PageHeader,
  Pagination,
  PaymentMethodPicker,
  StatCard,
  Tabs,
  usePagination,
} from '../ui';
import { NumberInput } from '../../components/common/NumberInput';
import { BranchSelect } from './BranchSelect';
import { EXPENSE_CATEGORY_LABELS, formatDate, formatMoney, fromUSD, PAYMENT_METHOD_LABELS, toUSD, todayISO } from '../utils';

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  freight: 'Fret / transport',
  sale: 'Vente de marchandises',
  commission: 'Commission',
  deposit: 'Acompte',
  service: 'Service',
  other: 'Autre recette',
};

const CURRENCIES: Currency[] = ['USD', 'CDF', 'CNY'];

type Period = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all';
const PERIOD_LABELS: Record<Period, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
  semester: 'Semestre',
  year: 'Année',
  all: 'Tout',
};

// ---------- Dates locales ----------
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const day = (s: string) => (s || '').slice(0, 10);
const monthsIn = (kind: Period) => (kind === 'quarter' ? 3 : kind === 'semester' ? 6 : 12);

const periodRange = (kind: Period, ref: string) => {
  const r = parse(ref);
  if (kind === 'all') return { start: '0000-01-01', end: '9999-12-31' };
  if (kind === 'day') return { start: ref, end: ref };
  if (kind === 'week') {
    const s = new Date(r.getFullYear(), r.getMonth(), r.getDate() - ((r.getDay() + 6) % 7));
    return { start: iso(s), end: iso(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)) };
  }
  if (kind === 'month') return { start: iso(new Date(r.getFullYear(), r.getMonth(), 1)), end: iso(new Date(r.getFullYear(), r.getMonth() + 1, 0)) };
  const len = monthsIn(kind);
  const first = Math.floor(r.getMonth() / len) * len;
  return { start: iso(new Date(r.getFullYear(), first, 1)), end: iso(new Date(r.getFullYear(), first + len, 0)) };
};

const shift = (kind: Period, ref: string, dir: 1 | -1) => {
  const r = parse(ref);
  if (kind === 'day') return iso(new Date(r.getFullYear(), r.getMonth(), r.getDate() + dir));
  if (kind === 'week') return iso(new Date(r.getFullYear(), r.getMonth(), r.getDate() + 7 * dir));
  const months = kind === 'month' ? 1 : monthsIn(kind);
  return iso(new Date(r.getFullYear(), r.getMonth() + months * dir, 1));
};

const periodTitle = (kind: Period, start: string, end: string) => {
  const s = parse(start);
  if (kind === 'all') return 'Toutes les opérations';
  if (kind === 'day') return s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (kind === 'week') return `Semaine du ${formatDate(start)} au ${formatDate(end)}`;
  if (kind === 'month') return s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (kind === 'quarter') return `${Math.floor(s.getMonth() / 3) + 1}ᵉ trimestre ${s.getFullYear()}`;
  if (kind === 'semester') return `${s.getMonth() < 6 ? '1ᵉʳ' : '2ᵉ'} semestre ${s.getFullYear()}`;
  return `Année ${s.getFullYear()}`;
};

/** Une entrée de caisse : paiement d'un colis ou recette saisie à la main */
interface Entry {
  key: string;
  date: string;
  amount: number;
  currency: Currency;
  source: string;
  party: string;
  method: PaymentMethod;
  income?: AgencyIncome;
}

// ---------------------------------------------------------------------
// Formulaire de recette
// ---------------------------------------------------------------------
const IncomeForm: React.FC<{ open: boolean; initial: Partial<AgencyIncome>; onClose: () => void }> = ({ open, initial, onClose }) => {
  const { saveIncome, defaultBranchId } = useWorkspace();
  const [form, setForm] = useState<Partial<AgencyIncome> & { amountText?: string }>({});
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (open) setForm({ ...initial, amountText: initial.amount ? String(initial.amount) : '' });
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amountText || '') || 0;
    if (amount <= 0) return;
    setBusy(true);
    const { amountText, ...rest } = form;
    void amountText;
    const ok = await saveIncome({ ...rest, amount, date: form.date || todayISO() });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      title={form.id ? 'Modifier la recette' : 'Nouvelle recette'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="income-form" disabled={busy || !(parseFloat(form.amountText || '') > 0)}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="income-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Montant" required>
          <NumberInput className={inputClass} value={form.amountText || ''} onChange={(v) => setForm({ ...form, amountText: v })} required placeholder="Ex. 250" />
        </Field>
        <Field label="Devise">
          <CurrencySelect value={(form.currency as Currency) || 'USD'} onChange={(c) => setForm({ ...form, currency: c })} />
        </Field>
        <Field label="Date" hint="Aujourd’hui si vide">
          <input type="date" className={inputClass} value={form.date || ''} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Type de recette">
          <select className={inputClass} value={form.category || 'other'} onChange={(e) => setForm({ ...form, category: e.target.value as IncomeCategory })}>
            {Object.entries(INCOME_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <PaymentMethodPicker value={form.paymentMethod} onChange={(v: PaymentMethod) => setForm({ ...form, paymentMethod: v })} />
        </div>
        <Field label="Client / payeur">
          <input className={inputClass} value={form.customerName || ''} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Facultatif" />
        </Field>
        <BranchSelect label="Succursale" value={form.branchId ?? defaultBranchId} onChange={(id) => setForm({ ...form, branchId: id })} restrictToMine />
        <Field label="Description" className="sm:col-span-2">
          <input className={inputClass} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Facultatif" />
        </Field>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Page Caisse
// ---------------------------------------------------------------------
export const CashPage: React.FC = () => {
  const { addToast } = useApp();
  const { shipments, incomes, expenses, settings, can, deleteIncome, logActivity, activeAgency } = useWorkspace();
  const displayCurrency = settings.defaultCurrency;
  const showExpenses = can('expenses');

  const [kind, setKind] = useState<Period>('month');
  const [ref, setRef] = useState(() => iso(new Date()));
  const [list, setList] = useState<'in' | 'out'>('in');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AgencyIncome>>({});
  const [deleting, setDeleting] = useState<AgencyIncome | null>(null);

  const { start, end } = useMemo(() => periodRange(kind, ref), [kind, ref]);
  const title = periodTitle(kind, start, end);
  const inRange = (d: string) => day(d) >= start && day(d) <= end;

  // Entrées : paiements encaissés sur les colis + recettes saisies
  const allEntries = useMemo<Entry[]>(
    () =>
      [
        ...shipments.flatMap((s) =>
          s.payments.map((p) => ({
            key: `${s.id}-${p.id}`,
            date: day(p.date),
            amount: p.amount,
            currency: (p.currency || 'USD') as Currency,
            source: `Colis ${s.trackingRef}`,
            party: s.customerName,
            method: p.method,
          }))
        ),
        ...incomes.map((r) => ({
          key: r.id,
          date: day(r.date),
          amount: r.amount,
          currency: r.currency,
          source: INCOME_CATEGORY_LABELS[r.category] + (r.description ? ` — ${r.description}` : ''),
          party: r.customerName,
          method: r.paymentMethod,
          income: r,
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [shipments, incomes]
  );
  const entries = useMemo(() => allEntries.filter((e) => inRange(e.date)), [allEntries, start, end]); // eslint-disable-line react-hooks/exhaustive-deps
  const outs = useMemo(() => (showExpenses ? expenses.filter((e) => inRange(e.date)) : []), [expenses, showExpenses, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totaux par monnaie (montants d'origine, sans conversion)
  const byCurrency = CURRENCIES.map((c) => {
    const inn = entries.filter((e) => e.currency === c).reduce((s, e) => s + e.amount, 0);
    const out = outs.filter((e) => e.currency === c).reduce((s, e) => s + e.amount, 0);
    return { currency: c, inn, out, balance: inn - out };
  });
  const totalInUSD = entries.reduce((s, e) => s + toUSD(e.amount, e.currency), 0);
  const totalOutUSD = outs.reduce((s, e) => s + toUSD(e.amount, e.currency), 0);
  const money = (usd: number) => formatMoney(fromUSD(usd, displayCurrency), displayCurrency);

  // Graphique : par jour (semaine, mois) ou par mois (trimestre, semestre, année, tout)
  const chart = useMemo(() => {
    if (kind === 'day') return [];
    const buckets: { key: string; label: string }[] = [];
    if (kind === 'week' || kind === 'month') {
      for (let d = parse(start); iso(d) <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        buckets.push({ key: iso(d), label: kind === 'week' ? d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : String(d.getDate()) });
      }
    } else {
      const s = kind === 'all' ? new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) : parse(start);
      const count = kind === 'all' ? 12 : monthsIn(kind);
      for (let i = 0; i < count; i++) {
        const d = new Date(s.getFullYear(), s.getMonth() + i, 1);
        buckets.push({ key: iso(d).slice(0, 7), label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') });
      }
    }
    const len = buckets[0]?.key.length || 10;
    return buckets.map((b) => ({
      label: b.label,
      values: {
        inn: fromUSD(entries.filter((e) => e.date.slice(0, len) === b.key).reduce((s, e) => s + toUSD(e.amount, e.currency), 0), displayCurrency),
        out: fromUSD(outs.filter((e) => e.date.slice(0, len) === b.key).reduce((s, e) => s + toUSD(e.amount, e.currency), 0), displayCurrency),
      },
    }));
  }, [kind, start, end, entries, outs, displayCurrency]);

  const bySource = [
    { label: 'Paiements de colis', value: entries.filter((e) => !e.income).reduce((s, e) => s + toUSD(e.amount, e.currency), 0) },
    ...(Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]).map((c) => ({
      label: INCOME_CATEGORY_LABELS[c],
      value: entries.filter((e) => e.income?.category === c).reduce((s, e) => s + toUSD(e.amount, e.currency), 0),
    })),
  ]
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const byMethod = Array.from(new Set(entries.map((e) => e.method)))
    .map((m) => ({ label: PAYMENT_METHOD_LABELS[m] || m, value: entries.filter((e) => e.method === m).reduce((s, e) => s + toUSD(e.amount, e.currency), 0) }))
    .sort((a, b) => b.value - a.value);

  const inPager = usePagination(entries);
  const outPager = usePagination(outs);

  const openCreate = () => {
    setEditing({ date: todayISO(), currency: displayCurrency, category: 'sale', paymentMethod: 'cash' });
    setFormOpen(true);
  };

  const exportExcel = () => {
    try {
      const rows = [
        ['Caisse — ' + (activeAgency?.name || ''), ''],
        [title, ''],
        [],
        ['Monnaie', 'Entrées', ...(showExpenses ? ['Sorties', 'Solde'] : [])],
        ...byCurrency.map((c) => [c.currency, c.inn, ...(showExpenses ? [c.out, c.balance] : [])]),
      ];
      const sheets = [
        { name: 'Résumé', rows, boldRows: [0, 3], widths: [26, 16, 16, 16] },
        {
          name: 'Entrées',
          boldRows: [0],
          widths: [12, 40, 24, 18, 14, 8],
          rows: [['Date', 'Origine', 'Client / payeur', 'Mode de paiement', 'Montant', 'Devise'], ...entries.map((e) => [e.date, e.source, e.party, PAYMENT_METHOD_LABELS[e.method] || e.method, e.amount, e.currency])],
        },
        ...(showExpenses
          ? [
              {
                name: 'Sorties',
                boldRows: [0],
                widths: [12, 18, 40, 18, 14, 8],
                rows: [['Date', 'Catégorie', 'Description', 'Mode de paiement', 'Montant', 'Devise'], ...outs.map((e) => [e.date, EXPENSE_CATEGORY_LABELS[e.category], e.description, PAYMENT_METHOD_LABELS[e.paymentMethod] || '', e.amount, e.currency])],
              },
            ]
          : []),
      ];
      downloadBlob(`caisse-${kind}-${start.slice(0, 10)}.xlsx`, buildXlsx(sheets));
      logActivity('cash', `a exporté la caisse (${title})`);
    } catch {
      addToast('Export impossible.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Caisse"
        subtitle="Recettes de l’agence par monnaie : paiements des colis et recettes saisies à la main."
        actions={
          <>
            {can('cash', 'export') && (
              <button className={btn.secondary} onClick={exportExcel}>
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              </button>
            )}
            {can('cash', 'create') && (
              <button className={btn.primary} onClick={openCreate}>
                <Plus className="w-4 h-4" /> Nouvelle recette
              </button>
            )}
          </>
        }
      />

      {/* Période */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${kind === k ? 'bg-[#123B70] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
        {kind !== 'all' && (
          <div className="flex items-center gap-1.5">
            <button className={btn.icon} onClick={() => setRef(shift(kind, ref, -1))} aria-label="Période précédente">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input type="date" className={`${inputClass} w-40`} value={ref} onChange={(e) => e.target.value && setRef(e.target.value)} aria-label="Date de référence" />
            <button className={btn.icon} onClick={() => setRef(shift(kind, ref, 1))} aria-label="Période suivante">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="lg:ml-auto text-sm font-semibold text-slate-900 first-letter:uppercase">{title}</div>
      </div>

      {/* Par monnaie */}
      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        {byCurrency.map((c) => (
          <div key={c.currency} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{c.currency}</span>
              <Wallet className="w-4 h-4 text-slate-300" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-emerald-700 tabular-nums">{formatMoney(c.inn, c.currency)}</div>
            <div className="text-[11px] text-slate-500">Entrées</div>
            {showExpenses && (
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">Sorties</div>
                  <div className="font-semibold text-rose-600 tabular-nums">{formatMoney(c.out, c.currency)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Solde</div>
                  <div className={`font-bold tabular-nums ${c.balance >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>{formatMoney(c.balance, c.currency)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={`Total entrées (en ${displayCurrency})`} value={money(totalInUSD)} hint={`${entries.length} opération(s)`} />
        <StatCard label={`Total sorties (en ${displayCurrency})`} value={showExpenses ? money(totalOutUSD) : '—'} hint={showExpenses ? `${outs.length} dépense(s)` : undefined} />
        <StatCard label="Solde (converti)" value={showExpenses ? money(totalInUSD - totalOutUSD) : '—'} hint="Taux indicatifs" />
        <StatCard label="Principale source" value={bySource[0]?.label || '—'} hint={bySource[0] ? money(bySource[0].value) : undefined} />
      </div>

      {chart.length > 0 && (
        <Card title={`Entrées${showExpenses ? ' et sorties' : ''} — ${kind === 'week' || kind === 'month' ? 'par jour' : 'par mois'} (en ${displayCurrency})`}>
          <ColumnChart
            ariaLabel="Entrées et sorties de caisse"
            data={chart}
            series={[
              { key: 'inn', label: 'Entrées', color: CHART_COLORS.primary },
              ...(showExpenses ? [{ key: 'out', label: 'Sorties', color: CHART_COLORS.secondary }] : []),
            ]}
            formatValue={(n) => formatMoney(n, displayCurrency)}
            height={240}
          />
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Entrées par source">
          <BarList items={bySource} formatValue={money} emptyText="Aucune entrée sur la période" />
        </Card>
        <Card title="Entrées par mode de paiement">
          <BarList items={byMethod} formatValue={money} emptyText="Aucune entrée sur la période" />
        </Card>
      </div>

      {/* Opérations */}
      <div>
        <Tabs
          tabs={[
            { key: 'in' as const, label: 'Entrées', count: entries.length },
            ...(showExpenses ? [{ key: 'out' as const, label: 'Sorties (dépenses)', count: outs.length }] : []),
          ]}
          value={list}
          onChange={setList}
        />
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 overflow-hidden">
          {list === 'in' &&
            (entries.length === 0 ? (
              <EmptyState icon={Wallet} title="Aucune entrée sur la période" text="Les paiements des colis et les recettes saisies apparaissent ici." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Origine</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Client / payeur</th>
                        <th className="p-3 font-semibold hidden sm:table-cell">Paiement</th>
                        <th className="p-3 font-semibold text-right">Montant</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inPager.items.map((e) => (
                        <tr key={e.key} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="p-3 text-slate-800">
                            <div className="truncate max-w-[220px]">{e.source}</div>
                            <div className="text-[11px] text-slate-400 md:hidden">{e.party}</div>
                          </td>
                          <td className="p-3 hidden md:table-cell text-slate-600">{e.party || '—'}</td>
                          <td className="p-3 hidden sm:table-cell text-slate-600">{PAYMENT_METHOD_LABELS[e.method] || e.method}</td>
                          <td className="p-3 text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">{formatMoney(e.amount, e.currency)}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              {e.income ? (
                                <>
                                  {can('cash', 'edit') && (
                                    <button
                                      className={btn.icon}
                                      title="Modifier"
                                      onClick={() => {
                                        setEditing(e.income!);
                                        setFormOpen(true);
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {can('cash', 'delete') && (
                                    <button className={btn.icon} title="Supprimer" onClick={() => setDeleting(e.income!)}>
                                      <Trash2 className="w-4 h-4 text-rose-600" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400" title="Paiement enregistré sur le colis (Gestion colis → Paiement)">
                                  Colis
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={inPager} />
              </>
            ))}

          {list === 'out' &&
            showExpenses &&
            (outs.length === 0 ? (
              <EmptyState icon={Wallet} title="Aucune dépense sur la période" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Catégorie</th>
                        <th className="p-3 font-semibold hidden sm:table-cell">Description</th>
                        <th className="p-3 font-semibold text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {outPager.items.map((e) => (
                        <tr key={e.id}>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="p-3 text-slate-800">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                          <td className="p-3 hidden sm:table-cell text-slate-600 truncate max-w-[260px]">{e.description}</td>
                          <td className="p-3 text-right font-semibold tabular-nums text-rose-600 whitespace-nowrap">{formatMoney(e.amount, e.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={outPager} />
              </>
            ))}
        </div>
      </div>

      <IncomeForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer la recette"
        text={`La recette de ${deleting ? formatMoney(deleting.amount, deleting.currency) : ''} du ${deleting ? formatDate(deleting.date) : ''} sera supprimée.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteIncome(deleting.id)}
      />
    </>
  );
};
