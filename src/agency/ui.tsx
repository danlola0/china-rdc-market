import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { PaymentMethod } from './types';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from './utils';

// ---------- Styles partagés ----------

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  accent:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8A00] hover:bg-[#e57c00] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer',
  secondary:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer',
  danger:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer',
  icon: 'p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40',
};

export const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]';

// ---------- Mise en page ----------

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
    <div>
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ title?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  actions,
  className = '',
  children,
}) => (
  <section className={`bg-white rounded-xl border border-slate-200 shadow-xs min-w-0 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        {title && <h2 className="text-sm font-bold text-slate-900">{title}</h2>}
        {actions}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon?: React.ElementType }> = ({
  label,
  value,
  hint,
  icon: Icon,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
    </div>
    <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
  </div>
);

export const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${className}`}>
    {children}
  </span>
);

export const EmptyState: React.FC<{ icon?: React.ElementType; title: string; text?: string; action?: React.ReactNode }> = ({
  icon: Icon,
  title,
  text,
  action,
}) => (
  <div className="py-10 text-center">
    {Icon && <Icon className="w-8 h-8 text-slate-300 mx-auto" />}
    <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
    {text && <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const AccessDenied: React.FC<{ text?: string }> = ({ text }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
    <Lock className="w-8 h-8 text-slate-300 mx-auto" />
    <p className="mt-3 text-sm font-semibold text-slate-800">Accès non autorisé</p>
    <p className="mt-1 text-xs text-slate-500">
      {text || 'Votre rôle ne permet pas d’accéder à cette rubrique. Contactez le propriétaire de l’agence.'}
    </p>
  </div>
);

// ---------- Formulaires ----------

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  required,
  hint,
  className = '',
  children,
}) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-semibold text-slate-700 mb-1">
      {label}
      {required && <span className="text-rose-500"> *</span>}
    </span>
    {children}
    {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const Modal: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}> = ({ open, title, onClose, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/50"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`bg-white w-full ${width} rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className={btn.icon} aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto text-xs">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ open, title, text, confirmLabel = 'Supprimer', onConfirm, onClose }) => (
  <Modal
    open={open}
    title={title}
    onClose={onClose}
    footer={
      <>
        <button className={btn.secondary} onClick={onClose}>
          Annuler
        </button>
        <button
          className={btn.danger}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-slate-600 leading-relaxed">{text}</p>
  </Modal>
);

export const Tabs = <T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) => (
  <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
          value === t.key ? 'border-[#123B70] text-[#123B70]' : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        {t.label}
        {t.count !== undefined && <span className="ml-1.5 text-[10px] text-slate-400">{t.count}</span>}
      </button>
    ))}
  </div>
);

// ---------- Graphiques ----------

/** Couleurs validées (contraste et séparation daltonisme) pour deux séries */
export const CHART_COLORS = { primary: '#2563EB', secondary: '#E8590C' };

const compact = (n: number) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const niceMax = (max: number) => {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setWidth(el.clientWidth || 600);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
};

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * Histogramme en colonnes groupées : un seul axe, barres fines à extrémité arrondie,
 * grille discrète, infobulle au survol et vue tableau accessible.
 */
export const ColumnChart: React.FC<{
  data: { label: string; values: Record<string, number> }[];
  series: ChartSeries[];
  formatValue: (n: number) => string;
  height?: number;
  ariaLabel: string;
}> = ({ data, series, formatValue, height = 220, ariaLabel }) => {
  const { ref, width } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] || 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const band = plotW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const roundedTop = (x: number, top: number, w: number, h: number) => {
    const r = Math.min(4, w / 2, h);
    const bottom = top + h;
    return `M${x},${bottom} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${bottom} Z`;
  };

  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        {series.length >= 2 ? (
          <div className="flex flex-wrap gap-3">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button onClick={() => setShowTable((v) => !v)} className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer">
          {showTable ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3 font-semibold">Période</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1.5 pr-3 font-semibold text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700 capitalize">{d.label}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1.5 pr-3 text-right tabular-nums text-slate-900">
                      {formatValue(d.values[s.key] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeWidth={1} />
                <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#64748B">
                  {compact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const gx = padL + band * i + (band - groupW) / 2;
              return (
                <g key={d.label}>
                  {hover === i && <rect x={padL + band * i} y={padT} width={band} height={plotH} fill="#F1F5F9" />}
                  {series.map((s, si) => {
                    const v = d.values[s.key] || 0;
                    const h = Math.max(0, plotH - (y(v) - padT));
                    if (h <= 0) return null;
                    return <path key={s.key} d={roundedTop(gx + si * (barW + gap), y(v), barW, h)} fill={s.color} />;
                  })}
                  <text x={padL + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="#64748B" className="capitalize">
                    {d.label}
                  </text>
                  <rect
                    x={padL + band * i}
                    y={padT}
                    width={band}
                    height={plotH + padB}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setHover(i)}
                  />
                </g>
              );
            })}
          </svg>
          {hover !== null && data[hover] && (
            <div
              className="absolute pointer-events-none bg-slate-900 text-white rounded-lg px-3 py-2 text-[11px] shadow-lg whitespace-nowrap"
              style={{
                left: Math.min(Math.max(padL + band * hover + band / 2, 70), width - 70),
                top: 0,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold capitalize mb-1">{data[hover].label}</div>
              {series.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                  <span className="text-slate-300">{s.label}</span>
                  <span className="ml-auto pl-3 tabular-nums">{formatValue(data[hover].values[s.key] || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Barres horizontales (une seule teinte) avec la valeur au bout de chaque barre */
export const BarList: React.FC<{
  items: { label: string; value: number }[];
  formatValue: (n: number) => string;
  color?: string;
  emptyText?: string;
}> = ({ items, formatValue, color = CHART_COLORS.primary, emptyText = 'Aucune donnée' }) => {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max === 0) return <p className="text-xs text-slate-400 py-6 text-center">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="text-xs" title={`${item.label} : ${formatValue(item.value)}`}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-slate-700 truncate">{item.label}</span>
            <span className="tabular-nums font-semibold text-slate-900 shrink-0">{formatValue(item.value)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-r-full" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

// ---------- Mode de paiement ----------

/** Choix du mode de paiement sous forme de boutons (M-Pesa, Orange Money, Airtel Money, Alipay, WeChat Pay…) */
export const PaymentMethodPicker: React.FC<{ value: PaymentMethod | undefined; onChange: (v: PaymentMethod) => void; label?: string }> = ({
  value,
  onChange,
  label = 'Mode de paiement',
}) => {
  const groups = Array.from(new Set(PAYMENT_METHOD_OPTIONS.map((o) => o.group)));
  return (
    <div role="radiogroup" aria-label={label}>
      <span className="block text-[11px] font-semibold text-slate-700 mb-1">{label}</span>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g}>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{g}</div>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHOD_OPTIONS.filter((o) => o.group === g).map((o) => {
                const active = value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(o.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      active ? 'border-[#123B70] bg-[#123B70] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-[#123B70]'
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[o.value]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {value && !PAYMENT_METHOD_OPTIONS.some((o) => o.value === value) && (
        <p className="mt-1 text-[11px] text-slate-500">Mode actuel : {PAYMENT_METHOD_LABELS[value]}</p>
      )}
    </div>
  );
};
