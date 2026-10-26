import React, { useState } from 'react';
import { History, KeyRound, MailCheck, Pencil, Plus, Power, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { MemberInput, useWorkspace } from '../AgencyWorkspaceContext';
import { ACTIONS, clonePermissions, MODULES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../permissions';
import { AgencyMember, AgencyRole, ModuleKey, PermissionAction, PermissionMatrix } from '../types';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader, Tabs, Pagination, usePagination } from '../ui';
import { formatDate, formatDateTime } from '../utils';

const STATUS: Record<AgencyMember['status'], { label: string; cls: string }> = {
  active: { label: 'Actif', cls: 'bg-emerald-100 text-emerald-800' },
  inactive: { label: 'Désactivé', cls: 'bg-slate-100 text-slate-600' },
  invited: { label: 'Invitation envoyée', cls: 'bg-amber-100 text-amber-800' },
};

const ROLES = Object.keys(ROLE_LABELS) as AgencyRole[];

const PermissionEditor: React.FC<{ member: AgencyMember | null; onClose: () => void }> = ({ member, onClose }) => {
  const { setMemberPermissions, can, currentMember } = useWorkspace();
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  React.useEffect(() => setMatrix(member ? JSON.parse(JSON.stringify(member.permissions)) : null), [member]);
  if (!member || !matrix) return null;
  const locked = member.role === 'owner';
  const otherBranch = !!currentMember?.branchId && currentMember.role !== 'owner' && member.branchId !== currentMember.branchId;
  const readOnly = locked || otherBranch || !can('staff', 'edit') || member.id === currentMember?.id;
  // Un responsable de succursale ne peut pas donner plus de droits qu'il n'en a
  const canGrant = (module: ModuleKey, action: PermissionAction) =>
    !currentMember?.branchId || currentMember.role === 'owner' || can(module, action);

  const toggle = (module: ModuleKey, action: PermissionAction) => {
    setMatrix((m) => {
      if (!m) return m;
      const current = m[module] || [];
      let next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
      // Toute action suppose le droit de consulter ; retirer la consultation retire tout
      if (action === 'view' && !next.includes('view')) next = [];
      if (action !== 'view' && next.length && !next.includes('view')) next = ['view', ...next];
      return { ...m, [module]: next };
    });
  };

  return (
    <Modal
      open
      size="xl"
      title={`Autorisations — ${member.fullName} (${ROLE_LABELS[member.role]})`}
      onClose={onClose}
      footer={
        !readOnly && (
          <>
            <button className={`${btn.secondary} mr-auto`} onClick={() => setMatrix(clonePermissions(member.role))}>
              Rétablir les droits du rôle
            </button>
            <button className={btn.secondary} onClick={onClose}>
              Annuler
            </button>
            <button
              className={btn.primary}
              onClick={async () => {
                await setMemberPermissions(member.id, matrix);
                onClose();
              }}
            >
              Enregistrer
            </button>
          </>
        )
      }
    >
      {readOnly && (
        <p className="mb-3 p-3 bg-slate-50 rounded-lg text-slate-600">
          {locked
            ? 'Le propriétaire dispose de tous les droits ; ils ne sont pas modifiables.'
            : member.id === currentMember?.id
            ? 'Vous ne pouvez pas modifier vos propres autorisations.'
            : otherBranch
            ? 'Consultation seule : cet employé dépend d’une autre succursale.'
            : 'Consultation seule : votre rôle ne permet pas de modifier les autorisations.'}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="text-left py-2 pr-3 font-semibold">Module</th>
              {ACTIONS.map((a) => (
                <th key={a.key} className="py-2 px-2 font-semibold text-center">
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.key} className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-800">{m.label}</td>
                {ACTIONS.map((a) => (
                  <td key={a.key} className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#123B70] cursor-pointer disabled:cursor-not-allowed"
                      checked={(matrix[m.key] || []).includes(a.key)}
                      disabled={readOnly || (!(matrix[m.key] || []).includes(a.key) && !canGrant(m.key, a.key))}
                      onChange={() => toggle(m.key, a.key)}
                      aria-label={`${m.label} : ${a.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

const MemberForm: React.FC<{ open: boolean; member: AgencyMember | null; onClose: () => void }> = ({ open, member, onClose }) => {
  const { inviteMember, updateMember, currentMember, branches, branchName, seesAllBranches, defaultBranchId } = useWorkspace();
  // Un responsable de succursale invite dans sa succursale ; le siège choisit
  const empty: MemberInput = { fullName: '', email: '', phone: '', role: 'sales', branchId: seesAllBranches ? null : defaultBranchId };
  const [form, setForm] = useState<MemberInput>(empty);
  React.useEffect(() => {
    if (open)
      setForm(member ? { fullName: member.fullName, email: member.email, phone: member.phone, role: member.role, branchId: member.branchId ?? null } : empty);
  }, [open, member]); // eslint-disable-line react-hooks/exhaustive-deps

  const roles = currentMember?.role === 'owner' ? ROLES : ROLES.filter((r) => r !== 'owner');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = { ...form, fullName: form.fullName.trim() || form.email.split('@')[0] };
    const ok = member ? await updateMember(member.id, input) : await inviteMember(input);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      title={member ? `Modifier ${member.fullName}` : 'Inviter un employé'}
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Annuler
          </button>
          <button className={btn.primary} type="submit" form="member-form">
            {member ? 'Enregistrer' : 'Envoyer l’invitation'}
          </button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom complet">
            <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Facultatif" />
          </Field>
          <Field label="Email" required>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!member} />
          </Field>
          <Field label="Téléphone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Rôle" required>
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AgencyRole })} disabled={member?.role === 'owner' && currentMember?.role !== 'owner'}>
              {(member?.role === 'owner' && !roles.includes('owner') ? ROLES : roles).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {branches.length > 1 && form.role !== 'owner' && (
          <Field label="Succursale" hint="Rattaché à une succursale, l’employé ne voit que ses données et les colis qui lui sont envoyés.">
            <select
              className={inputClass}
              value={form.branchId || ''}
              onChange={(e) => setForm({ ...form, branchId: e.target.value || null })}
              disabled={!seesAllBranches}
            >
              <option value="">Toutes les succursales (siège)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {branchName(b.id)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="p-3 bg-slate-50 rounded-lg text-slate-600">{ROLE_DESCRIPTIONS[form.role]}</p>
        {!member && (
          <p className="text-[11px] text-slate-500">
            Aucun mot de passe n’est saisi ici. Avec le backend, la personne recevra un lien d’invitation pour créer elle-même son accès.
          </p>
        )}
        {member && form.role !== member.role && (
          <p className="text-[11px] text-amber-700">Changer de rôle remplace ses autorisations par celles du nouveau rôle.</p>
        )}
      </form>
    </Modal>
  );
};

export const StaffPage: React.FC = () => {
  const { members, activity, can, currentMember, updateMember, removeMember, branches, branchName } = useWorkspace();
  const [tab, setTab] = useState<'members' | 'history'>('members');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyMember | null>(null);
  const [permFor, setPermFor] = useState<AgencyMember | null>(null);
  const [removing, setRemoving] = useState<AgencyMember | null>(null);
  const [historyModule, setHistoryModule] = useState<'all' | ModuleKey>('all');

  const sorted = [...members].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  const history = activity.filter((a) => historyModule === 'all' || a.module === historyModule);
  const canManage = (m: AgencyMember) =>
    (m.role !== 'owner' || currentMember?.role === 'owner') &&
    // Un responsable de succursale ne gère que le personnel de sa succursale
    (!currentMember?.branchId || currentMember.role === 'owner' || m.branchId === currentMember.branchId);

  const membersPager = usePagination(sorted);

  const historyPager = usePagination(history);

  return (
    <>
      <PageHeader
        title="Personnel & Permissions"
        subtitle={`${members.filter((m) => m.status === 'active').length} membre(s) actif(s) · ${members.filter((m) => m.status === 'invited').length} invitation(s) en attente`}
        actions={
          can('staff', 'create') && (
            <button
              className={btn.primary}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Ajouter un employé
            </button>
          )
        }
      />

      <Tabs
        tabs={[
          { key: 'members', label: 'Employés', count: members.length },
          { key: 'history', label: 'Historique des actions', count: activity.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'members' ? (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {members.length === 0 ? (
              <EmptyState icon={UserCog} title="Aucun membre" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Employé</th>
                        <th className="p-3 font-semibold">Rôle</th>
                        {branches.length > 1 && <th className="p-3 font-semibold hidden md:table-cell">Succursale</th>}
                        <th className="p-3 font-semibold hidden md:table-cell">Depuis</th>
                        <th className="p-3 font-semibold">Statut</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {membersPager.items.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#123B70] text-white flex items-center justify-center font-bold shrink-0">
                                {m.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {m.fullName}
                                  {m.id === currentMember?.id && <span className="ml-1 text-[10px] text-slate-400">(vous)</span>}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">{ROLE_LABELS[m.role]}</td>
                          {branches.length > 1 && (
                            <td className="p-3 hidden md:table-cell text-slate-600">{m.role === 'owner' || !m.branchId ? 'Toutes' : branchName(m.branchId)}</td>
                          )}
                          <td className="p-3 hidden md:table-cell text-slate-500">{formatDate(m.joinedAt || m.invitedAt)}</td>
                          <td className="p-3">
                            <Badge className={STATUS[m.status].cls}>{STATUS[m.status].label}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <button className={btn.icon} title="Autorisations" onClick={() => setPermFor(m)}>
                                <KeyRound className="w-4 h-4" />
                              </button>
                              {can('staff', 'edit') && canManage(m) && (
                                <>
                                  <button
                                    className={btn.icon}
                                    title="Modifier"
                                    onClick={() => {
                                      setEditing(m);
                                      setFormOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {m.status === 'invited' ? (
                                    <button className={btn.icon} title="Simuler l’acceptation de l’invitation" onClick={() => updateMember(m.id, { status: 'active' })}>
                                      <MailCheck className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    m.id !== currentMember?.id && (
                                      <button
                                        className={btn.icon}
                                        title={m.status === 'active' ? 'Désactiver' : 'Activer'}
                                        onClick={() => updateMember(m.id, { status: m.status === 'active' ? 'inactive' : 'active' })}
                                      >
                                        <Power className={`w-4 h-4 ${m.status === 'active' ? '' : 'text-emerald-600'}`} />
                                      </button>
                                    )
                                  )}
                                </>
                              )}
                              {can('staff', 'delete') && canManage(m) && m.id !== currentMember?.id && (
                                <button className={btn.icon} title="Retirer de l’agence" onClick={() => setRemoving(m)}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pager={membersPager} />
              </>
            )}
          </div>

          <Card title="Rôles disponibles">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLES.map((r) => (
                <div key={r} className="p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#123B70]" /> {ROLE_LABELS[r]}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card
          title="Historique des actions"
          actions={
            <select className={`${inputClass} w-48`} value={historyModule} onChange={(e) => setHistoryModule(e.target.value as any)} aria-label="Module">
              <option value="all">Tous les modules</option>
              {MODULES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          }
        >
          {history.length === 0 ? (
            <EmptyState icon={History} title="Aucune action enregistrée" />
          ) : (
            <>
              <ol className="divide-y divide-slate-100">
                {historyPager.items.map((a) => (
                  <li key={a.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs">
                    <span className="text-[11px] text-slate-400 sm:w-36 shrink-0">{formatDateTime(a.createdAt)}</span>
                    <span className="text-slate-700">
                      <span className="font-semibold text-slate-900">{a.actorName}</span> {a.description}
                    </span>
                    <Badge className="bg-slate-100 text-slate-600 sm:ml-auto self-start sm:self-auto">{MODULES.find((m) => m.key === a.module)?.label}</Badge>
                  </li>
                ))}
              </ol>
              <Pagination pager={historyPager} />
            </>
          )}
          <p className="mt-4 text-[11px] text-slate-400">
            Journal enregistré localement pour la démonstration. En production, il sera écrit côté serveur et non modifiable.
          </p>
        </Card>
      )}

      <MemberForm open={formOpen} member={editing} onClose={() => setFormOpen(false)} />
      <PermissionEditor member={permFor} onClose={() => setPermFor(null)} />
      <ConfirmDialog
        open={!!removing}
        title="Retirer le membre"
        text={`${removing?.fullName} n’aura plus accès à l’agence.`}
        confirmLabel="Retirer"
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMember(removing.id)}
      />
    </>
  );
};
