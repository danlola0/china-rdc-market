import React, { useEffect, useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, MessageCircle, MessageSquare, ShoppingCart, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { Order, OrderStatus, RFQ } from '../../types';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { Badge, btn, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader, Tabs, Pagination, usePagination } from '../ui';
import { formatDate, formatMoney, whatsappUrl } from '../utils';

/** Coordonnées saisies par le client à la commande (« adresse · Tél. … · Note : … ») */
const contactOf = (o: Order) => {
  const parts = (o.deliveryAddress || '').split(' · ').map((x) => x.trim());
  const phone = parts.find((x) => x.startsWith('Tél.'))?.replace(/^Tél\.\s*/, '') || '';
  const address = parts.filter((x) => x && !x.startsWith('Tél.') && !x.startsWith('Note :')).join(', ');
  return { phone, address: address === o.destinationCity ? '' : address };
};

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
  const { updateOrderStatus, respondRFQ, deleteOrder, openConversationWithBuyer } = useApp();
  const { orders, rfqs, can, logActivity, activeAgencyId, activeAgency, customers, saveCustomer, defaultBranchId } = useWorkspace();
  const [saving, setSaving] = useState<string | null>(null);

  // Téléphone des clients (compte acheteur ou dernier devis), quand il n'a pas été saisi à la commande
  const [buyerPhones, setBuyerPhones] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!activeAgencyId || !can('orders')) return;
    supabase.rpc('agency_buyer_phones', { p_agency: activeAgencyId }).then(({ data }) => setBuyerPhones((data as Record<string, string>) || {}));
  }, [activeAgencyId, orders.length, rfqs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const phoneFor = (o: Order): string => contactOf(o).phone || buyerPhones[o.buyerId] || '';

  // Client déjà dans la base de l'agence (lié à son compte acheteur)
  const savedCustomer = (o: Order) => customers.find((c) => c.buyerId === o.buyerId);

  const registerCustomer = async (o: Order) => {
    const { address } = contactOf(o);
    const phone = phoneFor(o);
    setSaving(o.id);
    await saveCustomer({
      name: o.buyerName,
      phone,
      city: o.destinationCity,
      address,
      buyerId: o.buyerId,
      status: 'active',
      notes: `Client marketplace — commande ${o.orderNumber}`,
      branchId: defaultBranchId,
    });
    setSaving(null);
  };

  const whatsappMessage = (o: Order) =>
    `Bonjour ${o.buyerName}, c’est ${activeAgency?.name || 'votre fournisseur'} au sujet de votre commande ${o.orderNumber} : ${o.quantity} × « ${o.productName} » (${formatMoney(o.totalUSD)}), livraison à ${o.destinationCity}. `;
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  // Discuter avec l'acheteur (comme sur Alibaba) : ouvre ou crée la conversation
  const chatWith = async (buyerId: string, key: string) => {
    if (!activeAgencyId) return;
    setOpening(key);
    const id = await openConversationWithBuyer(activeAgencyId, buyerId);
    setOpening(null);
    if (id) navigate(`/agency/conversations?c=${id}`);
  };

  const removeOrder = async (o: Order) => {
    if (await deleteOrder(o.id)) logActivity('orders', `a supprimé la commande ${o.orderNumber}`);
  };
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

  const ordersPager = usePagination(orders);

  const rfqsPager = usePagination(rfqs);

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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 font-semibold">Commande</th>
                      <th className="p-3 font-semibold">Client</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Article</th>
                      <th className="p-3 font-semibold text-right">Total</th>
                      <th className="p-3 font-semibold">Statut</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordersPager.items.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-semibold font-mono text-slate-900">{o.orderNumber}</div>
                          <div className="text-[11px] text-slate-400">{formatDate(o.date)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-800">{o.buyerName}</div>
                          <div className="text-[11px] text-slate-400">
                            {o.destinationCity}
                            {phoneFor(o) ? ` · ${phoneFor(o)}` : ''}
                          </div>
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
                        <td className="p-3">
                          <div className="flex flex-wrap justify-end gap-1">
                            {phoneFor(o) ? (
                              <a
                                href={whatsappUrl(phoneFor(o), whatsappMessage(o))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold"
                                title={`Discuter avec ${o.buyerName} sur WhatsApp (${phoneFor(o)})`}
                              >
                                <MessageCircle className="w-4 h-4" /> <span className="hidden lg:inline">WhatsApp</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center px-2 text-[10px] text-slate-400" title="Le client n’a pas indiqué de téléphone : utilisez « Discuter »">
                                Pas de WhatsApp
                              </span>
                            )}
                            {can('customers', 'create') &&
                              (savedCustomer(o) ? (
                                <span className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-emerald-700" title="Ce client est déjà dans Gestion clients">
                                  <UserCheck className="w-4 h-4" /> <span className="hidden lg:inline">Enregistré</span>
                                </span>
                              ) : (
                                <button className={btn.secondary} onClick={() => registerCustomer(o)} disabled={saving === o.id} title="Enregistrer ce client dans Gestion clients">
                                  <UserPlus className="w-4 h-4 text-[#123B70]" /> <span className="hidden lg:inline">{saving === o.id ? 'Enregistrement…' : 'Enregistrer le client'}</span>
                                </button>
                              ))}
                            {can('conversations') && (
                              <button className={btn.primary} onClick={() => chatWith(o.buyerId, o.id)} disabled={opening === o.id} title={`Discuter avec ${o.buyerName}`}>
                                <MessageSquare className="w-4 h-4" /> <span className="hidden lg:inline">{opening === o.id ? 'Ouverture…' : 'Discuter'}</span>
                              </button>
                            )}
                            {can('orders', 'delete') && (
                              <button className={btn.secondary} onClick={() => setDeleting(o)} title="Supprimer la commande">
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pager={ordersPager} />
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {rfqs.length === 0 ? (
            <EmptyState icon={FileText} title="Aucune demande de devis" />
          ) : (
            <>
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
                    {rfqsPager.items.map((r) => (
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
                        <td className="p-3">
                          <div className="flex flex-wrap justify-end gap-1">
                            {(r.buyerPhone || buyerPhones[r.buyerId]) && (
                              <a
                                href={whatsappUrl(
                                  r.buyerPhone || buyerPhones[r.buyerId],
                                  `Bonjour ${r.buyerName}, c’est ${activeAgency?.name || 'votre fournisseur'} au sujet de votre demande de devis ${r.rfqNumber} : ${r.quantity} × « ${r.productName} ». `
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold"
                                title={`Discuter avec ${r.buyerName} sur WhatsApp`}
                              >
                                <MessageCircle className="w-4 h-4" /> <span className="hidden lg:inline">WhatsApp</span>
                              </a>
                            )}
                            {can('conversations') && (
                              <button className={btn.secondary} onClick={() => chatWith(r.buyerId, r.id)} disabled={opening === r.id} title={`Discuter avec ${r.buyerName}`}>
                                <MessageSquare className="w-4 h-4 text-[#123B70]" /> <span className="hidden lg:inline">Discuter</span>
                              </button>
                            )}
                            {can('orders', 'edit') && r.status !== 'accepted' && (
                              <button className={btn.primary} onClick={() => openQuote(r)}>
                                {r.status === 'pending' ? 'Chiffrer' : 'Modifier l’offre'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pager={rfqsPager} />
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer la commande"
        text={`La commande ${deleting?.orderNumber} de ${deleting?.buyerName} (${deleting?.productName}) sera définitivement supprimée. Le client sera prévenu par une notification.`}
        confirmLabel="Supprimer"
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && removeOrder(deleting)}
      />

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
