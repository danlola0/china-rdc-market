import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { AgencyBranch } from '../types';
import { Badge, btn, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader } from '../ui';

const COUNTRIES = ['Chine', 'RD Congo', 'Angola', 'Congo-Brazzaville', 'Zambie', 'Ouganda', 'Rwanda', 'Burundi', 'Tanzanie', 'Autre'];

const BranchForm: React.FC<{ branch: Partial<AgencyBranch> | null; onClose: () => void }> = ({ branch, onClose }) => {
  const { saveBranch } = useWorkspace();
  const [form, setForm] = useState<Partial<AgencyBranch>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (branch) setForm({ name: '', city: '', country: 'RD Congo', phone: '', address: '', ...branch });
  }, [branch]);
  if (!branch) return null;

  const set = (k: keyof AgencyBranch) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await saveBranch(form);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open
      title={form.id ? `Modifier « ${branch.name} »` : 'Nouvelle succursale'}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="branch-form" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom de la succursale" required className="sm:col-span-2">
          <input className={inputClass} value={form.name || ''} onChange={set('name')} required placeholder="Ex. Agence Kinshasa" />
        </Field>
        <Field label="Pays">
          <select className={inputClass} value={form.country || ''} onChange={set('country')}>
            {!COUNTRIES.includes(form.country || '') && form.country && <option>{form.country}</option>}
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Ville">
          <input className={inputClass} value={form.city || ''} onChange={set('city')} placeholder="Ex. Kinshasa, Luanda…" />
        </Field>
        <Field label="Téléphone / WhatsApp" hint="Affiché aux clients dont les colis sont livrés par cette succursale">
          <input className={inputClass} value={form.phone || ''} onChange={set('phone')} />
        </Field>
        <Field label="Adresse">
          <input className={inputClass} value={form.address || ''} onChange={set('address')} />
        </Field>
      </form>
    </Modal>
  );
};

/** Page « Succursales » : le siège et les agences liées de la même société */
export const BranchesPage: React.FC = () => {
  const { branches, activeAgency, members, can, seesAllBranches, deleteBranch, setBranchFilter } = useWorkspace();
  const [editing, setEditing] = useState<Partial<AgencyBranch> | null>(null);
  const [deleting, setDeleting] = useState<AgencyBranch | null>(null);

  const maxBranches = activeAgency?.maxBranches ?? 0;
  const extraCount = branches.filter((b) => !b.isHeadquarters).length;
  const canAdd = can('settings', 'edit') && seesAllBranches && extraCount < maxBranches;
  const membersOf = (id: string) => members.filter((m) => m.branchId === id && m.status !== 'inactive').length;

  return (
    <>
      <PageHeader
        title="Succursales"
        subtitle="Vos agences liées (même société) partagent les clients et les colis. Chacune a ses employés et ses dépenses."
        actions={
          can('settings', 'edit') &&
          seesAllBranches && (
            <button className={btn.primary} onClick={() => setEditing({})} disabled={!canAdd} title={canAdd ? undefined : 'Nombre maximal de succursales atteint'}>
              <Plus className="w-4 h-4" /> Ajouter une succursale
            </button>
          )
        }
      />

      <div className={`p-3 rounded-lg border text-xs ${extraCount >= maxBranches ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
        <strong>
          {extraCount} / {maxBranches}
        </strong>{' '}
        succursale(s) utilisée(s) en plus du siège.{' '}
        {extraCount >= maxBranches
          ? 'Pour ajouter une succursale (Kinshasa, Angola…), contactez ASEP : elle sera activée sur votre abonnement.'
          : 'Vous pouvez encore en ajouter.'}
      </div>

      {branches.length === 0 ? (
        <EmptyState icon={Building2} title="Aucune succursale" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{b.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {[b.city, b.country].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                {b.isHeadquarters ? <Badge className="bg-[#123B70] text-white">Siège</Badge> : <Badge className="bg-slate-100 text-slate-700">Succursale</Badge>}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600 flex-1">
                {b.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {b.phone}
                  </div>
                )}
                {b.address && <div>{b.address}</div>}
                <div className="text-slate-400">{membersOf(b.id)} employé(s) rattaché(s)</div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1 flex-wrap">
                {seesAllBranches && (
                  <button className={btn.secondary} onClick={() => setBranchFilter(b.id)}>
                    Voir ses données
                  </button>
                )}
                {can('settings', 'edit') && seesAllBranches && (
                  <button className={btn.icon} onClick={() => setEditing(b)} title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {can('settings', 'edit') && seesAllBranches && !b.isHeadquarters && (
                  <button className={btn.icon} onClick={() => setDeleting(b)} title="Supprimer">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Comment ça marche</p>
        <p>• Un colis enregistré par le siège peut être <strong>envoyé vers une succursale</strong> : elle le voit arriver et met à jour son statut jusqu’à la livraison.</p>
        <p>• Dans « Personnel & Permissions », rattachez chaque employé à sa succursale : il ne verra que ses données et les colis qui lui sont envoyés.</p>
        <p>• Le siège et le propriétaire voient tout, avec le sélecteur de succursale dans le menu.</p>
      </div>

      <BranchForm branch={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer la succursale"
        text={`« ${deleting?.name} » sera supprimée. Ses employés, clients, dépenses et colis sont rattachés au siège : rien n’est perdu.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteBranch(deleting.id)}
      />
    </>
  );
};
