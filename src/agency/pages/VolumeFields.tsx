import React, { useState } from 'react';
import { Box, Ruler } from 'lucide-react';
import { NumberInput } from '../../components/common/NumberInput';
import { Field, inputClass } from '../ui';
import { formatNumber } from '../utils';
import { cbmFromDimensions, dimensionsFromCbm } from '../volume';

export interface VolumeValue {
  volumeCbm: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  packages?: number;
}

type Mode = 'dimensions' | 'volume';

const num = (v?: number | null) => (v && v > 0 ? v : 0);

/**
 * Saisie du volume d'un colis, dans les deux sens :
 * - Dimensions → CBM : longueur × largeur × hauteur × nombre de cartons
 * - CBM → Dimensions : dimensions d'un carton équivalent (ou hauteur exacte si longueur et largeur sont connues)
 */
export const VolumeFields: React.FC<{ value: VolumeValue; onChange: (v: VolumeValue) => void; required?: boolean }> = ({ value, onChange, required }) => {
  const [mode, setMode] = useState<Mode>('dimensions');
  const [cube, setCube] = useState(false);
  const packages = Math.max(1, value.packages || 1);
  const L = num(value.lengthCm);
  const W = num(value.widthCm);
  const H = num(value.heightCm);

  // Mode « dimensions » : le CBM suit les dimensions
  const setDimension = (key: 'lengthCm' | 'widthCm' | 'heightCm' | 'packages', raw: string) => {
    const n = key === 'packages' ? Math.max(1, parseInt(raw) || 1) : parseFloat(raw) || 0;
    const next = { ...value, [key]: key === 'packages' ? n : n || null };
    if (mode === 'dimensions') {
      next.volumeCbm = cbmFromDimensions(num(next.lengthCm), num(next.widthCm), num(next.heightCm), next.packages || 1);
    } else {
      // Mode « volume » : le CBM est fixé, on recalcule la hauteur (ou le carton équivalent)
      const d = dimensionsFromCbm(next.volumeCbm, next.packages || 1, num(next.lengthCm), num(next.widthCm));
      next.heightCm = key === 'heightCm' ? next.heightCm : d.heightCm;
      if (key === 'packages' && cube) {
        next.lengthCm = d.lengthCm;
        next.widthCm = d.widthCm;
        next.heightCm = d.heightCm;
      }
      if (key === 'lengthCm' || key === 'widthCm') setCube(false);
    }
    onChange(next);
  };

  // Mode « volume » : saisie directe du CBM
  const setVolume = (raw: string) => {
    const cbm = parseFloat(raw) || 0;
    const keepLW = !cube && L > 0 && W > 0;
    const d = dimensionsFromCbm(cbm, packages, keepLW ? L : 0, keepLW ? W : 0);
    setCube(d.cube);
    onChange({ ...value, volumeCbm: cbm, lengthCm: d.lengthCm, widthCm: d.widthCm, heightCm: d.heightCm });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'dimensions') {
      setCube(false);
      if (L && W && H) onChange({ ...value, volumeCbm: cbmFromDimensions(L, W, H, packages) });
    }
  };

  const ModeButton: React.FC<{ m: Mode; icon: React.ElementType; label: string }> = ({ m, icon: Icon, label }) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => switchMode(m)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
        mode === m ? 'border-[#123B70] bg-blue-50 text-[#123B70]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="sm:col-span-2 p-3 rounded-xl border border-slate-200 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <ModeButton m="dimensions" icon={Ruler} label="Dimensions → CBM" />
        <ModeButton m="volume" icon={Box} label="CBM → Dimensions" />
      </div>

      {mode === 'volume' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Volume total (CBM)" required={required}>
            <NumberInput className={inputClass} value={value.volumeCbm} onChange={setVolume} required={required} placeholder="Ex. 1.5" />
          </Field>
          <Field label="Nombre de cartons">
            <NumberInput decimals={false} className={inputClass} value={packages} onChange={(v) => setDimension('packages', v)} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Longueur (cm)">
          <NumberInput className={inputClass} value={value.lengthCm ?? ''} onChange={(v) => setDimension('lengthCm', v)} required={required && mode === 'dimensions'} />
        </Field>
        <Field label="Largeur (cm)">
          <NumberInput className={inputClass} value={value.widthCm ?? ''} onChange={(v) => setDimension('widthCm', v)} required={required && mode === 'dimensions'} />
        </Field>
        <Field label={mode === 'volume' && L && W && !cube ? 'Hauteur (cm) — calculée' : 'Hauteur (cm)'}>
          <NumberInput
            className={`${inputClass} ${mode === 'volume' ? 'bg-slate-50' : ''}`}
            value={value.heightCm ?? ''}
            onChange={(v) => setDimension('heightCm', v)}
            readOnly={mode === 'volume'}
            required={required && mode === 'dimensions'}
          />
        </Field>
      </div>

      {mode === 'dimensions' && (
        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Nombre de cartons">
            <NumberInput decimals={false} className={inputClass} value={packages} onChange={(v) => setDimension('packages', v)} />
          </Field>
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex justify-between gap-2">
            <span className="text-blue-900">Volume calculé</span>
            <span className="font-bold text-blue-900 tabular-nums">{formatNumber(value.volumeCbm, 3)} CBM</span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        {mode === 'dimensions'
          ? 'Saisissez les dimensions d’un carton : le volume total est calculé (longueur × largeur × hauteur × nombre de cartons).'
          : cube
          ? 'Dimensions d’un carton cubique de même volume. Pour la hauteur exacte, saisissez la longueur et la largeur réelles du carton.'
          : 'Le volume est fixé : la hauteur est recalculée à partir de la longueur et de la largeur.'}
      </p>
    </div>
  );
};
