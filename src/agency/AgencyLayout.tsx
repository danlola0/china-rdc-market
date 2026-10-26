import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Menu,
  Handshake,
  Route,
  FileText,
  Wallet,
  Network,
  MessageSquare,
  Package,
  PackageSearch,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  X,
  Clock,
  Crown,
  Lock,
} from 'lucide-react';
import { useWorkspace } from './AgencyWorkspaceContext';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS } from './permissions';
import { ModuleKey } from './types';
import { CreateAgencyForm } from './pages/CreateAgencyForm';
import { AccessDenied, btn, Modal } from './ui';
import { localDateTime, PLAN_INFO, PREMIUM_PATHS, remainingLabel } from './subscription';

export const NAV_ITEMS: { module: ModuleKey; path: string; label: string; icon: React.ElementType }[] = [
  { module: 'dashboard', path: '/agency', label: 'Tableau de bord', icon: LayoutDashboard },
  { module: 'products', path: '/agency/products', label: 'Articles', icon: Package },
  { module: 'orders', path: '/agency/orders', label: 'Commandes', icon: ShoppingCart },
  { module: 'customers', path: '/agency/customers', label: 'Gestion clients', icon: Users },
  { module: 'expenses', path: '/agency/expenses', label: 'Dépenses', icon: Receipt },
  { module: 'invoices', path: '/agency/invoices', label: 'Factures', icon: FileText },
  { module: 'freight', path: '/agency/freight', label: 'Fret & Logistique', icon: Truck },
  { module: 'freight', path: '/agency/parcels', label: 'Gestion colis', icon: PackageSearch },
  { module: 'freight', path: '/agency/tracking', label: 'Suivi des colis', icon: Route },
  { module: 'conversations', path: '/agency/conversations', label: 'Conversations', icon: MessageSquare },
  { module: 'staff', path: '/agency/staff', label: 'Personnel & Permissions', icon: UserCog },
  { module: 'reports', path: '/agency/reports', label: 'Rapports', icon: BarChart3 },
  { module: 'subscription', path: '/agency/subscription', label: 'Abonnement', icon: CreditCard },
  { module: 'settings', path: '/agency/branches', label: 'Succursales', icon: Network },
  { module: 'settings', path: '/agency/partners', label: 'Partenaires', icon: Handshake },
  { module: 'settings', path: '/agency/settings', label: 'Paramètres', icon: Settings },
  { module: 'cash', path: '/agency/cash', label: 'Caisse', icon: Wallet },
];

/**
 * Message affiché à la connexion : durée de l'essai (72 h) ou fin d'accès.
 * Une fois par session de navigation et par agence.
 */
