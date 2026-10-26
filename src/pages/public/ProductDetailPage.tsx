import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { RFQModal } from '../../components/common/RFQModal';
import { OrderModal } from '../../components/common/OrderModal';
import { whatsappUrl } from '../../agency/utils';
import { QuantityStepper, unitPriceFor } from '../../components/common/QuantityStepper';
import { ProductCard } from '../../components/product/ProductCard';
import {
  MessageSquare,
  FileText,
  Heart,
  Share2,
  ShieldCheck,
  MapPin,
  Building2,
  Clock,
  Package,
  Ship,
  Plane,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  ShoppingCart,
} from 'lucide-react';
import { AgencyLogo } from '../../components/common/AgencyImages';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    products,
    agencies,
    favorites,
    toggleFavorite,
    startOrOpenConversation,
    addToast,
    t,
    language,
    getProductName,
    getCategoryName,
    getProductDesc,
    isAuthenticated,
  } = useApp();

  const product = products.find((p) => p.id === id);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(0);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">{t.noProductsFound}</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">{t.noProductsDesc}</p>
        <Link
          to="/catalog"
          className="px-5 py-2.5 bg-[#123B70] text-white text-xs font-semibold rounded-lg hover:bg-[#0c274c]"
        >
          {t.backToCatalog}
        </Link>
      </div>
    );
  }

  const agency = agencies.find((a) => a.id === product.agencyId);
  const isFav = favorites.includes(product.id);
  const displayName = getProductName(product);
  const displayCategory = getCategoryName(product.category);
  const displayDesc = getProductDesc(product);

  const similarProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // Quantité choisie (au moins le MOQ)
  const qty = quantity || Math.max(product.moq || 1, 1);

  const handleVariantSelect = (variantName: string, optionValue: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: optionValue,
    }));
  };

  const handleStartChat = () => {
    const greeting =
      language === 'zh'
        ? `您好 ${product.agencyName}，我想订购 "${displayName}"。请告知生产交期及发往马塔迪港的运费。`
        : language === 'en'
        ? `Hello ${product.agencyName}, I would like to order "${displayName}". Could you indicate lead times and shipping options to Matadi port?`
        : `Bonjour ${product.agencyName}, je souhaite commander "${displayName}". Pourriez-vous m’indiquer les délais et les options d’acheminement vers le port de Matadi ?`;

    startOrOpenConversation(product.agencyId, product.id, greeting);
    navigate('/messages');
  };

  // Commande directe auprès de l'agence qui a publié l'article
  const handleOrder = () => {
    if (!isAuthenticated) {
      addToast('Connectez-vous ou créez un compte pour commander.', 'info');
      navigate('/auth/login', { state: { from: `/product/${product.id}` } });
      return;
    }
    setOrderModalOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast(
      language === 'zh'
        ? '商品链接已复制到剪贴板！'
        : language === 'en'
        ? 'Product link copied to clipboard!'
        : 'Lien du produit copié dans le presse-papier !',
      'info'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-800">{t.home}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/catalog" className="hover:text-slate-800">{t.b2bCatalog}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/catalog?cat=${encodeURIComponent(product.category)}`} className="hover:text-slate-800">
          {displayCategory}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-semibold truncate max-w-xs">{displayName}</span>
      </div>

      {/* Main PDP Grid: Gallery Left, Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Gallery & Images */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Main Image */}
          <div className="relative aspect-4/3 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => toggleFavorite(product.id)}
              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isFav
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
              }`}
              aria-label="Favori"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Thumbnails list */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                    activeImageIdx === idx ? 'border-[#123B70] shadow-md ring-2 ring-blue-100' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Logistics and Port reassurance for RDC */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#123B70]" />
              <span>{t.shippingOption}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Ship className="w-3.5 h-3.5 text-[#FF8A00]" />
                  <span>{t.seaFreight}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {language === 'zh'
                    ? '广州、深圳、宁波港口出运，直达刚果(金)马塔迪或博马港，时效28-35天，支持整柜FCL与散货拼箱LCL。'
                    : language === 'en'
                    ? 'Departures from Guangzhou, Shenzhen, or Ningbo ports to Matadi or Boma port. Transit: 28-38 days. FCL & LCL.'
                    : 'Départ ports de Guangzhou, Shenzhen ou Ningbo vers le Port de Matadi ou Boma. Délai : 28 à 38 jours. Groupage LCL ou Conteneur 20/40ft FCL.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.airFreight}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {language === 'zh'
                    ? '定期货运包机直飞金沙萨恩吉利国际机场(FIH)与卢本巴希卢阿诺机场(FBM)，时效5-8工作日。'
                    : language === 'en'
                    ? 'Scheduled air cargo flights to Kinshasa Ndjili (FIH) and Lubumbashi Luano (FBM) airports. Transit: 5-8 business days.'
                    : 'Vols cargos réguliers vers les aéroports de Kinshasa Ndjili (FIH) et Lubumbashi Luano (FBM). Délai : 5 à 8 jours ouvrés.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Purchase & Supplier Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            {/* Category tag & Share */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-[#123B70] uppercase tracking-wider text-[11px]">
                {displayCategory}
              </span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '分享' : language === 'en' ? 'Share' : 'Partager'}</span>
              </button>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {displayName}
            </h1>

            {/* Pricing Tiers (Alibaba Style in USD) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2 font-medium">{t.pricePerUnit}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-base font-black text-[#123B70] font-mono tabular-nums">
                    ${product.priceMax}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {product.moq} - {product.moq * 5} {t.unit}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-base font-black text-[#123B70] font-mono tabular-nums">
                    ${((product.priceMin + product.priceMax) / 2).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {product.moq * 5 + 1} - {product.moq * 20} {t.unit}
                  </div>
                </div>

                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <div className="text-base font-black text-[#FF8A00] font-mono tabular-nums">
                    ${product.priceMin}
                  </div>
                  <div className="text-[10px] text-blue-900 font-semibold mt-0.5">
                    ≥ {product.moq * 20 + 1} {t.unit}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{t.moq}</span>
                <span className="font-bold text-slate-900 font-mono">
                  {product.moq} {t.unit}
                </span>
              </div>
            </div>

            {/* Quantité à commander */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">Quantité</div>
                <QuantityStepper value={qty} onChange={setQuantity} min={Math.max(product.moq || 1, 1)} unit={product.unit} size="lg" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">
                  {qty} × ${unitPriceFor(product, qty)}
                </div>
                <div className="text-lg font-black text-[#123B70] font-mono tabular-nums">
                  ${(qty * unitPriceFor(product, qty)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">hors transport</div>
              </div>
            </div>

            {/* Variants Selectors */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {product.variants.map((v) => (
                  <div key={v.name} className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      {v.name} :{' '}
                      <span className="text-slate-900 font-bold">
                        {selectedVariants[v.name] || v.options[0]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((opt) => {
                        const isSelected = (selectedVariants[v.name] || v.options[0]) === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleVariantSelect(v.name, opt)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#123B70] text-white border-[#123B70] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleOrder}
                disabled={!product.inStock}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{product.inStock ? `Commander auprès de ${product.agencyName}` : 'Rupture de stock'}</span>
              </button>

              <button
                onClick={() => setRfqModalOpen(true)}
                className="w-full py-3.5 px-4 bg-[#FF8A00] hover:bg-[#e57c00] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span>{t.requestQuote}</span>
              </button>

              <button
                onClick={handleStartChat}
                className="w-full py-3 px-4 bg-[#123B70] hover:bg-[#0c274c] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#FF8A00]" />
                <span>{t.chatWithAgency}</span>
              </button>

              {agency?.phoneWeChat && (
                <a
                  href={whatsappUrl(
                    agency.phoneWeChat,
                    `Bonjour ${agency.name}, je suis intéressé(e) par « ${displayName} » vu sur ASEP MARKET (${window.location.href}). Pouvez-vous me donner plus d’informations ?`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88zm8.42-18.3A11.8 11.8 0 0 0 12.04 0C5.48 0 .13 5.34.13 11.9c0 2.1.55 4.14 1.59 5.95L.03 24l6.3-1.65a11.88 11.88 0 0 0 5.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.48-8.4z"/></svg>
                  <span>Écrire sur WhatsApp</span>
                </a>
              )}
            </div>

            {/* Supplier mini-card */}
            {agency && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'zh' ? '供应商信息' : language === 'en' ? 'Supplier Information' : 'Informations sur le Fournisseur'}
                </div>
                <div className="flex items-start gap-3">
                  <AgencyLogo src={agency.logo} name={agency.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <h4 className="font-bold text-slate-900 truncate">{agency.name}</h4>
                    <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{agency.city}, {agency.province}</span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      {t.responseTime} <span className="font-semibold text-slate-800">{agency.responseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{language === 'zh' ? '认证资质：' : language === 'en' ? 'Verification Status:' : 'Statut vérification :'}</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {t.verifiedSupplier}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t.frenchSupport}</span>
                    <span className="font-semibold text-slate-900">
                      {agency.francophoneSupport ? 'Oui (Français / Lingala)' : 'Anglais / Chinois'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.specifications}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.corridorTitle}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
          {displayDesc}
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-slate-200">
              {Object.entries(product.specifications).map(([key, val], idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="px-4 py-3 font-semibold text-slate-600 w-1/3 sm:w-1/4 border-r border-slate-200">
                    {key}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{val}</td>
                </tr>
              ))}
              <tr className="bg-white">
                <td className="px-4 py-3 font-semibold text-slate-600 border-r border-slate-200">
                  {language === 'zh' ? '生产周期' : language === 'en' ? 'Manufacturing Lead Time' : 'Délai de fabrication'}
                </td>
                <td className="px-4 py-3 text-slate-900 font-medium">
                  {product.leadTimeDays} {language === 'zh' ? '工作日出厂' : language === 'en' ? 'business days ex-factory' : 'jours ouvrés départ usine'}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-600 border-r border-slate-200">
                  {language === 'zh' ? '刚果清关支持' : language === 'en' ? 'DRC Customs Support' : 'Assistance douanière RDC'}
                </td>
                <td className="px-4 py-3 text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.customsCompliance}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t.similarProductsTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
            </div>
            <Link
              to={`/catalog?cat=${encodeURIComponent(product.category)}`}
              className="text-xs font-semibold text-[#123B70] hover:text-[#FF8A00]"
            >
              {t.seeAll}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Mobile Buy/Chat Action Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 px-4 shadow-xl flex items-center gap-2">
        <button
          onClick={handleStartChat}
          className="p-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-center shrink-0 cursor-pointer"
          aria-label={t.chatDirect}
        >
          <MessageSquare className="w-5 h-5 text-[#123B70]" />
        </button>
        <button
          onClick={() => setRfqModalOpen(true)}
          className="flex-1 py-2.5 px-4 bg-[#FF8A00] hover:bg-[#e57c00] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'zh' ? '询价' : language === 'en' ? 'Quote' : 'Devis'}</span>
        </button>
        <button
          onClick={handleOrder}
          disabled={!product.inStock}
          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Commander</span>
        </button>
      </div>

      {/* RFQ Modal */}
      <RFQModal
        product={product}
        isOpen={rfqModalOpen}
        onClose={() => setRfqModalOpen(false)}
      />

      {/* Commande directe */}
      <OrderModal product={product} isOpen={orderModalOpen} onClose={() => setOrderModalOpen(false)} variants={selectedVariants} initialQuantity={qty} />
    </div>
  );
};
