import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, FilePlus2, FileText, MessageCircle, Palette, Pencil, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NumberInput } from '../../components/common/NumberInput';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyInvoice, Currency, InvoiceItem, InvoiceSettings, InvoiceStatus, PaymentMethod } from '../types';
import {
  Badge,
  btn,
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
  usePagination,
} from '../ui';
import { formatDate, formatMoney, fromUSD, PAYMENT_METHOD_LABELS, todayISO, toUSD, whatsappUrl } from '../utils';

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Envoyée', cls: 'bg-blue-100 text-blue-800' },
  partial: { label: 'Payée en partie', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Annulée', cls: 'bg-rose-100 text-rose-700' },
};

/** Sous-total, remise, TVA et total d'une facture */
export const invoiceTotals = (inv: Pick<AgencyInvoice, 'items' | 'discount' | 'taxRate'>) => {
  const subtotal = (inv.items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = Math.min(Number(inv.discount) || 0, subtotal);
  const base = subtotal - discount;
  const tax = Math.round(base * (Number(inv.taxRate) || 0)) / 100;
  return { subtotal, discount, tax, total: Math.round((base + tax) * 100) / 100 };
};

const isOverdue = (inv: AgencyInvoice) => !!inv.dueDate && inv.dueDate < todayISO() && !['paid', 'cancelled'].includes(inv.status);

/** Texte compatible avec la police standard du PDF */
const pdfText = (s: string) =>
  String(s ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->');

/** Image (logo) convertie pour le PDF ; null si elle ne peut pas être chargée */
const imageData = async (url?: string): Promise<{ data: string; format: string } | null> => {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const data: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return { data, format };
  } catch {
    return null;
  }
};

/** Facture PDF aux couleurs de l'agence */
export const downloadInvoicePdf = async (
  inv: AgencyInvoice,
  agency: { name: string; logo?: string; city?: string; country?: string; phone?: string; email?: string; address?: string },
  opts: InvoiceSettings,
  color: string
) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const c = opts.color || color || '#123B70';
  const t = invoiceTotals(inv);
  const money = (n: number) => pdfText(formatMoney(n, inv.currency));

  // En-tête : logo, agence, numéro
  doc.setFillColor(c);
  doc.rect(0, 0, W, 6, 'F');
  const logo = await imageData(agency.logo);
  let x = 40;
  if (logo) {
    try {
      doc.addImage(logo.data, logo.format, 40, 28, 54, 54);
      x = 104;
    } catch {
      // logo illisible : on continue sans
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#0f172a');
  doc.text(pdfText(agency.name), x, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#475569');
  const agencyLines = [agency.address, [agency.city, agency.country].filter(Boolean).join(', '), agency.phone, agency.email, opts.legalIds].filter(Boolean) as string[];
  agencyLines.forEach((l, i) => doc.text(pdfText(l), x, 60 + i * 11));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(c);
  doc.text('FACTURE', W - 40, 48, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor('#0f172a');
  doc.text(pdfText(inv.number), W - 40, 64, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#475569');
  doc.text(pdfText(`Date : ${formatDate(inv.issueDate)}`), W - 40, 78, { align: 'right' });
  if (inv.dueDate) doc.text(pdfText(`Échéance : ${formatDate(inv.dueDate)}`), W - 40, 90, { align: 'right' });

  // Client
  const top = Math.max(120, 60 + agencyLines.length * 11 + 20);
  doc.setFillColor('#f8fafc');
  doc.roundedRect(40, top, W / 2 - 50, 74, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(c);
  doc.text('FACTURÉ À', 52, top + 16);
  doc.setFontSize(11);
  doc.setTextColor('#0f172a');
  doc.text(pdfText(inv.customerName || 'Client'), 52, top + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#475569');
  [inv.customerPhone, inv.customerEmail, inv.customerAddress].filter(Boolean).slice(0, 3).forEach((l, i) => doc.text(pdfText(l), 52, top + 46 + i * 11));

  // Statut
  const st = INVOICE_STATUS[inv.status];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(inv.status === 'paid' ? '#047857' : inv.status === 'cancelled' ? '#be123c' : '#b45309');
  doc.text(pdfText(st.label.toUpperCase()), W - 40, top + 32, { align: 'right' });

  // Lignes
  autoTable(doc, {
    startY: top + 92,
    head: [['Description', 'Qté', 'Prix unitaire', 'Montant'].map(pdfText)],
    body: inv.items.map((it) => [pdfText(it.description), String(it.quantity), money(it.unitPrice), money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: c, textColor: '#ffffff' },
    alternateRowStyles: { fillColor: '#f8fafc' },
    columnStyles: { 1: { halign: 'center', cellWidth: 40 }, 2: { halign: 'right', cellWidth: 100 }, 3: { halign: 'right', cellWidth: 100 } },
  });

  // Totaux
  let y = ((doc as any).lastAutoTable?.finalY ?? top + 120) + 16;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(bold ? '#0f172a' : '#475569');
    doc.text(pdfText(label), W - 190, y);
    doc.text(value, W - 40, y, { align: 'right' });
    y += bold ? 18 : 14;
  };
  row('Sous-total', money(t.subtotal));
  if (t.discount) row('Remise', '- ' + money(t.discount));
  if (inv.taxRate) row(`TVA (${inv.taxRate} %)`, money(t.tax));
  doc.setDrawColor('#e2e8f0');
  doc.line(W - 190, y - 8, W - 40, y - 8);
  y += 4;
  row('Total', money(t.total), true);
  if (inv.amountPaid > 0) {
    row('Déjà payé', money(inv.amountPaid));
    row('Reste à payer', money(Math.max(0, t.total - inv.amountPaid)), true);
  }

  // Notes, conditions, paiement
  let by = Math.max(y + 10, ((doc as any).lastAutoTable?.finalY ?? 0) + 16);
  const block = (title: string, text?: string) => {
    if (!text) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(c);
    doc.text(pdfText(title), 40, by);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#475569');
    const lines = doc.splitTextToSize(pdfText(text), W - 80);
    doc.text(lines, 40, by + 12);
    by += 18 + lines.length * 11;
  };
  block('Notes', inv.notes);
  block('Modalités de paiement', opts.paymentInfo);
  block('Conditions', opts.terms);

  // Pied de page
  doc.setFillColor(c);
  doc.rect(0, H - 6, W, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#64748b');
  doc.text(pdfText(opts.footer || `Merci pour votre confiance — ${agency.name}`), W / 2, H - 22, { align: 'center' });
  doc.save(`${inv.number || 'facture'}.pdf`);
};

// ---------------------------------------------------------------------
// Éditeur de facture
// ---------------------------------------------------------------------
type Draft = Partial<AgencyInvoice> & { items: InvoiceItem[] };

const emptyItem = (): InvoiceItem => ({ description: '', quantity: 1, unitPrice: 0 });

const InvoiceEditor: React.FC<{ open: boolean; initial: Draft | null; onClose: () => void; onSaved: (inv: AgencyInvoice) => void }> = ({ open, initial, onClose, onSaved }) => {
  const { customers, shipments, saveInvoice } = useWorkspace();
  const [form, setForm] = useState<Draft>({ items: [emptyItem()] });
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open && initial) setForm({ ...initial, items: initial.items.length ? initial.items : [emptyItem()] });
  }, [open, initial]);

  const totals = invoiceTotals({ items: form.items, discount: form.discount || 0, taxRate: form.taxRate || 0 });
  const cur = (form.currency || 'USD') as Currency;

  const setItem = (i: number, patch: Partial<InvoiceItem>) => setForm((f) => ({ ...f, items: f.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));

  const pickCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      customerId: id || null,
      customerName: c?.name ?? f.customerName,
      customerPhone: c?.phone ?? f.customerPhone,
      customerEmail: c?.email ?? f.customerEmail,
      customerAddress: c ? [c.address, c.city].filter(Boolean).join(', ') : f.customerAddress,
    }));
  };

  // Ajouter le fret d'un colis comme ligne de facture (converti dans la devise de la facture)
  const addShipment = (id: string) => {
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    const line: InvoiceItem = {
      description: `Fret ${s.mode === 'air' ? 'aérien' : 'maritime'} ${s.trackingRef}${s.description ? ` — ${s.description}` : ''} (${s.originCity} → ${s.destinationCity})`,
      quantity: 1,
      unitPrice: Math.round(fromUSD(s.estimatedCost, cur) * 100) / 100,
    };
    setForm((f) => ({
      ...f,
      shipmentId: f.shipmentId || s.id,
      customerId: f.customerId || s.customerId || null,
      customerName: f.customerName || s.customerName,
      items: [...f.items.filter((it) => it.description || it.unitPrice), line],
    }));
  };

  const customerShipments = shipments.filter((s) => !form.customerId || s.customerId === form.customerId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const items = form.items.filter((it) => it.description.trim() || it.unitPrice);
    const saved = await saveInvoice({
      ...form,
      items,
      discount: Number(form.discount) || 0,
      taxRate: Number(form.taxRate) || 0,
      total: invoiceTotals({ items, discount: form.discount || 0, taxRate: form.taxRate || 0 }).total,
      issueDate: form.issueDate || todayISO(),
      dueDate: form.dueDate || null,
    });
    setBusy(false);
    if (saved) onSaved(saved);
  };

  return (
    <Modal
      open={open}
      title={form.id ? `Modifier la facture ${form.number}` : 'Nouvelle facture'}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="invoice-form" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer la facture'}
          </button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={save} className="space-y-5">
        {/* Client */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Client enregistré" hint="Facultatif : remplit automatiquement ses coordonnées" className="sm:col-span-2">
            <select className={inputClass} value={form.customerId || ''} onChange={(e) => pickCustomer(e.target.value)}>
              <option value="">— Saisir un client librement —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nom du client">
            <input className={inputClass} value={form.customerName || ''} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Facultatif" />
          </Field>
          <Field label="Téléphone / WhatsApp">
            <input className={inputClass} value={form.customerPhone || ''} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="+243 …" />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={form.customerEmail || ''} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          </Field>
          <Field label="Adresse">
            <input className={inputClass} value={form.customerAddress || ''} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} />
          </Field>
        </div>

        {/* Dates, devise */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date">
            <input type="date" className={inputClass} value={form.issueDate || ''} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </Field>
          <Field label="Échéance">
            <input type="date" className={inputClass} value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Devise">
            <CurrencySelect value={cur} onChange={(c) => setForm({ ...form, currency: c })} />
          </Field>
          <Field label="Statut">
            <select className={inputClass} value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}>
              {(['draft', 'sent', 'cancelled'] as InvoiceStatus[]).concat(form.status === 'partial' || form.status === 'paid' ? [form.status] : []).map((s) => (
                <option key={s} value={s}>
                  {INVOICE_STATUS[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Lignes */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-800">Lignes de la facture</span>
            {customerShipments.length > 0 && (
              <select className={`${inputClass} sm:w-72`} value="" onChange={(e) => e.target.value && addShipment(e.target.value)} aria-label="Ajouter le fret d’un colis">
                <option value="">+ Ajouter le fret d’un colis…</option>
                {customerShipments.slice(0, 50).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.trackingRef} — {s.customerName} ({formatMoney(s.estimatedCost)})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_130px_110px_auto] gap-2 items-center p-2 sm:p-0 rounded-lg bg-slate-50 sm:bg-transparent">
                <input className={`${inputClass} col-span-2 sm:col-span-1`} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Description (article, service, fret…)" aria-label="Description" />
                <NumberInput className={inputClass} value={it.quantity} onChange={(v) => setItem(i, { quantity: parseFloat(v) || 0 })} placeholder="Qté" aria-label="Quantité" />
                <NumberInput className={inputClass} value={it.unitPrice} onChange={(v) => setItem(i, { unitPrice: parseFloat(v) || 0 })} placeholder="Prix unitaire" aria-label="Prix unitaire" />
                <div className="text-right text-xs font-semibold tabular-nums text-slate-900">{formatMoney((it.quantity || 0) * (it.unitPrice || 0), cur)}</div>
                <button
                  type="button"
                  className={btn.icon}
                  title="Retirer la ligne"
                  onClick={() => setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, k) => k !== i) : [emptyItem()] }))}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btn.secondary} mt-2`} onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}>
            <Plus className="w-4 h-4" /> Ajouter une ligne
          </button>
        </div>

        {/* Totaux */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Remise (${cur})`}>
                <NumberInput className={inputClass} value={form.discount || ''} onChange={(v) => setForm({ ...form, discount: parseFloat(v) || 0 })} placeholder="0" />
              </Field>
              <Field label="TVA (%)">
                <NumberInput className={inputClass} value={form.taxRate || ''} onChange={(v) => setForm({ ...form, taxRate: Math.min(100, parseFloat(v) || 0) })} placeholder="0" />
              </Field>
            </div>
            <Field label="Notes (imprimées sur la facture)">
              <textarea rows={2} className={inputClass} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Facultatif" />
            </Field>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1.5 self-start">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatMoney(totals.subtotal, cur)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Remise</span>
                <span className="tabular-nums">- {formatMoney(totals.discount, cur)}</span>
              </div>
            )}
            {(form.taxRate || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>TVA ({form.taxRate} %)</span>
                <span className="tabular-nums">{formatMoney(totals.tax, cur)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(totals.total, cur)}</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Encaissement d'une facture
// ---------------------------------------------------------------------
const InvoicePayment: React.FC<{ invoice: AgencyInvoice | null; onClose: () => void }> = ({ invoice, onClose }) => {
  const { saveInvoice, saveIncome, can, logActivity } = useWorkspace();
  const { addToast } = useApp();
  const total = invoice ? invoiceTotals(invoice).total : 0;
  const rest = invoice ? Math.max(0, total - invoice.amountPaid) : 0;
  const [form, setForm] = useState({ amount: '', method: 'cash' as PaymentMethod, toCash: true });
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (invoice) setForm({ amount: rest ? String(rest) : '', method: (invoice.paymentMethod as PaymentMethod) || 'cash', toCash: can('cash', 'create') });
  }, [invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!invoice) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) return;
    setBusy(true);
    const paid = Math.round((invoice.amountPaid + amount) * 100) / 100;
    const ok = await saveInvoice({ id: invoice.id, amountPaid: paid, paymentMethod: form.method, status: paid >= total ? 'paid' : 'partial' });
    if (ok && form.toCash) {
      await saveIncome({
        amount,
        currency: invoice.currency,
        category: invoice.shipmentId ? 'freight' : 'sale',
        description: `Facture ${invoice.number}`,
        customerName: invoice.customerName,
        paymentMethod: form.method,
        date: todayISO(),
      });
    }
    setBusy(false);
    if (ok) {
      await logActivity('invoices', `a encaissé ${formatMoney(amount, invoice.currency)} sur la facture ${invoice.number}`);
      addToast(paid >= total ? `Facture ${invoice.number} entièrement payée.` : `Paiement enregistré. Reste ${formatMoney(total - paid, invoice.currency)}.`, 'success');
      onClose();
    }
  };

  return (
    <Modal
      open
      title={`Encaisser — ${invoice.number}`}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="invoice-pay-form" disabled={busy || !(parseFloat(form.amount) > 0)}>
            {busy ? 'Enregistrement…' : 'Enregistrer le paiement'}
          </button>
        </>
      }
    >
      <form id="invoice-pay-form" onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <div className="text-slate-500">Total</div>
            <div className="font-bold tabular-nums">{formatMoney(total, invoice.currency)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <div className="text-emerald-700">Payé</div>
            <div className="font-bold tabular-nums text-emerald-800">{formatMoney(invoice.amountPaid, invoice.currency)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2.5">
            <div className="text-amber-700">Reste</div>
            <div className="font-bold tabular-nums text-amber-800">{formatMoney(rest, invoice.currency)}</div>
          </div>
        </div>
        <Field label={`Montant reçu (${invoice.currency})`} required>
          <NumberInput className={inputClass} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required />
        </Field>
        <PaymentMethodPicker value={form.method} onChange={(v: PaymentMethod) => setForm({ ...form, method: v })} />
        {can('cash', 'create') && (
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#123B70]" checked={form.toCash} onChange={(e) => setForm({ ...form, toCash: e.target.checked })} />
            Enregistrer aussi ce montant dans la Caisse
          </label>
        )}
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Personnalisation
// ---------------------------------------------------------------------
const InvoiceSettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { settings, saveSettings } = useWorkspace();
  const [form, setForm] = useState<InvoiceSettings>({});
  React.useEffect(() => {
    if (open) setForm(settings.invoiceSettings || {});
  }, [open, settings.invoiceSettings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ invoiceSettings: form });
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Personnaliser mes factures"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="invoice-settings-form">
            Enregistrer
          </button>
        </>
      }
    >
      <form id="invoice-settings-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <p className="sm:col-span-2 text-[11px] text-slate-500">
          Le logo, le nom, l’adresse et le téléphone de l’agence viennent de Paramètres. Ces éléments s’ajoutent sur chaque facture PDF.
        </p>
        <Field label="Couleur des factures">
          <input type="color" className="h-9 w-full rounded-lg border border-slate-300 cursor-pointer" value={form.color || settings.primaryColor} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </Field>
        <Field label="TVA par défaut (%)">
          <NumberInput className={inputClass} value={form.defaultTaxRate ?? ''} onChange={(v) => setForm({ ...form, defaultTaxRate: Math.min(100, parseFloat(v) || 0) })} placeholder="0" />
        </Field>
        <Field label="Identifiants légaux" hint="RCCM, Id. Nat., NIF…" className="sm:col-span-2">
          <input className={inputClass} value={form.legalIds || ''} onChange={(e) => setForm({ ...form, legalIds: e.target.value })} placeholder="RCCM : … · Id. Nat. : … · NIF : …" />
        </Field>
        <Field label="Modalités de paiement" hint="Imprimées sous le total" className="sm:col-span-2">
          <textarea rows={2} className={inputClass} value={form.paymentInfo || ''} onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })} placeholder="M-Pesa : 08… · Equity Bank : compte n° … · Alipay : …" />
        </Field>
        <Field label="Conditions" className="sm:col-span-2">
          <textarea rows={2} className={inputClass} value={form.terms || ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Ex. Paiement à 15 jours. Marchandise livrée après paiement complet." />
        </Field>
        <Field label="Message de pied de page" className="sm:col-span-2">
          <input className={inputClass} value={form.footer || ''} onChange={(e) => setForm({ ...form, footer: e.target.value })} placeholder="Merci pour votre confiance !" />
        </Field>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Page Factures
// ---------------------------------------------------------------------
export const InvoicesPage: React.FC = () => {
  const { addToast } = useApp();
  const { invoices, can, deleteInvoice, activeAgency, settings, logActivity } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'unpaid' | InvoiceStatus>('all');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [paying, setPaying] = useState<AgencyInvoice | null>(null);
  const [deleting, setDeleting] = useState<AgencyInvoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [justSaved, setJustSaved] = useState<AgencyInvoice | null>(null);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (status === 'all' || (status === 'unpaid' ? !['paid', 'cancelled'].includes(i.status) : i.status === status)) &&
          [i.number, i.customerName, i.customerPhone, i.notes].join(' ').toLowerCase().includes(query.toLowerCase())
      ),
    [invoices, query, status]
  );
  const pager = usePagination(filtered);

  const cur = settings.defaultCurrency;
  const active = invoices.filter((i) => i.status !== 'cancelled' && i.status !== 'draft');
  const billed = active.reduce((s, i) => s + toUSD(invoiceTotals(i).total, i.currency), 0);
  const collected = active.reduce((s, i) => s + toUSD(i.amountPaid, i.currency), 0);
  const overdue = invoices.filter(isOverdue);
  const money = (usd: number) => formatMoney(fromUSD(usd, cur), cur);

  const agencyInfo = {
    name: activeAgency?.name || '',
    logo: activeAgency?.logo,
    city: activeAgency?.city,
    country: activeAgency?.country,
    phone: activeAgency?.phoneWeChat,
    email: activeAgency?.email,
    address: activeAgency?.address,
  };

  const openNew = () =>
    setEditing({ items: [], currency: cur, issueDate: todayISO(), status: 'draft', taxRate: settings.invoiceSettings?.defaultTaxRate || 0, discount: 0 });

  const pdf = async (inv: AgencyInvoice) => {
    try {
      await downloadInvoicePdf(inv, agencyInfo, settings.invoiceSettings || {}, settings.primaryColor);
      logActivity('invoices', `a téléchargé la facture ${inv.number}`);
    } catch {
      addToast('PDF impossible à générer.', 'error');
    }
  };

  const whatsappMessage = (inv: AgencyInvoice) => {
    const t = invoiceTotals(inv);
    const rest = Math.max(0, t.total - inv.amountPaid);
    return (
      `Bonjour ${inv.customerName || ''}, voici votre facture ${inv.number} de ${activeAgency?.name || ''} :\n` +
      inv.items.map((it) => `• ${it.description} — ${it.quantity} × ${formatMoney(it.unitPrice, inv.currency)}`).join('\n') +
      `\nTotal : ${formatMoney(t.total, inv.currency)}` +
      (inv.amountPaid ? `\nDéjà payé : ${formatMoney(inv.amountPaid, inv.currency)}\nReste à payer : ${formatMoney(rest, inv.currency)}` : '') +
      (inv.dueDate ? `\nÉchéance : ${formatDate(inv.dueDate)}` : '') +
      (settings.invoiceSettings?.paymentInfo ? `\nPaiement : ${settings.invoiceSettings.paymentInfo}` : '') +
      `\nMerci !`
    );
  };

  return (
    <>
      <PageHeader
        title="Factures"
        subtitle="Créez une facture personnalisée pour chaque client, envoyez-la en PDF ou sur WhatsApp et suivez les paiements."
        actions={
          <>
            {can('settings', 'edit') && (
              <button className={btn.secondary} onClick={() => setSettingsOpen(true)}>
                <Palette className="w-4 h-4" /> Personnaliser
              </button>
            )}
            {can('invoices', 'create') && (
              <button className={btn.primary} onClick={openNew}>
                <FilePlus2 className="w-4 h-4" /> Nouvelle facture
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Facturé" value={money(billed)} hint={`${active.length} facture(s) émise(s)`} />
        <StatCard label="Encaissé" value={money(collected)} />
        <StatCard label="Reste à encaisser" value={money(Math.max(0, billed - collected))} />
        <StatCard label="En retard" value={overdue.length} hint={overdue.length ? 'Échéance dépassée' : 'Aucune'} />
      </div>

      {justSaved && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            Facture <strong>{justSaved.number}</strong> enregistrée pour {justSaved.customerName || 'le client'}.
          </span>
          <button className={btn.secondary} onClick={() => pdf(justSaved)}>
            <Download className="w-4 h-4" /> PDF
          </button>
          {justSaved.customerPhone && (
            <a
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold"
              href={whatsappUrl(justSaved.customerPhone, whatsappMessage(justSaved))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-4 h-4" /> Envoyer sur WhatsApp
            </a>
          )}
          <button className={btn.icon} onClick={() => setJustSaved(null)} aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="N° de facture, client, téléphone…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-52`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Toutes les factures</option>
          <option value="unpaid">Non payées</option>
          {(Object.keys(INVOICE_STATUS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS[s].label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={invoices.length ? 'Aucune facture ne correspond' : 'Aucune facture'}
            text={invoices.length ? 'Modifiez la recherche ou le filtre.' : 'Créez votre première facture : elle reçoit un numéro automatique (FAC-2026-0001).'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Facture</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Client</th>
                    <th className="p-3 font-semibold text-right">Total</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">Statut</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pager.items.map((inv) => {
                    const t = invoiceTotals(inv);
                    const rest = Math.max(0, t.total - inv.amountPaid);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-mono font-semibold text-slate-900">{inv.number}</div>
                          <div className="text-[11px] text-slate-400">
                            {formatDate(inv.issueDate)}
                            {inv.dueDate ? ` · échéance ${formatDate(inv.dueDate)}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500 md:hidden">{inv.customerName}</div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="text-slate-800">{inv.customerName || '—'}</div>
                          <div className="text-[11px] text-slate-400">{inv.customerPhone}</div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="font-semibold tabular-nums text-slate-900">{formatMoney(t.total, inv.currency)}</div>
                          {inv.status !== 'cancelled' && inv.amountPaid > 0 && (
                            <div className={`text-[11px] tabular-nums ${rest > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {rest > 0 ? `Reste ${formatMoney(rest, inv.currency)}` : 'Soldée'}
                            </div>
                          )}
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <Badge className={INVOICE_STATUS[inv.status].cls}>{INVOICE_STATUS[inv.status].label}</Badge>
                          {isOverdue(inv) && <Badge className="bg-rose-100 text-rose-700 ml-1">En retard</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap justify-end gap-1">
                            <button className={btn.secondary} onClick={() => pdf(inv)} title="Télécharger la facture en PDF">
                              <Download className="w-4 h-4 text-rose-600" /> <span className="hidden xl:inline">PDF</span>
                            </button>
                            {inv.customerPhone && (
                              <a
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white"
                                href={whatsappUrl(inv.customerPhone, whatsappMessage(inv))}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Envoyer la facture sur WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            {can('invoices', 'edit') && !['paid', 'cancelled'].includes(inv.status) && (
                              <button className={btn.secondary} onClick={() => setPaying(inv)} title="Encaisser un paiement">
                                <Wallet className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                            {can('invoices', 'edit') && (
                              <button className={btn.secondary} onClick={() => setEditing({ ...inv })} title="Modifier">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {can('invoices', 'delete') && (
                              <button className={btn.secondary} onClick={() => setDeleting(inv)} title="Supprimer">
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pager={pager} />
          </>
        )}
      </div>

      <InvoiceEditor
        open={!!editing}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={(inv) => {
          setEditing(null);
          setJustSaved(inv);
          addToast(`Facture ${inv.number} enregistrée.`, 'success');
        }}
      />
      <InvoicePayment invoice={paying} onClose={() => setPaying(null)} />
      <InvoiceSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer la facture"
        text={`La facture ${deleting?.number} de ${deleting?.customerName || 'ce client'} sera supprimée. Les montants déjà enregistrés dans la Caisse ne sont pas modifiés.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteInvoice(deleting.id)}
      />
    </>
  );
};