const SubscriptionNotice: React.FC = () => {
  const { access, activeAgencyId, settings, can } = useWorkspace();
  const { profile } = useApp();
  const key = `asep_sub_notice_${activeAgencyId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!activeAgencyId || profile?.isAdmin) return;
    if (access.state !== 'trial' && access.active) return;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // stockage indisponible : on affiche le message
    }
    setOpen(true);
  }, [activeAgencyId, access.state, access.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // stockage indisponible
    }
  };

  if (!open) return null;
  const trial = access.state === 'trial';
  return (
    <Modal open title={trial ? 'Bienvenue sur ASEP MARKET' : 'Accès suspendu'} onClose={close}>
      <div className="space-y-3 text-center">
        {trial ? <Clock className="w-10 h-10 mx-auto text-[#123B70]" /> : <Lock className="w-10 h-10 mx-auto text-rose-500" />}
        {trial ? (
          <>
            <p className="text-sm font-bold text-slate-900">Vous avez 3 jours (72 heures) d’utilisation gratuite de cette application.</p>
            <p className="text-xs text-slate-600">
              Après ce délai, l’application ne sera plus fonctionnelle : il faudra vous réabonner pour continuer à l’utiliser.
            </p>
            {access.endsAt && (
              <p className="text-xs p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                Il vous reste <strong>{remainingLabel(access.endsAt)}</strong> — fin le {localDateTime(access.endsAt)}.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-900">
              {settings.subscriptionStatus === 'trial' ? 'Vos 72 heures d’essai gratuit sont terminées.' : 'Votre abonnement a expiré.'}
            </p>
            <p className="text-xs text-slate-600">L’application n’est plus fonctionnelle pour votre agence. Réabonnez-vous pour retrouver l’accès : vos données sont conservées.</p>
          </>
        )}
        <div className="text-[11px] text-slate-500">
          Formules : Standard {PLAN_INFO.standard.price} $ / mois · Premium {PLAN_INFO.gold.price} $ / mois · Achat complet {PLAN_INFO.enterprise.price.toLocaleString('fr-FR')} $
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          {can('subscription') && (
            <Link to="/agency/subscription" onClick={close} className={btn.primary}>
              {trial ? 'Voir les formules' : 'Me réabonner'}
            </Link>
          )}
          <button className={btn.secondary} onClick={close}>
            {trial ? 'Commencer l’essai' : 'Fermer'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** Rubrique réservée à Premium / Achat complet */
export const PremiumGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { access } = useWorkspace();
  if (access.premium) return <>{children}</>;
  return (
    <div className="max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
      <Crown className="w-10 h-10 mx-auto text-amber-500" />
      <h2 className="text-lg font-extrabold text-slate-900">Rubrique Premium</h2>
      <p className="text-xs text-slate-600">
        Les succursales et les agences partenaires sont incluses dans les formules <strong>Premium ({PLAN_INFO.gold.price} $ / mois)</strong> et{' '}
        <strong>Achat complet ({PLAN_INFO.enterprise.price.toLocaleString('fr-FR')} $)</strong>.
      </p>
      <Link to="/agency/subscription" className={btn.primary}>
        Passer à Premium
      </Link>
    </div>
  );
};

/** Bloque une rubrique si le rôle de l'utilisateur ne permet pas de la consulter */
export const ModuleGuard: React.FC<{ module: ModuleKey; children: React.ReactNode }> = ({ module, children }) => {
  const { can } = useWorkspace();
  return can(module) ? <>{children}</> : <AccessDenied />;
};

const AgencyLogo: React.FC<{ src?: string; name: string; size?: string }> = ({ src, name, size = 'w-9 h-9' }) =>
  src ? (
    <img src={src} alt={name} className={`${size} rounded-lg object-cover bg-white shrink-0`} />
  ) : (
    <div className={`${size} rounded-lg bg-white/15 text-white flex items-center justify-center text-xs font-bold shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );

