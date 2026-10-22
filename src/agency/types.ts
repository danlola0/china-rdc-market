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
}

export type ShipmentMode = 'air' | 'sea';
export type ShipmentStatus = 'registered' | 'preparing' | 'in_transit' | 'arrived' | 'delivered';

export interface ShipmentPayment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note: string;
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
  subscriptionNote: string;
  /** Formule demandée par l'agence, en attente de l'administrateur */
  requestedPlan: SubscriptionPlan | null;
  requestedAt: string | null;
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
