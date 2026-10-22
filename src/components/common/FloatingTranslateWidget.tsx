import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Globe, Check, ChevronRight, X } from 'lucide-react';

export const FloatingTranslateWidget: React.FC = () => {
  const { language, setLanguage } = useApp();
  const [minimized, setMinimized] = useState(false);

  return (
    <div className="fixed bottom-16 sm:bottom-4 right-3 sm:right-4 z-40 flex flex-col items-end print:hidden">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="bg-white/95 backdrop-blur-md text-[#123B70] p-2.5 rounded-full shadow-xl border border-slate-200 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Ouvrir le sélecteur de langue"
          aria-label="Changer de langue"
        >
          <Globe className="w-4 h-4 text-[#FF8A00]" />
          <span className="text-xs font-bold uppercase">
            {language === 'zh' ? '中文' : language.toUpperCase()}
          </span>
        </button>
      ) : (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-1.5 sm:p-2 text-xs flex items-center gap-1.5 sm:gap-2 transition-all duration-200">
          <div className="flex items-center gap-1 pl-1 pr-1.5 text-slate-700 font-bold border-r border-slate-200">
            <Globe className="w-3.5 h-3.5 text-[#123B70]" />
            <span className="text-[10px] uppercase tracking-wider text-slate-500 hidden sm:inline">
              Traduction :
            </span>
          </div>

          {/* 1-Click Direct Language Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-xs ${
                language === 'fr'
                  ? 'bg-[#123B70] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Français"
            >
              <span>🇫🇷</span>
              <span>FR</span>
              {language === 'fr' && <Check className="w-2.5 h-2.5 text-amber-300" />}
            </button>

            <button
              onClick={() => setLanguage('zh')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-xs ${
                language === 'zh'
                  ? 'bg-[#123B70] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="中文 (Chinese)"
            >
              <span>🇨🇳</span>
              <span>中文</span>
              {language === 'zh' && <Check className="w-2.5 h-2.5 text-amber-300" />}
            </button>

            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-xs ${
                language === 'en'
                  ? 'bg-[#123B70] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="English"
            >
              <span>🇬🇧</span>
              <span>EN</span>
              {language === 'en' && <Check className="w-2.5 h-2.5 text-amber-300" />}
            </button>
          </div>

          <button
            onClick={() => setMinimized(true)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors ml-0.5"
            title="Réduire"
            aria-label="Réduire"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
