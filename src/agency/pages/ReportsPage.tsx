import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildXlsx, downloadBlob, XlsxSheet } from '../../lib/xlsx';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { useAgencyMetrics } from '../metrics';
import { BarList, btn, Card, CHART_COLORS, ColumnChart, EmptyState, inputClass, PageHeader, Pagination, StatCard, Tabs, usePagination } from '../ui';
import {
  EXPENSE_CATEGORY_LABELS,
  formatDate,
  formatMoney,
  formatNumber,
  PAYMENT_METHOD_LABELS,
  SHIPMENT_MODE_LABELS,
  SHIPMENT_STATUS_LABELS,
  paymentUSD,
  toUSD,
} from '../utils';

type PeriodKind = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<PeriodKind, string> = { day: 'Journalier', week: 'Hebdomadaire', month: 'Mensuel' };

// ---------- Dates locales (AAAA-MM-JJ) ----------

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const day = (s: string) => (s || '').slice(0, 10);

/** Début, fin et jours d'une période contenant la date de référence */
const periodRange = (kind: PeriodKind, ref: string) => {
  const r = parse(ref);
  let start = r;
  let end = r;
  if (kind === 'week') {
    start = addDays(r, -((r.getDay() + 6) % 7)); // lundi
    end = addDays(start, 6);
  } else if (kind === 'month') {
    start = new Date(r.getFullYear(), r.getMonth(), 1);
    end = new Date(r.getFullYear(), r.getMonth() + 1, 0);
  }
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(iso(d));
  return { start: iso(start), end: iso(end), days };
};

const periodTitle = (kind: PeriodKind, start: string, end: string) => {
  const s = parse(start);
  const e = parse(end);
  if (kind === 'day') return s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (kind === 'month') return s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};

const shift = (kind: PeriodKind, ref: string, dir: 1 | -1) => {
  const r = parse(ref);
  if (kind === 'day') return iso(addDays(r, dir));
  if (kind === 'week') return iso(addDays(r, 7 * dir));
  return iso(new Date(r.getFullYear(), r.getMonth() + dir, 1));
};

/** Texte compatible avec la police standard du PDF (espaces insécables, guillemets typographiques…) */
const pdfText = (s: string) =>
  String(s ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/→/g, '->');

