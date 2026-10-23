import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Agency, Conversation, Order, Product, RFQ } from '../types';
import { agencyService, newId } from './services/agencyService';
import { clonePermissions, hasPermission, ROLE_LABELS } from './permissions';
import {
  AgencyActivity,
  AgencyBranch,
  AgencyCustomer,
  AgencyExpense,
  AgencyMember,
  AgencyRole,
  AgencySettings,
  AgencyShipment,
  AgencyShipmentEvent,
  ModuleKey,
  PermissionAction,
  PermissionMatrix,
  Profile,
  ShipmentPayment,
  ShipmentStatus,
} from './types';
import { SHIPMENT_STATUS_LABELS } from './utils';
import { errorMessage, supabase } from '../lib/supabase';
import { AgencyVerification, DocumentType, saveVerification, uploadDocument } from './services/verificationService';

const lsActiveAgency = (profileId: string) => `asep_ws_active_agency_${profileId}`;

const lsGet = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const lsSet = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // stockage indisponible
  }
};

export const defaultSettings = (agencyId: string): AgencySettings => ({
  id: agencyId,
  agencyId,
  country: 'Chine',
  primaryColor: '#123B70',
  accentColor: '#FF8A00',
  defaultCurrency: 'USD',
  freightRates: { airPerKg: 10, seaPerCbm: 220 },
  notifications: { newOrder: true, newMessage: true, shipmentUpdate: true, weeklyReport: false },
  display: { compactTables: false, showMarketplaceOrders: true },
  plan: 'standard',
  subscriptionStatus: 'trial',
  subscriptionExpiresAt: null,
  subscriptionNote: '',
  requestedPlan: null,
  requestedAt: null,
});

export interface NewAgencyInput {
  name: string;
  city: Agency['city'];
  country: string;
  address: string;
  email: string;
  phone: string;
  description: string;
  ownerName: string;
  /** Dossier d'identification (RCCM, responsable…) */
  verification: Partial<AgencyVerification>;
  /** Pièces justificatives à envoyer */
  documents: { docType: DocumentType; file: File }[];
}

export interface MemberInput {
  fullName: string;
  email: string;
  phone: string;
  role: AgencyRole;
  /** Succursale de rattachement (null = toutes) */
  branchId?: string | null;
}

/** 'all' = toutes les succursales visibles, sinon l'identifiant d'une succursale */
export type BranchFilter = 'all' | string;

export interface ShipmentInput
  extends Omit<AgencyShipment, 'id' | 'agencyId' | 'trackingRef' | 'createdAt' | 'updatedAt' | 'payments' | 'status'> {
  trackingRef: string;
}

interface WorkspaceContextType {
  profile: Profile;
  memberships: AgencyMember[];
  myAgencies: Agency[];
  activeAgencyId: string | null;
  activeAgency: Agency | null;
  switchAgency: (agencyId: string) => void;
  currentMember: AgencyMember | null;
  ready: boolean;
  can: (module: ModuleKey, action?: PermissionAction) => boolean;

  // Succursales
  branches: AgencyBranch[];
  headquarters: AgencyBranch | null;
  /** true si l'utilisateur voit toutes les succursales (siège, propriétaire, administrateur) */
  seesAllBranches: boolean;
  branchFilter: BranchFilter;
  setBranchFilter: (f: BranchFilter) => void;
  /** Succursale utilisée par défaut pour une nouvelle saisie */
  defaultBranchId: string | null;
  branchName: (id?: string | null) => string;
  saveBranch: (branch: Partial<AgencyBranch> & { id?: string }) => Promise<boolean>;
  deleteBranch: (id: string) => Promise<void>;

  // Données de l'agence active uniquement (filtrées selon la succursale choisie)
  members: AgencyMember[];
  customers: AgencyCustomer[];
  expenses: AgencyExpense[];
  shipments: AgencyShipment[];
  shipmentEvents: AgencyShipmentEvent[];
  settings: AgencySettings;
  activity: AgencyActivity[];
  products: Product[];
  orders: Order[];
  rfqs: RFQ[];
  conversations: Conversation[];

