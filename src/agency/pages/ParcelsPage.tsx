import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, MessageCircle, Package, Pencil, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NumberInput } from '../../components/common/NumberInput';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyShipment, ShipmentMode, ShipmentStatus } from '../types';
import { Badge, btn, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader } from '../ui';
import {
  CHINA_DEPARTURE_CITIES,
  computeFreightCost,
  DRC_DESTINATIONS,
  formatDateTime,
  formatMoney,
  formatNumber,
  SHIPMENT_MODE_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_ORDER,
  SHIPMENT_STATUS_STYLES,
  trackingLink,
  whatsappNumber,
  whatsappUrl,
} from '../utils';

// ---------------------------------------------------------------------
// Modifier un colis
// ---------------------------------------------------------------------
const EditParcel: React.FC<{ parcel: AgencyShipment | null; onClose: () => void }> = ({ parcel, onClose }) => {
  const { customers, updateShipment, changeShipmentStatus } = useWorkspace();
  const [form, setForm] = useState({
    customerId: '',
    description: '',
    weightKg: 0,
    volumeCbm: 0,
    mode: 'sea' as ShipmentMode,
    originCity: '',
    destinationCity: '',
    rateType: 'cbm' as 'kg' | 'cbm',
    rate: 0,
    status: 'registered' as ShipmentStatus,
    note: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!parcel) return;
    setForm({
      customerId: parcel.customerId,
      description: parcel.description,
      weightKg: parcel.weightKg,
      volumeCbm: parcel.volumeCbm,
      mode: parcel.mode,
      originCity: parcel.originCity,
      destinationCity: parcel.destinationCity,
      rateType: parcel.rateType,
      rate: parcel.rate,
      status: parcel.status,
      note: '',
    });
  }, [parcel]);

  if (!parcel) return null;
  const estimate = computeFreightCost(form.rateType, form.rate, form.weightKg, form.volumeCbm);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const customer = customers.find((c) => c.id === form.customerId);
    // Seuls les champs modifiables sont envoyés (le jeton de suivi ne change jamais)
    const ok = await updateShipment(parcel.id, {
      customerId: form.customerId,
      customerName: customer?.name || parcel.customerName,
      description: form.description,
      weightKg: form.weightKg,
      volumeCbm: form.volumeCbm,
      mode: form.mode,
      originCity: form.originCity,
      destinationCity: form.destinationCity,
      rateType: form.rateType,
      rate: form.rate,
      estimatedCost: estimate,
    });
    // Un changement de statut est enregistré dans l'historique visible par le client
    if (ok && form.status !== parcel.status) await changeShipmentStatus(parcel.id, form.status, form.note);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open
      size="lg"
      title={`Modifier le colis ${parcel.trackingRef}`}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="edit-parcel-form" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="edit-parcel-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Field label="Client" required className="sm:col-span-2">
          <select className={inputClass} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            {!customers.some((c) => c.id === form.customerId) && <option value={form.customerId}>{parcel.customerName}</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `— ${c.company}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description du contenu" required className="sm:col-span-2">
          <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </Field>
        <Field label="Statut du colis">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ShipmentStatus })}>
            {SHIPMENT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {SHIPMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commentaire sur le statut" hint="Visible par le client sur sa page de suivi">
          <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} disabled={form.status === parcel.status} placeholder="Ex. Arrivé au port de Matadi" />
        </Field>
        <Field label="Transport">
          <select
            className={inputClass}
            value={form.mode}
            onChange={(e) => {
              const mode = e.target.value as ShipmentMode;
              setForm({ ...form, mode, rateType: mode === 'air' ? 'kg' : 'cbm' });
            }}
          >
            <option value="sea">{SHIPMENT_MODE_LABELS.sea}</option>
            <option value="air">{SHIPMENT_MODE_LABELS.air}</option>
          </select>
        </Field>
        <Field label="Tarification">
          <select className={inputClass} value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value as 'kg' | 'cbm' })}>
            <option value="kg">Au kilogramme</option>
            <option value="cbm">Au CBM</option>
          </select>
        </Field>
        <Field label="Ville de départ (Chine)">
          <select className={inputClass} value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })}>
            {!CHINA_DEPARTURE_CITIES.includes(form.originCity) && <option>{form.originCity}</option>}
            {CHINA_DEPARTURE_CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Destination (RDC)">
          <select className={inputClass} value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}>
            {!DRC_DESTINATIONS.includes(form.destinationCity) && <option>{form.destinationCity}</option>}
            {DRC_DESTINATIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Poids (kg)">
          <NumberInput className={inputClass} value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: parseFloat(v) || 0 })} />
        </Field>
        <Field label="Volume (CBM)">
          <NumberInput className={inputClass} value={form.volumeCbm} onChange={(v) => setForm({ ...form, volumeCbm: parseFloat(v) || 0 })} />
        </Field>
        <Field label={`Tarif (USD / ${form.rateType === 'kg' ? 'kg' : 'CBM'})`}>
          <NumberInput className={inputClass} value={form.rate} onChange={(v) => setForm({ ...form, rate: parseFloat(v) || 0 })} />
        </Field>
        <div className="flex items-end">
          <div className="w-full p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex justify-between">
            <span className="text-blue-900">Frais estimés</span>
            <span className="font-bold text-blue-900 tabular-nums">{formatMoney(estimate)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Message personnalisé au client (WhatsApp)
// ---------------------------------------------------------------------
const buildMessage = (p: AgencyShipment, agencyName: string, customerName: string) => {
  const firstName = customerName.split(' ')[0] || '';
  const link = trackingLink(p.trackingToken);
  return [
    `Bonjour ${firstName},`,
    '',
    `Votre colis ${p.trackingRef} (${p.description}) est actuellement : *${SHIPMENT_STATUS_LABELS[p.status]}*.`,
    `Trajet : ${p.originCity} → ${p.destinationCity} (${SHIPMENT_MODE_LABELS[p.mode].toLowerCase()}).`,
    '',
    link ? `Suivez l’évolution de votre colis jusqu’à son arrivée ici :\n${link}` : '',
    '',
    `Merci de votre confiance,`,
    agencyName,
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');
};

const MessageParcel: React.FC<{ parcel: AgencyShipment | null; onClose: () => void }> = ({ parcel, onClose }) => {
  const { customers, activeAgency, logActivity } = useWorkspace();
  const { addToast } = useApp();
  const customer = customers.find((c) => c.id === parcel?.customerId);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!parcel) return;
    setPhone(customer?.phone || '');
    setMessage(buildMessage(parcel, activeAgency?.name || '', customer?.name || parcel.customerName));
  }, [parcel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!parcel) return null;
  const link = trackingLink(parcel.trackingToken);
  const validPhone = whatsappNumber(phone).length >= 9;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${what} copié.`, 'success');
    } catch {
      addToast('Copie impossible : sélectionnez le texte et copiez-le manuellement.', 'error');
    }
  };

  const send = () => {
    window.open(whatsappUrl(phone, message), '_blank', 'noopener');
    logActivity('freight', `a envoyé le suivi du colis ${parcel.trackingRef} à ${customer?.name || parcel.customerName} (WhatsApp)`);
    onClose();
  };

  return (
    <Modal
      open
      title={`Message au client — ${parcel.trackingRef}`}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={() => copy(message, 'Message')}>
            <Copy className="w-4 h-4" /> Copier le message
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer" onClick={send} disabled={!validPhone}>
            <MessageCircle className="w-4 h-4" /> Envoyer sur WhatsApp
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={`Numéro WhatsApp de ${customer?.name || parcel.customerName}`} hint="Format international conseillé, ex. +243 81 234 5678. Un numéro local (08…) est converti automatiquement.">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 …" />
        </Field>
        {!validPhone && <p className="text-[11px] text-amber-700">Ajoutez le numéro du client pour pouvoir envoyer le message.</p>}
        <Field label="Message (modifiable)">
          <textarea rows={10} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        {link && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-slate-600 break-all flex-1">{link}</span>
            <div className="flex gap-1 shrink-0">
              <button className={btn.secondary} onClick={() => copy(link, 'Lien de suivi')}>
                <Copy className="w-4 h-4" /> Copier
              </button>
              <a className={btn.secondary} href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Aperçu
              </a>
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          Le bouton ouvre WhatsApp avec ce message déjà écrit : il ne reste qu’à appuyer sur Envoyer. Le client voit l’avancement de son colis sans
          créer de compte, et rien d’autre (ni prix, ni autres clients).
        </p>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Page « Gestion colis »
// ---------------------------------------------------------------------
export const ParcelsPage: React.FC = () => {
  const { shipments, customers, can, deleteShipment } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ShipmentStatus>('all');
  const [editing, setEditing] = useState<AgencyShipment | null>(null);
  const [messaging, setMessaging] = useState<AgencyShipment | null>(null);
  const [deleting, setDeleting] = useState<AgencyShipment | null>(null);

  const filtered = useMemo(
    () =>
      shipments.filter(
        (s) =>
          (status === 'all' || s.status === status) &&
          [s.trackingRef, s.customerName, s.description, s.destinationCity].join(' ').toLowerCase().includes(query.toLowerCase())
      ),
    [shipments, query, status]
  );

  const phoneOf = (s: AgencyShipment) => customers.find((c) => c.id === s.customerId)?.phone || '';

  return (
    <>
      <PageHeader
        title="Gestion colis"
        subtitle="Modifiez vos colis et tenez vos clients informés de leur avancement par WhatsApp."
        actions={
          can('freight', 'create') && (
            <Link to="/agency/freight" className={btn.primary}>
              <Package className="w-4 h-4" /> Enregistrer un colis
            </Link>
          )
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Référence, client, destination…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-48`} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Statut">
          <option value="all">Tous les statuts</option>
          {SHIPMENT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={shipments.length ? 'Aucun colis ne correspond' : 'Aucun colis'}
            text={shipments.length ? undefined : 'Enregistrez vos colis dans « Fret & Logistique » : ils apparaîtront ici.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Colis</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Client</th>
                  <th className="p-3 font-semibold hidden lg:table-cell">Trajet</th>
                  <th className="p-3 font-semibold">Statut</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">Mis à jour</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <Link to={`/agency/freight/${s.id}`} className="font-mono font-semibold text-[#123B70] hover:underline">
                        {s.trackingRef}
                      </Link>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{s.description}</div>
                      <div className="text-[11px] text-slate-500 md:hidden">{s.customerName}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="text-slate-800">{s.customerName}</div>
                      <div className="text-[11px] text-slate-400">{phoneOf(s) || 'Pas de téléphone'}</div>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-slate-600">
                      {s.originCity} → {s.destinationCity}
                      <div className="text-[11px] text-slate-400">
                        {SHIPMENT_MODE_LABELS[s.mode]} · {formatNumber(s.weightKg, 1)} kg
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={SHIPMENT_STATUS_STYLES[s.status]}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-slate-500">{formatDateTime(s.updatedAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {can('freight', 'edit') && (
                          <button className={btn.secondary} onClick={() => setEditing(s)} title="Modifier le colis">
                            <Pencil className="w-4 h-4" /> <span className="hidden xl:inline">Modifier</span>
                          </button>
                        )}
                        <button
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold cursor-pointer"
                          onClick={() => setMessaging(s)}
                          title="Envoyer le suivi au client sur WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" /> <span className="hidden xl:inline">Message</span>
                        </button>
                        {can('freight', 'delete') && (
                          <button className={btn.secondary} onClick={() => setDeleting(s)} title="Supprimer le colis">
                            <Trash2 className="w-4 h-4 text-rose-600" /> <span className="hidden xl:inline">Supprimer</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditParcel parcel={editing} onClose={() => setEditing(null)} />
      <MessageParcel parcel={messaging} onClose={() => setMessaging(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer le colis"
        text={`Le colis ${deleting?.trackingRef} et son historique seront supprimés. Son lien de suivi ne fonctionnera plus.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteShipment(deleting.id)}
      />
    </>
  );
};
