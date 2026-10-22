import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { useAgencyMetrics } from '../metrics';
import { BarList, btn, Card, CHART_COLORS, ColumnChart, inputClass, PageHeader, StatCard } from '../ui';
import { downloadCSV, formatMoney, formatNumber, monthKey, SHIPMENT_MODE_LABELS } from '../utils';

export const ReportsPage: React.FC = () => {
  const { shipments, customers, can, logActivity, activeAgency } = useWorkspace();
  const [months, setMonths] = useState(6);
  const m = useAgencyMetrics(months);
  const showFinance = can('expenses') || can('reports', 'export');
  const net = m.revenuePeriod - m.expensesPeriod;

  const start = m.monthly[0].key;
  const periodShipments = shipments.filter((s) => monthKey(s.createdAt) >= start);

  const byMode = (['sea', 'air'] as const).map((mode) => {
    const rows = periodShipments.filter((s) => s.mode === mode);
    return {
      mode,
      count: rows.length,
      weight: rows.reduce((s, r) => s + r.weightKg, 0),
      volume: rows.reduce((s, r) => s + r.volumeCbm, 0),
      billed: rows.reduce((s, r) => s + r.estimatedCost, 0),
    };
  });

  const topCustomers = customers
    .map((c) => ({ label: c.name, value: periodShipments.filter((s) => s.customerId === c.id).reduce((sum, s) => sum + s.estimatedCost, 0) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const exportCsv = () => {
    downloadCSV(
      `rapport-${activeAgency?.name || 'agence'}-${months}mois.csv`,
      ['Mois', `Revenus (${m.currency})`, `Dépenses (${m.currency})`, `Résultat (${m.currency})`],
      m.monthly.map((x) => [x.key, Math.round(m.display(x.revenue)), Math.round(m.display(x.expenses)), Math.round(m.display(x.revenue - x.expenses))])
    );
    logActivity('reports', `a exporté le rapport sur ${months} mois`);
  };

  return (
    <>
      <PageHeader
        title="Rapports"
        subtitle={`Montants en ${m.currency} (taux indicatifs) · revenus = paiements de fret déclarés + commandes marketplace`}
        actions={
          <>
            <select className={`${inputClass} w-40`} value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Période">
              <option value={3}>3 derniers mois</option>
              <option value={6}>6 derniers mois</option>
              <option value={12}>12 derniers mois</option>
            </select>
            {can('reports', 'export') && (
              <button className={btn.secondary} onClick={exportCsv}>
                <Download className="w-4 h-4" /> Exporter CSV
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Revenus" value={m.money(m.revenuePeriod)} />
        <StatCard label="Dépenses" value={showFinance ? m.money(m.expensesPeriod) : '—'} />
        <StatCard label="Résultat" value={showFinance ? m.money(net) : '—'} hint={showFinance ? (net >= 0 ? 'Excédent' : 'Déficit') : undefined} />
        <StatCard label="Reste à encaisser (fret)" value={m.money(m.freightOutstanding)} />
      </div>

      <Card title="Revenus et dépenses par mois">
        <ColumnChart
          ariaLabel="Revenus et dépenses par mois"
          data={m.monthly.map((x) => ({ label: x.label, values: { revenue: m.display(x.revenue), expenses: m.display(x.expenses) } }))}
          series={[
            { key: 'revenue', label: 'Revenus', color: CHART_COLORS.primary },
            { key: 'expenses', label: 'Dépenses', color: CHART_COLORS.secondary },
          ]}
          formatValue={(n) => formatMoney(n, m.currency)}
          height={260}
        />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Dépenses par catégorie">
          <BarList items={m.byCategory.map((c) => ({ label: c.label, value: c.usd }))} formatValue={(n) => m.money(n)} color={CHART_COLORS.secondary} />
        </Card>
        <Card title="Meilleurs clients (fret facturé)">
          <BarList items={topCustomers} formatValue={(n) => m.money(n)} emptyText="Aucune expédition sur la période" />
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
              {byMode.map((r) => (
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
    </>
  );
};
