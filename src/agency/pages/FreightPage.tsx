import React, { useMemo, useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Plane, Plus, Search, Ship, Trash2, Truck, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ShipmentInput, useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyShipment, PaymentMethod, ShipmentMode, ShipmentStatus } from '../types';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader, PaymentMethodPicker, StatCard } from '../ui';
import {
  CHINA_DEPARTURE_CITIES,
  compressImage,
  computeFreightCost,
  downloadCSV,
  DRC_DESTINATIONS,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  generateTrackingRef,
  PAYMENT_METHOD_LABELS,
  SHIPMENT_MODE_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_ORDER,
  SHIPMENT_STATUS_STYLES,
  todayISO,
} from '../utils';

const paidOf = (s: AgencyShipment) => s.payments.reduce((sum, p) => sum + p.amount, 0);

const ModeIcon: React.FC<{ mode: ShipmentMode }> = ({ mode }) =>
  mode === 'air' ? <Plane className="w-3.5 h-3.5" /> : <Ship className="w-3.5 h-3.5" />;

// ---------- Formulaire d'enregistrement ----------

const ShipmentForm: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { customers, settings, shipments, activeAgency, createShipment } = useWorkspace();
  const { addToast } = useApp();
  const navigate = useNavigate();

  const initial = (): ShipmentInput => ({
    trackingRef: generateTrackingRef(activeAgency?.name || '', 'sea', shipments.map((s) => s.trackingRef)),
    customerId: customers[0]?.id || '',
    customerName: customers[0]?.name || '',
    description: '',
    weightKg: 0,
    volumeCbm: 0,
    mode: 'sea',
    originCity: activeAgency?.city || 'Guangzhou',
    destinationCity: 'Kinshasa',
    rateType: 'cbm',
    rate: settings.freightRates.seaPerCbm,
    estimatedCost: 0,
    photos: [],
  });

  const [form, setForm] = useState<ShipmentInput>(initial);
  React.useEffect(() => {
    if (open) setForm(initial());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimate = computeFreightCost(form.rateType, form.rate, form.weightKg, form.volumeCbm);

  const setMode = (mode: ShipmentMode) =>
    setForm((f) => ({
      ...f,
      mode,
      rateType: mode === 'air' ? 'kg' : 'cbm',
      rate: mode === 'air' ? settings.freightRates.airPerKg : settings.freightRates.seaPerCbm,
      trackingRef: generateTrackingRef(activeAgency?.name || '', mode, shipments.map((s) => s.trackingRef)),
    }));

  const onPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - form.photos.length);
    try {
      const urls = await Promise.all(files.map((f) => compressImage(f, 640, 0.65)));
      setForm((f) => ({ ...f, photos: [...f.photos, ...urls].slice(0, 3) }));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
    e.target.value = '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      addToast('Ajoutez d’abord un client dans « Gestion clients ».', 'error');
      return;
    }
    const created = await createShipment({ ...form, estimatedCost: estimate });
    if (created) {
      onClose();
      navigate(`/agency/freight/${created.id}`);
    }
  };

  return (
    <Modal
      open={open}
      title="Enregistrer un colis"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="shipment-form">
            Enregistrer le colis
          </button>
        </>
      }
    >
      <form id="shipment-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg flex items-center justify-between gap-3">
          <span className="text-slate-500">Référence de suivi</span>
          <span className="font-mono font-bold text-slate-900">{form.trackingRef}</span>
        </div>

        <Field label="Client" required className="sm:col-span-2">
          {customers.length === 0 ? (
            <p className="text-rose-600">Aucun client : créez d’abord une fiche client.</p>
          ) : (
            <select
              className={inputClass}
              value={form.customerId}
              onChange={(e) => {
                const c = customers.find((x) => x.id === e.target.value);
                setForm({ ...form, customerId: e.target.value, customerName: c?.name || '' });
              }}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `— ${c.company}` : ''}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Description du contenu" required className="sm:col-span-2">
          <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </Field>

        <Field label="Transport" required className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {(['sea', 'air'] as ShipmentMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={form.mode === m}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  form.mode === m ? 'border-[#123B70] bg-blue-50 text-[#123B70]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ModeIcon mode={m} /> {SHIPMENT_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ville de départ (Chine)" required>
          <select className={inputClass} value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })}>
            {CHINA_DEPARTURE_CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Destination (RDC)" required>
          <select className={inputClass} value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}>
            {DRC_DESTINATIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Poids (kg)" required>
          <NumberInput className={inputClass} value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: parseFloat(v) || 0 })} required placeholder="Ex. 120" />
        </Field>
        <Field label="Volume (CBM)" required>
          <NumberInput className={inputClass} value={form.volumeCbm} onChange={(v) => setForm({ ...form, volumeCbm: parseFloat(v) || 0 })} required placeholder="Ex. 1.5" />
        </Field>
        <Field label="Tarification">
          <select className={inputClass} value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value as 'kg' | 'cbm' })}>
            <option value="kg">Au kilogramme</option>
            <option value="cbm">Au CBM</option>
          </select>
        </Field>
        <Field label={`Tarif (USD / ${form.rateType === 'kg' ? 'kg' : 'CBM'})`}>
          <NumberInput className={inputClass} value={form.rate} onChange={(v) => setForm({ ...form, rate: parseFloat(v) || 0 })} />
        </Field>

        <div className="sm:col-span-2 p-3 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-between">
          <span className="text-blue-900">Frais estimés</span>
          <span className="text-lg font-bold text-blue-900 tabular-nums">{formatMoney(estimate)}</span>
        </div>

        <div className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-slate-700 mb-1">Photos du colis (3 maximum)</span>
          <div className="flex flex-wrap items-center gap-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photos: form.photos.filter((_, j) => j !== i) })}
                  className="absolute -top-1.5 -right-1.5 bg-white rounded-full border border-slate-200 p-0.5"
                  aria-label="Retirer la photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {form.photos.length < 3 && (
              <label className={`${btn.secondary} cursor-pointer`}>
                <Upload className="w-4 h-4" /> Ajouter
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} />
              </label>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ---------- Fiche détaillée ----------

