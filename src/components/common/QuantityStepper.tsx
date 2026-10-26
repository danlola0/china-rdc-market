import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { NumberInput } from './NumberInput';
import { Product } from '../../types';

/**
 * Prix unitaire selon les paliers affichés sur la fiche article
 * (jusqu'à 5 × MOQ, jusqu'à 20 × MOQ, au-delà) — même calcul que la base.
 */
export const unitPriceFor = (product: Pick<Product, 'priceMin' | 'priceMax' | 'moq'>, quantity: number) => {
  const moq = Math.max(product.moq || 1, 1);
  const high = product.priceMax || product.priceMin;
  if (quantity <= moq * 5) return high;
  if (quantity <= moq * 20) return Math.round(((product.priceMin + high) / 2) * 10) / 10;
  return product.priceMin;
};

/** Sélecteur de quantité : boutons − / + et saisie libre, minimum imposé */
export const QuantityStepper: React.FC<{
  value: number;
  onChange: (n: number) => void;
  min?: number;
  unit?: string;
  size?: 'md' | 'lg';
}> = ({ value, onChange, min = 1, unit, size = 'md' }) => {
  const h = size === 'lg' ? 'h-11' : 'h-9';
  const below = value < min;
  const btn = `${h} w-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`;
  return (
    <div>
      <div className={`inline-flex items-stretch rounded-lg border bg-white overflow-hidden ${below ? 'border-rose-400' : 'border-slate-300'}`}>
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuer la quantité">
          <Minus className="w-4 h-4" />
        </button>
        <NumberInput
          decimals={false}
          value={value}
          onChange={(v) => onChange(parseInt(v) || 0)}
          onBlur={() => below && onChange(min)}
          className={`${h} w-20 text-center text-sm font-bold text-slate-900 border-x border-slate-200 focus:outline-none focus:bg-blue-50/40`}
          aria-label={`Quantité${unit ? ` (${unit})` : ''}`}
        />
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value + 1))} aria-label="Augmenter la quantité">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className={`text-[11px] mt-1 ${below ? 'text-rose-600' : 'text-slate-500'}`}>
        Minimum : {min}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
};
