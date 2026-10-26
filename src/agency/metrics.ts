import { useMemo } from 'react';
import { useWorkspace } from './AgencyWorkspaceContext';
import { ExpenseCategory } from './types';
import { EXPENSE_CATEGORY_LABELS, formatMoney, fromUSD, lastMonths, monthKey, paymentUSD, toUSD, todayISO } from './utils';

/**
 * Indicateurs calculés sur les données de l'agence active.
 * Les montants sont ramenés en USD puis affichés dans la devise par défaut de l'agence
 * (taux indicatifs, voir FX_PER_USD).
 */
export const useAgencyMetrics = (months = 6) => {
  const { expenses, shipments, orders, settings } = useWorkspace();
  const currency = settings.defaultCurrency;

  return useMemo(() => {
    const display = (usd: number) => fromUSD(usd, currency);
    const money = (usd: number, compact = false) => formatMoney(display(usd), currency, compact);

    // Revenus : paiements déclarés sur les colis + commandes marketplace
    const revenueEntries = [
      ...shipments.flatMap((s) => s.payments.map((p) => ({ date: p.date, usd: paymentUSD(p) }))),
      ...orders.map((o) => ({ date: o.date, usd: o.totalUSD })),
    ];
    const expenseEntries = expenses.map((e) => ({ date: e.date, usd: toUSD(e.amount, e.currency), category: e.category }));

    const today = todayISO();
    const thisMonth = monthKey(today);

    const monthly = lastMonths(months).map((m) => ({
      key: m.key,
      label: m.label,
      revenue: revenueEntries.filter((r) => monthKey(r.date) === m.key).reduce((s, r) => s + r.usd, 0),
      expenses: expenseEntries.filter((e) => monthKey(e.date) === m.key).reduce((s, e) => s + e.usd, 0),
    }));

    const byCategory = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[])
      .map((cat) => ({
        category: cat,
        label: EXPENSE_CATEGORY_LABELS[cat],
        usd: expenseEntries.filter((e) => e.category === cat && monthKey(e.date) >= monthly[0].key).reduce((s, e) => s + e.usd, 0),
      }))
      .filter((c) => c.usd > 0)
      .sort((a, b) => b.usd - a.usd);

    const freightBilled = shipments.reduce((s, sh) => s + sh.estimatedCost, 0);
    const freightPaid = shipments.reduce((s, sh) => s + sh.payments.reduce((x, p) => x + paymentUSD(p), 0), 0);

    return {
      currency,
      display,
      money,
      monthly,
      byCategory,
      expensesToday: expenseEntries.filter((e) => e.date === today).reduce((s, e) => s + e.usd, 0),
      expensesMonth: expenseEntries.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.usd, 0),
      revenueMonth: revenueEntries.filter((r) => monthKey(r.date) === thisMonth).reduce((s, r) => s + r.usd, 0),
      revenueTotal: revenueEntries.reduce((s, r) => s + r.usd, 0),
      revenuePeriod: monthly.reduce((s, m) => s + m.revenue, 0),
      expensesPeriod: monthly.reduce((s, m) => s + m.expenses, 0),
      freightBilled,
      freightPaid,
      freightOutstanding: Math.max(0, freightBilled - freightPaid),
    };
  }, [expenses, shipments, orders, currency, months]);
};
