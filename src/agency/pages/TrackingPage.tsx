import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, MapPin, MessageCircle, Pencil, Route, Search, Trash2 } from 'lucide-react';
import { EditParcel } from './ParcelsPage';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyShipment, ShipmentStatus } from '../types';
import { Badge, btn, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader, Pagination, usePagination } from '../ui';
import {
  formatDateTime,
  SHIPMENT_MODE_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_ORDER,
  SHIPMENT_STATUS_STYLES,
  trackingLink,
  whatsappUrl,
} from '../utils';

/** Étapes courantes d'un envoi Chine → RDC (texte + statut correspondant) */
const STEP_PRESETS = (origin: string, destination: string): { label: string; status: ShipmentStatus }[] => [
  { label: `Reçu à l’entrepôt de ${origin}`, status: 'registered' },
  { label: 'Chargement du conteneur en cours', status: 'preparing' },
  { label: `A quitté ${origin}`, status: 'in_transit' },
  { label: 'Navire parti du port de Chine', status: 'in_transit' },
  { label: 'Vol parti de Chine', status: 'in_transit' },
  { label: 'Arrivé au port de Matadi', status: 'in_transit' },
  { label: 'En dédouanement', status: 'in_transit' },
  { label: `En route vers ${destination}`, status: 'in_transit' },
  { label: `Arrivé à ${destination}, disponible au retrait`, status: 'arrived' },
  { label: 'Livré au client', status: 'delivered' },
];

