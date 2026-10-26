import React, { useEffect, useState } from 'react';

const initials = (name: string) =>
  (name || '?')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/**
 * Logo d'une agence. Sans logo (ou si l'image ne se charge pas), on affiche
 * ses initiales sur un fond coloré : jamais d'image cassée sur la plateforme.
 */
export const AgencyLogo: React.FC<{ src?: string | null; name: string; className?: string }> = ({ src, name, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#123B70] text-white font-bold text-xs select-none`} aria-label={name} role="img">
        {initials(name)}
      </div>
    );
  }
  return <img src={src} alt={name} className={className} onError={() => setFailed(true)} loading="lazy" />;
};

/** Photo de couverture d'une agence, avec un fond aux couleurs d'ASEP si elle manque */
export const AgencyBanner: React.FC<{ src?: string | null; name: string; className?: string }> = ({ src, name, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={`${className} relative bg-gradient-to-br from-[#0c274c] via-[#123B70] to-[#1d4f8f] overflow-hidden`} aria-label={name} role="img">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-[#FF8A00]/20" />
        <div className="absolute -left-8 -bottom-10 w-40 h-40 rounded-full bg-white/5" />
        <span className="absolute right-4 top-3 text-3xl font-black text-white/10 tracking-tight">{initials(name)}</span>
      </div>
    );
  }
  return <img src={src} alt={name} className={className} onError={() => setFailed(true)} loading="lazy" />;
};
