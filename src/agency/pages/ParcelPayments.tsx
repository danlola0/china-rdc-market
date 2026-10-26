import React, { useEffect, useState } from 'react';
import { FileText, MessageCircle } from 'lucide-react';
import { NumberInput } from '../../components/common/NumberInput';
import { useApp } from '../../context/AppContext';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyShipment, Currency, PaymentMethod, ShipmentPayment } from '../types';
import { btn, CurrencySelect, Field, inputClass, Modal, PaymentMethodPicker } from '../ui';
import { formatDate, formatMoney, PAYMENT_METHOD_LABELS, paymentUSD, todayISO, trackingLink, whatsappUrl } from '../utils';

export const paidOf = (s: AgencyShipment) => s.payments.reduce((sum, p) => sum + paymentUSD(p), 0);

/** Texte compatible avec la police standard du PDF */
const pdfText = (s: string) =>
  String(s ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->');

/** Reçu de paiement en PDF (une page A5) */
export const downloadReceipt = async (shipment: AgencyShipment, payment: ShipmentPayment, agency: { name: string; phone?: string; city?: string }, color = '#123B70') => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const paid = paidOf(shipment);
  const rest = Math.max(0, shipment.estimatedCost - paid);

  doc.setFillColor(color);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(pdfText(agency.name), 28, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(pdfText([agency.city, agency.phone].filter(Boolean).join(' - ')), 28, 47);

  doc.setTextColor('#0f172a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REÇU DE PAIEMENT', 28, 96);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#64748b');
  doc.text(pdfText(`N° ${payment.id.slice(0, 8).toUpperCase()} - ${formatDate(payment.date)}`), 28, 112);

  const rows: [string, string][] = [
    ['Client', shipment.customerName],
    ['Colis', `${shipment.trackingRef} - ${shipment.description}`],
    ['Trajet', `${shipment.originCity} -> ${shipment.destinationCity}`],
    ['Montant reçu', formatMoney(payment.amount, payment.currency || 'USD')],
    ['Mode de paiement', PAYMENT_METHOD_LABELS[payment.method] || payment.method],
    ...(payment.note ? ([['Note', payment.note]] as [string, string][]) : []),
    ['Total du fret', formatMoney(shipment.estimatedCost)],
    ['Total payé', formatMoney(paid)],
    ['Reste à payer', rest > 0 ? formatMoney(rest) : 'Soldé'],
  ];
  let y = 140;
  for (const [k, v] of rows) {
    doc.setTextColor('#64748b');
    doc.setFont('helvetica', 'normal');
    doc.text(pdfText(k), 28, y);
    doc.setTextColor('#0f172a');
    doc.setFont('helvetica', k === 'Montant reçu' || k === 'Reste à payer' ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(pdfText(v), W - 160);
    doc.text(lines, 130, y);
    y += 18 * Math.max(1, lines.length);
    if (k === 'Note' || k === 'Mode de paiement') {
      doc.setDrawColor('#e2e8f0');
      doc.line(28, y - 8, W - 28, y - 8);
      y += 6;
    }
  }
  const link = trackingLink(shipment.trackingToken);
  if (link) {
    doc.setFontSize(8);
    doc.setTextColor('#64748b');
    doc.text(pdfText('Suivez votre colis : ' + link), 28, y + 16, { maxWidth: W - 56 });
  }
  doc.setFontSize(7);
  doc.setTextColor('#94a3b8');
  doc.text(pdfText(`Édité le ${new Date().toLocaleString('fr-FR')} - ASEP MARKET`), 28, doc.internal.pageSize.getHeight() - 20);
  doc.save(`recu-${shipment.trackingRef}-${payment.date}.pdf`);
};

/** Fenêtre « Paiements » d'un colis : historique, encaissement avec mode de paiement, reçu */
export const ParcelPayments: React.FC<{ parcel: AgencyShipment | null; phone: string; onClose: () => void }> = ({ parcel, phone, onClose }) => {
  const { addToast } = useApp();
  const { shipments, addShipmentPayment, can, activeAgency, settings } = useWorkspace();
  // Toujours la version à jour du colis (après un encaissement)
  const s = parcel ? shipments.find((x) => x.id === parcel.id) || parcel : null;
  const [form, setForm] = useState({ amount: '', currency: 'USD' as Currency, date: todayISO(), method: 'cash' as PaymentMethod, note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (parcel) setForm({ amount: '', currency: 'USD', date: todayISO(), method: 'cash', note: '' });
  }, [parcel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null;
  const paid = paidOf(s);
  const rest = Math.max(0, s.estimatedCost - paid);
  const agency = { name: activeAgency?.name || 'Agence', phone: activeAgency?.phoneWeChat, city: activeAgency?.city };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) return;
    setBusy(true);
    await addShipmentPayment(s.id, { amount, currency: form.currency, date: form.date, method: form.method, note: form.note });
    setBusy(false);
    setForm({ amount: '', currency: form.currency, date: todayISO(), method: form.method, note: '' });
  };

  const receipt = async (p: ShipmentPayment) => {
    try {
      await downloadReceipt(s, p, agency, settings.primaryColor);
    } catch {
      addToast('Reçu impossible à générer.', 'error');
    }
  };

  const confirmation = (p: ShipmentPayment) =>
    `Bonjour ${s.customerName}, nous confirmons la réception de ${formatMoney(p.amount, p.currency || 'USD')} (${PAYMENT_METHOD_LABELS[p.method]}) pour votre colis ${s.trackingRef}. ` +
    (rest > 0 ? `Reste à payer : ${formatMoney(rest)}.` : 'Votre colis est entièrement payé, merci !') +
    (s.trackingToken ? ` Suivi : ${trackingLink(s.trackingToken)}` : '') +
    `\n${agency.name}`;

  return (
    <Modal open title={`Paiements — ${s.trackingRef}`} onClose={onClose} size="lg">
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <div className="text-[11px] text-slate-500">Fret</div>
            <div className="font-bold text-slate-900 tabular-nums">{formatMoney(s.estimatedCost)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <div className="text-[11px] text-emerald-700">Payé</div>
            <div className="font-bold text-emerald-800 tabular-nums">{formatMoney(paid)}</div>
          </div>
          <div className={`rounded-lg p-2.5 ${rest > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <div className={`text-[11px] ${rest > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Reste</div>
            <div className={`font-bold tabular-nums ${rest > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>{rest > 0 ? formatMoney(rest) : 'Soldé'}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold text-slate-800 mb-1.5">Historique des paiements</div>
          {s.payments.length === 0 ? (
            <p className="text-slate-400">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {[...s.payments].reverse().map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 tabular-nums">{formatMoney(p.amount, p.currency || 'USD')}</div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(p.date)} · <span className="font-semibold text-slate-700">{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                      {p.note ? ` · ${p.note}` : ''}
                    </div>
                  </div>
                  <button type="button" className={btn.secondary} onClick={() => receipt(p)} title="Télécharger le reçu (PDF)">
                    <FileText className="w-4 h-4 text-rose-600" /> Reçu
                  </button>
                  {phone && (
                    <a
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold"
                      href={whatsappUrl(phone, confirmation(p))}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Confirmer le paiement au client sur WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" /> Confirmer
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {can('freight', 'edit') && (
          <form onSubmit={save} className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 font-semibold text-slate-800">Encaisser un paiement</div>
            <Field label="Montant" required hint={rest > 0 ? `Reste à payer : ${formatMoney(rest)}` : undefined}>
              <NumberInput className={inputClass} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required placeholder={rest > 0 ? String(rest) : ''} />
            </Field>
            <Field label="Devise">
              <CurrencySelect value={form.currency} onChange={(c) => setForm({ ...form, currency: c })} />
            </Field>
            <Field label="Date" required>
              <input type="date" className={inputClass} value={form.date} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <div className="sm:col-span-2">
              <PaymentMethodPicker value={form.method} onChange={(v: PaymentMethod) => setForm({ ...form, method: v })} />
            </div>
            <Field label="Note" className="sm:col-span-2">
              <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ex. référence de transaction M-Pesa" />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <button className={btn.primary} disabled={busy || !(parseFloat(form.amount) > 0)}>
                {busy ? 'Enregistrement…' : 'Enregistrer le paiement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
