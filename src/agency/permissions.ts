import { AgencyRole, ModuleKey, PermissionAction, PermissionMatrix } from './types';

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'products', label: 'Articles' },
  { key: 'orders', label: 'Commandes' },
  { key: 'customers', label: 'Gestion clients' },
  { key: 'expenses', label: 'Dépenses' },
  { key: 'freight', label: 'Fret & Logistique' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'staff', label: 'Personnel & Permissions' },
  { key: 'reports', label: 'Rapports' },
  { key: 'subscription', label: 'Abonnement' },
  { key: 'settings', label: 'Paramètres' },
];

export const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'Consulter' },
  { key: 'create', label: 'Créer' },
  { key: 'edit', label: 'Modifier' },
  { key: 'delete', label: 'Supprimer' },
  { key: 'export', label: 'Exporter' },
];

export const ROLE_LABELS: Record<AgencyRole, string> = {
  owner: 'Propriétaire',
  manager: 'Gérant',
  accountant: 'Comptable',
  freight_agent: 'Agent de fret',
  sales: 'Commercial',
  stock_manager: 'Gestionnaire de stock',
};

export const ROLE_DESCRIPTIONS: Record<AgencyRole, string> = {
  owner: 'Accès complet : agence, personnel, finances, paramètres et abonnement.',
  manager: 'Opérations, clients, commandes et personnel selon les permissions accordées.',
  accountant: 'Dépenses, recettes, paiements et rapports financiers.',
  freight_agent: 'Colis, expéditions, suivi et livraisons.',
  sales: 'Clients, articles, devis et conversations.',
  stock_manager: 'Produits, quantités et disponibilités.',
};

const ALL: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export'];
const V: PermissionAction[] = ['view'];
const VCE: PermissionAction[] = ['view', 'create', 'edit'];
const NONE: PermissionAction[] = [];

const matrix = (m: Partial<PermissionMatrix>): PermissionMatrix => ({
  dashboard: NONE,
  products: NONE,
  orders: NONE,
  customers: NONE,
  expenses: NONE,
  freight: NONE,
  conversations: NONE,
  staff: NONE,
  reports: NONE,
  subscription: NONE,
  settings: NONE,
  ...m,
});

/** Permissions par défaut de chaque rôle ; le propriétaire peut ensuite les ajuster membre par membre. */
export const DEFAULT_PERMISSIONS: Record<AgencyRole, PermissionMatrix> = {
  owner: matrix({
    dashboard: ALL,
    products: ALL,
    orders: ALL,
    customers: ALL,
    expenses: ALL,
    freight: ALL,
    conversations: ALL,
    staff: ALL,
    reports: ALL,
    subscription: ALL,
    settings: ALL,
  }),
  manager: matrix({
    dashboard: V,
    products: ALL,
    orders: ALL,
    customers: ALL,
    expenses: V,
    freight: ALL,
    conversations: VCE,
    staff: VCE,
    reports: ['view', 'export'],
    settings: V,
  }),
  accountant: matrix({
    dashboard: V,
    orders: V,
    customers: V,
    expenses: ALL,
    freight: ['view', 'edit'],
    reports: ['view', 'export'],
    subscription: V,
  }),
  freight_agent: matrix({
    dashboard: V,
    customers: V,
    freight: ['view', 'create', 'edit', 'export'],
    conversations: VCE,
  }),
  sales: matrix({
    dashboard: V,
    products: VCE,
    orders: VCE,
    customers: ['view', 'create', 'edit', 'export'],
    freight: V,
    conversations: VCE,
  }),
  stock_manager: matrix({
    dashboard: V,
    products: ALL,
    orders: V,
  }),
};

export const clonePermissions = (role: AgencyRole): PermissionMatrix =>
  JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[role]));

export const hasPermission = (
  permissions: PermissionMatrix | undefined,
  module: ModuleKey,
  action: PermissionAction = 'view'
): boolean => !!permissions && (permissions[module] || []).includes(action);
