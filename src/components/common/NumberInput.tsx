import React, { useEffect, useState } from 'react';

type NativeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'step'>;

interface NumberInputProps extends NativeProps {
  value: number | string | null | undefined;
  /** Reçoit le texte nettoyé (ex. « 12.5 »), ou « » si le champ est vidé */
  onChange: (value: string) => void;
  /** false pour les quantités : chiffres uniquement, pas de 0 initial (minimum 1) */
  decimals?: boolean;
}

const toText = (v: NumberInputProps['value']) =>
  v === null || v === undefined || v === '' || Number(v) === 0 ? '' : String(v);

const toNumber = (s: string) => (s === '' || s === '.' ? 0 : parseFloat(s));

/** Nettoie la saisie : un seul séparateur décimal, et jamais de 0 en tête (« 05 » → « 5 ») */
export const cleanNumber = (raw: string, decimals = true) => {
  let s = raw.replace(',', '.');
  if (decimals) {
    s = s.replace(/[^\d.]/g, '');
    const dot = s.indexOf('.');
    if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    if (s.startsWith('.')) s = '0' + s;
    s = s.replace(/^0+(?=\d)/, '');
  } else {
    s = s.replace(/\D/g, '').replace(/^0+/, '');
  }
  return s;
};

/**
 * Champ numérique : n'affiche pas de 0 par défaut, retire les zéros en tête
 * et accepte la virgule comme séparateur décimal.
 */
export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, decimals = true, ...rest }) => {
  const [text, setText] = useState(toText(value));

  // Synchronise quand la valeur change depuis l'extérieur (sans écraser une saisie en cours comme « 0. »)
  useEffect(() => {
    if (toNumber(text) !== toNumber(String(value ?? ''))) setText(toText(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const cleaned = cleanNumber(e.target.value, decimals);
        setText(cleaned);
        onChange(cleaned);
      }}
    />
  );
};
