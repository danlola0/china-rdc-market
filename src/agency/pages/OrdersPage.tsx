import React, { useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { useSearchParams } from 'react-router-dom';
import { FileText, ShoppingCart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStatus, RFQ } from '../../types';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { Badge, btn, EmptyState, Field, inputClass, Modal, PageHeader, Tabs } from '../ui';
import { formatDate, formatMoney } from '../utils';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  en_production: 'En production',
  expedie_chine: 'Expédiée de Chine',
  transit_maritime: 'Transit maritime',
  douane_matadi: 'Douane (Matadi / Ndjili)',
  arrive_kinshasa: 'Arrivée en RDC',
  livre: 'Livrée',
};

const RFQ_STATUS: Record<RFQ['status'], { label: string; cls: string }> = {
  pending: { label: 'À chiffrer', cls: 'bg-amber-100 text-amber-800' },
  quoted: { label: 'Offre envoyée', cls: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Refusée', cls: 'bg-slate-100 text-slate-600' },
};

export const OrdersPage: React.FC = () => {
  const { updateOrderStatus, respondRFQ } = useApp();
  const { orders, rfqs, can, logActivity } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'rfqs' ? 'rfqs' : 'orders';
  const [answering, setAnswering] = useState<RFQ | null>(null);
  const [quote, setQuote] = useState({ price: '', shipping: '', notes: '' });

  const openQuote = (r: RFQ) => {
    setAnswering(r);
    setQuote({
      price: String(r.quotedPriceUSD ?? r.targetPriceUSD ?? ''),
      shipping: String(r.quotedShippingUSD ?? ''),
      notes: r.agencyNotes || '',
    });
  };

  const sendQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answering) return;
    respondRFQ(answering.id, parseFloat(quote.price) || 0, parseFloat(quote.shipping) || 0, quote.notes);
    logActivity('orders', `a chiffré le devis ${answering.rfqNumber}`);
    setAnswering(null);
  };

  const changeStatus = (orderId: string, orderNumber: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    logActivity('orders', `a passé la commande ${orderNumber} au statut « ${ORDER_STATUS_LABELS[status]} »`);
  };

  return (
    <>
      <PageHeader title="Commandes" subtitle="Commandes et demandes de devis reçues via la marketplace" />

      <Tabs
        tabs={[
          { key: 'orders', label: 'Commandes', count: orders.length },
          { key: 'rfqs', label: 'Demandes de devis', count: rfqs.filter((r) => r.status === 'pending').length },
        ]}
        value={tab}
        onChange={(k) => setParams(k === 'rfqs' ? { tab: 'rfqs' } : {})}
      />

      {tab === 'orders' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Aucune commande" text="Les commandes apparaissent quand un acheteur accepte un de vos devis." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Commande</th>
                    <th className="p-3 font-semibold">Client</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Article</th>
                    <th className="p-3 font-semibold text-right">Total</th>
                    <th className="p-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold font-mono text-slate-900">{o.orderNumber}</div>
                        <div className="text-[11px] text-slate-400">{formatDate(o.date)}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800">{o.buyerName}</div>
                        <div className="text-[11px] text-slate-400">{o.destinationCity}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="text-slate-800 truncate max-w-[220px]">{o.productName}</div>
                        <div className="text-[11px] text-slate-400">
                          {o.quantity} unités · {o.shippingMode}
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{formatMoney(o.totalUSD)}</td>
                      <td className="p-3">
                        {can('orders', 'edit') ? (
                          <select
                            value={o.status}
                            onChange={(e) => changeStatus(o.id, o.orderNumber, e.target.value as OrderStatus)}
                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            aria-label={`Statut de ${o.orderNumber}`}
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700">{ORDER_STATUS_LABELS[o.status]}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {rfqs.length === 0 ? (
            <EmptyState icon={FileText} title="Aucune demande de devis" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Demande</th>
                    <th className="p-3 font-semibold">Acheteur</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">Quantité</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Livraison</th>
                    <th className="p-3 font-semibold">Statut</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rfqs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">{r.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.rfqNumber}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800">{r.buyerName}</div>
                        <div className="text-[11px] text-slate-400">{r.buyerCity}</div>
                      </td>
                      <td className="p-3 tabular-nums hidden sm:table-cell">{r.quantity}</td>
                      <td className="p-3 text-slate-600 hidden md:table-cell">{r.deliveryPort}</td>
                      <td className="p-3">
                        <Badge className={RFQ_STATUS[r.status].cls}>{RFQ_STATUS[r.status].label}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {can('orders', 'edit') && r.status !== 'accepted' && (
                          <button className={btn.primary} onClick={() => openQuote(r)}>
                            {r.status === 'pending' ? 'Chiffrer' : 'Modifier l’offre'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!answering}
        title={`Offre chiffrée — ${answering?.rfqNumber || ''}`}
        onClose={() => setAnswering(null)}
        footer={
          <>
            <button className={btn.secondary} onClick={() => setAnswering(null)}>
              Annuler
            </button>
            <button className={btn.accent} type="submit" form="quote-form">
              Envoyer l’offre
            </button>
          </>
        }
      >
        {answering && (
          <form id="quote-form" onSubmit={sendQuote} className="space-y-4">
            <p className="text-slate-600">
              {answering.buyerName} demande <strong>{answering.quantity}</strong> × {answering.productName}
              {answering.targetPriceUSD ? ` (prix cible ${formatMoney(answering.targetPriceUSD)})` : ''}.
            </p>
            {answering.notes && <p className="p-3 bg-slate-50 rounded-lg text-slate-600">« {answering.notes} »</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Prix unitaire FOB (USD)" required>
                <NumberInput className={inputClass} value={quote.price} onChange={(v) => setQuote({ ...quote, price: v })} required />
              </Field>
              <Field label="Fret estimé vers la RDC (USD)" required>
                <NumberInput className={inputClass} value={quote.shipping} onChange={(v) => setQuote({ ...quote, shipping: v })} required />
              </Field>
            </div>
            <Field label="Conditions et remarques">
              <textarea rows={3} className={inputClass} value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} />
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
};
