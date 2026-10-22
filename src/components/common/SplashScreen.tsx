import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Language } from '../../i18n/translations';
import { Building2, FileText, Languages, Ship, ArrowRight, X } from 'lucide-react';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
];

const LOGO_SRC = '/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg';

export const SplashScreen: React.FC = () => {
  const { isSplashOpen, closeSplash, language, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const enterButtonRef = useRef<HTMLButtonElement>(null);

  // Focus sur le bouton principal + blocage du défilement
  useEffect(() => {
    if (!isSplashOpen) return;
    setIsVisible(true);
    enterButtonRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSplashOpen]);

  const handleClose = (then?: () => void) => {
    setIsVisible(false);
    setTimeout(() => {
      closeSplash(dontShowAgain);
      then?.();
    }, 200);
  };

  useEffect(() => {
    if (!isSplashOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSplashOpen, dontShowAgain]);

  if (!isSplashOpen) return null;

  const features = [
    { icon: Building2, title: t.splashPillar1Title, desc: t.splashPillar1Desc },
    { icon: FileText, title: t.splashPillar2Title, desc: t.splashPillar2Desc },
    { icon: Languages, title: t.splashPillar3Title, desc: t.splashPillar3Desc },
    { icon: Ship, title: t.splashPillar4Title, desc: t.splashPillar4Desc },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl grid md:grid-cols-5 transition-all duration-200 ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
      >
        {/* Panneau de marque */}
        <div className="md:col-span-2 bg-[#0c274c] text-white p-6 sm:p-8 flex flex-col md:rounded-l-2xl rounded-t-2xl md:rounded-tr-none relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#FF8A00]" />

          <div className="flex md:flex-col items-center md:items-start gap-4">
            <div className="bg-white rounded-xl p-2 shrink-0">
              <img src={LOGO_SRC} alt="ASEP" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
            </div>
            <div>
              <h1 id="splash-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
                ASEP <span className="text-[#FF8A00]">MARKET</span>
              </h1>
              <p className="text-[11px] md:text-xs text-blue-200 mt-1 leading-snug">{t.splashSubtitle}</p>
            </div>
          </div>

          <p className="mt-6 text-sm md:text-base text-slate-100 leading-relaxed">{t.splashCorridor}</p>

          <div className="hidden md:block mt-auto pt-8">
            <div className="h-px bg-white/15 mb-4" />
            <div className="grid grid-cols-2 gap-4 text-[11px] text-blue-200">
              <div>
                <div className="font-semibold text-white mb-1">Chine</div>
                Guangzhou · Yiwu
                <br />
                Shenzhen · Foshan
              </div>
              <div>
                <div className="font-semibold text-white mb-1">RD Congo</div>
                Kinshasa · Matadi
                <br />
                Lubumbashi · Goma
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="md:col-span-3 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Langue">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  aria-pressed={language === lang.code}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    language === lang.code ? 'bg-[#123B70] text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleClose()}
              aria-label={t.splashSkip}
              title={t.splashSkip}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <ul className="mt-6 space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#123B70] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                  <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 space-y-3 md:space-y-4 bg-white max-md:sticky max-md:bottom-0 max-md:-mx-6 max-md:px-6 max-md:-mb-6 max-md:pb-5 sm:max-md:-mx-8 sm:max-md:px-8 sm:max-md:-mb-8">
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                onClick={() => handleClose(() => navigate('/how-it-works'))}
                className="sm:flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {t.howItWorks}
              </button>
              <button
                ref={enterButtonRef}
                onClick={() => handleClose()}
                className="sm:flex-[1.4] px-5 py-2.5 rounded-lg bg-[#FF8A00] hover:bg-[#e57c00] text-white text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A00] focus-visible:ring-offset-2"
              >
                {t.splashEnterButton}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#123B70] cursor-pointer"
              />
              {t.splashDoNotShowAgain}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
