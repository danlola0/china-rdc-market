import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  CreditCard,
  ExternalLink,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage } from '../../lib/supabase';
import { Agency } from '../../types';
import { AgencyActivity, AgencyBranch, AgencyMember, AgencySettings, SubscriptionPlan, SubscriptionStatus } from '../../agency/types';
import { NumberInput } from '../../components/common/NumberInput';
import { MODULES, ROLE_LABELS } from '../../agency/permissions';
import { PLANS, SUBSCRIPTION_STATUS } from '../../agency/pages/SubscriptionPage';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, Modal, StatCard } from '../../agency/ui';
import { formatDate, formatDateTime, formatMoney } from '../../agency/utils';
import { AgencyReview } from './AgencyReview';
import {
  deleteAgency,
  inviteAdmin,
  listAllBranches,
  setBranchQuota,
  listActivity,
  listAllMembers,
  listAllSettings,
  listUsers,
  openAgencyWorkspace,
  PlatformUser,
  sendPasswordReset,
  setPlatformAdmin,
  setSubscription,
} from './adminService';

type Tab = 'overview' | 'agencies' | 'approvals' | 'subscriptions' | 'users' | 'products' | 'activity';

const AGENCY_STATUS: Record<Agency['verifiedStatus'], { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Validée', cls: 'bg-emerald-100 text-emerald-800' },
  gold: { label: 'Validée (Gold)', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Refusée', cls: 'bg-rose-100 text-rose-700' },
};

const planName = (plan?: string | null) => PLANS.find((p) => p.key === plan)?.name || '—';

// ---------------------------------------------------------------------
// Modification d'un abonnement
// ---------------------------------------------------------------------
const SubscriptionEditor: React.FC<{
  agency: Agency | null;
  settings?: AgencySettings;
  onClose: () => void;
  onSaved: () => void;
}> = ({ agency, settings, onClose, onSaved }) => {
  const { addToast } = useApp();
  const [form, setForm] = useState({ plan: 'standard' as SubscriptionPlan, status: 'trial' as SubscriptionStatus, expiresAt: '', note: '' });

  useEffect(() => {
    if (!agency) return;
    setForm({
      plan: (settings?.requestedPlan || settings?.plan || 'standard') as SubscriptionPlan,
      status: settings?.subscriptionStatus || 'trial',
      expiresAt: settings?.subscriptionExpiresAt || '',
      note: settings?.subscriptionNote || '',
    });
  }, [agency, settings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    try {
      await setSubscription(agency.id, form.plan, form.status, form.expiresAt || null, form.note);
      addToast(`Abonnement de ${agency.name} mis à jour.`, 'success');
      onSaved();
      onClose();
    } catch (err) {
      addToast(errorMessage(err), 'error');
    }
  };

  const addYear = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setForm((f) => ({ ...f, status: 'active', expiresAt: d.toISOString().slice(0, 10) }));
  };

  return (
    <Modal
      open={!!agency}
      title={`Abonnement — ${agency?.name || ''}`}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="subscription-form">
            Enregistrer
          </button>
        </>
      }
    >
      <form id="subscription-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        {settings?.requestedPlan && (
          <p className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
            L’agence demande la formule « {planName(settings.requestedPlan)} »
            {settings.requestedAt ? ` (le ${formatDate(settings.requestedAt)})` : ''}.
          </p>
        )}
        <Field label="Formule">
          <select className={inputClass} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as SubscriptionPlan })}>
            {PLANS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} — {p.price}
              </option>
            ))}
          </select>
        </Field>
        <Field label="État">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SubscriptionStatus })}>
            {Object.entries(SUBSCRIPTION_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valable jusqu’au">
          <input type="date" className={inputClass} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <button type="button" className={btn.secondary} onClick={addYear}>
            Activer pour 1 an
          </button>
        </div>
        <Field label="Note interne (paiement reçu, référence…)" className="sm:col-span-2">
          <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Fiche complète d'une agence
// ---------------------------------------------------------------------
/** Succursales d'une agence et quota fixé par l'administrateur */
const BranchesAdmin: React.FC<{ agency: Agency; branches: AgencyBranch[]; onSaved: () => void }> = ({ agency, branches, onSaved }) => {
  const { addToast } = useApp();
  const [max, setMax] = useState(String(agency.maxBranches ?? 0));
  const [saving, setSaving] = useState(false);
  useEffect(() => setMax(String(agency.maxBranches ?? 0)), [agency.id, agency.maxBranches]);
  const extra = branches.filter((b) => !b.isHeadquarters);

  const save = async () => {
    setSaving(true);
    try {
      await setBranchQuota(agency.id, parseInt(max) || 0);
      addToast(`${agency.name} peut maintenant avoir ${parseInt(max) || 0} succursale(s) en plus du siège.`, 'success');
      onSaved();
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-2">Succursales</h3>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg mb-3">
        {branches.map((b) => (
          <li key={b.id} className="px-3 py-2 flex items-center justify-between gap-2">
            <span>
              <span className="font-semibold text-slate-900">{b.name}</span>{' '}
              <span className="text-slate-500">· {[b.city, b.country].filter(Boolean).join(', ') || '—'}</span>
            </span>
            {b.isHeadquarters && <Badge className="bg-[#123B70] text-white">Siège</Badge>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Succursales autorisées en plus du siège" hint={`Utilisées : ${extra.length}`}>
          <NumberInput decimals={false} className={`${inputClass} w-32`} value={max === '0' ? '' : max} onChange={(v) => setMax(v || '0')} placeholder="0" />
        </Field>
        <button className={btn.primary} onClick={save} disabled={saving || String(agency.maxBranches ?? 0) === String(parseInt(max) || 0)}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

const AgencyDetail: React.FC<{
  agency: Agency | null;
  members: AgencyMember[];
  branches: AgencyBranch[];
  onBranchesSaved: () => void;
  settings?: AgencySettings;
  onClose: () => void;
  onManage: (a: Agency) => void;
  onSubscription: (a: Agency) => void;
  onDelete: (a: Agency) => void;
}> = ({ agency, members, branches, onBranchesSaved, settings, onClose, onManage, onSubscription, onDelete }) => {
  const { products, orders, approveAgency, rejectAgency } = useApp();
  if (!agency) return null;
  const agencyMembers = members.filter((m) => m.agencyId === agency.id);
  const agencyProducts = products.filter((p) => p.agencyId === agency.id);
  const agencyOrders = orders.filter((o) => o.agencyId === agency.id);
  const sub = settings ? SUBSCRIPTION_STATUS[settings.subscriptionStatus] : null;

  return (
    <Modal open title={agency.name} onClose={onClose} size="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={AGENCY_STATUS[agency.verifiedStatus].cls}>{AGENCY_STATUS[agency.verifiedStatus].label}</Badge>
          {sub && <Badge className={sub.cls}>Abonnement : {sub.label}</Badge>}
          <span className="text-slate-500">Inscrite le {formatDate((agency as any).createdAt)}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className={btn.primary} onClick={() => onManage(agency)}>
              <ExternalLink className="w-4 h-4" /> Gérer l’agence
            </button>
            <button className={btn.secondary} onClick={() => onSubscription(agency)}>
              <CreditCard className="w-4 h-4" /> Abonnement
            </button>
            <button className={btn.secondary} onClick={() => onDelete(agency)}>
              <Trash2 className="w-4 h-4 text-rose-600" /> Supprimer
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <StatCard label="Membres" value={agencyMembers.filter((m) => m.status === 'active').length} />
          <StatCard label="Articles" value={agencyProducts.length} />
          <StatCard label="Commandes" value={agencyOrders.length} />
          <StatCard label="Formule" value={planName(settings?.plan)} hint={settings?.subscriptionExpiresAt ? `jusqu’au ${formatDate(settings.subscriptionExpiresAt)}` : undefined} />
        </div>

        <dl className="grid sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
          <div>
            <dt className="text-slate-500">Ville / pays</dt>
            <dd className="font-semibold">
              {agency.city}
              {(agency as any).country ? `, ${(agency as any).country}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-semibold break-all">{agency.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Téléphone / WhatsApp</dt>
            <dd className="font-semibold">{agency.phoneWeChat || '—'}</dd>
          </div>
        </dl>

        <BranchesAdmin agency={agency} branches={branches.filter((b) => b.agencyId === agency.id)} onSaved={onBranchesSaved} />

        <div>
          <h3 className="font-semibold text-slate-800 mb-2">Équipe</h3>
          {agencyMembers.length === 0 ? (
            <p className="text-slate-400">Aucun membre.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {agencyMembers.map((m) => (
                <li key={m.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold text-slate-900">{m.fullName}</span> <span className="text-slate-500">· {m.email}</span>
                  </span>
                  <span className="text-slate-600">
                    {ROLE_LABELS[m.role]} · {m.status === 'active' ? 'actif' : m.status === 'invited' ? 'invité' : 'désactivé'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100">
          <h3 className="font-semibold text-slate-800 mt-4">Dossier d’identification</h3>
          <AgencyReview agency={agency} />
          {agency.verifiedStatus === 'verified' && (
            <p className="text-slate-500">
              Agence validée.{' '}
              <button className="text-rose-600 hover:underline" onClick={() => rejectAgency(agency.id, 'Validation retirée par l’administrateur')}>
                Retirer la validation
              </button>
            </p>
          )}
          {agency.verifiedStatus === 'rejected' && (
            <button className="text-emerald-700 hover:underline" onClick={() => approveAgency(agency.id)}>
              Valider finalement cette agence
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Suppression définitive d'une agence
// ---------------------------------------------------------------------
const DeleteAgencyDialog: React.FC<{ agency: Agency | null; onClose: () => void; onDeleted: () => void }> = ({ agency, onClose, onDeleted }) => {
  const { products, orders, addToast } = useApp();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setTyped(''), [agency]);
  if (!agency) return null;

  const agencyProducts = products.filter((p) => p.agencyId === agency.id);
  const agencyOrders = orders.filter((o) => o.agencyId === agency.id);
  const confirmed = typed.trim().toLowerCase() === agency.name.trim().toLowerCase();

  const remove = async () => {
    setBusy(true);
    try {
      const name = await deleteAgency(agency.id, agencyProducts.flatMap((p) => p.images));
      addToast(`L’agence « ${name} » a été supprimée.`, 'success');
      onDeleted();
      onClose();
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Supprimer l’agence « ${agency.name} »`}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button className={btn.danger} onClick={remove} disabled={!confirmed || busy}>
            <Trash2 className="w-4 h-4" /> {busy ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
          <strong>Action irréversible.</strong> L’agence disparaît du site et tout ce qui lui appartient est supprimé : {agencyProducts.length} article(s),{' '}
          {agencyOrders.length} commande(s), ses devis, conversations, clients, dépenses, colis, employés, documents et paramètres.
        </p>
        <p className="text-slate-600">
          Si vous voulez seulement la cacher temporairement, utilisez plutôt « Retirer la validation » dans sa fiche.
        </p>
        <Field label={`Pour confirmer, tapez le nom de l’agence : ${agency.name}`}>
          <input className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder={agency.name} />
        </Field>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Ajouter un administrateur (sans inscription acheteur ou agence)
// ---------------------------------------------------------------------
const InviteAdminDialog: React.FC<{ open: boolean; onClose: () => void; onDone: () => void }> = ({ open, onClose, onDone }) => {
  const { addToast } = useApp();
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setForm({ fullName: '', email: '' });
  }, [open]);
  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const status = await inviteAdmin(form.email.trim(), form.fullName.trim());
      addToast(
        status === 'invited'
          ? `Invitation envoyée à ${form.email.trim()}. La personne choisira son mot de passe depuis l’email reçu.`
          : status === 'promoted'
          ? `${form.email.trim()} avait déjà un compte : il est maintenant administrateur.`
          : `${form.email.trim()} est déjà administrateur.`,
        'success'
      );
      onDone();
      onClose();
    } catch (err) {
      addToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Ajouter un administrateur"
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="invite-admin-form" disabled={busy}>
            {busy ? 'Envoi…' : 'Envoyer l’invitation'}
          </button>
        </>
      }
    >
      <form id="invite-admin-form" onSubmit={submit} className="space-y-4">
        <Field label="Nom complet" required>
          <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required autoFocus />
        </Field>
        <Field label="Adresse email" required>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
          <p>La personne reçoit un email avec un lien pour <strong>choisir son mot de passe</strong>. Elle n’a pas besoin de créer de compte acheteur ou agence.</p>
          <p>Si cette adresse a déjà un compte sur le site, il est simplement nommé administrateur.</p>
        </div>
        <p className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
          Un administrateur a accès à <strong>toute la plateforme</strong> : agences, documents, abonnements, utilisateurs et suppressions.
        </p>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Tableau de bord administrateur
// ---------------------------------------------------------------------
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { agencies, products, orders, rfqs, deleteProduct, addToast, refreshData, profile } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [settings, setSettings] = useState<AgencySettings[]>([]);
  const [activity, setActivity] = useState<AgencyActivity[]>([]);
  const [branches, setBranches] = useState<AgencyBranch[]>([]);
  const [loading, setLoading] = useState(false);

  const [agencySearch, setAgencySearch] = useState('');
  const [agencyStatus, setAgencyStatus] = useState<'all' | Agency['verifiedStatus']>('all');
  const [userSearch, setUserSearch] = useState('');
  const [activityAgency, setActivityAgency] = useState('all');
  const [detail, setDetail] = useState<Agency | null>(null);
  const [subFor, setSubFor] = useState<Agency | null>(null);
  const [adminChange, setAdminChange] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAgency, setDeletingAgency] = useState<Agency | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m, s, a, b] = await Promise.all([listUsers(), listAllMembers(), listAllSettings(), listActivity(), listAllBranches()]);
      setBranches(b);
      setUsers(u);
      setMembers(m);
      setSettings(s);
      setActivity(a);
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAll = async () => {
    await Promise.all([refreshData(), load()]);
  };

  const settingsOf = (agencyId: string) => settings.find((s) => s.agencyId === agencyId);
  const agencyName = (id: string) => agencies.find((a) => a.id === id)?.name || '—';
  const pending = agencies.filter((a) => a.verifiedStatus === 'pending');
  const requests = settings.filter((s) => s.requestedPlan);

  const manage = (a: Agency) => {
    if (!profile) return;
    openAgencyWorkspace(profile.id, a.id);
    navigate('/agency');
  };

  const filteredAgencies = useMemo(
    () =>
      agencies.filter(
        (a) =>
          (agencyStatus === 'all' || a.verifiedStatus === agencyStatus) &&
          [a.name, a.city, a.email].join(' ').toLowerCase().includes(agencySearch.toLowerCase())
      ),
    [agencies, agencyStatus, agencySearch]
  );

  const filteredUsers = users.filter((u) => [u.fullName, u.email, u.agencies].join(' ').toLowerCase().includes(userSearch.toLowerCase()));
  const filteredActivity = activity.filter((a) => activityAgency === 'all' || a.agencyId === activityAgency);

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { key: 'agencies', label: 'Agences', icon: Building2, count: agencies.length },
    { key: 'approvals', label: 'Validations', icon: FileCheck2, count: pending.length },
    { key: 'subscriptions', label: 'Abonnements', icon: CreditCard, count: requests.length || undefined },
    { key: 'users', label: 'Utilisateurs', icon: Users, count: users.length },
    { key: 'products', label: 'Catalogue', icon: Package, count: products.length },
    { key: 'activity', label: 'Activité', icon: Activity },
  ];

  const volume = orders.reduce((s, o) => s + o.totalUSD, 0);
  const activeSubs = settings.filter((s) => s.subscriptionStatus === 'active').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-xs">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-950 to-[#123B70] text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">Administration ASEP MARKET</h1>
            <p className="text-slate-300 mt-0.5">Contrôle des agences, abonnements, utilisateurs et de toute l’activité de la plateforme.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/agency?new=1')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF8A00] hover:bg-[#e57c00] font-semibold cursor-pointer">
            <Plus className="w-4 h-4" /> Ajouter une agence
          </button>
          <button onClick={refreshAll} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold cursor-pointer" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap border-b-2 -mb-px font-semibold cursor-pointer ${
              tab === key ? 'border-purple-900 text-purple-950' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && <span className="ml-0.5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{count}</span>}
          </button>
        ))}
      </div>

      {/* Vue d'ensemble */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Agences"
              value={agencies.length}
              hint={`${agencies.filter((a) => a.verifiedStatus === 'verified' || a.verifiedStatus === 'gold').length} validées · ${pending.length} en attente`}
              icon={Building2}
            />
            <StatCard
              label="Utilisateurs"
              value={users.length}
              hint={`${users.filter((u) => u.accountType === 'buyer').length} acheteurs · ${users.filter((u) => u.accountType === 'agency').length} agences`}
              icon={Users}
            />
            <StatCard label="Abonnements actifs" value={activeSubs} hint={`${requests.length} demande(s) de formule`} icon={CreditCard} />
            <StatCard label="Articles publiés" value={products.length} icon={Package} />
            <StatCard label="Demandes de devis" value={rfqs.length} hint={`${rfqs.filter((r) => r.status === 'pending').length} à chiffrer`} />
            <StatCard label="Commandes" value={orders.length} hint={`Volume ${formatMoney(volume)}`} />
            <StatCard label="Membres d’agences" value={members.filter((m) => m.status === 'active').length} hint={`${members.filter((m) => m.status === 'invited').length} invitation(s)`} />
            <StatCard label="Administrateurs" value={users.filter((u) => u.isAdmin).length} icon={Shield} />
          </div>

          {(pending.length > 0 || requests.length > 0) && (
            <div className="grid md:grid-cols-2 gap-3">
              {pending.length > 0 && (
                <button onClick={() => setTab('approvals')} className="text-left p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
                  <strong>{pending.length} agence(s)</strong> attendent la vérification de leur dossier →
                </button>
              )}
              {requests.length > 0 && (
                <button onClick={() => setTab('subscriptions')} className="text-left p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 cursor-pointer">
                  <strong>{requests.length} demande(s)</strong> de changement de formule à traiter →
                </button>
              )}
            </div>
          )}

          <Card title="Activité récente sur la plateforme">
            {activity.length === 0 ? (
              <EmptyState icon={Activity} title="Aucune activité pour le moment" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {activity.slice(0, 10).map((a) => (
                  <li key={a.id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-[11px] text-slate-400 sm:w-32 shrink-0">{formatDateTime(a.createdAt)}</span>
                    <span className="font-semibold text-[#123B70] sm:w-40 truncate">{agencyName(a.agencyId)}</span>
                    <span className="text-slate-700">
                      <strong>{a.actorName}</strong> {a.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Agences */}
      {tab === 'agencies' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${inputClass} pl-9`} placeholder="Nom, ville, email…" value={agencySearch} onChange={(e) => setAgencySearch(e.target.value)} />
            </div>
            <select className={`${inputClass} sm:w-48`} value={agencyStatus} onChange={(e) => setAgencyStatus(e.target.value as any)} aria-label="Statut">
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="verified">Validées</option>
              <option value="rejected">Refusées</option>
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filteredAgencies.length === 0 ? (
              <EmptyState icon={Building2} title="Aucune agence" text="Les agences inscrites apparaîtront ici." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 font-semibold">Agence</th>
                      <th className="p-3 font-semibold">Statut</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Abonnement</th>
                      <th className="p-3 font-semibold hidden lg:table-cell text-right">Succursales</th>
                      <th className="p-3 font-semibold hidden lg:table-cell text-right">Membres</th>
                      <th className="p-3 font-semibold hidden lg:table-cell text-right">Articles</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Inscrite le</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAgencies.map((a) => {
                      const s = settingsOf(a.id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <button onClick={() => setDetail(a)} className="font-semibold text-[#123B70] hover:underline text-left cursor-pointer">
                              {a.name}
                            </button>
                            <div className="text-[11px] text-slate-400">
                              {a.city} · {a.email}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={AGENCY_STATUS[a.verifiedStatus].cls}>{AGENCY_STATUS[a.verifiedStatus].label}</Badge>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {s ? (
                              <>
                                <div className="font-semibold text-slate-800">{planName(s.plan)}</div>
                                <Badge className={SUBSCRIPTION_STATUS[s.subscriptionStatus].cls}>{SUBSCRIPTION_STATUS[s.subscriptionStatus].label}</Badge>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-right tabular-nums">
                            {branches.filter((b) => b.agencyId === a.id && !b.isHeadquarters).length} / {a.maxBranches ?? 0}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-right tabular-nums">{members.filter((m) => m.agencyId === a.id && m.status === 'active').length}</td>
                          <td className="p-3 hidden lg:table-cell text-right tabular-nums">{products.filter((p) => p.agencyId === a.id).length}</td>
                          <td className="p-3 hidden md:table-cell text-slate-500">{formatDate((a as any).createdAt)}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <button className={btn.secondary} onClick={() => setDetail(a)}>
                                Fiche
                              </button>
                              <button className={btn.primary} onClick={() => manage(a)}>
                                Gérer
                              </button>
                              <button className={btn.icon} onClick={() => setDeletingAgency(a)} title="Supprimer l’agence">
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validations */}
      {tab === 'approvals' && (
        <Card title="Agences en attente de validation">
          {pending.length === 0 ? (
            <EmptyState icon={FileCheck2} title="Aucune agence en attente" text="Les nouveaux dossiers d’agence apparaîtront ici." />
          ) : (
            <div className="divide-y divide-slate-200">
              {pending.map((a) => (
                <AgencyReview key={a.id} agency={a} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Abonnements */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <p className="text-slate-500">Les agences paient hors du site (Mobile Money, virement…). Après réception du paiement, activez leur formule ici.</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {agencies.length === 0 ? (
              <EmptyState icon={CreditCard} title="Aucune agence" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 font-semibold">Agence</th>
                      <th className="p-3 font-semibold">Formule</th>
                      <th className="p-3 font-semibold">État</th>
                      <th className="p-3 font-semibold hidden sm:table-cell">Expire le</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Demande</th>
                      <th className="p-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...agencies]
                      .sort((x, y) => Number(!!settingsOf(y.id)?.requestedPlan) - Number(!!settingsOf(x.id)?.requestedPlan))
                      .map((a) => {
                        const s = settingsOf(a.id);
                        const expired = !!s?.subscriptionExpiresAt && s.subscriptionExpiresAt < new Date().toISOString().slice(0, 10);
                        return (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{a.name}</td>
                            <td className="p-3">{planName(s?.plan)}</td>
                            <td className="p-3">
                              {s && <Badge className={SUBSCRIPTION_STATUS[s.subscriptionStatus].cls}>{SUBSCRIPTION_STATUS[s.subscriptionStatus].label}</Badge>}
                            </td>
                            <td className={`p-3 hidden sm:table-cell ${expired ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                              {s?.subscriptionExpiresAt ? formatDate(s.subscriptionExpiresAt) : '—'}
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              {s?.requestedPlan ? <Badge className="bg-amber-100 text-amber-800">{planName(s.requestedPlan)}</Badge> : '—'}
                            </td>
                            <td className="p-3 text-right">
                              <button className={btn.primary} onClick={() => setSubFor(a)}>
                                Modifier
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Utilisateurs */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            Les mots de passe sont chiffrés et ne peuvent être lus par personne. En cas d’oubli ou de problème, envoyez à l’utilisateur un lien pour en
            choisir un nouveau (icône clé).
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${inputClass} pl-9`} placeholder="Nom, email, agence…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            <button className={btn.primary} onClick={() => setInviteOpen(true)}>
              <ShieldCheck className="w-4 h-4" /> Ajouter un administrateur
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title="Aucun utilisateur" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 font-semibold">Utilisateur</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold hidden lg:table-cell">Agences</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Inscrit le</th>
                      <th className="p-3 font-semibold hidden md:table-cell">Dernière connexion</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">
                            {u.fullName || '—'} {u.isAdmin && <Badge className="bg-purple-100 text-purple-800 ml-1">Admin</Badge>}
                          </div>
                          <div className="text-[11px] text-slate-400 break-all">{u.email}</div>
                          {!u.emailConfirmedAt && <div className="text-[11px] text-amber-700">Email non confirmé</div>}
                        </td>
                        <td className="p-3">{u.isAdmin ? 'Administrateur' : u.accountType === 'agency' ? 'Agence' : 'Acheteur'}</td>
                        <td className="p-3 hidden lg:table-cell text-slate-600">{u.agencies || '—'}</td>
                        <td className="p-3 hidden md:table-cell text-slate-500">{formatDate(u.createdAt)}</td>
                        <td className="p-3 hidden md:table-cell text-slate-500">{u.lastSignInAt ? formatDateTime(u.lastSignInAt) : 'Jamais'}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <button
                              className={btn.icon}
                              title="Envoyer un lien pour choisir un nouveau mot de passe"
                              onClick={async () => {
                                try {
                                  await sendPasswordReset(u.email);
                                  addToast(`Lien de nouveau mot de passe envoyé à ${u.email}.`, 'success');
                                } catch (e) {
                                  addToast(errorMessage(e), 'error');
                                }
                              }}
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {u.id !== profile?.id && (
                              <button className={btn.icon} title={u.isAdmin ? 'Retirer les droits d’administrateur' : 'Nommer administrateur'} onClick={() => setAdminChange(u)}>
                                {u.isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
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
        </div>
      )}

      {/* Catalogue */}
      {tab === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {products.length === 0 ? (
            <EmptyState icon={Package} title="Aucun article publié" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Article</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Agence</th>
                    <th className="p-3 font-semibold">Prix</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {p.images[0] && <img src={p.images[0]} alt="" className="w-9 h-9 rounded object-cover border border-slate-200" />}
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-slate-600">{p.agencyName}</td>
                      <td className="p-3 tabular-nums">
                        {formatMoney(p.priceMin)} – {formatMoney(p.priceMax)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Link to={`/product/${p.id}`} className={btn.icon} title="Voir">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button className={btn.icon} title="Retirer du catalogue" onClick={() => setDeleting(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Activité */}
      {tab === 'activity' && (
        <Card
          title="Journal de toutes les agences"
          actions={
            <select className={`${inputClass} w-56`} value={activityAgency} onChange={(e) => setActivityAgency(e.target.value)} aria-label="Agence">
              <option value="all">Toutes les agences</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          }
        >
          {filteredActivity.length === 0 ? (
            <EmptyState icon={Activity} title="Aucune activité" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredActivity.map((a) => (
                <li key={a.id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-[11px] text-slate-400 sm:w-32 shrink-0">{formatDateTime(a.createdAt)}</span>
                  <span className="font-semibold text-[#123B70] sm:w-40 truncate">{agencyName(a.agencyId)}</span>
                  <span className="text-slate-700 flex-1">
                    <strong>{a.actorName}</strong> {a.description}
                  </span>
                  <Badge className="bg-slate-100 text-slate-600 self-start sm:self-auto">{MODULES.find((m) => m.key === a.module)?.label}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-400">200 dernières actions.</p>
        </Card>
      )}

      <AgencyDetail
        agency={detail ? agencies.find((x) => x.id === detail.id) || detail : null}
        members={members}
        branches={branches}
        onBranchesSaved={refreshAll}
        settings={detail ? settingsOf(detail.id) : undefined}
        onClose={() => setDetail(null)}
        onManage={manage}
        onSubscription={(a) => setSubFor(a)}
        onDelete={(a) => setDeletingAgency(a)}
      />
      <InviteAdminDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={load} />
      <DeleteAgencyDialog
        agency={deletingAgency}
        onClose={() => setDeletingAgency(null)}
        onDeleted={() => {
          setDetail(null);
          refreshAll();
        }}
      />
      <SubscriptionEditor agency={subFor} settings={subFor ? settingsOf(subFor.id) : undefined} onClose={() => setSubFor(null)} onSaved={load} />
      <ConfirmDialog
        open={!!adminChange}
        title={adminChange?.isAdmin ? 'Retirer les droits d’administrateur' : 'Nommer administrateur'}
        text={
          adminChange?.isAdmin
            ? `${adminChange?.email} ne pourra plus accéder à l’administration.`
            : `${adminChange?.email} aura accès à toute la plateforme : agences, documents, abonnements et utilisateurs.`
        }
        confirmLabel={adminChange?.isAdmin ? 'Retirer' : 'Nommer administrateur'}
        onClose={() => setAdminChange(null)}
        onConfirm={async () => {
          if (!adminChange) return;
          try {
            await setPlatformAdmin(adminChange.id, !adminChange.isAdmin);
            addToast('Droits mis à jour.', 'success');
            await load();
          } catch (e) {
            addToast(errorMessage(e), 'error');
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Retirer l’article du catalogue"
        text="L’article sera supprimé définitivement."
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteProduct(deleting)}
      />
    </div>
  );
};
