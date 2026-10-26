// Entités de l'espace agence multi-tenant.
// Chaque type correspond à une future table Supabase (voir docs/supabase/schema.sql).
// Toute ligne métier porte un `agencyId` : c'est la clé d'isolation entre agences.

export type AgencyRole = 'owner' | 'manager' | 'accountant' | 'freight_agent' | 'sales' | 'stock_manager';

export type ModuleKey =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'expenses'
  | 'freight'
  | 'conversations'
  | 'staff'
  | 'reports'
  | 'cash'
  | 'invoices'
  | 'subscription'
  | 'settings';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export type PermissionMatrix = Record<ModuleKey, PermissionAction[]>;

/** profiles — identité d'un utilisateur, indépendante des agences */
export interface Profile {
  id: string;
  fullName: string;
  email: string;
}

/** agency_members — appartenance d'un profil à une agence, avec rôle et permissions */
export interface AgencyMember {
  id: string;
  agencyId: string;
  /** null tant que l'invitation n'a pas été acceptée */
  profileId: string | null;
  fullName: string;
  email: string;
  phone: string;
  role: AgencyRole;
  status: 'active' | 'inactive' | 'invited';
  permissions: PermissionMatrix;
  invitedAt: string;
  joinedAt?: string;
  /** Succursale de rattachement ; null = toutes les succursales */
  branchId?: string | null;
}

/** agency_branches — succursale d'une agence (le siège est créé automatiquement) */
export interface AgencyBranch {
  id: string;
  agencyId: string;
  name: string;
  city: string;
  country: string;
  phone: string;
  address: string;
  isHeadquarters: boolean;
  createdAt: string;
}

export type CustomerStatus = 'prospect' | 'active' | 'vip' | 'inactive';

/** agency_customers — fiche client interne à une agence */
export interface AgencyCustomer {
  id: string;
  agencyId: string;
  /** Compte acheteur de la marketplace, si le client en possède un */
  buyerId?: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: CustomerStatus;
  notes: string;
  createdAt: string;
  branchId?: string | null;
}

export type Currency = 'USD' | 'CDF' | 'CNY';

export type ExpenseCategory =
  | 'transport'
  | 'salaries'
  | 'rent'
  | 'internet'
  | 'electricity'
  | 'supplies'
  | 'customs'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'bank'
  | 'card'
  | 'mpesa'
  | 'orange_money'
  | 'airtel_money'
  | 'alipay'
  | 'wechat_pay'
  // Anciennes valeurs, conservées pour les enregistrements existants
  | 'mobile_money'
  | 'wechat_alipay';

/** agency_expenses */
export interface AgencyExpense {
  id: string;
  agencyId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  description: string;
  responsibleName: string;
  paymentMethod: PaymentMethod;
  receipt?: { name: string; dataUrl?: string };
  createdAt: string;
  branchId?: string | null;
}

export type ShipmentMode = 'air' | 'sea';
export type ShipmentStatus = 'registered' | 'preparing' | 'in_transit' | 'arrived' | 'delivered';

export interface ShipmentPayment {
  id: string;
  date: string;
  amount: number;
  /** Devise du paiement (USD si absente, pour les anciens paiements) */
  currency?: Currency;
  method: PaymentMethod;
  note: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** agency_invoices — facture personnalisée pour un client */
export interface AgencyInvoice {
  id: string;
  agencyId: string;
  branchId?: string | null;
  /** Numéro attribué par la base : FAC-2026-0001 */
  number: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  shipmentId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  currency: Currency;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  status: InvoiceStatus;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Personnalisation des factures d'une agence */
export interface InvoiceSettings {
  /** Coordonnées de paiement imprimées sur la facture */
  paymentInfo?: string;
  /** Conditions (délai de paiement, pénalités…) */
  terms?: string;
  /** Message de pied de page */
  footer?: string;
  /** Numéro d'identification (RCCM, NIF…) */
  legalIds?: string;
  defaultTaxRate?: number;
  /** Couleur des factures (sinon couleur de l'agence) */
  color?: string;
}

export type IncomeCategory = 'freight' | 'sale' | 'commission' | 'deposit' | 'service' | 'other';

/** agency_incomes — recette saisie à la main dans la Caisse */
export interface AgencyIncome {
  id: string;
  agencyId: string;
  branchId?: string | null;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: Currency;
  category: IncomeCategory;
  description: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  createdAt: string;
}

/** agency_shipments */
export interface AgencyShipment {
  id: string;
  agencyId: string;
  trackingRef: string;
  customerId: string;
  customerName: string;
  description: string;
  weightKg: number;
  volumeCbm: number;
  /** Dimensions en centimètres (facultatives) et nombre de cartons */
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  packages?: number;
  /** Succursale qui expédie / succursale qui reçoit et livre */
  originBranchId?: string | null;
  destinationBranchId?: string | null;
  /** Agence partenaire (autre société) à qui le colis est confié */
  partnerAgencyId?: string | null;
  mode: ShipmentMode;
  originCity: string;
  destinationCity: string;
  rateType: 'kg' | 'cbm';
  rate: number; // USD par kg ou par CBM
  estimatedCost: number; // USD
  payments: ShipmentPayment[];
  photos: string[];
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  /** Jeton secret du lien public de suivi (/suivi/<jeton>), créé par la base */
  trackingToken?: string;
}

/** agency_shipment_events — historique des changements de statut */
export interface AgencyShipmentEvent {
  id: string;
  agencyId: string;
  shipmentId: string;
  status: ShipmentStatus;
  note: string;
  actorName: string;
  createdAt: string;
}

export type SubscriptionPlan = 'standard' | 'gold' | 'enterprise';

/** agency_settings — préférences propres à une agence */
export interface AgencySettings {
  id: string; // = agencyId
  agencyId: string;
  country: string;
  primaryColor: string;
  accentColor: string;
  defaultCurrency: Currency;
  freightRates: { airPerKg: number; seaPerCbm: number };
  notifications: { newOrder: boolean; newMessage: boolean; shipmentUpdate: boolean; weeklyReport: boolean };
  display: { compactTables: boolean; showMarketplaceOrders: boolean };
  plan: SubscriptionPlan;
  /** Géré uniquement par l'administrateur de la plateforme */
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  /** Fin précise de l'abonnement (instant ; null = sans fin) */
  subscriptionEndsAt?: string | null;
  /** Fin de l'essai gratuit de 72 h */
  trialEndsAt?: string | null;
  subscriptionNote: string;
  /** Formule demandée par l'agence, en attente de l'administrateur */
  requestedPlan: SubscriptionPlan | null;
  requestedAt: string | null;
  requestedMethod?: string | null;
  invoiceSettings?: InvoiceSettings;
  requestedReference?: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended';

/** agency_activity — journal des actions (audit) */
export interface AgencyActivity {
  id: string;
  agencyId: string;
  actorName: string;
  module: ModuleKey;
  description: string;
  createdAt: string;
}
