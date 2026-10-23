import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { User, UserRole, Agency, Product, RFQ, Order, OrderStatus, Conversation, ChatMessage } from '../types';
import { Language, TranslationDict, translations } from '../i18n/translations';
import { getCategoryLabel, getProductDisplay } from '../utils/translationsData';
import { errorMessage, fromRow, isSupabaseConfigured, supabase, toRow } from '../lib/supabase';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

/** Profil Supabase de l'utilisateur connecté (table public.profiles) */
export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  companyName: string;
  accountType: 'buyer' | 'agency';
  isAdmin: boolean;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  city?: string;
  country?: string;
  companyName?: string;
  accountType: 'buyer' | 'agency';
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDict;
  getCategoryName: (catName: string) => string;
  getProductName: (p: Product) => string;
  getProductDesc: (p: Product) => string;

  // Authentification
  authReady: boolean;
  isAuthenticated: boolean;
  profile: Profile | null;
  currentUser: User;
  currentRole: UserRole;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  updateProfile: (updates: Partial<Pick<Profile, 'fullName' | 'phone' | 'city' | 'country' | 'companyName'>>) => Promise<boolean>;

  // Données partagées
  dataLoading: boolean;
  refreshData: () => Promise<void>;
  products: Product[];
  agencies: Agency[];
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  rfqs: RFQ[];
  orders: Order[];
  favorites: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  isSplashOpen: boolean;
  openSplash: () => void;
  closeSplash: (dontShowAgain?: boolean) => void;

  // Actions
  toggleFavorite: (productId: string) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  submitRFQ: (data: Omit<RFQ, 'id' | 'rfqNumber' | 'status' | 'createdAt'>) => Promise<RFQ | null>;
  respondRFQ: (rfqId: string, quoteUSD: number, shippingUSD: number, agencyNotes: string) => Promise<void>;
  acceptRFQ: (rfqId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string, attachment?: any, sender?: 'buyer' | 'agency') => Promise<void>;
  startOrOpenConversation: (agencyId: string, productId?: string, initialText?: string) => Promise<string | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateAgency: (agencyId: string, updates: Partial<Agency>) => Promise<boolean>;
  approveAgency: (agencyId: string) => Promise<void>;
  rejectAgency: (agencyId: string, reason?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_USER: User = { id: '', name: 'Invité', email: '', role: 'buyer', country: '' };

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const relativeLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return timeLabel(iso);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const mapConversation = (row: any): Conversation => {
  const { messages = [], ...rest } = row;
  const base = fromRow<any>(rest);
  return {
    ...base,
    lastMessageTime: relativeLabel(row.last_message_at),
    messages: [...messages]
      .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
      .map(
        (m: any): ChatMessage => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: timeLabel(m.created_at),
          attachment: m.attachment || undefined,
        })
      ),
  };
};