export const ReportsPage: React.FC = () => {
  const { addToast } = useApp();
  const { shipments, customers, expenses, orders, can, logActivity, activeAgency, settings } = useWorkspace();
  const m = useAgencyMetrics();
  const [kind, setKind] = useState<PeriodKind>('day');
  const [ref, setRef] = useState(() => iso(new Date()));
  const [list, setList] = useState<'income' | 'expenses' | 'shipments'>('income');
  const [busy, setBusy] = useState<'' | 'pdf' | 'xlsx'>('');
  const showFinance = can('expenses') || can('reports', 'export');
  const canExport = can('reports', 'export');

  const { start, end, days } = useMemo(() => periodRange(kind, ref), [kind, ref]);
  const title = periodTitle(kind, start, end);
  const inRange = (d: string) => day(d) >= start && day(d) <= end;

  const report = useMemo(() => {
    const income = [
      ...shipments.flatMap((s) =>
        s.payments
          .filter((p) => inRange(p.date))
          .map((p) => ({
            id: `${s.id}-${p.id}`,
            date: day(p.date),
            source: `Fret ${s.trackingRef}`,
            party: s.customerName,
            method: PAYMENT_METHOD_LABELS[p.method] || p.method || '',
            usd: paymentUSD(p),
          }))
      ),
      ...(settings.display.showMarketplaceOrders
        ? orders
            .filter((o) => inRange(o.date))
            .map((o) => ({ id: o.id, date: day(o.date), source: `Commande ${o.orderNumber}`, party: o.buyerName, method: 'Marketplace', usd: o.totalUSD }))
        : []),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const spent = expenses
      .filter((e) => inRange(e.date))
      .map((e) => ({ ...e, usd: toUSD(e.amount, e.currency) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const registered = shipments.filter((s) => inRange(s.createdAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const revenue = income.reduce((s, r) => s + r.usd, 0);
    const expenseTotal = spent.reduce((s, e) => s + e.usd, 0);

    const daily = days.map((d) => ({
      date: d,
      revenue: income.filter((r) => r.date === d).reduce((s, r) => s + r.usd, 0),
      expenses: spent.filter((e) => e.date === d).reduce((s, e) => s + e.usd, 0),
    }));

    const byCategory = Object.entries(EXPENSE_CATEGORY_LABELS)
      .map(([cat, label]) => ({ label, value: spent.filter((e) => e.category === cat).reduce((s, e) => s + e.usd, 0) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const byMode = (['sea', 'air'] as const).map((mode) => {
      const rows = registered.filter((s) => s.mode === mode);
      return {
        mode,
        count: rows.length,
        weight: rows.reduce((s, r) => s + r.weightKg, 0),
        volume: rows.reduce((s, r) => s + r.volumeCbm, 0),
        billed: rows.reduce((s, r) => s + r.estimatedCost, 0),
      };
    });

    const topCustomers = customers
      .map((c) => ({ label: c.name, value: registered.filter((s) => s.customerId === c.id).reduce((sum, s) => sum + s.estimatedCost, 0) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { income, spent, registered, revenue, expenseTotal, net: revenue - expenseTotal, daily, byCategory, byMode, topCustomers };
  }, [shipments, expenses, orders, customers, settings.display.showMarketplaceOrders, start, end]);

  const incomePager = usePagination(report.income);
  const expensePager = usePagination(report.spent);
  const shipmentPager = usePagination(report.registered);

  const agencyName = activeAgency?.name || 'Agence';
  const fileBase = `rapport-${PERIOD_LABELS[kind].toLowerCase()}-${kind === 'month' ? start.slice(0, 7) : start}-${agencyName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-');
  const cur = m.currency;
  const amount = (usd: number) => Math.round(m.display(usd) * 100) / 100;

  // ---------- Export Excel ----------
  const exportExcel = () => {
    setBusy('xlsx');
    try {
      const summary: XlsxSheet = {
        name: 'Résumé',
        widths: [34, 22],
        boldRows: [0, 4, 12],
        rows: [
          [`Rapport ${PERIOD_LABELS[kind].toLowerCase()} — ${agencyName}`],
          [title],
          [`Du ${formatDate(start)} au ${formatDate(end)} · montants en ${cur} (taux indicatifs)`],
          [],
          ['Indicateur', 'Valeur'],
          [`Revenus (${cur})`, amount(report.revenue)],
          [`Dépenses (${cur})`, showFinance ? amount(report.expenseTotal) : ''],
          [`Résultat (${cur})`, showFinance ? amount(report.net) : ''],
          ['Colis enregistrés', report.registered.length],
          ['Poids total (kg)', Math.round(report.registered.reduce((s, r) => s + r.weightKg, 0) * 10) / 10],
          ['Volume total (CBM)', Math.round(report.registered.reduce((s, r) => s + r.volumeCbm, 0) * 1000) / 1000],
          [],
          ['Mode', 'Colis', 'Poids (kg)', 'Volume (CBM)', `Fret facturé (${cur})`],
          ...report.byMode.map((r) => [SHIPMENT_MODE_LABELS[r.mode], r.count, Math.round(r.weight * 10) / 10, Math.round(r.volume * 1000) / 1000, amount(r.billed)]),
        ],
      };
      const daily: XlsxSheet = {
        name: 'Par jour',
        widths: [14, 18, 18, 18],
        boldRows: [0],
        rows: [['Date', `Revenus (${cur})`, `Dépenses (${cur})`, `Résultat (${cur})`], ...report.daily.map((d) => [d.date, amount(d.revenue), amount(d.expenses), amount(d.revenue - d.expenses)])],
      };
      const income: XlsxSheet = {
        name: 'Encaissements',
        widths: [12, 28, 28, 18, 16],
        boldRows: [0],
        rows: [['Date', 'Origine', 'Client', 'Mode de paiement', `Montant (${cur})`], ...report.income.map((r) => [r.date, r.source, r.party, r.method, amount(r.usd)])],
      };
      const spent: XlsxSheet = {
        name: 'Dépenses',
        widths: [12, 18, 34, 18, 14, 10, 16, 20],
        boldRows: [0],
        rows: [
          ['Date', 'Catégorie', 'Description', 'Mode de paiement', 'Montant', 'Devise', `Montant (${cur})`, 'Responsable'],
          ...report.spent.map((e) => [e.date, EXPENSE_CATEGORY_LABELS[e.category], e.description, PAYMENT_METHOD_LABELS[e.paymentMethod] || '', e.amount, e.currency, amount(e.usd), e.responsibleName]),
        ],
      };
      const parcels: XlsxSheet = {
        name: 'Colis',
        widths: [18, 24, 30, 10, 26, 12, 12, 10, 16, 16, 12],
        boldRows: [0],
        rows: [
          ['Référence', 'Client', 'Description', 'Mode', 'Trajet', 'Poids (kg)', 'Volume (CBM)', 'Cartons', `Fret (${cur})`, 'Statut', 'Date'],
          ...report.registered.map((s) => [
            s.trackingRef,
            s.customerName,
            s.description,
            SHIPMENT_MODE_LABELS[s.mode],
            `${s.originCity} → ${s.destinationCity}`,
            s.weightKg,
            s.volumeCbm,
            s.packages || 1,
            amount(s.estimatedCost),
            SHIPMENT_STATUS_LABELS[s.status],
            day(s.createdAt),
          ]),
        ],
      };
      const sheets = showFinance ? [summary, daily, income, spent, parcels] : [summary, income, parcels];
      downloadBlob(`${fileBase}.xlsx`, buildXlsx(sheets));
      logActivity('reports', `a exporté le rapport ${PERIOD_LABELS[kind].toLowerCase()} (${title}) en Excel`);
    } catch {
      addToast('Export Excel impossible.', 'error');
    } finally {
      setBusy('');
    }
  };

  // ---------- Export PDF ----------
  const exportPdf = async () => {
    setBusy('pdf');
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const color = settings.primaryColor || '#123B70';
      const money = (usd: number) => pdfText(m.money(usd));

      doc.setFillColor(color);
      doc.rect(0, 0, W, 70, 'F');
      doc.setTextColor('#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(pdfText(agencyName), 40, 32);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(pdfText(`Rapport ${PERIOD_LABELS[kind].toLowerCase()} - ${title}`), 40, 52);
      doc.setTextColor('#334155');
      doc.setFontSize(8);
      doc.text(pdfText(`Du ${formatDate(start)} au ${formatDate(end)} - montants en ${cur} (taux indicatifs) - édité le ${new Date().toLocaleString('fr-FR')}`), 40, 88);

      const section = (label: string) => {
        const y = ((doc as any).lastAutoTable?.finalY ?? 96) + 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor('#0f172a');
        doc.text(pdfText(label), 40, y);
        return y + 6;
      };
      const table = (label: string, head: string[], body: (string | number)[][], right: number[] = []) => {
        const startY = section(label);
        autoTable(doc, {
          startY,
          head: [head.map(pdfText)],
          body: body.length ? body.map((r) => r.map((c) => pdfText(String(c)))) : [[pdfText('Aucune donnée sur la période'), ...head.slice(1).map(() => '')]],
          margin: { left: 40, right: 40 },
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: color, textColor: '#ffffff' },
          alternateRowStyles: { fillColor: '#f8fafc' },
          columnStyles: Object.fromEntries(right.map((i) => [i, { halign: 'right' as const }])),
        });
      };

      table(
        'Synthèse',
        ['Indicateur', 'Valeur'],
        [
          ['Revenus', money(report.revenue)],
          ...(showFinance ? [['Dépenses', money(report.expenseTotal)], ['Résultat', money(report.net)]] : []),
          ['Colis enregistrés', String(report.registered.length)],
          ['Poids total', `${formatNumber(report.registered.reduce((s, r) => s + r.weightKg, 0), 1)} kg`],
          ['Volume total', `${formatNumber(report.registered.reduce((s, r) => s + r.volumeCbm, 0), 3)} CBM`],
        ],
        [1]
      );
      table(
        'Expéditions par mode de transport',
        ['Mode', 'Colis', 'Poids', 'Volume', 'Fret facturé'],
        report.byMode.map((r) => [SHIPMENT_MODE_LABELS[r.mode], r.count, `${formatNumber(r.weight)} kg`, `${formatNumber(r.volume, 1)} CBM`, money(r.billed)]),
        [1, 2, 3, 4]
      );
      if (showFinance && kind !== 'day') {
        table(
          'Revenus et dépenses par jour',
          ['Date', 'Revenus', 'Dépenses', 'Résultat'],
          report.daily.filter((d) => d.revenue || d.expenses).map((d) => [formatDate(d.date), money(d.revenue), money(d.expenses), money(d.revenue - d.expenses)]),
          [1, 2, 3]
        );
      }
      table('Encaissements', ['Date', 'Origine', 'Client', 'Paiement', 'Montant'], report.income.map((r) => [formatDate(r.date), r.source, r.party, r.method, money(r.usd)]), [4]);
      if (showFinance) {
        table(
          'Dépenses',
          ['Date', 'Catégorie', 'Description', 'Paiement', 'Montant'],
          report.spent.map((e) => [formatDate(e.date), EXPENSE_CATEGORY_LABELS[e.category], e.description, PAYMENT_METHOD_LABELS[e.paymentMethod] || '', formatMoney(e.amount, e.currency)]),
          [4]
        );
      }
      table(
        'Colis enregistrés',
        ['Référence', 'Client', 'Mode', 'Trajet', 'Poids / Volume', 'Fret', 'Statut'],
        report.registered.map((s) => [
          s.trackingRef,
          s.customerName,
          SHIPMENT_MODE_LABELS[s.mode],
          `${s.originCity} -> ${s.destinationCity}`,
          `${formatNumber(s.weightKg, 1)} kg / ${formatNumber(s.volumeCbm, 3)} CBM`,
          money(s.estimatedCost),
          SHIPMENT_STATUS_LABELS[s.status],
        ]),
        [5]
      );

      // Pied de page
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor('#94a3b8');
        doc.text(pdfText(`${agencyName} - ASEP MARKET`), 40, doc.internal.pageSize.getHeight() - 20);
        doc.text(`Page ${i} / ${pages}`, W - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      }
      doc.save(`${fileBase}.pdf`);
      logActivity('reports', `a exporté le rapport ${PERIOD_LABELS[kind].toLowerCase()} (${title}) en PDF`);
    } catch {
      addToast('Export PDF impossible.', 'error');
    } finally {
      setBusy('');
    }
  };

  const changeKind = (k: PeriodKind) => {
    setKind(k);
    if (k === 'month') setRef(`${ref.slice(0, 7)}-01`);
  };
  const isCurrent = periodRange(kind, iso(new Date())).start === start;

  return (
    <>
      <PageHeader
        title="Rapports"
        subtitle={`Montants en ${cur} (taux indicatifs) · revenus = paiements de fret déclarés${settings.display.showMarketplaceOrders ? ' + commandes marketplace' : ''}`}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start">
          {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((k) => (
            <button
              key={k}
              onClick={() => changeKind(k)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${kind === k ? 'bg-[#123B70] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button className={btn.icon} onClick={() => setRef(shift(kind, ref, -1))} aria-label="Période précédente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {kind === 'month' ? (
            <input type="month" className={`${inputClass} w-40`} value={ref.slice(0, 7)} onChange={(e) => e.target.value && setRef(`${e.target.value}-01`)} aria-label="Mois" />
          ) : (
            <input type="date" className={`${inputClass} w-40`} value={ref} onChange={(e) => e.target.value && setRef(e.target.value)} aria-label="Date" />
          )}
          <button className={btn.icon} onClick={() => setRef(shift(kind, ref, 1))} aria-label="Période suivante">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrent && (
            <button className="text-[11px] font-semibold text-[#123B70] hover:underline ml-1 cursor-pointer" onClick={() => setRef(iso(new Date()))}>
              {kind === 'day' ? "Aujourd'hui" : kind === 'week' ? 'Cette semaine' : 'Ce mois'}
            </button>
          )}
        </div>
        <div className="md:ml-auto text-sm font-semibold text-slate-900 first-letter:uppercase">{title}</div>
      </div>

      <div className="rounded-xl border border-[#123B70]/15 bg-[#123B70]/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-xs text-slate-700">
          <div className="font-semibold text-slate-900">Télécharger le rapport {PERIOD_LABELS[kind].toLowerCase()}</div>
          <div className="text-[11px] text-slate-500 first-letter:uppercase">{title} · synthèse, encaissements, dépenses et colis</div>
        </div>
        {canExport ? (
          <div className="flex gap-2">
            <button className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer bg-rose-600 hover:bg-rose-700" onClick={exportPdf} disabled={!!busy}>
              <FileText className="w-4 h-4" /> {busy === 'pdf' ? 'Préparation…' : 'Télécharger en PDF'}
            </button>
            <button className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer bg-emerald-600 hover:bg-emerald-700" onClick={exportExcel} disabled={!!busy}>
              <FileSpreadsheet className="w-4 h-4" /> {busy === 'xlsx' ? 'Préparation…' : 'Télécharger en Excel'}
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">Votre rôle ne permet pas d’exporter les rapports (droit « Rapports → Exporter »).</div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Revenus" value={m.money(report.revenue)} hint={`${report.income.length} encaissement(s)`} />
        <StatCard label="Dépenses" value={showFinance ? m.money(report.expenseTotal) : '—'} hint={showFinance ? `${report.spent.length} dépense(s)` : undefined} />
        <StatCard label="Résultat" value={showFinance ? m.money(report.net) : '—'} hint={showFinance ? (report.net >= 0 ? 'Excédent' : 'Déficit') : undefined} />
        <StatCard
          label="Colis enregistrés"
          value={report.registered.length}
          hint={`${formatNumber(report.registered.reduce((s, r) => s + r.weightKg, 0))} kg · ${formatNumber(report.registered.reduce((s, r) => s + r.volumeCbm, 0), 1)} CBM`}
        />
      </div>

      {kind !== 'day' && (
        <Card title="Revenus et dépenses par jour">
          <ColumnChart
            ariaLabel="Revenus et dépenses par jour"
            data={report.daily.map((d) => ({
              label: kind === 'week' ? parse(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : String(parse(d.date).getDate()),
              values: { revenue: m.display(d.revenue), expenses: showFinance ? m.display(d.expenses) : 0 },
            }))}
            series={[
              { key: 'revenue', label: 'Revenus', color: CHART_COLORS.primary },
              ...(showFinance ? [{ key: 'expenses', label: 'Dépenses', color: CHART_COLORS.secondary }] : []),
            ]}
            formatValue={(n) => formatMoney(n, cur)}
            height={240}
          />
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {showFinance && (
          <Card title="Dépenses par catégorie">
            <BarList items={report.byCategory} formatValue={(n) => m.money(n)} color={CHART_COLORS.secondary} emptyText="Aucune dépense sur la période" />
          </Card>
        )}
        <Card title="Meilleurs clients (fret facturé)">
          <BarList items={report.topCustomers} formatValue={(n) => m.money(n)} emptyText="Aucune expédition sur la période" />
        </Card>
      </div>

      <Card title="Expéditions par mode de transport">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-2 text-left font-semibold">Mode</th>
                <th className="px-3 py-2 text-right font-semibold">Colis</th>
                <th className="px-3 py-2 text-right font-semibold">Poids</th>
                <th className="px-3 py-2 text-right font-semibold">Volume</th>
                <th className="px-5 py-2 text-right font-semibold">Fret facturé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.byMode.map((r) => (
                <tr key={r.mode}>
                  <td className="px-5 py-2.5 text-slate-800">{SHIPMENT_MODE_LABELS[r.mode]}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.count}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(r.weight)} kg</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(r.volume, 1)} CBM</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-semibold">{m.money(r.billed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-0">
        <Tabs
          tabs={[
            { key: 'income' as const, label: 'Encaissements', count: report.income.length },
            ...(showFinance ? [{ key: 'expenses' as const, label: 'Dépenses', count: report.spent.length }] : []),
            { key: 'shipments' as const, label: 'Colis enregistrés', count: report.registered.length },
          ]}
          value={list}
          onChange={setList}
        />
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 overflow-hidden">
          {list === 'income' &&
            (report.income.length === 0 ? (
              <EmptyState title="Aucun encaissement sur la période" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Origine</th>
                        <th className="p-3 font-semibold hidden sm:table-cell">Client</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Paiement</th>
                        <th className="p-3 font-semibold text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incomePager.items.map((r) => (
                        <tr key={r.id}>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(r.date)}</td>
                          <td className="p-3 text-slate-800">{r.source}</td>
                          <td className="p-3 hidden sm:table-cell text-slate-600">{r.party}</td>
                          <td className="p-3 hidden md:table-cell text-slate-600">{r.method}</td>
                          <td className="p-3 text-right tabular-nums font-semibold">{m.money(r.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={incomePager} />
              </>
            ))}

          {list === 'expenses' &&
            showFinance &&
            (report.spent.length === 0 ? (
              <EmptyState title="Aucune dépense sur la période" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Catégorie</th>
                        <th className="p-3 font-semibold hidden sm:table-cell">Description</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Paiement</th>
                        <th className="p-3 font-semibold text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expensePager.items.map((e) => (
                        <tr key={e.id}>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="p-3 text-slate-800">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                          <td className="p-3 hidden sm:table-cell text-slate-600 truncate max-w-[260px]">{e.description}</td>
                          <td className="p-3 hidden md:table-cell text-slate-600">{PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
                          <td className="p-3 text-right tabular-nums font-semibold">{formatMoney(e.amount, e.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={expensePager} />
              </>
            ))}

          {list === 'shipments' &&
            (report.registered.length === 0 ? (
              <EmptyState title="Aucun colis enregistré sur la période" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Colis</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Trajet</th>
                        <th className="p-3 font-semibold hidden sm:table-cell">Poids / Volume</th>
                        <th className="p-3 font-semibold">Statut</th>
                        <th className="p-3 font-semibold text-right">Fret</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shipmentPager.items.map((s) => (
                        <tr key={s.id}>
                          <td className="p-3">
                            <div className="font-mono font-semibold text-slate-900">{s.trackingRef}</div>
                            <div className="text-[11px] text-slate-500">{s.customerName}</div>
                          </td>
                          <td className="p-3 hidden md:table-cell text-slate-600">
                            {s.originCity} → {s.destinationCity}
                            <div className="text-[11px] text-slate-400">{SHIPMENT_MODE_LABELS[s.mode]}</div>
                          </td>
                          <td className="p-3 hidden sm:table-cell text-slate-600 tabular-nums">
                            {formatNumber(s.weightKg, 1)} kg · {formatNumber(s.volumeCbm, 3)} CBM
                          </td>
                          <td className="p-3 text-slate-700">{SHIPMENT_STATUS_LABELS[s.status]}</td>
                          <td className="p-3 text-right tabular-nums font-semibold">{m.money(s.estimatedCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={shipmentPager} />
              </>
            ))}
        </div>
      </div>
    </>
  );
};
