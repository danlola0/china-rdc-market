import React from 'react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { Field, inputClass } from '../ui';

/**
 * Choix d'une succursale dans un formulaire.
 * N'apparaît que si l'agence a plusieurs succursales.
 * - restrictToMine : un employé de succursale ne peut choisir que la sienne (ex. succursale de départ)
 * - emptyLabel : propose une option vide (ex. « Pas de transfert »)
 */
export const BranchSelect: React.FC<{
  label: string;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  restrictToMine?: boolean;
  emptyLabel?: string;
  exclude?: string | null;
  hint?: string;
  className?: string;
}> = ({ label, value, onChange, restrictToMine, emptyLabel, exclude, hint, className }) => {
  const { branches, seesAllBranches, defaultBranchId, branchName } = useWorkspace();
  if (branches.length <= 1) return null;
  const options = branches.filter((b) => b.id !== exclude && (!restrictToMine || seesAllBranches || b.id === defaultBranchId));
  return (
    <Field label={label} hint={hint} className={className}>
      <select className={inputClass} value={value || ''} onChange={(e) => onChange(e.target.value || null)} disabled={restrictToMine && !seesAllBranches}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            {branchName(b.id)}
          </option>
        ))}
      </select>
    </Field>
  );
};
