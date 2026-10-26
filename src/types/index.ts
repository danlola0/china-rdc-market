export type UserRole = 'buyer' | 'agency' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  city?: string;
  country: string;
  companyName?: string;
  agencyId?: string; // If role is agency
}

export interface Agency {
  id: string;
  name: string;
  chineseName?: string;
  city: 'Guangzhou' | 'Yiwu' | 'Shenzhen' | 'Ningbo' | 'Foshan' | 'Shanghai' | 'Dongguan' | 'Hangzhou';
  province: string;
  logo: string;
  banner: string;
  rating: number;
  reviewCount: number;
  verifiedStatus: 'verified' | 'gold' | 'pending' | 'rejected';
  responseTime: string; // e.g. "< 2 heures"
  mainCategories: string[];
  yearEstablished: number;
  employeeCount: string;
  businessLicense: string;
  phoneWeChat: string;
  whatsapp: string;
  email: string;
  address: string;
  description: string;
  francophoneSupport: boolean;
  totalProducts: number;
  exportMarkets: string[];
  /** Succursales autorisées en plus du siège (fixé par l'administrateur) */
  maxBranches?: number;
  /** Code à communiquer à une agence partenaire */
  partnerCode?: string;
  country?: string;
  createdAt?: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  category: string;
  subcategory?: string;
  images: string[];
  priceMin: number;
  priceMax: number;
  currency: 'USD';
  moq: number;
  unit: string; // 'pièce' | 'carton' | 'lot' | 'mètre' | 'palette' | 'ensemble'
  agencyId: string;
  agencyName: string;
  agencyCity: string;
  leadTimeDays: number;
  specifications: Record<string, string>;
  variants: ProductVariant[];
  inStock: boolean;
  rating: number;
  reviewsCount: number;
  featured: boolean;
  newArrival: boolean;
  status: 'active' | 'inactif' | 'pending_review';
  createdAt: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  productId: string;
  productName: string;
  productImage: string;
  agencyId: string;
  agencyName: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCity: string; // e.g. Kinshasa, Lubumbashi
  quantity: number;
  targetPriceUSD?: number;
  notes: string;
  deliveryPort: 'Matadi (Maritime)' | 'Boma (Maritime)' | 'Aéroport Ndjili Kinshasa (Aérien)' | 'Aéroport Luano Lubumbashi (Aérien)';
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  createdAt: string;
  quotedPriceUSD?: number;
  quotedShippingUSD?: number;
  quoteValidUntil?: string;
  agencyNotes?: string;
}

export type OrderStatus =
  | 'en_attente'
  | 'en_production'
  | 'expedie_chine'
  | 'transit_maritime'
  | 'douane_matadi'
  | 'arrive_kinshasa'
  | 'livre';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  productId: string;
  productName: string;
  productImage: string;
  agencyId: string;
  agencyName: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  unitPriceUSD: number;
  shippingUSD: number;
  totalUSD: number;
  status: OrderStatus;
  destinationCity: string;
  deliveryAddress: string;
  trackingNumber: string;
  shippingMode: 'Fret Maritime (Conteneur)' | 'Fret Aérien Express';
  estimatedDeliveryDate: string;
  timeline: {
    status: OrderStatus;
    title: string;
    date: string;
    completed: boolean;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'buyer' | 'agency';
  /** Auteur réel (pour « Supprimer pour tout le monde ») */
  senderId?: string;
  /** Message supprimé pour tout le monde */
  deleted?: boolean;
  text: string;
  timestamp: string;
  attachment?: {
    type: 'rfq' | 'product';
    id: string;
    title: string;
    image?: string;
    price?: number;
    moq?: number;
  };
}

export interface Conversation {
  id: string;
  /** Discussion effacée de ce côté à cette date (elle réapparaît avec les nouveaux messages) */
  buyerClearedAt?: string | null;
  agencyClearedAt?: string | null;
  agencyId: string;
  agencyName: string;
  agencyCity: string;
  agencyAvatar: string;
  buyerId: string;
  buyerName: string;
  buyerCity: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  productId?: string;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  messages: ChatMessage[];
}

export type EmployeeRole =
  | 'Propriétaire'
  | 'Gérant'
  | 'Commercial'
  | 'Gestionnaire de stock'
  | 'Caissier';

export interface Employee {
  id: string;
  agencyId: string;
  name: string;
  role: EmployeeRole;
  email: string;
  phone: string;
  status: 'actif' | 'inactif';
  avatar: string;
  joinedDate: string;
  permissions: string[];
}

export interface PlatformStats {
  totalAgencies: number;
  pendingAgencies: number;
  totalBuyers: number;
  publishedProducts: number;
  totalOrders: number;
  activeSubscriptions: number;
  simulatedRevenueUSD: number;
}
