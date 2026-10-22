import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyCustomer, CustomerStatus } from '../types';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader } from '../ui';
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_STYLES,
  DRC_DESTINATIONS,
  downloadCSV,
  formatDate,
  formatMoney,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_STYLES,
} from '../utils';
import { ORDER_STATUS_LABELS } from './OrdersPage';

const emptyCustomer: Partial<AgencyCustomer> = {
  name: '',
  company: '',
  phone: '',
  email: '',
  city: 'Kinshasa',
  address: '',
  status: 'prospect',
  notes: '',
};

const CustomerForm: React.FC<{
  open: boolean;
  initial: Partial<AgencyCustomer>;
  onClose: () => void;
}> = ({ open, initial, onClose }) => {
  const { saveCustomer } = useWorkspace();
  const [form, setForm] = useState(initial);
  React.useEffect(() => {
    if (open) setForm(initial);
  }, [initial, open]);

  const set = (k: keyof AgencyCustomer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await saveCustomer(form)) onClose();
  };

  return (
    <Modal
      open={open}
      title={form.id ? 'Modifier la fiche client' : 'Nouveau client'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="customer-form">
            Enregistrer
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom du contact" required>
          <input className={inputClass} value={form.name || ''} onChange={set('name')} required />
        </Field>
        <Field label="Entreprise">
          <input className={inputClass} value={form.company || ''} onChange={set('company')} />
        </Field>
        <Field label="Téléphone">
          <input className={inputClass} value={form.phone || ''} onChange={set('phone')} placeholder="+243 …" />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email || ''} onChange={set('email')} />
        </Field>
        <Field label="Ville">
          <input className={inputClass} value={form.city || ''} onChange={set('city')} list="drc-cities" />
          <datalist id="drc-cities">
            {DRC_DESTINATIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Statut">
          <select className={inputClass} value={form.status} onChange={set('status')}>
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <input className={inputClass} value={form.address || ''} onChange={set('address')} />
        </Field>
        <Field label="Notes internes" hint="Visibles uniquement par les membres de votre agence." className="sm:col-span-2">
          <textarea rows={3} className={inputClass} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
};

const CustomerDetail: React.FC<{ customer: AgencyCustomer }> = ({ customer }) => {
  const { orders, shipments, can, deleteCustomer } = useWorkspace();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const customerOrders = orders.filter((o) => (customer.buyerId ? o.buyerId === customer.buyerId : o.buyerName === customer.name));
  const customerShipments = shipments.filter((s) => s.customerId === customer.id);

  return (
    <>
      <Link to="/agency/customers" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Tous les clients
      </Link>
      <PageHeader
        title={customer.name}
        subtitle={customer.company}
        actions={
          <>
            {can('customers', 'edit') && (
              <button className={btn.secondary} onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" /> Modifier
              </button>
            )}
            {can('customers', 'delete') && (
              <button className={btn.secondary} onClick={() => setConfirm(true)}>
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            )}
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Coordonnées">
          <dl className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge className={CUSTOMER_STATUS_STYLES[customer.status]}>{CUSTOMER_STATUS_LABELS[customer.status]}</Badge>
              {customer.buyerId && <Badge className="bg-blue-50 text-blue-700">Compte marketplace</Badge>}
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" /> {customer.phone || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" /> {customer.email || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" /> {[customer.address, customer.city].filter(Boolean).join(', ') || '—'}
            </div>
            <div className="text-slate-500">Client depuis le {formatDate(customer.createdAt)}</div>
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-[11px] font-semibold text-slate-500 mb-1">Notes internes</h3>
            <p className="text-xs text-slate-700 whitespace-pre-line">{customer.notes || 'Aucune note.'}</p>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card title={`Historique des commandes (${customerOrders.length})`}>
            {customerOrders.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune commande marketplace pour ce client.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {customerOrders.map((o) => (
                  <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 font-mono">{o.orderNumber}</div>
                      <div className="text-slate-500 truncate">{o.productName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{formatMoney(o.totalUSD)}</div>
                      <div className="text-[11px] text-slate-400">{ORDER_STATUS_LABELS[o.status]}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Historique des expéditions (${customerShipments.length})`}>
            {customerShipments.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun colis enregistré pour ce client.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {customerShipments.map((s) => (
                  <li key={s.id} className="py-2">
                    <Link to={`/agency/freight/${s.id}`} className="flex items-center justify-between gap-3 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 font-mono">{s.trackingRef}</div>
                        <div className="text-slate-500 truncate">
                          {s.description} · {s.originCity} → {s.destinationCity}
                        </div>
                      </div>
                      <Badge className={SHIPMENT_STATUS_STYLES[s.status]}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <CustomerForm open={editOpen} initial={customer} onClose={() => setEditOpen(false)} />
      <ConfirmDialog
        open={confirm}
        title="Supprimer le client"
        text={`La fiche de ${customer.name} et ses notes internes seront supprimées. Les colis existants restent enregistrés.`}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteCustomer(customer.id);
          navigate('/agency/customers');
        }}
      />
    </>
  );
};

export const CustomersPage: React.FC = () => {
  const { customerId } = useParams();
  const { customers, shipments, can, logActivity } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CustomerStatus>('all');
  const [city, setCity] = useState('all');
  const [formOpen, setFormOpen] = useState(false);

  const cities = useMemo(() => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort(), [customers]);
  const filtered = customers.filter(
    (c) =>
      (status === 'all' || c.status === status) &&
      (city === 'all' || c.city === city) &&
      [c.name, c.company, c.phone, c.email].join(' ').toLowerCase().includes(query.toLowerCase())
  );

  if (customerId) {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? (
      <CustomerDetail customer={customer} />
    ) : (
      <EmptyState icon={Users} title="Client introuvable" text="Ce client n’existe pas dans l’agence active." action={<Link to="/agency/customers" className={btn.secondary}>Retour</Link>} />
    );
  }

  const exportCsv = () => {
    downloadCSV(
      'clients.csv',
      ['Nom', 'Entreprise', 'Téléphone', 'Email', 'Ville', 'Statut', 'Colis'],
      filtered.map((c) => [c.name, c.company, c.phone, c.email, c.city, CUSTOMER_STATUS_LABELS[c.status], shipments.filter((s) => s.customerId === c.id).length])
    );
    logActivity('customers', 'a exporté la liste des clients');
  };

  return (
    <>
      <PageHeader
        title="Gestion clients"
        subtitle={`${customers.length} client(s) dans votre agence`}
        actions={
          <>
            {can('customers', 'export') && (
              <button className={btn.secondary} onClick={exportCsv} disabled={!filtered.length}>
                <Download className="w-4 h-4" /> Exporter
              </button>
            )}
            {can('customers', 'create') && (
              <button className={btn.primary} onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" /> Ajouter un client
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Nom, entreprise, téléphone…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Statut">
          <option value="all">Tous les statuts</option>
          {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className={`${inputClass} sm:w-40`} value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville">
          <option value="all">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title={customers.length ? 'Aucun client ne correspond' : 'Aucun client'} text={customers.length ? undefined : 'Ajoutez vos clients pour suivre leurs commandes et expéditions.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Client</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Contact</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">Ville</th>
                  <th className="p-3 font-semibold hidden sm:table-cell text-right">Colis</th>
                  <th className="p-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <Link to={`/agency/customers/${c.id}`} className="font-semibold text-[#123B70] hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-slate-400">{c.company}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-slate-600">
                      <div>{c.phone}</div>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-slate-600">{c.city}</td>
                    <td className="p-3 hidden sm:table-cell text-right tabular-nums">{shipments.filter((s) => s.customerId === c.id).length}</td>
                    <td className="p-3">
                      <Badge className={CUSTOMER_STATUS_STYLES[c.status]}>{CUSTOMER_STATUS_LABELS[c.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerForm open={formOpen} initial={emptyCustomer} onClose={() => setFormOpen(false)} />
    </>
  );
};
