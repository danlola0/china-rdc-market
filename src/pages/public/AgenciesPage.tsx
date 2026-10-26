import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Search,
  ExternalLink,
  Award,
  Globe,
  Clock,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { CHINESE_CITIES } from '../../data/referenceData';
import { whatsappUrl } from '../../agency/utils';
import { AgencyBanner, AgencyLogo } from '../../components/common/AgencyImages';

export const AgenciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { agencies, startOrOpenConversation, t, language } = useApp();
  const [selectedCity, setSelectedCity] = useState<string>('Toutes les villes');
  const [search, setSearch] = useState<string>('');

  const filteredAgencies = agencies.filter((a) => {
    if (selectedCity !== 'Toutes les villes' && a.city !== selectedCity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.mainCategories.some((c) => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#123B70] text-white rounded-2xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 text-amber-300 text-xs font-semibold">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg"
              alt="Logo ASEP"
              className="w-4 h-4 rounded object-contain bg-white"
            />
            <span>{t.heroPill}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.suppliersAgencies}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {language === 'zh'
              ? '经实地核验认证的对非出口中国供应商名录。直连外贸经理，享受出厂直供价格与全流程海空运物流护航。'
              : language === 'en'
              ? 'Verified directory of audited Chinese commercial agencies and manufacturers accredited for export to the DR Congo.'
              : 'Consultez les fiches des fournisseurs chinois habilités pour l’exportation vers la République Démocratique du Congo. Prenez contact directement avec leurs représentants commerciaux.'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              language === 'zh'
                ? '搜索商户名称或货源品类 (如：太阳能、发电机、义乌、广州)...'
                : language === 'en'
                ? 'Search agency or specialty (e.g. Solar, Generator, Yiwu, Guangzhou)...'
                : 'Rechercher une agence ou une spécialité (ex: Solaire, BTP, Yiwu, Guangzhou)...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">{t.cityChina} :</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none w-full sm:w-auto cursor-pointer"
          >
            {CHINESE_CITIES.map((c) => (
              <option key={c} value={c}>
                {c === 'Toutes les villes' ? t.allCities : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Agencies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAgencies.map((agency) => (
          <div
            key={agency.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Banner */}
              <div className="h-28 relative bg-slate-200 overflow-hidden">
                <AgencyBanner src={agency.banner} name={agency.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs">
                  <span className="font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-300" />
                    {agency.city}, {agency.province}
                  </span>
                  <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t.verifiedSupplier}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <AgencyLogo
                    src={agency.logo}
                    name={agency.name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-white -mt-10 relative z-10 shadow-md bg-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-slate-900 truncate">{agency.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{agency.chineseName ? `${agency.chineseName} · ` : ''}{language === 'zh' ? '成立于 ' : 'Fondée en '}{agency.yearEstablished}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {agency.description}
                </p>

                {/* Specialties */}
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {language === 'zh' ? '主营货源品类' : language === 'en' ? 'Core Categories' : 'Filières d’exportation'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agency.mainCategories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-md"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key stats table */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{t.responseTime}</span>
                    <span className="font-semibold text-slate-800">{agency.responseTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{t.catalogItems}</span>
                    <span className="font-semibold text-slate-800">{agency.totalProducts} {t.itemsCount}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">{t.frenchSupport}</span>
                    <span className="font-semibold text-emerald-700">
                      {agency.francophoneSupport ? 'Oui (Français / Lingala)' : 'Anglais / Chinois'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => {
                  startOrOpenConversation(
                    agency.id,
                    undefined,
                    language === 'zh'
                      ? `您好 ${agency.name}，我正在从刚果(金)寻找大宗采购货源，希望与贵商行洽谈。`
                      : language === 'en'
                      ? `Hello ${agency.name}, I am contacting you from the DR Congo regarding wholesale purchasing.`
                      : `Bonjour ${agency.name}, je vous contacte depuis la République Démocratique du Congo pour échanger sur vos opportunités de fourniture en gros.`
                  );
                  navigate('/messages');
                }}
                className="flex-1 py-2 px-4 bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#FF8A00]" />
                <span>{t.chatWithAgency}</span>
              </button>

              {agency.phoneWeChat && (
                <a
                  href={whatsappUrl(agency.phoneWeChat, `Bonjour ${agency.name}, je vous contacte depuis ASEP MARKET.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white rounded-lg transition-colors"
                  title="Écrire sur WhatsApp"
                  aria-label={`Écrire à ${agency.name} sur WhatsApp`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88zm8.42-18.3A11.8 11.8 0 0 0 12.04 0C5.48 0 .13 5.34.13 11.9c0 2.1.55 4.14 1.59 5.95L.03 24l6.3-1.65a11.88 11.88 0 0 0 5.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.48-8.4z"/></svg>
                </a>
              )}

              <Link
                to={`/catalog?agency=${agency.id}`}
                className="py-2 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <span>{t.visitStore}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
