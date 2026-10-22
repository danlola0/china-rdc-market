import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, PackageCheck, Receipt, ShoppingCart, Truck, UserCog, Users, Wallet } from 'lucide-react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { useAgencyMetrics } from '../metrics';
import { MODULES } from '../permissions';
import { BarList, Card, CHART_COLORS, ColumnChart, EmptyState, PageHeader, StatCard } from '../ui';
import { formatDateTime, formatMoney } from '../utils';

export const DashboardPage: React.FC = () => {
  const { activeAgency, currentMember, customers, members, products, shipments, orders, rfqs, activity, can } = useWorkspace();
  const m = useAgencyMetrics(6);

  const inTransit = shipments.filter((s) => s.status === 'in_transit' || s.status === 'preparing').length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const pendingOrders = orders.filter((o) => o.status === 'en_attente').length + rfqs.filter((r) => r.status === 'pending').length;
  const canFinance = can('expenses') || can('reports');
  const moduleLabel = (key: string) => MODULES.find((x) => x.key === key)?.label || key;

  return (
    <>
      <PageHeader
        title={`Bonjour ${currentMember?.fullName.split(' ')[0] || ''}`}
        subtitle={`Activité de ${activeAgency?.name} — uniquement les données de cette agence.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Clients" value={customers.length} icon={Users} hint={`${customers.filter((c) => c.status === 'vip').length} VIP`} />
        <StatCard label="Employés" value={members.filter((x) => x.status === 'active').length} icon={UserCog} hint={`${members.filter((x) => x.status === 'invited').length} invitation(s) en attente`} />
        <StatCard label="Articles" value={products.length} icon={Package} hint={`${products.filter((p) => !p.inStock).length} en rupture`} />
        <StatCard label="Colis en transit" value={inTransit} icon={Truck} hint="Préparation et transit" />
        <StatCard label="Colis livrés" value={delivered} icon={PackageCheck} />
        <StatCard
          label="Dépenses du mois"
          value={canFinance ? m.money(m.expensesMonth) : '—'}
          icon={Receipt}
          hint={canFinance ? `Aujourd’hui : ${m.money(m.expensesToday)}` : 'Réservé aux finances'}
        />
        <StatCard
          label="Revenus enregistrés"
          value={canFinance ? m.money(m.revenueMonth) : '—'}
          icon={Wallet}
          hint={canFinance ? 'Ce mois-ci (fret + commandes)' : 'Réservé aux finances'}
        />
        <StatCard label="En attente" value={pendingOrders} icon={ShoppingCart} hint="Commandes et devis à traiter" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {canFinance ? (
          <Card title="Revenus et dépenses — 6 derniers mois" className="lg:col-span-2">
            <ColumnChart
              ariaLabel="Revenus et dépenses mensuels"
              data={m.monthly.map((x) => ({ label: x.label, values: { revenue: m.display(x.revenue), expenses: m.display(x.expenses) } }))}
              series={[
                { key: 'revenue', label: 'Revenus', color: CHART_COLORS.primary },
                { key: 'expenses', label: 'Dépenses', color: CHART_COLORS.secondary },
              ]}
              formatValue={(n) => formatMoney(n, m.currency)}
            />
          </Card>
        ) : (
          <Card title="Colis par statut" className="lg:col-span-2">
            <BarList
              items={[
                { label: 'Enregistrés', value: shipments.filter((s) => s.status === 'registered').length },
                { label: 'En préparation', value: shipments.filter((s) => s.status === 'preparing').length },
                { label: 'En transit', value: shipments.filter((s) => s.status === 'in_transit').length },
                { label: 'Arrivés', value: shipments.filter((s) => s.status === 'arrived').length },
                { label: 'Livrés', value: delivered },
              ]}
              formatValue={(n) => String(n)}
              emptyText="Aucun colis enregistré"
            />
          </Card>
        )}

        <Card title="Activité récente">
          {activity.length === 0 ? (
            <EmptyState icon={Clock} title="Aucune activité" />
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 7).map((a) => (
                <li key={a.id} className="text-xs">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">{a.actorName}</span> {a.description}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {moduleLabel(a.module)} · {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {canFinance && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Dépenses par catégorie — 6 derniers mois">
            <BarList items={m.byCategory.map((c) => ({ label: c.label, value: c.usd }))} formatValue={(n) => m.money(n)} color={CHART_COLORS.secondary} emptyText="Aucune dépense enregistrée" />
          </Card>
          <Card title="Fret">
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-500">Facturé (estimé)</dt>
                <dd className="text-lg font-bold text-slate-900 tabular-nums">{m.money(m.freightBilled)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Paiements déclarés</dt>
                <dd className="text-lg font-bold text-slate-900 tabular-nums">{m.money(m.freightPaid)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Reste à encaisser</dt>
                <dd className="text-lg font-bold text-slate-900 tabular-nums">{m.money(m.freightOutstanding)}</dd>
              </div>
            </dl>
            {can('freight') && (
              <Link to="/agency/freight" className="inline-block mt-4 text-xs font-semibold text-[#123B70] hover:underline">
                Voir les expéditions →
              </Link>
            )}
          </Card>
        </div>
      )}
    </>
  );
};