const ShipmentDetail: React.FC<{ shipment: AgencyShipment }> = ({ shipment }) => {
  const { shipmentEvents, can, changeShipmentStatus, addShipmentPayment, deleteShipment, customers } = useWorkspace();
  const navigate = useNavigate();
  const events = shipmentEvents.filter((e) => e.shipmentId === shipment.id);
  const [status, setStatus] = useState<ShipmentStatus>(shipment.status);
  const [note, setNote] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: '', date: todayISO(), method: 'bank' as PaymentMethod, note: '' });
  const [confirm, setConfirm] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  React.useEffect(() => setStatus(shipment.status), [shipment.status]);

  const paid = paidOf(shipment);
  const remaining = Math.max(0, shipment.estimatedCost - paid);
  const customer = customers.find((c) => c.id === shipment.customerId);

  return (
    <>
      <Link to="/agency/freight" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Toutes les expéditions
      </Link>
      <PageHeader
        title={shipment.trackingRef}
        subtitle={`${shipment.description} · enregistré le ${formatDate(shipment.createdAt)}`}
        actions={
          <>
            <Badge className={SHIPMENT_STATUS_STYLES[shipment.status]}>{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>
            {can('freight', 'delete') && (
              <button className={btn.secondary} onClick={() => setConfirm(true)}>
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            )}
          </>
        }
      />

      {/* Progression */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
        <ol className="flex min-w-[520px]">
          {SHIPMENT_STATUS_ORDER.map((s, i) => {
            const reached = SHIPMENT_STATUS_ORDER.indexOf(shipment.status) >= i;
            return (
              <li key={s} className="flex-1 flex flex-col items-center text-center relative">
                {i > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 -z-0 ${reached ? 'bg-[#123B70]' : 'bg-slate-200'}`} />}
                <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${reached ? 'bg-[#123B70] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {i + 1}
                </span>
                <span className={`mt-1.5 text-[11px] ${reached ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>{SHIPMENT_STATUS_LABELS[s]}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Informations">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <dt className="text-slate-500">Client</dt>
              <dd className="font-semibold text-slate-900">
                {customer ? (
                  <Link to={`/agency/customers/${customer.id}`} className="text-[#123B70] hover:underline">
                    {shipment.customerName}
                  </Link>
                ) : (
                  shipment.customerName
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Transport</dt>
              <dd className="font-semibold text-slate-900 inline-flex items-center gap-1">
                <ModeIcon mode={shipment.mode} /> {SHIPMENT_MODE_LABELS[shipment.mode]}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Trajet</dt>
              <dd className="font-semibold text-slate-900">
                {shipment.originCity} → {shipment.destinationCity}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Poids</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{formatNumber(shipment.weightKg, 1)} kg</dd>
            </div>
            <div>
              <dt className="text-slate-500">Volume</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{formatNumber(shipment.volumeCbm, 2)} CBM</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Tarif appliqué</dt>
              <dd className="font-semibold text-slate-900">
                {formatMoney(shipment.rate)} / {shipment.rateType === 'kg' ? 'kg' : 'CBM'}
              </dd>
            </div>
          </dl>
          {shipment.photos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              {shipment.photos.map((p, i) => (
                <button key={i} onClick={() => setPhoto(p)} className="cursor-zoom-in">
                  <img src={p} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Frais et paiements"
          actions={
            can('freight', 'edit') && (
              <button className={btn.secondary} onClick={() => setPayOpen(true)}>
                <Plus className="w-4 h-4" /> Paiement
              </button>
            )
          }
        >
          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-slate-500">Estimé</dt>
              <dd className="font-bold text-slate-900 tabular-nums">{formatMoney(shipment.estimatedCost)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Payé</dt>
              <dd className="font-bold text-emerald-700 tabular-nums">{formatMoney(paid)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reste</dt>
              <dd className={`font-bold tabular-nums ${remaining > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatMoney(remaining)}</dd>
            </div>
          </dl>
          <ul className="mt-4 divide-y divide-slate-100 text-xs">
            {shipment.payments.length === 0 && <li className="text-slate-400 py-2">Aucun paiement déclaré.</li>}
            {shipment.payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between gap-2">
                <div>
                  <div className="text-slate-800">{PAYMENT_METHOD_LABELS[p.method]}</div>
                  <div className="text-[11px] text-slate-400">
                    {formatDate(p.date)}
                    {p.note ? ` · ${p.note}` : ''}
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Historique des statuts">
          {can('freight', 'edit') && shipment.status !== 'delivered' && (
            <form
              className="space-y-2 mb-4 pb-4 border-b border-slate-100"
              onSubmit={async (e) => {
                e.preventDefault();
                await changeShipmentStatus(shipment.id, status, note);
                setNote('');
              }}
            >
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)} aria-label="Nouveau statut">
                {SHIPMENT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SHIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <input className={inputClass} placeholder="Commentaire (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className={`${btn.primary} w-full`} disabled={status === shipment.status}>
                Mettre à jour le statut
              </button>
            </form>
          )}
          <ol className="space-y-3">
            {[...events].reverse().map((ev) => (
              <li key={ev.id} className="flex gap-3 text-xs">
                <span className="mt-1 w-2 h-2 rounded-full bg-[#123B70] shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">{SHIPMENT_STATUS_LABELS[ev.status]}</div>
                  {ev.note && ev.note !== SHIPMENT_STATUS_LABELS[ev.status] && <div className="text-slate-600">{ev.note}</div>}
                  <div className="text-[10px] text-slate-400">
                    {formatDateTime(ev.createdAt)}
                    {ev.actorName ? ` · ${ev.actorName}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Modal
        open={payOpen}
        title="Enregistrer un paiement déclaré"
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <button className={btn.secondary} onClick={() => setPayOpen(false)}>
              Annuler
            </button>
            <button className={btn.primary} type="submit" form="payment-form">
              Enregistrer
            </button>
          </>
        }
      >
        <form
          id="payment-form"
          className="grid sm:grid-cols-2 gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await addShipmentPayment(shipment.id, { ...payment, amount: parseFloat(payment.amount) || 0 });
            setPayOpen(false);
            setPayment({ amount: '', date: todayISO(), method: 'bank', note: '' });
          }}
        >
          <Field label="Montant (USD)" required hint={remaining > 0 ? `Reste à payer : ${formatMoney(remaining)}` : undefined}>
            <NumberInput className={inputClass} value={payment.amount} onChange={(v) => setPayment({ ...payment, amount: v })} required />
          </Field>
          <Field label="Date" required>
            <input type="date" className={inputClass} value={payment.date} max={todayISO()} onChange={(e) => setPayment({ ...payment, date: e.target.value })} required />
          </Field>
          <div className="sm:col-span-2">
            <PaymentMethodPicker value={payment.method} onChange={(v: PaymentMethod) => setPayment({ ...payment, method: v })} />
          </div>
          <Field label="Note">
            <input className={inputClass} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Supprimer le colis"
        text={`Le colis ${shipment.trackingRef} et son historique seront supprimés.`}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteShipment(shipment.id);
          navigate('/agency/freight');
        }}
      />
      <Modal open={!!photo} title="Photo du colis" onClose={() => setPhoto(null)}>
        {photo && <img src={photo} alt="" className="max-w-full rounded-lg" />}
      </Modal>
    </>
  );
};

// ---------- Liste ----------

export const FreightPage: React.FC = () => {
  const { shipmentId } = useParams();
  const { shipments, can, logActivity } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ShipmentStatus>('all');
  const [mode, setMode] = useState<'all' | ShipmentMode>('all');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(
    () =>
      shipments.filter(
        (s) =>
          (status === 'all' || s.status === status) &&
          (mode === 'all' || s.mode === mode) &&
          [s.trackingRef, s.customerName, s.description, s.destinationCity].join(' ').toLowerCase().includes(query.toLowerCase())
      ),
    [shipments, query, status, mode]
  );

  if (shipmentId) {
    const shipment = shipments.find((s) => s.id === shipmentId);
    return shipment ? (
      <ShipmentDetail shipment={shipment} />
    ) : (
      <EmptyState icon={Truck} title="Colis introuvable" text="Ce colis n’appartient pas à l’agence active." action={<Link to="/agency/freight" className={btn.secondary}>Retour</Link>} />
    );
  }

  const exportCsv = () => {
    downloadCSV(
      'expeditions.csv',
      ['Référence', 'Client', 'Description', 'Mode', 'Départ', 'Destination', 'Poids (kg)', 'Volume (CBM)', 'Frais estimés (USD)', 'Payé (USD)', 'Statut', 'Créé le'],
      filtered.map((s) => [s.trackingRef, s.customerName, s.description, SHIPMENT_MODE_LABELS[s.mode], s.originCity, s.destinationCity, s.weightKg, s.volumeCbm, s.estimatedCost, paidOf(s), SHIPMENT_STATUS_LABELS[s.status], s.createdAt.slice(0, 10)])
    );
    logActivity('freight', 'a exporté la liste des expéditions');
  };

  const count = (st: ShipmentStatus) => shipments.filter((s) => s.status === st).length;

  return (
    <>
      <PageHeader
        title="Fret & Logistique"
        subtitle="Expéditions Chine → RDC de votre agence"
        actions={
          <>
            {can('freight', 'export') && (
              <button className={btn.secondary} onClick={exportCsv} disabled={!filtered.length}>
                <Download className="w-4 h-4" /> Exporter
              </button>
            )}
            {can('freight', 'create') && (
              <button className={btn.primary} onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" /> Enregistrer un colis
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {SHIPMENT_STATUS_ORDER.map((st) => (
          <button key={st} onClick={() => setStatus(status === st ? 'all' : st)} className="text-left cursor-pointer" aria-pressed={status === st}>
            <StatCard label={SHIPMENT_STATUS_LABELS[st]} value={count(st)} hint={status === st ? 'Filtre actif' : undefined} />
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Référence, client, destination…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Statut">
          <option value="all">Tous les statuts</option>
          {SHIPMENT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={`${inputClass} sm:w-36`} value={mode} onChange={(e) => setMode(e.target.value as any)} aria-label="Transport">
          <option value="all">Aérien et maritime</option>
          <option value="air">Aérien</option>
          <option value="sea">Maritime</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Truck} title={shipments.length ? 'Aucun colis ne correspond' : 'Aucun colis enregistré'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Référence</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Client</th>
                  <th className="p-3 font-semibold hidden lg:table-cell">Trajet</th>
                  <th className="p-3 font-semibold hidden sm:table-cell text-right">Poids / Volume</th>
                  <th className="p-3 font-semibold text-right">Frais</th>
                  <th className="p-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const due = s.estimatedCost - paidOf(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <Link to={`/agency/freight/${s.id}`} className="font-mono font-semibold text-[#123B70] hover:underline">
                          {s.trackingRef}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{s.description}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-slate-700">{s.customerName}</td>
                      <td className="p-3 hidden lg:table-cell text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <ModeIcon mode={s.mode} /> {s.originCity} → {s.destinationCity}
                        </span>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-right tabular-nums text-slate-600 whitespace-nowrap">
                        {formatNumber(s.weightKg, 1)} kg · {formatNumber(s.volumeCbm, 2)} m³
                      </td>
                      <td className="p-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatMoney(s.estimatedCost)}</div>
                        <div className={`text-[11px] ${due > 0.009 ? 'text-rose-600' : 'text-emerald-600'}`}>{due > 0.009 ? `Reste ${formatMoney(due)}` : 'Soldé'}</div>
                      </td>
                      <td className="p-3">
                        <Badge className={SHIPMENT_STATUS_STYLES[s.status]}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ShipmentForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
};