/** Rubrique « Suivi des colis » : enregistrer chaque étape et prévenir les clients sur WhatsApp */
export const TrackingPage: React.FC = () => {
  const { shipments, shipmentEvents, customers, can, recordTrackingStep, activeAgency, deleteShipment } = useWorkspace();
  const [editing, setEditing] = useState<AgencyShipment | null>(null);
  const [deleting, setDeleting] = useState<AgencyShipment | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'all' | ShipmentStatus>('active');
  const [selected, setSelected] = useState<string[]>([]);
  const [stepOpen, setStepOpen] = useState(false);
  const [step, setStep] = useState<{ status: ShipmentStatus; note: string }>({ status: 'in_transit', note: '' });
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Colis à prévenir après la dernière mise à jour, et ceux déjà prévenus
  const [toNotify, setToNotify] = useState<{ ids: string[]; note: string } | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const filtered = useMemo(
    () =>
      shipments
        .filter((s) => (status === 'all' ? true : status === 'active' ? s.status !== 'delivered' : s.status === status))
        .filter((s) => [s.trackingRef, s.customerName, s.description, s.destinationCity].join(' ').toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [shipments, status, query]
  );
  const pager = usePagination(filtered);

  const phoneOf = (s: AgencyShipment) => customers.find((c) => c.id === s.customerId)?.phone || '';
  const eventsOf = (id: string) => shipmentEvents.filter((e) => e.shipmentId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastStep = (s: AgencyShipment) => eventsOf(s.id)[0];

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.id));

  const firstSelected = shipments.find((s) => s.id === selected[0]);
  const presets = STEP_PRESETS(firstSelected?.originCity || activeAgency?.city || 'Guangzhou', firstSelected?.destinationCity || 'Kinshasa');

  const openStep = (ids?: string[]) => {
    if (ids) setSelected(ids);
    setStep({ status: 'in_transit', note: '' });
    setStepOpen(true);
  };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0 || !step.note.trim()) return;
    setBusy(true);
    const ok = await recordTrackingStep(selected, step.status, step.note);
    setBusy(false);
    if (ok) {
      setToNotify({ ids: selected, note: step.note.trim() });
      setSent([]);
      setSelected([]);
      setStepOpen(false);
    }
  };

  const message = (s: AgencyShipment, note: string) =>
    `Bonjour ${s.customerName}, nouvelle étape pour votre colis ${s.trackingRef}${s.description ? ` (${s.description})` : ''} : ${note}.` +
    (s.trackingToken ? `\nSuivez-le en temps réel : ${trackingLink(s.trackingToken)}` : '') +
    `\n${activeAgency?.name || ''}`;

  const notifyList = toNotify ? shipments.filter((s) => toNotify.ids.includes(s.id)) : [];

  return (
    <>
      <PageHeader
        title="Suivi des colis"
        subtitle="À chaque étape (départ de Chine, arrivée au port, livraison…), mettez à jour vos colis puis prévenez vos clients sur WhatsApp."
        actions={
          can('freight', 'edit') && (
            <button className={btn.primary} disabled={selected.length === 0} onClick={() => openStep()}>
              <Route className="w-4 h-4" /> Nouvelle étape{selected.length ? ` (${selected.length} colis)` : ''}
            </button>
          )
        }
      />

      {/* Clients à prévenir après une mise à jour */}
      {toNotify && notifyList.length > 0 && (
        <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <div className="font-bold text-slate-900">Prévenir les clients — « {toNotify.note} »</div>
              <div className="text-[11px] text-slate-500">
                {sent.length} / {notifyList.length} prévenu(s). Cliquez sur chaque bouton : WhatsApp s’ouvre avec le message prêt, il suffit d’appuyer sur Envoyer.
              </div>
            </div>
            <button className={btn.secondary} onClick={() => setToNotify(null)}>
              Terminé
            </button>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {notifyList.map((s) => {
              const phone = phoneOf(s);
              const done = sent.includes(s.id);
              return (
                <li key={s.id} className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{s.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{s.trackingRef}</div>
                  </div>
                  {phone ? (
                    <a
                      href={whatsappUrl(phone, message(s, toNotify.note))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSent((cur) => (cur.includes(s.id) ? cur : [...cur, s.id]))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white ${done ? 'bg-slate-400' : 'bg-[#25D366] hover:bg-[#1ebe5b]'}`}
                    >
                      {done ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />} {done ? 'Envoyé' : 'WhatsApp'}
                    </a>
                  ) : (
                    <span className="text-[11px] text-amber-700">Pas de numéro</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Référence, client, destination…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-52`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">En cours (non livrés)</option>
          <option value="all">Tous les colis</option>
          {SHIPMENT_STATUS_ORDER.map((st) => (
            <option key={st} value={st}>
              {SHIPMENT_STATUS_LABELS[st]}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Route} title="Aucun colis à suivre" text="Les colis enregistrés dans « Fret & Logistique » apparaissent ici." />
        ) : (
          <>
            {can('freight', 'edit') && (
              <label className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#123B70]"
                  checked={allFilteredSelected}
                  onChange={() => setSelected(allFilteredSelected ? [] : filtered.map((s) => s.id))}
                />
                Tout sélectionner ({filtered.length} colis) — pratique pour un même conteneur
              </label>
            )}
            <ul className="divide-y divide-slate-100">
              {pager.items.map((s) => {
                const last = lastStep(s);
                const open = expanded === s.id;
                return (
                  <li key={s.id} className="px-4 py-3 text-xs">
                    <div className="flex items-start gap-3">
                      {can('freight', 'edit') && (
                        <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[#123B70] cursor-pointer" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} aria-label={`Sélectionner ${s.trackingRef}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900">{s.trackingRef}</span>
                          <Badge className={SHIPMENT_STATUS_STYLES[s.status]}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge>
                          <span className="text-slate-500">{s.customerName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.originCity} → {s.destinationCity} · {SHIPMENT_MODE_LABELS[s.mode]}
                        </div>
                        {last && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-700">
                            <MapPin className="w-3 h-3 text-[#FF8A00] shrink-0" />
                            <span className="font-semibold">{last.note}</span>
                            <span className="text-slate-400">· {formatDateTime(last.createdAt)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 shrink-0 max-w-[45%] sm:max-w-none">
                        {can('freight', 'edit') && (
                          <button className={btn.secondary} onClick={() => openStep([s.id])} title="Nouvelle étape pour ce colis">
                            <Route className="w-4 h-4" /> <span className="hidden sm:inline">Étape</span>
                          </button>
                        )}
                        {phoneOf(s) && last && (
                          <a
                            className="p-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white"
                            href={whatsappUrl(phoneOf(s), message(s, last.note))}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Envoyer la dernière étape au client sur WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        {can('freight', 'edit') && (
                          <button className={btn.secondary} onClick={() => setEditing(s)} title="Modifier le colis">
                            <Pencil className="w-4 h-4" /> <span className="hidden lg:inline">Modifier</span>
                          </button>
                        )}
                        {can('freight', 'delete') && (
                          <button className={btn.secondary} onClick={() => setDeleting(s)} title="Supprimer le colis">
                            <Trash2 className="w-4 h-4 text-rose-600" /> <span className="hidden lg:inline">Supprimer</span>
                          </button>
                        )}
                        <button className={btn.icon} onClick={() => setExpanded(open ? null : s.id)} aria-label="Historique" title="Historique">
                          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {open && (
                      <ol className="mt-3 ml-7 border-l-2 border-slate-200 pl-4 space-y-2">
                        {eventsOf(s.id).map((ev) => (
                          <li key={ev.id} className="relative">
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#123B70]" />
                            <div className="font-semibold text-slate-800">{ev.note || SHIPMENT_STATUS_LABELS[ev.status]}</div>
                            <div className="text-[11px] text-slate-400">
                              {SHIPMENT_STATUS_LABELS[ev.status]} · {formatDateTime(ev.createdAt)}
                              {ev.actorName ? ` · ${ev.actorName}` : ''}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination pager={pager} />
          </>
        )}
      </div>

      <EditParcel parcel={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer le colis"
        text={`Le colis ${deleting?.trackingRef} et son historique seront supprimés. Son lien de suivi ne fonctionnera plus.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setSelected((cur) => cur.filter((x) => x !== deleting.id));
          deleteShipment(deleting.id);
        }}
      />

      <Modal
        open={stepOpen}
        title={selected.length > 1 ? `Nouvelle étape pour ${selected.length} colis` : `Nouvelle étape — ${firstSelected?.trackingRef || ''}`}
        onClose={() => setStepOpen(false)}
        footer={
          <>
            <button className={btn.secondary} onClick={() => setStepOpen(false)}>
              Annuler
            </button>
            <button className={btn.primary} type="submit" form="tracking-step-form" disabled={busy || !step.note.trim()}>
              {busy ? 'Enregistrement…' : 'Enregistrer l’étape'}
            </button>
          </>
        }
      >
        <form id="tracking-step-form" onSubmit={apply} className="space-y-4 text-xs">
          <div>
            <div className="font-semibold text-slate-700 mb-1.5">Étapes courantes</div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setStep({ status: p.status, note: p.label })}
                  className={`px-2.5 py-1 rounded-full border text-[11px] cursor-pointer ${
                    step.note === p.label ? 'bg-[#123B70] text-white border-[#123B70]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Étape / lieu" required hint="Visible par le client sur sa page de suivi et dans le message WhatsApp">
            <input className={inputClass} value={step.note} onChange={(e) => setStep({ ...step, note: e.target.value })} placeholder="Ex. A quitté l’entrepôt de Guangzhou" required />
          </Field>
          <Field label="Statut du colis">
            <select className={inputClass} value={step.status} onChange={(e) => setStep({ ...step, status: e.target.value as ShipmentStatus })}>
              {SHIPMENT_STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {SHIPMENT_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-[11px] text-slate-500">Après l’enregistrement, la liste des clients à prévenir s’affiche avec un bouton WhatsApp pour chacun.</p>
        </form>
      </Modal>
    </>
  );
};
