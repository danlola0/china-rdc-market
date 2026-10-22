import React from 'react';

export const LOGO_SRC = '/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg';

export const authInput =
  'w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#123B70]/30 focus:border-[#123B70]';

export const AuthCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }> = ({
  title,
  subtitle,
  children,
  wide,
}) => (
  <div className={`${wide ? 'max-w-lg' : 'max-w-md'} mx-auto px-4 py-10 sm:py-14`}>
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <img src={LOGO_SRC} alt="ASEP" className="w-14 h-14 object-contain mx-auto rounded-xl border border-slate-100" />
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 max-w-sm mx-auto">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export const AuthField: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const SubmitButton: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-2.5 bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
  >
    {loading ? 'Veuillez patienter…' : children}
  </button>
);

export const CheckEmail: React.FC<{ email: string }> = ({ email }) => (
  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 space-y-1">
    <p className="font-semibold">Vérifiez votre boîte email</p>
    <p className="text-xs">
      Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus, puis connectez-vous.
    </p>
  </div>
);