const AgencySwitcher: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  const { myAgencies, activeAgency, switchAgency } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!activeAgency) return null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <AgencyLogo src={activeAgency.logo} name={activeAgency.name} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white truncate">{activeAgency.name}</div>
          <div className="text-[11px] text-blue-200 truncate">
            {activeAgency.city}
            {activeAgency.verifiedStatus === 'pending' && ' · en attente de validation'}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-blue-200 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs" role="listbox">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Mes agences</div>
          {myAgencies.map((a) => (
            <button
              key={a.id}
              role="option"
              aria-selected={a.id === activeAgency.id}
              onClick={() => {
                switchAgency(a.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer ${
                a.id === activeAgency.id ? 'font-semibold text-[#123B70]' : 'text-slate-700'
              }`}
            >
              <img src={a.logo} alt="" className="w-6 h-6 rounded object-cover" />
              <span className="truncate">{a.name}</span>
            </button>
          ))}
          {(
            <button
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50 border-t border-slate-100 mt-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer une autre agence
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Choix de la succursale affichée (le siège voit tout ; un employé de succursale voit la sienne) */
const BranchSwitcher: React.FC = () => {
  const { branches, branchFilter, setBranchFilter, seesAllBranches, branchName } = useWorkspace();
  if (branches.length <= 1) return null;
  if (!seesAllBranches) {
    return (
      <div className="px-2 py-1.5 rounded-lg bg-white/10 text-[11px] text-blue-100">
        Succursale : <span className="font-semibold text-white">{branchName(branchFilter)}</span>
      </div>
    );
  }
  return (
    <label className="block">
      <span className="sr-only">Succursale affichée</span>
      <select
        value={branchFilter}
        onChange={(e) => setBranchFilter(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
      >
        <option value="all" className="text-slate-900">Toutes les succursales</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="text-slate-900">
            {branchName(b.id)}
          </option>
        ))}
      </select>
    </label>
  );
};

const Onboarding: React.FC = () => {
  const { memberships } = useWorkspace();
  const { profile } = useApp();
  const invitedOnly = memberships.length > 0;

  if (profile?.accountType !== 'agency' && !profile?.isAdmin) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center">
        <Building2 className="w-9 h-9 text-slate-300 mx-auto" />
        <h1 className="mt-3 text-lg font-extrabold text-slate-900">L’espace agence est réservé aux comptes agence</h1>
        <p className="mt-2 text-xs text-slate-500">
          Vous êtes connecté avec un <strong>compte acheteur</strong>. Pour vendre sur ASEP MARKET, créez un compte agence avec une
          autre adresse email. Si une agence vous a invité comme employé, connectez-vous avec l’email de l’invitation.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/buyer" className={btn.secondary}>
            Mon espace acheteur
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <Building2 className="w-9 h-9 text-[#123B70]" />
      <h1 className="mt-3 text-xl font-extrabold text-slate-900">Dossier d’inscription de votre agence</h1>
      <p className="mt-1 text-xs text-slate-500">
        Présentez votre agence pour la publier sur ASEP MARKET. Le numéro RCCM, la pièce d’identité du responsable et les
        documents sont facultatifs : vous pourrez les ajouter plus tard dans Paramètres.
        {invitedOnly && ' Votre accès à une autre agence est désactivé : demandez au propriétaire de le réactiver.'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Vous avez été invité par une agence ? Connectez-vous avec l’adresse email qui a reçu l’invitation : l’accès apparaît automatiquement.
      </p>
      <div className="mt-6">
        <CreateAgencyForm />
      </div>
    </div>
  );
};

export const AgencyLayout: React.FC = () => {
  const { ready, activeAgency, currentMember, can, settings, access } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Ouvert depuis l'Espace Admin (« Ajouter une agence ») : on y retourne après la création
  const [fromAdmin, setFromAdmin] = useState(false);
  const navigate = useNavigate();
  const { profile: appProfile } = useApp();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // /agency?new=1 : ouverture directe du formulaire d'inscription d'agence (depuis l'Espace Admin)
  useEffect(() => {
    if (params.get('new') === '1') {
      setCreateOpen(true);
      setFromAdmin(!!appProfile?.isAdmin);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-500" role="status">
        Chargement de l’espace agence…
      </div>
    );
  }

  if (!activeAgency || !currentMember) {
    return (
      <div className="bg-slate-50 min-h-[70vh]">
        <div className="px-4 py-8 sm:py-12">
          <Onboarding />
        </div>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((i) => can(i.module));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/10 space-y-2">
        <AgencySwitcher onCreate={() => setCreateOpen(true)} />
        <BranchSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Navigation de l’agence">
        {items.map(({ path, label, icon: Icon }) => {
          // Abonnement expiré : seule la rubrique Abonnement reste ouverte ; Standard : pas de succursales ni partenaires
          const locked = (!access.active && path !== '/agency/subscription') || (access.active && !access.premium && PREMIUM_PATHS.includes(path));
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/agency'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-white text-[#123B70] font-semibold' : locked ? 'text-blue-200/60 hover:bg-white/5' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {locked && (access.active ? <Crown className="w-3.5 h-3.5 text-amber-300" aria-label="Premium" /> : <Lock className="w-3.5 h-3.5" aria-label="Verrouillé" />)}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {currentMember.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{currentMember.fullName}</div>
            <div className="text-[10px] text-blue-200">{ROLE_LABELS[currentMember.role]}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="flex">
        {/* Sidebar bureau */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-[calc(100vh-4rem)]" style={{ background: settings.primaryColor }}>{sidebar}</aside>

        {/* Menu mobile */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-[55] flex">
            <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl" style={{ background: settings.primaryColor }}>
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-blue-100 hover:bg-white/10 z-10"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Barre mobile : agence active toujours visible */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-2.5 text-white sticky top-0 z-20" style={{ background: settings.primaryColor }}>
            <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10" aria-label="Ouvrir le menu">
              <Menu className="w-5 h-5" />
            </button>
            <AgencyLogo src={activeAgency.logo} name={activeAgency.name} size="w-7 h-7" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{activeAgency.name}</div>
              <div className="text-[10px] text-blue-200 truncate">
                {currentMember.fullName} · {ROLE_LABELS[currentMember.role]}
              </div>
            </div>
          </div>

          <main className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl ${settings.display.compactTables ? 'agency-compact' : ''}`}>
            {activeAgency.verifiedStatus === 'pending' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center gap-2">
                <span>
                  <strong>Dossier en cours de vérification.</strong> Votre agence et vos articles seront visibles par les acheteurs après validation par ASEP.
                </span>
                {can('settings') && (
                  <Link to="/agency/settings" className="sm:ml-auto font-semibold underline whitespace-nowrap">
                    Voir mon dossier
                  </Link>
                )}
              </div>
            )}
            {activeAgency.verifiedStatus === 'rejected' && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center gap-2">
                <span>
                  <strong>Dossier refusé.</strong> Consultez le motif, corrigez votre dossier puis renvoyez-le.
                </span>
                {can('settings') && (
                  <Link to="/agency/settings" className="sm:ml-auto font-semibold underline whitespace-nowrap">
                    Corriger mon dossier
                  </Link>
                )}
              </div>
            )}
            <SubscriptionNotice />
            {/* Essai gratuit : temps restant, dans le fuseau horaire de l'utilisateur */}
            {access.state === 'trial' && access.endsAt && location.pathname !== '/agency/subscription' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 hidden sm:block" />
                <span>
                  <strong>Essai gratuit : il reste {remainingLabel(access.endsAt)}.</strong> Fin le {localDateTime(access.endsAt)}.
                </span>
                {can('subscription') && (
                  <Link to="/agency/subscription" className="sm:ml-auto font-semibold underline whitespace-nowrap">
                    Choisir une formule
                  </Link>
                )}
              </div>
            )}
            {access.state === 'active' && access.endsAt && access.endsAt.getTime() - Date.now() < 5 * 86400000 && location.pathname !== '/agency/subscription' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center gap-2">
                <span>
                  <strong>Votre abonnement se termine dans {remainingLabel(access.endsAt)}</strong> ({localDateTime(access.endsAt)}). Pensez à le renouveler.
                </span>
                {can('subscription') && (
                  <Link to="/agency/subscription" className="sm:ml-auto font-semibold underline whitespace-nowrap">
                    Renouveler
                  </Link>
                )}
              </div>
            )}
            {!access.active && location.pathname !== '/agency/subscription' ? (
              <div className="max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                <Lock className="w-10 h-10 mx-auto text-rose-500" />
                <h2 className="text-lg font-extrabold text-slate-900">
                  {access.state === 'suspended' ? 'Abonnement suspendu' : settings.subscriptionStatus === 'trial' ? 'Votre essai gratuit est terminé' : 'Votre abonnement a expiré'}
                </h2>
                <p className="text-xs text-slate-600">
                  Vos données sont conservées. Pour continuer à utiliser l’espace agence, réabonnez-vous : payez par Mobile Money, Alipay, WeChat, Equity Bank ou en espèces,
                  puis saisissez le code d’activation reçu d’ASEP.
                </p>
                {can('subscription') ? (
                  <Link to="/agency/subscription" className={btn.primary}>
                    Me réabonner
                  </Link>
                ) : (
                  <p className="text-[11px] text-slate-500">Contactez le propriétaire de l’agence pour renouveler l’abonnement.</p>
                )}
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Inscrire une nouvelle agence"
        onClose={() => {
          setCreateOpen(false);
          if (fromAdmin) navigate('/admin?tab=agencies');
        }}
        size="xl"
      >
        <CreateAgencyForm
          onDone={() => {
            setCreateOpen(false);
            if (fromAdmin || appProfile?.isAdmin) navigate('/admin?tab=agencies');
          }}
        />
      </Modal>
    </div>
  );
};

