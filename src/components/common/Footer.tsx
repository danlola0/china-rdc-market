import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Anchor, Plane, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { t, openSplash } = useApp();

  return (
    <footer className="bg-[#0c274c] text-slate-300 pt-12 pb-20 md:pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-10 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">{t.footerTrustAgencies}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.footerTrustAgenciesDesc}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Anchor className="w-6 h-6 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">{t.footerTrustSea}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.footerTrustSeaDesc}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Plane className="w-6 h-6 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">{t.footerTrustAir}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.footerTrustAirDesc}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Award className="w-6 h-6 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">{t.footerTrustSupport}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.footerTrustSupportDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Links Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-10 border-b border-slate-800 text-xs">
          {/* Col 1: Platform */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg"
                alt="Logo ASEP"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 shadow-sm"
              />
              <div className="flex flex-col">
                <span className="font-black text-white text-base leading-tight">
                  ASEP <span className="text-[#FF8A00]">MARKET</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Atelier des Solutions Entrepreneuriales et Pédagogiques
                </span>
              </div>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              {t.footerAboutDesc}
            </p>
            <div className="text-[11px] text-amber-300 font-medium pt-2">
              {t.footerDemoNotice}
            </div>
          </div>

          {/* Col 2: Catégories Phares */}
          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">{t.allCategories}</h5>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/catalog?cat=Machines" className="hover:text-white transition-colors">{t.machinesTab}</Link></li>
              <li><Link to="/catalog?cat=Solaire" className="hover:text-white transition-colors">{t.solarTab}</Link></li>
              <li><Link to="/catalog?cat=Textile" className="hover:text-white transition-colors">{t.waxTab}</Link></li>
              <li><Link to="/catalog?cat=High-Tech" className="hover:text-white transition-colors">Smartphones & High-Tech</Link></li>
              <li><Link to="/catalog?cat=Matériaux" className="hover:text-white transition-colors">Carrelage & BTP</Link></li>
              <li><Link to="/catalog?cat=Véhicules" className="hover:text-white transition-colors">Tricycles moto & Pièces</Link></li>
            </ul>
          </div>

          {/* Col 3: Villes & Hubs */}
          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">{t.footerHubsTitle}</h5>
            <ul className="space-y-2 text-slate-400">
              <li><span className="text-slate-300 font-medium">Guangzhou</span> (Solaire & Fret)</li>
              <li><span className="text-slate-300 font-medium">Yiwu</span> (Petits articles & Quincaillerie)</li>
              <li><span className="text-slate-300 font-medium">Shenzhen</span> (High-tech & Électronique)</li>
              <li><span className="text-slate-300 font-medium">Ningbo</span> (Grosses machines industrielles)</li>
              <li><span className="text-slate-300 font-medium">Foshan</span> (Céramique & Sanitaires)</li>
              <li><span className="text-slate-300 font-medium">Hangzhou</span> (Textile & Tissus)</li>
            </ul>
          </div>

          {/* Col 4: Guide & Espaces */}
          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">{t.footerQuickLinksTitle}</h5>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={openSplash} className="text-amber-300 hover:text-amber-200 font-bold transition-colors cursor-pointer flex items-center gap-1">✨ {t.splashPresentation}</button></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">{t.howToBuyGuide}</Link></li>
              <li><Link to="/buyer" className="hover:text-white transition-colors">{t.buyerSpace}</Link></li>
              <li><Link to="/agency" className="hover:text-white transition-colors">{t.agencySpace}</Link></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">{t.adminSpace}</Link></li>
              <li><Link to="/auth/login" className="hover:text-white transition-colors">{t.login}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            {t.footerCopyright}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-400">
            <span>Matadi</span>
            <span>·</span>
            <span>Kinshasa</span>
            <span>·</span>
            <span>Lubumbashi</span>
            <span>·</span>
            <span>Guangzhou</span>
            <span>·</span>
            <span>Yiwu</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