  // Actions
  createAgency: (input: NewAgencyInput, onProgress?: (step: string) => void) => Promise<boolean>;
  saveCustomer: (customer: Partial<AgencyCustomer> & { id?: string }) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<void>;
  saveExpense: (expense: Partial<AgencyExpense> & { id?: string }) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<void>;
  createShipment: (input: ShipmentInput) => Promise<AgencyShipment | null>;
  updateShipment: (id: string, patch: Partial<AgencyShipment>) => Promise<boolean>;
  deleteShipment: (id: string) => Promise<void>;
  changeShipmentStatus: (id: string, status: ShipmentStatus, note: string) => Promise<void>;
  addShipmentPayment: (id: string, payment: Omit<ShipmentPayment, 'id'>) => Promise<void>;
  inviteMember: (input: MemberInput) => Promise<boolean>;
  updateMember: (id: string, patch: Partial<AgencyMember>) => Promise<boolean>;
  removeMember: (id: string) => Promise<void>;
  setMemberPermissions: (id: string, permissions: PermissionMatrix) => Promise<void>;
  saveSettings: (patch: Partial<AgencySettings>) => Promise<void>;
  updateAgencyProfile: (patch: Partial<Agency>) => Promise<void>;
  logActivity: (module: ModuleKey, description: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const AgencyWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const app = useApp();
  const { addToast } = app;

  const profile: Profile = useMemo(
    () => ({ id: app.profile?.id || '', fullName: app.profile?.fullName || app.profile?.email || '', email: app.profile?.email || '' }),
    [app.profile]
  );

  const [memberships, setMemberships] = useState<AgencyMember[]>([]);
  const [activeAgencyId, setActiveAgencyId] = useState<string | null>(null);
  const [membershipsReady, setMembershipsReady] = useState(false);
  const [loadedAgencyId, setLoadedAgencyId] = useState<string | null>(null);

  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [customers, setCustomers] = useState<AgencyCustomer[]>([]);
  const [expenses, setExpenses] = useState<AgencyExpense[]>([]);
  const [shipments, setShipments] = useState<AgencyShipment[]>([]);
  const [shipmentEvents, setShipmentEvents] = useState<AgencyShipmentEvent[]>([]);
  const [settingsRows, setSettingsRows] = useState<AgencySettings[]>([]);
  const [activity, setActivity] = useState<AgencyActivity[]>([]);
  const [branches, setBranches] = useState<AgencyBranch[]>([]);
  const [branchFilterState, setBranchFilterState] = useState<BranchFilter>('all');

  // ---------- Appartenances du profil connecté ----------
  // L'administrateur de la plateforme peut entrer dans toutes les agences, avec tous les droits
  const isPlatformAdmin = !!app.profile?.isAdmin;
  const agencyIdsKey = app.agencies.map((a) => a.id).join(',');
  const adminMember = useCallback(
    (agencyId: string): AgencyMember => ({
      id: `admin-${agencyId}`,
      agencyId,
      profileId: profile.id,
      fullName: `${profile.fullName || 'Administrateur'} (Admin ASEP)`,
      email: profile.email,
      phone: '',
      role: 'owner',
      status: 'active',
      permissions: clonePermissions('owner'),
      invitedAt: '',
    }),
    [profile.id, profile.fullName, profile.email]
  );

  const refreshMemberships = useCallback(async () => {
    if (!profile.id) {
      setMemberships([]);
      setActiveAgencyId(null);
      setMembershipsReady(true);
      return;
    }
    let rows: AgencyMember[] = [];
    try {
      rows = await agencyService.listMembershipsForProfile(profile.id);
    } catch (e) {
      console.error(e);
    }
    if (isPlatformAdmin) {
      const own = new Set(rows.map((m) => m.agencyId));
      rows = [...rows, ...app.agencies.filter((a) => !own.has(a.id)).map((a) => adminMember(a.id))];
    }
    setMemberships(rows);
    const usable = rows.filter((m) => m.status === 'active');
    const stored = lsGet(lsActiveAgency(profile.id));
    const next = usable.find((m) => m.agencyId === stored)?.agencyId || usable[0]?.agencyId || null;
    setActiveAgencyId(next);
    setMembershipsReady(true);
  }, [profile.id, isPlatformAdmin, agencyIdsKey, adminMember]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  // ---------- Chargement des données de l'agence active ----------
  const reload = useCallback(async (agencyId: string | null = activeAgencyId) => {
    if (!agencyId) {
      setMembers([]);
      setCustomers([]);
      setExpenses([]);
      setShipments([]);
      setShipmentEvents([]);
      setSettingsRows([]);
      setActivity([]);
      setBranches([]);
      setLoadedAgencyId(null);
      return;
    }
    const safe = <T,>(promise: Promise<T[]>) =>
      promise.catch((err) => {
        console.error(err);
        return [] as T[];
      });
    const [m, c, e, s, ev, st, a, br] = await Promise.all([
      safe(agencyService.list('agency_members', agencyId)),
      safe(agencyService.list('agency_customers', agencyId)),
      safe(agencyService.list('agency_expenses', agencyId)),
      safe(agencyService.list('agency_shipments', agencyId)),
      safe(agencyService.list('agency_shipment_events', agencyId)),
      safe(agencyService.list('agency_settings', agencyId)),
      safe(agencyService.list('agency_activity', agencyId)),
      safe(agencyService.list('agency_branches', agencyId)),
    ]);
    setMembers(m);
    setCustomers(c.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
    setExpenses(e.sort((x, y) => y.date.localeCompare(x.date)));
    setShipments(s.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
    setShipmentEvents(ev.sort((x, y) => x.createdAt.localeCompare(y.createdAt)));
    setSettingsRows(st);
    setActivity(a.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
    // Le siège d'abord, puis les succursales par ordre de création
    setBranches(br.sort((x, y) => Number(y.isHeadquarters) - Number(x.isHeadquarters) || x.createdAt.localeCompare(y.createdAt)));
    setLoadedAgencyId(agencyId);
  }, [activeAgencyId]);

  useEffect(() => {
    reload(activeAgencyId);
  }, [activeAgencyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchAgency = (agencyId: string) => {
    if (!memberships.some((m) => m.agencyId === agencyId && m.status === 'active')) return;
    setBranchFilterState('all');
    lsSet(lsActiveAgency(profile.id), agencyId);
    setActiveAgencyId(agencyId);
    const name = app.agencies.find((a) => a.id === agencyId)?.name;
    if (name) addToast(`Agence active : ${name}`, 'info');
  };

  // ---------- Membre courant et permissions ----------
  const currentMember = useMemo(
    () =>
      members.find((m) => m.profileId === profile.id && m.agencyId === activeAgencyId) ||
      (isPlatformAdmin && activeAgencyId ? adminMember(activeAgencyId) : null),
    [members, profile.id, activeAgencyId, isPlatformAdmin, adminMember]
  );

  const can = useCallback(
    (module: ModuleKey, action: PermissionAction = 'view') =>
      !!currentMember &&
      currentMember.status === 'active' &&
      (currentMember.role === 'owner' ||
        (hasPermission(currentMember.permissions, module, action) &&
          // Paramètres et abonnement de l'agence : réservés au siège
          (!currentMember.branchId || (module !== 'settings' && module !== 'subscription')))),
    [currentMember]
  );

  const guard = (module: ModuleKey, action: PermissionAction) => {
    if (can(module, action)) return true;
    addToast('Action non autorisée pour votre rôle.', 'error');
    return false;
  };

  const logActivity = async (module: ModuleKey, description: string) => {
    if (!activeAgencyId) return;
    const row: AgencyActivity = {
      id: newId('act'),
      agencyId: activeAgencyId,
      actorName: currentMember?.fullName || profile.fullName,
      module,
      description,
      createdAt: new Date().toISOString(),
    };
    await agencyService.insert('agency_activity', row);
    setActivity((prev) => [row, ...prev]);
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      return true;
    } catch (e: any) {
      addToast(errorMessage(e), 'error');
      return false;
    }
  };

  // ---------- Données marketplace filtrées sur l'agence active ----------
  const activeAgency = app.agencies.find((a) => a.id === activeAgencyId) || null;
  const scope = <T extends { agencyId: string }>(rows: T[]) => rows.filter((r) => r.agencyId === activeAgencyId);
  const products = useMemo(() => scope(app.products), [app.products, activeAgencyId]);
  const orders = useMemo(() => scope(app.orders), [app.orders, activeAgencyId]);
  const rfqs = useMemo(() => scope(app.rfqs), [app.rfqs, activeAgencyId]);
  const conversations = useMemo(() => scope(app.conversations), [app.conversations, activeAgencyId]);

  const myAgencies = useMemo(
    () =>
      memberships
        .filter((m) => m.status === 'active')
        .map((m) => app.agencies.find((a) => a.id === m.agencyId))
        .filter(Boolean) as Agency[],
    [memberships, app.agencies]
  );

  const settings = settingsRows[0] || defaultSettings(activeAgencyId || '');

  // ---------- Création d'agence / démonstration ----------
  const createAgency = async (input: NewAgencyInput, onProgress?: (step: string) => void) => {
    let agencyId: string | null = null;
    try {
      onProgress?.('Création de l’agence…');
      agencyId = await agencyService.createAgency(input);
      // Le propriétaire vient d'être créé : il a le droit de compléter la fiche et le dossier
      const { error } = await supabase.from('agencies').update({ country: input.country, address: input.address }).eq('id', agencyId);
      if (error) throw error;
      onProgress?.('Enregistrement du dossier…');
      await saveVerification(agencyId, input.verification, true);
      for (const [i, doc] of input.documents.entries()) {
        onProgress?.(`Envoi des documents (${i + 1}/${input.documents.length})…`);
        await uploadDocument(agencyId, doc.docType, doc.file);
      }
      addToast('Dossier envoyé. Votre agence sera visible sur le site après vérification par ASEP.', 'success');
      return true;
    } catch (e) {
      addToast(
        agencyId
          ? `L’agence est créée mais le dossier est incomplet : ${errorMessage(e)} Complétez-le dans Paramètres.`
          : errorMessage(e),
        'error'
      );
      return false;
    } finally {
      if (agencyId) {
        lsSet(lsActiveAgency(profile.id), agencyId);
        await app.refreshData();
        await refreshMemberships();
      }
    }
  };

  // ---------- Clients ----------
  const saveCustomer: WorkspaceContextType['saveCustomer'] = async (input) => {
    if (!activeAgencyId) return false;
    if (input.id) {
      if (!guard('customers', 'edit')) return false;
      return run(async () => {
        await agencyService.update('agency_customers', activeAgencyId, input.id!, input);
        await logActivity('customers', `a modifié la fiche client ${input.name || ''}`.trim());
        await reload();
        addToast('Fiche client mise à jour.', 'success');
      });
    }
    if (!guard('customers', 'create')) return false;
    return run(async () => {
      const row: AgencyCustomer = {
        id: newId('customer'),
        agencyId: activeAgencyId,
        buyerId: input.buyerId,
        name: input.name || '',
        company: input.company || '',
        phone: input.phone || '',
        email: input.email || '',
        city: input.city || '',
        address: input.address || '',
        status: input.status || 'prospect',
        notes: input.notes || '',
        branchId: input.branchId ?? defaultBranchId,
        createdAt: new Date().toISOString(),
      };
      await agencyService.insert('agency_customers', row);
      await logActivity('customers', `a ajouté le client ${row.name}`);
      await reload();
      addToast('Client ajouté.', 'success');
    });
  };

  const deleteCustomer = async (id: string) => {
    if (!activeAgencyId || !guard('customers', 'delete')) return;
    const c = customers.find((x) => x.id === id);
    await run(async () => {
      await agencyService.remove('agency_customers', activeAgencyId, id);
      await logActivity('customers', `a supprimé le client ${c?.name || ''}`);
      await reload();
      addToast('Client supprimé.', 'info');
    });
  };

  // ---------- Dépenses ----------
  const saveExpense: WorkspaceContextType['saveExpense'] = async (input) => {
    if (!activeAgencyId) return false;
    if (input.id) {
      if (!guard('expenses', 'edit')) return false;
      return run(async () => {
        await agencyService.update('agency_expenses', activeAgencyId, input.id!, input);
        await logActivity('expenses', `a modifié la dépense « ${input.description} »`);
        await reload();
        addToast('Dépense mise à jour.', 'success');
      });
    }
    if (!guard('expenses', 'create')) return false;
    return run(async () => {
      const row: AgencyExpense = {
        id: newId('expense'),
        agencyId: activeAgencyId,
        date: input.date || new Date().toISOString().slice(0, 10),
        amount: Number(input.amount) || 0,
        currency: input.currency || settings.defaultCurrency,
        category: input.category || 'other',
        description: input.description || '',
        responsibleName: input.responsibleName || currentMember?.fullName || '',
        paymentMethod: input.paymentMethod || 'cash',
        receipt: input.receipt,
        branchId: input.branchId ?? defaultBranchId,
        createdAt: new Date().toISOString(),
      };
      await agencyService.insert('agency_expenses', row);
      await logActivity('expenses', `a enregistré une dépense « ${row.description} »`);
      await reload();
      addToast('Dépense enregistrée.', 'success');
    });
  };

  const deleteExpense = async (id: string) => {
    if (!activeAgencyId || !guard('expenses', 'delete')) return;
    const e = expenses.find((x) => x.id === id);
    await run(async () => {
      await agencyService.remove('agency_expenses', activeAgencyId, id);
      await logActivity('expenses', `a supprimé la dépense « ${e?.description || ''} »`);
      await reload();
      addToast('Dépense supprimée.', 'info');
    });
  };

  // ---------- Fret ----------
  const createShipment = async (input: ShipmentInput) => {
    if (!activeAgencyId || !guard('freight', 'create')) return null;
    const now = new Date().toISOString();
    const row: AgencyShipment = {
      ...input,
      originBranchId: input.originBranchId ?? defaultBranchId,
      destinationBranchId: input.destinationBranchId ?? null,
      id: newId('shipment'),
      agencyId: activeAgencyId,
      payments: [],
      status: 'registered',
      createdAt: now,
      updatedAt: now,
    };
    const ok = await run(async () => {
      await agencyService.insert('agency_shipments', row);
      await agencyService.insert('agency_shipment_events', {
        id: newId('event'),
        agencyId: activeAgencyId,
        shipmentId: row.id,
        status: 'registered',
        note: 'Colis enregistré',
        actorName: currentMember?.fullName || '',
        createdAt: now,
      });
      await logActivity('freight', `a enregistré le colis ${row.trackingRef}`);
      await reload();
      addToast(`Colis ${row.trackingRef} enregistré.`, 'success');
    });
    return ok ? row : null;
  };

  const updateShipment = async (id: string, patch: Partial<AgencyShipment>) => {
    if (!activeAgencyId || !guard('freight', 'edit')) return false;
    return run(async () => {
      await agencyService.update('agency_shipments', activeAgencyId, id, { ...patch, updatedAt: new Date().toISOString() });
      await logActivity('freight', `a modifié le colis ${shipments.find((s) => s.id === id)?.trackingRef || ''}`);
      await reload();
      addToast('Colis mis à jour.', 'success');
    });
  };

  const deleteShipment = async (id: string) => {
    if (!activeAgencyId || !guard('freight', 'delete')) return;
    const s = shipments.find((x) => x.id === id);
    await run(async () => {
      await agencyService.remove('agency_shipments', activeAgencyId, id);
      for (const ev of shipmentEvents.filter((e) => e.shipmentId === id)) {
        await agencyService.remove('agency_shipment_events', activeAgencyId, ev.id);
      }
      await logActivity('freight', `a supprimé le colis ${s?.trackingRef || ''}`);
      await reload();
      addToast('Colis supprimé.', 'info');
    });
  };

  const changeShipmentStatus = async (id: string, status: ShipmentStatus, note: string) => {
    if (!activeAgencyId || !guard('freight', 'edit')) return;
    const s = shipments.find((x) => x.id === id);
    if (!s || s.status === status) return;
    await run(async () => {
      const now = new Date().toISOString();
      await agencyService.update('agency_shipments', activeAgencyId, id, { status, updatedAt: now });
      await agencyService.insert('agency_shipment_events', {
        id: newId('event'),
        agencyId: activeAgencyId,
        shipmentId: id,
        status,
        note: note || SHIPMENT_STATUS_LABELS[status],
        actorName: currentMember?.fullName || '',
        createdAt: now,
      });
      await logActivity('freight', `a passé le colis ${s.trackingRef} au statut « ${SHIPMENT_STATUS_LABELS[status]} »`);
      await reload();
      addToast(`Statut mis à jour : ${SHIPMENT_STATUS_LABELS[status]}.`, 'success');
    });
  };

  const addShipmentPayment = async (id: string, payment: Omit<ShipmentPayment, 'id'>) => {
    if (!activeAgencyId || !guard('freight', 'edit')) return;
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    await run(async () => {
      await agencyService.update('agency_shipments', activeAgencyId, id, {
        payments: [...s.payments, { ...payment, id: newId('pay') }],
        updatedAt: new Date().toISOString(),
      });
      await logActivity('freight', `a enregistré un paiement de ${payment.amount} USD sur ${s.trackingRef}`);
      await reload();
      addToast('Paiement enregistré.', 'success');
    });
  };

  // ---------- Personnel ----------
  // Droits d'un rôle, limités à ceux du responsable de succursale qui les attribue
  const grantablePermissions = (role: AgencyRole): PermissionMatrix => {
    const perms = clonePermissions(role);
    if (!currentMember?.branchId || currentMember.role === 'owner') return perms;
    const out = { ...perms };
    for (const [module, actions] of Object.entries(perms)) {
      out[module as ModuleKey] = (actions || []).filter((a) => (currentMember.permissions[module as ModuleKey] || []).includes(a));
    }
    return out;
  };

  const inviteMember = async (input: MemberInput) => {
    if (!activeAgencyId || !guard('staff', 'create')) return false;
    if (input.role === 'owner' && currentMember?.role !== 'owner') {
      addToast('Seul le propriétaire peut nommer un autre propriétaire.', 'error');
      return false;
    }
    if (members.some((m) => m.email && m.email.toLowerCase() === input.email.toLowerCase())) {
      addToast('Un membre utilise déjà cette adresse email.', 'error');
      return false;
    }
    return run(async () => {
      await agencyService.insert('agency_members', {
        id: newId('member'),
        agencyId: activeAgencyId,
        // Le profil réel sera créé lors de l'acceptation de l'invitation (Supabase Auth)
        profileId: null,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: 'invited',
        permissions: grantablePermissions(input.role),
        branchId: input.branchId ?? null,
        invitedAt: new Date().toISOString(),
      });
      await logActivity('staff', `a invité ${input.fullName} (${ROLE_LABELS[input.role]})`);
      await reload();
      addToast(`Invitation préparée pour ${input.email}.`, 'success');
    });
  };

  const isLastActiveOwner = (id: string) => {
    const owners = members.filter((m) => m.role === 'owner' && m.status === 'active');
    return owners.length === 1 && owners[0].id === id;
  };

  const updateMember = async (id: string, patch: Partial<AgencyMember>) => {
    if (!activeAgencyId || !guard('staff', 'edit')) return false;
    const target = members.find((m) => m.id === id);
    if (!target) return false;
    if (target.role === 'owner' && currentMember?.role !== 'owner') {
      addToast('Seul un propriétaire peut modifier un propriétaire.', 'error');
      return false;
    }
    if (isLastActiveOwner(id) && ((patch.role && patch.role !== 'owner') || (patch.status && patch.status !== 'active'))) {
      addToast('L’agence doit conserver au moins un propriétaire actif.', 'error');
      return false;
    }
    const finalPatch = { ...patch };
    if (patch.role && patch.role !== target.role) finalPatch.permissions = grantablePermissions(patch.role);
    if (patch.status === 'active' && !target.joinedAt) finalPatch.joinedAt = new Date().toISOString();
    return run(async () => {
      await agencyService.update('agency_members', activeAgencyId, id, finalPatch);
      const what =
        patch.status === 'inactive'
          ? 'a désactivé'
          : patch.status === 'active'
          ? 'a activé'
          : patch.role
          ? `a attribué le rôle ${ROLE_LABELS[patch.role]} à`
          : 'a modifié';
      await logActivity('staff', `${what} ${target.fullName}`);
      await reload();
      if (target.profileId === profile.id) await refreshMemberships();
      addToast('Membre mis à jour.', 'success');
    });
  };

  const removeMember = async (id: string) => {
    if (!activeAgencyId || !guard('staff', 'delete')) return;
    const target = members.find((m) => m.id === id);
    if (!target) return;
    if (target.profileId === profile.id) {
      addToast('Vous ne pouvez pas vous retirer vous-même.', 'error');
      return;
    }
    if (isLastActiveOwner(id) || (target.role === 'owner' && currentMember?.role !== 'owner')) {
      addToast('Ce propriétaire ne peut pas être retiré.', 'error');
      return;
    }
    await run(async () => {
      await agencyService.remove('agency_members', activeAgencyId, id);
      await logActivity('staff', `a retiré ${target.fullName} de l’agence`);
      await reload();
      addToast('Membre retiré.', 'info');
    });
  };

  const setMemberPermissions = async (id: string, permissions: PermissionMatrix) => {
    if (!activeAgencyId || !guard('staff', 'edit')) return;
    const target = members.find((m) => m.id === id);
    if (!target) return;
    if (target.role === 'owner') {
      addToast('Les permissions du propriétaire ne sont pas modifiables.', 'error');
      return;
    }
    await run(async () => {
      await agencyService.update('agency_members', activeAgencyId, id, { permissions });
      await logActivity('staff', `a modifié les autorisations de ${target.fullName}`);
      await reload();
      addToast('Autorisations enregistrées.', 'success');
    });
  };

  // ---------- Paramètres ----------
  // ---------- Succursales ----------
  const saveBranch: WorkspaceContextType['saveBranch'] = async (input) => {
    if (!activeAgencyId || !guard('settings', 'edit')) return false;
    if (input.id) {
      return run(async () => {
        await agencyService.update('agency_branches', activeAgencyId, input.id!, {
          name: input.name,
          city: input.city,
          country: input.country,
          phone: input.phone,
          address: input.address,
        });
        await logActivity('settings', `a modifié la succursale « ${input.name} »`);
        await reload();
        addToast('Succursale mise à jour.', 'success');
      });
    }
    return run(async () => {
      await agencyService.insert('agency_branches', {
        id: newId('branch'),
        agencyId: activeAgencyId,
        name: input.name || '',
        city: input.city || '',
        country: input.country || '',
        phone: input.phone || '',
        address: input.address || '',
        isHeadquarters: false,
        createdAt: new Date().toISOString(),
      });
      await logActivity('settings', `a ajouté la succursale « ${input.name} »`);
      await reload();
      addToast(`Succursale « ${input.name} » ajoutée.`, 'success');
    });
  };

  const deleteBranch = async (id: string) => {
    if (!activeAgencyId || !guard('settings', 'edit')) return;
    const b = branches.find((x) => x.id === id);
    if (!b || b.isHeadquarters) return;
    await run(async () => {
      await agencyService.remove('agency_branches', activeAgencyId, id);
      await logActivity('settings', `a supprimé la succursale « ${b.name} »`);
      if (branchFilterState === id) setBranchFilterState('all');
      await reload();
      addToast('Succursale supprimée. Ses données restent dans l’agence.', 'info');
    });
  };

  const saveSettings = async (patch: Partial<AgencySettings>) => {
    if (!activeAgencyId || !guard('settings', 'edit')) return;
    await run(async () => {
      if (settingsRows[0]) await agencyService.update('agency_settings', activeAgencyId, activeAgencyId, patch);
      else await agencyService.insert('agency_settings', { ...defaultSettings(activeAgencyId), ...patch });
      await reload();
    });
  };

  const updateAgencyProfile = async (patch: Partial<Agency>) => {
    if (!activeAgencyId || !guard('settings', 'edit')) return;
    await app.updateAgency(activeAgencyId, patch);
  };

  // ---------- Filtrage par succursale ----------
  const headquarters = branches.find((b) => b.isHeadquarters) || null;
  const myBranchId = currentMember && currentMember.role !== 'owner' ? currentMember.branchId || null : null;
  const seesAllBranches = !myBranchId;
  // Un employé rattaché à une succursale ne voit que celle-ci
  const branchFilter: BranchFilter = myBranchId || branchFilterState;
  const setBranchFilter = (f: BranchFilter) => {
    if (!seesAllBranches) return;
    setBranchFilterState(f);
  };
  const defaultBranchId = branchFilter !== 'all' ? branchFilter : headquarters?.id || null;
  const branchName = (id?: string | null) => {
    const b = branches.find((x) => x.id === id);
    return b ? (b.isHeadquarters ? `${b.name}${b.city ? ` — ${b.city}` : ''}` : `${b.name}${b.city && b.city !== b.name ? ` — ${b.city}` : ''}`) : '';
  };
  const inBranch = (id?: string | null) => branchFilter === 'all' || id === branchFilter;
  const visibleCustomers = useMemo(() => customers.filter((c) => inBranch(c.branchId)), [customers, branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleExpenses = useMemo(() => expenses.filter((e) => inBranch(e.branchId)), [expenses, branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleShipments = useMemo(
    () => shipments.filter((sh) => branchFilter === 'all' || sh.originBranchId === branchFilter || sh.destinationBranchId === branchFilter),
    [shipments, branchFilter]
  );

  const value: WorkspaceContextType = {
    branches,
    headquarters,
    seesAllBranches,
    branchFilter,
    setBranchFilter,
    defaultBranchId,
    branchName,
    saveBranch,
    deleteBranch,
    profile,
    memberships,
    myAgencies,
    activeAgencyId,
    activeAgency,
    switchAgency,
    currentMember,
    ready: membershipsReady && (activeAgencyId === null || loadedAgencyId === activeAgencyId),
    can,
    members,
    customers: visibleCustomers,
    expenses: visibleExpenses,
    shipments: visibleShipments,
    shipmentEvents,
    settings,
    activity,
    products,
    orders,
    rfqs,
    conversations,
    createAgency,
    saveCustomer,
    deleteCustomer,
    saveExpense,
    deleteExpense,
    createShipment,
    updateShipment,
    deleteShipment,
    changeShipmentStatus,
    addShipmentPayment,
    inviteMember,
    updateMember,
    removeMember,
    setMemberPermissions,
    saveSettings,
    updateAgencyProfile,
    logActivity,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace doit être utilisé dans AgencyWorkspaceProvider');
  return ctx;
};
