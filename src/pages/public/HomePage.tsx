import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ProductCard } from '../../components/product/ProductCard';
import {
  ArrowRight,
  ShieldCheck,
  Ship,
  Plane,
  Building,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Search,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { CATEGORIES, GENERATED_IMAGES } from '../../data/referenceData';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { products, agencies, setSelectedCategory, startOrOpenConversation, t, language, getCategoryName } = useApp();
  const [activeTab, setActiveTab] = useState('all');

  const featuredProducts = products.filter((p) => p.featured);
  const newProducts = products.filter((p) => p.newArrival);
  const filteredProducts =
    activeTab === 'all'
      ? featuredProducts.slice(0, 8)
      : products.filter((p) => p.category === activeTab).slice(0, 8);

  const topAgencies = agencies.slice(0, 4);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative bg-[#0c274c] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30 mix-blend-luminosity">
          <img
            src={GENERATED_IMAGES.heroCargo}
            alt="Commerce maritime et logistique Chine - RD Congo"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c274c] via-[#0c274c]/90 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 backdrop-blur-xs text-amber-300 text-[11px] sm:text-xs font-semibold tracking-wide border border-white/15 max-w-full">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg"
                alt="Logo ASEP"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded object-contain bg-white p-0.5 shrink-0"
              />
              <span className="truncate">{t.heroPill}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {t.heroTitle}
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
              {t.heroDesc}
            </p>

            {/* Quick Hero Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 pt-2">
              <Link
                to="/catalog"
                className="px-5 sm:px-6 py-3 bg-[#FF8A00] hover:bg-[#e57c00] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                <span>{t.exploreCatalog}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                to="/agencies"
                className="px-5 sm:px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-xs border border-white/20 transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                <span>{t.seeAgencies}</span>
              </Link>
              <Link
                to="/how-it-works"
                className="px-4 py-2 sm:py-3 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors text-center"
              >
                {t.howItWorks}
              </Link>
            </div>

            {/* Fast reassurance metrics */}
            <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
              <div>
                <div className="text-white font-black text-lg font-mono tabular-nums">{agencies.length}</div>
                <div className="text-slate-400">{t.metricFactoriesSub}</div>
              </div>
              <div>
                <div className="text-white font-black text-lg font-mono tabular-nums">{t.metricSea}</div>
                <div className="text-slate-400">{t.metricSeaSub}</div>
              </div>
              <div>
                <div className="text-white font-black text-lg font-mono tabular-nums">{t.metricAir}</div>
                <div className="text-slate-400">{t.metricAirSub}</div>
              </div>
              <div>
                <div className="text-white font-black text-lg font-mono tabular-nums">{t.metricSupport}</div>
                <div className="text-slate-400">{t.metricSupportSub}</div>
              </div>
            </div>
          </div>

          {/* Hero right card: Sourcing express assistant */}
          <div className="lg:col-span-4 bg-white/95 backdrop-blur-md rounded-xl p-6 text-slate-900 shadow-xl border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[#FF8A00]" />
              <h3 className="font-bold text-base text-[#123B70]">{t.sourcingAssistantTitle}</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {t.sourcingAssistantDesc}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (agencies.length === 0) {
                    navigate('/agencies');
                    return;
                  }
                  startOrOpenConversation(
                    agencies[0].id,
                    undefined,
                    language === 'zh'
                      ? '您好，我来自刚果(金)，正在寻找特定产品货源并需要外贸集装箱报价。'
                      : language === 'en'
                      ? 'Hello, I am reaching out from DR Congo to inquire about custom sourcing and wholesale shipping options.'
                      : 'Bonjour, je recherche un produit spécifique pour mon entreprise en RDC. Pouvez-vous me proposer un devis de sourcing ?'
                  );
                  navigate('/messages');
                }}
                className="w-full py-2.5 px-4 bg-[#123B70] hover:bg-[#0c274c] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#FF8A00]" />
                <span>{t.chatSalesAgent}</span>
              </button>

              <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.freeAssistance}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.popularCategoriesTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t.popularCategoriesSub}
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold text-[#123B70] hover:text-[#FF8A00] flex items-center gap-1 transition-colors"
          >
            <span>{t.seeAll}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                navigate('/catalog');
              }}
              className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-[#123B70] hover:shadow-md transition-all text-center flex flex-col items-center justify-between cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#123B70] group-hover:bg-[#123B70] group-hover:text-white transition-colors flex items-center justify-center mb-2.5">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight group-hover:text-[#123B70]">
                {getCategoryName(cat.name)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 font-mono">
                {products.filter((p) => p.category === cat.id).length} {t.itemsCount}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. RECOMMENDED PRODUCTS (TABBED GRID) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold text-[#FF8A00] uppercase tracking-wider mb-1">
              {t.recommendedTag}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.recommendedTitle}
            </h2>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.allArticles}
            </button>
            <button
              onClick={() => setActiveTab('Machines & Outillage')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'Machines & Outillage'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.machinesTab}
            </button>
            <button
              onClick={() => setActiveTab('Énergie Solaire & Électricité')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'Énergie Solaire & Électricité'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.solarTab}
            </button>
            <button
              onClick={() => setActiveTab('Textile & Mode')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'Textile & Mode'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.waxTab}
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <span>{t.seeAllProductsCount} ({products.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 4. FEATURED CHINESE AGENCIES / SUPPLIERS */}
      <section className="bg-slate-100 py-12 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold text-[#123B70] uppercase tracking-wider mb-1">
                {t.featuredAgenciesTag}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t.featuredAgenciesTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {t.featuredAgenciesSub}
              </p>
            </div>
            <Link
              to="/agencies"
              className="text-xs font-semibold text-[#123B70] hover:text-[#FF8A00] flex items-center gap-1"
            >
              <span>{t.seeAll}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topAgencies.map((agency) => (
              <div
                key={agency.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={agency.logo}
                      alt={agency.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 truncate">{agency.name}</h3>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#FF8A00]" />
                        <span>{agency.city}, {agency.province}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {agency.description}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span>{t.responseTime}</span>
                      <span className="font-medium text-slate-800">{agency.responseTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.frenchSupport}</span>
                      <span className="font-medium text-emerald-600">
                        {agency.francophoneSupport
                          ? language === 'zh'
                            ? '中法双语团队'
                            : language === 'en'
                            ? 'French & English'
                            : 'Oui (Français / Lingala)'
                          : language === 'zh'
                          ? '中英团队'
                          : 'Anglais / Chinois'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.catalogItems}</span>
                      <span className="font-medium text-slate-800">{agency.totalProducts} {t.itemsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      startOrOpenConversation(
                        agency.id,
                        undefined,
                        language === 'zh'
                          ? `您好 ${agency.name}，我正在从刚果(金)寻找大宗采购货源，希望与贵商行洽谈。`
                          : language === 'en'
                          ? `Hello ${agency.name}, I am contacting you from the DR Congo regarding wholesale purchasing opportunities.`
                          : `Bonjour ${agency.name}, je vous contacte depuis la République Démocratique du Congo pour échanger sur vos opportunités de fourniture en gros.`
                      );
                      navigate('/messages');
                    }}
                    className="flex-1 py-1.5 px-3 bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{t.chatWithAgency}</span>
                  </button>
                  <Link
                    to={`/catalog?agency=${agency.id}`}
                    className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    {t.visitStore}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              {t.newArrivalsTitle}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.newArrivalsSub}
            </h2>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold text-[#123B70] hover:text-[#FF8A00] flex items-center gap-1"
          >
            <span>{t.seeAll}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. HOW TO BUY FROM DRC (EXPLICATIVE B2B WORKFLOW) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 lg:p-12 shadow-sm">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold text-[#FF8A00] uppercase tracking-wider">
              {t.guideTag}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123B70] tracking-tight mt-1">
              {t.guideTitle}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {t.guideSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#123B70] font-black text-sm flex items-center justify-center font-mono">
                01
              </div>
              <h3 className="font-bold text-base text-slate-900">{t.step1Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center font-mono">
                02
              </div>
              <h3 className="font-bold text-base text-slate-900">{t.step2Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center font-mono">
                03
              </div>
              <h3 className="font-bold text-base text-slate-900">{t.step3Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.step3Desc}
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center font-mono">
                04
              </div>
              <h3 className="font-bold text-base text-slate-900">{t.step4Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.step4Desc}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.customsCompliance}</span>
            </div>
            <Link
              to="/catalog"
              className="px-5 py-2 bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>{t.startSourcingNow}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