// Colonnes calculées par la base, à ne jamais envoyer
const PRODUCT_READONLY = ['id', 'agencyName', 'agencyCity', 'createdAt', 'rating', 'reviewsCount'];
const AGENCY_READONLY = ['id', 'verifiedStatus', 'createdBy', 'createdAt', 'rating', 'reviewCount', 'totalProducts', 'maxBranches', 'partnerCode'];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---------- Notifications ----------
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fail = (e: unknown) => {
    addToast(errorMessage(e), 'error');
  };

  // ---------- Écran d'accueil ----------
  const [isSplashOpen, setIsSplashOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('asep_splash_dismissed') !== 'true';
    } catch {
      return true;
    }
  });
  const openSplash = () => setIsSplashOpen(true);
  const closeSplash = (dontShowAgain?: boolean) => {
    setIsSplashOpen(false);
    try {
      if (dontShowAgain) localStorage.setItem('asep_splash_dismissed', 'true');
    } catch {
      // stockage indisponible
    }
  };

  // ---------- Langue ----------
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('asep_lang') || '"fr"');
      return stored in translations ? stored : 'fr';
    } catch {
      return 'fr';
    }
  });
  const t = translations[language] || translations.fr;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('asep_lang', JSON.stringify(lang));
      document.documentElement.lang = lang;
      document.title =
        lang === 'zh'
          ? 'ASEP MARKET — 中国至刚果(金)源头直采B2B贸易平台'
          : lang === 'en'
          ? 'ASEP MARKET — China to DR Congo B2B Sourcing Platform'
          : 'ASEP MARKET — Marketplace Chine & RDC | Atelier des Solutions Entrepreneuriales et Pédagogiques';
    } catch {
      // ignore
    }
    addToast((translations[lang] || translations.fr).langSwitched, 'info');
  };

  const getCategoryName = (catName: string) => getCategoryLabel(catName, language);
  const getProductName = (p: Product) => getProductDisplay(p, language).name;
  const getProductDesc = (p: Product) => getProductDisplay(p, language).description;

  // ---------- Authentification ----------
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    setProfile(data ? fromRow<Profile>(data) : null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) setProfile(null);
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Hors du callback pour ne pas bloquer le client Supabase
        setTimeout(() => loadProfile(newSession.user.id), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const userId = session?.user.id || null;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      fail(error);
      return false;
    }
    // Rattache les invitations d'agence envoyées à cette adresse
    await supabase.rpc('claim_agency_invitations');
    addToast('Connexion réussie.', 'success');
    return true;
  };

  const signUp = async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: {
          full_name: input.fullName,
          phone: input.phone || '',
          city: input.city || '',
          country: input.country || '',
          company_name: input.companyName || '',
          account_type: input.accountType,
        },
      },
    });
    if (error) {
      fail(error);
      return { ok: false, needsConfirmation: false };
    }
    if (data.session) await supabase.rpc('claim_agency_invitations');
    return { ok: true, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    addToast('Vous êtes déconnecté.', 'info');
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      fail(error);
      return false;
    }
    return true;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      fail(error);
      return false;
    }
    addToast('Mot de passe mis à jour.', 'success');
    return true;
  };

  const updateProfile: AppContextType['updateProfile'] = async (updates) => {
    if (!userId) return false;
    const { data, error } = await supabase.from('profiles').update(toRow(updates)).eq('id', userId).select().single();
    if (error) {
      fail(error);
      return false;
    }
    setProfile(fromRow<Profile>(data));
    addToast('Profil mis à jour.', 'success');
    return true;
  };

  const currentRole: UserRole = profile?.isAdmin ? 'admin' : profile?.accountType || 'buyer';
  const currentUser: User = profile
    ? {
        id: profile.id,
        name: profile.fullName || profile.email,
        email: profile.email,
        role: currentRole,
        phone: profile.phone,
        city: profile.city,
        country: profile.country,
        companyName: profile.companyName,
      }
    : GUEST_USER;

  const requireAuth = () => {
    if (userId) return true;
    addToast('Connectez-vous pour effectuer cette action.', 'info');
    return false;
  };

  // ---------- Données ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadCatalog = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase.from('agencies').select('*').order('created_at'),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
    ]);
    if (a.error) console.error(a.error);
    if (p.error) console.error(p.error);
    setAgencies((a.data || []).map((r) => fromRow<Agency>(r)));
    setProducts((p.data || []).map((r) => fromRow<Product>(r)));
  }, []);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .order('last_message_at', { ascending: false });
    if (error) console.error(error);
    setConversations((data || []).map(mapConversation));
  }, []);

  const loadPrivate = useCallback(async () => {
    const [r, o, f] = await Promise.all([
      supabase.from('rfqs').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('favorites').select('product_id'),
    ]);
    [r, o, f].forEach((res) => res.error && console.error(res.error));
    setRfqs((r.data || []).map((x) => fromRow<RFQ>(x)));
    setOrders((o.data || []).map((x) => fromRow<Order>(x)));
    setFavorites((f.data || []).map((x: any) => x.product_id));
    await loadConversations();
  }, [loadConversations]);

  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    try {
      await loadCatalog();
      if (userId) await loadPrivate();
      else {
        setRfqs([]);
        setOrders([]);
        setFavorites([]);
        setConversations([]);
      }
    } finally {
      setDataLoading(false);
    }
  }, [loadCatalog, loadPrivate, userId]);

  // Recharge à la connexion / déconnexion (et quand le profil change d'agence)
  useEffect(() => {
    if (authReady) refreshData();
  }, [authReady, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Temps réel : catalogue (nouvel article, modification, validation d'une agence) pour tous les visiteurs
  const loadCatalogRef = useRef(loadCatalog);
  loadCatalogRef.current = loadCatalog;
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadCatalogRef.current(), 400);
    };
    const channel = supabase
      .channel(`catalog-${userId || 'public'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agencies' }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Temps réel : nouveaux messages et conversations
  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations;
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel('messaging')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConversationsRef.current())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => loadConversationsRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ---------- Favoris ----------
  const toggleFavorite = async (productId: string) => {
    if (!requireAuth()) return;
    const exists = favorites.includes(productId);
    setFavorites((prev) => (exists ? prev.filter((id) => id !== productId) : [...prev, productId]));
    const { error } = exists
      ? await supabase.from('favorites').delete().eq('product_id', productId).eq('user_id', userId!)
      : await supabase.from('favorites').insert({ product_id: productId });
    if (error) {
      setFavorites((prev) => (exists ? [...prev, productId] : prev.filter((id) => id !== productId)));
      fail(error);
      return;
    }
    addToast(exists ? 'Produit retiré des favoris' : 'Produit ajouté à vos favoris', exists ? 'info' : 'success');
  };

  // ---------- Articles ----------
  const addProduct = async (prodData: Partial<Product>) => {
    if (!requireAuth()) return null;
    const row = toRow(
      {
        shortDesc: '',
        description: '',
        category: 'Machines & Outillage',
        images: [],
        priceMin: 0,
        priceMax: 0,
        currency: 'USD',
        moq: 1,
        unit: 'pièce',
        leadTimeDays: 7,
        specifications: {},
        variants: [],
        inStock: true,
        status: 'active',
        ...prodData,
      },
      PRODUCT_READONLY
    );
    const { data, error } = await supabase.from('products').insert(row).select().single();
    if (error) {
      fail(error);
      return null;
    }
    const product = fromRow<Product>(data);
    setProducts((prev) => [product, ...prev]);
    addToast(`Article « ${product.name} » publié.`, 'success');
    return product;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update(toRow(updates, PRODUCT_READONLY)).eq('id', id).select().single();
    if (error) return fail(error);
    const product = fromRow<Product>(data);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    addToast('Article mis à jour.', 'success');
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return fail(error);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('Article supprimé.', 'info');
  };

  // ---------- Messagerie ----------
  const sendMessage = async (conversationId: string, text: string, attachment?: any, sender?: 'buyer' | 'agency') => {
    if (!requireAuth() || (!text.trim() && !attachment)) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const role = sender || (conv && conv.buyerId === userId ? 'buyer' : 'agency');
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender: role,
      text,
      attachment: attachment || null,
    });
    if (error) return fail(error);
    await loadConversations();
  };

  const startOrOpenConversation = async (agencyId: string, productId?: string, initialText?: string) => {
    if (!requireAuth()) return null;
    const product = products.find((p) => p.id === productId);
    const attachment = product
      ? { type: 'product', id: product.id, title: product.name, image: product.images[0], price: product.priceMin, moq: product.moq }
      : undefined;

    const existing = conversations.find((c) => c.agencyId === agencyId && c.buyerId === userId);
    if (existing) {
      setActiveConversationId(existing.id);
      if (initialText) await sendMessage(existing.id, initialText, attachment, 'buyer');
      return existing.id;
    }

    const agency = agencies.find((a) => a.id === agencyId);
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        agency_id: agencyId,
        agency_name: agency?.name || '',
        agency_city: agency?.city || '',
        agency_avatar: agency?.logo || '',
        buyer_name: currentUser.name,
        buyer_city: currentUser.city || '',
        product_id: product?.id || null,
        product_name: product?.name || null,
        product_image: product?.images[0] || null,
        product_price: product?.priceMin ?? null,
      })
      .select()
      .single();
    if (error) {
      fail(error);
      return null;
    }
    if (initialText) {
      const res = await supabase.from('messages').insert({ conversation_id: data.id, sender: 'buyer', text: initialText, attachment: attachment || null });
      if (res.error) fail(res.error);
    }
    await loadConversations();
    setActiveConversationId(data.id);
    return data.id as string;
  };

  // ---------- Devis et commandes ----------
  const submitRFQ = async (data: Omit<RFQ, 'id' | 'rfqNumber' | 'status' | 'createdAt'>) => {
    if (!requireAuth()) return null;
    const { data: row, error } = await supabase
      .from('rfqs')
      .insert(toRow(data, ['buyerId', 'id', 'status', 'createdAt', 'rfqNumber']))
      .select()
      .single();
    if (error) {
      fail(error);
      return null;
    }
    const rfq = fromRow<RFQ>(row);
    setRfqs((prev) => [rfq, ...prev]);
    await startOrOpenConversation(
      data.agencyId,
      data.productId,
      `Bonjour, j’ai envoyé une demande de devis (${rfq.rfqNumber}) pour ${data.quantity} unités de « ${data.productName} ». Livraison : ${data.deliveryPort}.`
    );
    addToast(`Demande de devis ${rfq.rfqNumber} transmise à l’agence.`, 'success');
    return rfq;
  };

  const respondRFQ = async (rfqId: string, quoteUSD: number, shippingUSD: number, agencyNotes: string) => {
    const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('rfqs')
      .update({ status: 'quoted', quoted_price_usd: quoteUSD, quoted_shipping_usd: shippingUSD, agency_notes: agencyNotes, quote_valid_until: validUntil })
      .eq('id', rfqId)
      .select()
      .single();
    if (error) return fail(error);
    setRfqs((prev) => prev.map((r) => (r.id === rfqId ? fromRow<RFQ>(data) : r)));
    addToast('Offre chiffrée envoyée à l’acheteur.', 'success');
  };

  const acceptRFQ = async (rfqId: string) => {
    const { error } = await supabase.rpc('accept_rfq', { p_rfq: rfqId });
    if (error) return fail(error);
    await loadPrivate();
    addToast('Devis accepté : la commande a été créée.', 'success');
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const today = new Date().toISOString().slice(0, 10);
    const index = order.timeline.findIndex((s) => s.status === status);
    const timeline = order.timeline.map((step, i) => ({
      ...step,
      completed: i <= index,
      date: i <= index ? step.date || today : '',
    }));
    const { data, error } = await supabase.from('orders').update({ status, timeline }).eq('id', orderId).select().single();
    if (error) return fail(error);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? fromRow<Order>(data) : o)));
    addToast('Statut de la commande mis à jour.', 'success');
  };

  // ---------- Agences ----------
  const updateAgency = async (agencyId: string, updates: Partial<Agency>) => {
    const { error } = await supabase.from('agencies').update(toRow(updates, AGENCY_READONLY)).eq('id', agencyId);
    if (error) {
      fail(error);
      return false;
    }
    await loadCatalog();
    return true;
  };

  const setAgencyStatus = async (agencyId: string, status: 'verified' | 'rejected', note = '') => {
    const { error } = await supabase.rpc('set_agency_status', { p_agency: agencyId, p_status: status, p_note: note });
    if (error) return fail(error);
    await loadCatalog();
    addToast(status === 'verified' ? 'Agence approuvée et visible dans l’annuaire.' : 'Inscription de l’agence refusée.', status === 'verified' ? 'success' : 'info');
  };

  const value: AppContextType = {
    language,
    setLanguage,
    t,
    getCategoryName,
    getProductName,
    getProductDesc,
    authReady,
    isAuthenticated: !!userId,
    profile,
    currentUser,
    currentRole,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    dataLoading,
    refreshData,
    products,
    agencies,
    conversations,
    activeConversationId,
    setActiveConversationId,
    rfqs,
    orders,
    favorites,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    toasts,
    addToast,
    removeToast,
    isSplashOpen,
    openSplash,
    closeSplash,
    toggleFavorite,
    addProduct,
    updateProduct,
    deleteProduct,
    submitRFQ,
    respondRFQ,
    acceptRFQ,
    sendMessage,
    startOrOpenConversation,
    updateOrderStatus,
    updateAgency,
    approveAgency: (id) => setAgencyStatus(id, 'verified'),
    rejectAgency: (id, reason) => setAgencyStatus(id, 'rejected', reason || ''),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
