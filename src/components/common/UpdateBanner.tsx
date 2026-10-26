import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/** Script principal chargé par cette page (change à chaque mise en ligne) */
const currentBundle = () =>
  Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((s) => new URL(s.src).pathname)
    .find((p) => /\/assets\/index-[^/]+\.js$/.test(p)) || '';

/**
 * Prévient l'utilisateur quand une nouvelle version de l'application est en ligne
 * (vérifiée au retour sur l'onglet et toutes les 5 minutes).
 */
export const UpdateBanner: React.FC = () => {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    const mine = currentBundle();
    if (!mine) return; // serveur de développement
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })).text();
        const live = html.match(/\/assets\/index-[^"']+\.js/)?.[0];
        if (live && live !== mine) setOutdated(true);
      } catch {
        // hors ligne : on réessaiera
      }
    };
    const timer = window.setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!outdated) return null;
  return (
    <div role="status" className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-md">
      <div className="flex items-center gap-3 rounded-xl bg-[#123B70] text-white shadow-2xl px-4 py-3 text-xs">
        <RefreshCw className="w-4 h-4 shrink-0" />
        <span className="flex-1">Une nouvelle version d’ASEP MARKET est disponible.</span>
        <button className="px-3 py-1.5 rounded-lg bg-[#FF8A00] hover:bg-[#e57c00] font-semibold cursor-pointer" onClick={() => window.location.reload()}>
          Actualiser
        </button>
      </div>
    </div>
  );
};
