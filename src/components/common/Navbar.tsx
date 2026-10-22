import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Search,
  MessageSquare,
  FileText,
  Heart,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Building,
  Shield,
  Layers,
  PhoneCall,
  Globe,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES } from '../../data/referenceData';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    language,
    setLanguage,
    t,
    getCategoryName,
    currentUser,
    currentRole,
    isAuthenticated,
    profile,
    signOut,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    favorites,
    conversations,
    rfqs,
    openSplash,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingRfqsCount = rfqs.filter((r) => r.status === 'pending' || r.status === 'quoted').length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/catalog') {
      navigate('/catalog');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* 1. Top Bar / Announcement & Demo Selector */}
      <div className="bg-[#0c274c] text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Corridor info */}
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-white">{t.corridorTitle}</span>
            <span className="hidden sm:inline text-slate-400">·</span>
            <span className="hidden sm:inline text-slate-300">{t.corridorSub}</span>
          </div>

          {/* Quick Demo Switcher & Direct 1-Click Language Switcher */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-slate-300 max-w-[180px] truncate">{currentUser.name}</span>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="px-2.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-white font-medium transition-colors cursor-pointer"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/auth/login" className="text-white font-medium hover:underline">
                  Connexion
                </Link>
                <span className="text-slate-500">·</span>
                <Link to="/auth/register" className="text-slate-300 hover:text-white hover:underline">
                  Créer un compte (acheteur ou agence)
                </Link>
              </div>
            )}

            {/* Quick Splash Presentation Re-open Button */}
            <button
              onClick={openSplash}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-xs transition-colors cursor-pointer border border-amber-400/30"
              title={t.splashPresentation}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.splashPresentation}</span>
            </button>

            {/* DIRECT 1-CLICK PROMINENT LANGUAGE SWITCHER */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20 shadow-xs">
              <span className="text-[10px] text-amber-300 font-bold px-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Langue :</span>
              </span>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  language === 'fr'
                    ? 'bg-[#FF8A00] text-white shadow-xs scale-102'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Passer en Français"
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  language === 'zh'
                    ? 'bg-[#FF8A00] text-white shadow-xs scale-102'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="切换到中文 (Chinese)"
              >
                🇨🇳 中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#FF8A00] text-white shadow-xs scale-102'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Switch to English"
              >
                🇬🇧 EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg"
              alt="Logo ASEP"
              className="h-11 w-auto object-contain rounded-md shadow-xs bg-white"
            />
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-[#123B70] leading-none">
                ASEP <span className="text-[#FF8A00]">MARKET</span>
              </span>
              <span className="text-[9.5px] uppercase font-bold tracking-tight text-slate-500 mt-0.5 hidden sm:block">
                Atelier des Solutions Entrepreneuriales et Pédagogiques
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#FF8A00] mt-0.5 sm:hidden">
                Chine–RDC Sourcing
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-2xl items-center border-2 border-[#123B70] rounded-lg overflow-hidden bg-white shadow-xs"
          >
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 px-3 py-2.5 border-r border-slate-200 focus:outline-none shrink-0"
            >
              <option value="all">{t.allCategories}</option>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat.name)}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="bg-[#123B70] hover:bg-[#0c274c] text-white px-5 py-2.5 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchButton}</span>
            </button>
          </form>

          {/* Right Action Icons & User menu */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Messages */}
            <Link
              to="/messages"
              className="hidden sm:flex relative p-2 text-slate-700 hover:text-[#123B70] hover:bg-slate-100 rounded-lg transition-colors flex-col items-center"
              title={t.messages}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] hidden sm:inline font-medium">{t.messages}</span>
              {unreadMessagesCount > 0 && (
                <span className="absolute 1 top-1 right-1 w-4 h-4 bg-[#FF8A00] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>

            {/* RFQs / Demandes de devis */}
            <Link
              to={currentRole === 'agency' ? '/agency/rfqs' : '/buyer/rfqs'}
              className="hidden sm:flex relative p-2 text-slate-700 hover:text-[#123B70] hover:bg-slate-100 rounded-lg transition-colors flex-col items-center"
              title={t.rfqs}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] hidden sm:inline font-medium">{t.rfqs}</span>
              {pendingRfqsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingRfqsCount}
                </span>
              )}
            </Link>

            {/* Favorites */}
            <Link
              to="/buyer/favorites"
              className="hidden sm:flex relative p-2 text-slate-700 hover:text-[#123B70] hover:bg-slate-100 rounded-lg transition-colors flex-col items-center"
              title={t.favorites}
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px] hidden sm:inline font-medium">{t.favorites}</span>
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Account / Dashboard Button */}
            <div className="hidden sm:block pl-1 sm:pl-2 border-l border-slate-200">
              {!isAuthenticated && (
                <Link
                  to="/auth/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#123B70] text-white hover:bg-[#0c274c] transition-colors text-xs font-semibold"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Connexion</span>
                </Link>
              )}
              {isAuthenticated && currentRole === 'buyer' && (
                <Link
                  to="/buyer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-semibold text-slate-800"
                >
                  <UserIcon className="w-4 h-4 text-[#123B70]" />
                  <span className="hidden md:inline">{t.buyerSpace}</span>
                </Link>
              )}
              {isAuthenticated && currentRole === 'agency' && (
                <Link
                  to="/agency"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#123B70] text-white hover:bg-[#0c274c] transition-colors text-xs font-semibold shadow-xs"
                >
                  <Building className="w-4 h-4 text-[#FF8A00]" />
                  <span>{t.agencySpace}</span>
                </Link>
              )}
              {isAuthenticated && currentRole === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900 text-white hover:bg-purple-950 transition-colors text-xs font-semibold shadow-xs"
                >
                  <Shield className="w-4 h-4 text-amber-300" />
                  <span>{t.adminSpace}</span>
                </Link>
              )}
            </div>

            {/* Prominent Header 1-Click Language Switcher (Visible on both desktop & mobile) */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="hidden xl:flex items-center gap-1 text-[11px] font-bold text-slate-500 pl-1.5 pr-1">
                <Globe className="w-3.5 h-3.5 text-[#123B70]" />
              </span>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  language === 'fr'
                    ? 'bg-[#123B70] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                title="Français"
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  language === 'zh'
                    ? 'bg-[#123B70] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                title="中文 (Chinese)"
              >
                🇨🇳 中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#123B70] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="mt-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 focus:outline-none"
            />
            <button type="submit" className="bg-[#123B70] text-white px-3 py-2">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Category & Navigation Strip */}
      <nav className="bg-slate-50 border-t border-slate-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-6 overflow-x-auto py-2.5">
            <Link
              to="/catalog"
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap hover:text-[#123B70] transition-colors ${
                location.pathname === '/catalog' && selectedCategory === 'all'
                  ? 'text-[#123B70] font-bold underline underline-offset-4'
                  : 'text-slate-600'
              }`}
            >
              {t.allProducts}
            </Link>

            {CATEGORIES.filter((c) => c.id !== 'all').slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  navigate('/catalog');
                }}
                className={`whitespace-nowrap hover:text-[#123B70] transition-colors cursor-pointer ${
                  selectedCategory === cat.id && location.pathname === '/catalog'
                    ? 'text-[#123B70] font-bold underline underline-offset-4'
                    : 'text-slate-600'
                }`}
              >
                {getCategoryName(cat.name)}
              </button>
            ))}

            <Link
              to="/agencies"
              className={`whitespace-nowrap hover:text-[#123B70] transition-colors ${
                location.pathname === '/agencies' ? 'text-[#123B70] font-bold underline underline-offset-4' : 'text-slate-600'
              }`}
            >
              {t.suppliersAgencies}
            </Link>
          </div>

          <div className="flex items-center gap-4 shrink-0 py-2.5 text-slate-500 pl-4 border-l border-slate-200">
            <Link to="/how-it-works" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t.howToBuyGuide}
            </Link>
            <Link to="/auth/login" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t.login}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 animate-in slide-in-from-top-2">
          {/* Mobile Language Switcher */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Langue / 语言 / Language
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setLanguage('fr')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  language === 'fr'
                    ? 'bg-[#123B70] text-white border-[#123B70] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🇫🇷</span>
                <span>Français</span>
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  language === 'zh'
                    ? 'bg-[#123B70] text-white border-[#123B70] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🇨🇳</span>
                <span>中文</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  language === 'en'
                    ? 'bg-[#123B70] text-white border-[#123B70] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
            </div>

            {/* Replay Splash Presentation in Mobile Drawer */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openSplash();
              }}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-[#123B70] text-xs font-bold flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF8A00]" />
                <span>{t.splashPresentation} (Splash Screen)</span>
              </div>
              <span className="text-[10px] bg-[#FF8A00] text-white px-1.5 py-0.5 rounded font-semibold uppercase">
                Intro
              </span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.navigation}</div>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800"
            >
              Accueil
            </Link>
            <Link
              to="/catalog"
              onClick={() => {
                setSelectedCategory('all');
                setMobileMenuOpen(false);
              }}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800"
            >
              {t.allProducts}
            </Link>
            <Link
              to="/agencies"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800"
            >
              {t.suppliersAgencies}
            </Link>
            <Link
              to="/messages"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800"
            >
              {t.messages} ({unreadMessagesCount})
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800"
            >
              {t.howToBuyGuide}
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.managementSpaces}</div>
            {isAuthenticated ? (
              <>
                <div className="px-3 py-1 text-xs text-slate-500 truncate">Connecté : {currentUser.name}</div>
                <Link to="/buyer" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md bg-blue-50 text-[#123B70] text-sm font-semibold">
                  {t.buyerSpace}
                </Link>
                {profile?.accountType === 'agency' && (
                  <Link to="/agency" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md bg-amber-50 text-amber-900 text-sm font-semibold">
                    {t.agencySpace}
                  </Link>
                )}
                {profile?.isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md bg-purple-50 text-purple-900 text-sm font-semibold">
                    {t.adminSpace}
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-700"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md bg-[#123B70] text-white text-sm font-semibold">
                  Connexion
                </Link>
                <Link to="/auth/register-buyer" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800">
                  Créer un compte acheteur <span className="text-xs text-slate-500">— pour acheter</span>
                </Link>
                <Link to="/auth/register-agency" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-800">
                  Créer un compte agence <span className="text-xs text-slate-500">— pour vendre</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
