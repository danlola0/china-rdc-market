import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Handshake, MessageCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage } from '../../lib/supabase';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { listPartnerShipments, PartnerShipment, partnerUpdateStatus } from '../services/partnerService';
import { ShipmentStatus } from '../types';
import { Badge, btn, EmptyState, Field, inputClass, Modal } from '../ui';
import {
  formatDateTime,
  formatNumber,
  SHIPMENT_MODE_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_ORDER,
  SHIPMENT_STATUS_STYLES,
  trackingLink,
  whatsappUrl,
} from '../utils';

/** Colis confiés à mon agence par des agences partenaires */
export const PartnerParcels: React.FC = () => {
  const { addToast } = useApp();
  const { activeAgencyId, activeAgency, can, logActivity } = useWorkspace();
  const [rows, setRows] = useState<PartnerShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<PartnerShipment | null>(null);
  const [status, setStatus] = useState<ShipmentStatus>('in_transit');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!activeAgencyId) return;
    setLoading(true);
    try {
      setRows(await listPartnerShipments(activeAgencyId));
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [activeAgencyId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openUpdate = (p: PartnerShipment) => {
    setUpdating(p);
    setStatus(p.status);
    setNote('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updating) return;
    setBusy(true);
    try {
      await partnerUpdateStatus(updating.id, status, note);
      await logActivity('freight', `a passé le colis partenaire ${updating.trackingRef} au statut « ${SHIPMENT_STATUS_LABELS[status]} »`);
      addToast(`Statut mis à jour. ${updating.fromAgencyName} et le client le voient aussitôt.`, 'success');
      setUpdating(null);
      await load();
    } catch (err) {
      addToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (p: PartnerShipment) => {
    try {
      await navigator.clipboard.writeText(trackingLink(p.trackingToken));
      addToast('Lien de suivi copié.', 'success');
    } catch {
      addToast('Copie impossible.', 'error');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Colis que des agences partenaires vous ont confiés. Vous voyez les informations de livraison ; mettez à jour le statut jusqu’à la remise au client.
        </p>
        <button className={btn.secondary} onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Handshake} title="Aucun colis reçu de partenaires" text="Quand une agence partenaire vous confie un colis, il apparaît ici." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Colis</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Confié par</th>
                  <th className="p-3 font-semibold hidden lg:table-cell">Trajet</th>
                  <th className="p-3 font-semibold">Statut</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-mono font-semibold text-slate-900">{p.trackingRef}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{p.description}</div>
                      <div className="text-[11px] text-slate-400">Client : {p.customerName}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="text-slate-800">{p.fromAgencyName}</div>
                      <div className="text-[11px] text-slate-400">{p.fromAgencyPhone}</div>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-slate-600">
                      {p.originCity} → {p.destinationCity}
                      <div className="text-[11px] text-slate-400">
                        {SHIPMENT_MODE_LABELS[p.mode]} · {formatNumber(p.weightKg, 1)} kg · {formatNumber(p.volumeCbm, 3)} CBM · {p.packages || 1} carton(s)
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={SHIPMENT_STATUS_STYLES[p.status]}>{SHIPMENT_STATUS_LABELS[p.status]}</Badge>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(p.updatedAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {can('freight', 'edit') && (
                          <button className={btn.primary} onClick={() => openUpdate(p)}>
                            Mettre à jour
                          </button>
                        )}
                        <button className={btn.icon} title="Copier le lien de suivi du client" onClick={() => copyLink(p)}>
                          <Copy className="w-4 h-4" />
                        </button>
                        {p.fromAgencyPhone && (
                          <a
                            className={btn.icon}
                            title={`Écrire à ${p.fromAgencyName} sur WhatsApp`}
                            href={whatsappUrl(p.fromAgencyPhone, `Bonjour ${p.fromAgencyName}, c’est ${activeAgency?.name || 'votre partenaire'} au sujet du colis ${p.trackingRef}.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-4 h-4 text-[#25D366]" />
                          </a>
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

      <Modal
        open={!!updating}
        title={`Mettre à jour ${updating?.trackingRef || ''}`}
        onClose={() => setUpdating(null)}
        footer={
          <>
            <button className={btn.secondary} onClick={() => setUpdating(null)}>
              Annuler
            </button>
            <button className={btn.primary} type="submit" form="partner-status-form" disabled={busy || status === updating?.status}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        {updating && (
          <form id="partner-status-form" onSubmit={save} className="space-y-4">
            <Field label="Nouveau statut">
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
                {SHIPMENT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SHIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commentaire" hint="Visible par l’agence d’origine et par le client sur sa page de suivi">
              <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Récupéré au port de Matadi" />
            </Field>
            {updating.events.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-700 mb-1">Historique</div>
                <ol className="space-y-1">
                  {[...updating.events].reverse().map((ev, i) => (
                    <li key={i} className="text-[11px] text-slate-600">
                      <strong>{SHIPMENT_STATUS_LABELS[ev.status]}</strong> · {formatDateTime(ev.createdAt)}
                      {ev.actorName ? ` · ${ev.actorName}` : ''}
                      {ev.note && ev.note !== SHIPMENT_STATUS_LABELS[ev.status] ? ` — ${ev.note}` : ''}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </form>
        )}
      </Modal>
    </>
  );
};
