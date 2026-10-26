import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Handshake, MapPin, Phone, Unlink, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage } from '../../lib/supabase';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { endPartnership, listPartnerships, Partnership, requestPartnership, respondPartnership } from '../services/partnerService';
import { Badge, btn, Card, ConfirmDialog, EmptyState, Field, inputClass, PageHeader, Pagination, usePagination } from '../ui';
import { formatDate } from '../utils';
import { AgencyLogo } from '../../components/common/AgencyImages';

/** Liste des partenaires acceptés de l'agence active (utilisée dans les formulaires de colis) */
export const useAcceptedPartners = () => {
  const { activeAgencyId } = useWorkspace();
  const [partners, setPartners] = useState<Partnership[]>([]);
  useEffect(() => {
    if (!activeAgencyId) return;
    listPartnerships(activeAgencyId)
      .then((rows) => setPartners(rows.filter((p) => p.status === 'accepted')))
      .catch(() => setPartners([]));
  }, [activeAgencyId]);
  return partners;
};

/** Page « Partenaires » : agences indépendantes avec qui on échange des colis */
export const PartnersPage: React.FC = () => {
  const { addToast } = useApp();
  const { activeAgency, activeAgencyId, can, logActivity } = useWorkspace();
  const [rows, setRows] = useState<Partnership[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState<Partnership | null>(null);
  const canEdit = can('settings', 'edit');
  const myCode = activeAgency?.partnerCode || '';

  const load = useCallback(async () => {
    if (!activeAgencyId) return;
    try {
      setRows(await listPartnerships(activeAgencyId));
    } catch (e) {
      addToast(errorMessage(e), 'error');
    }
  }, [activeAgencyId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      addToast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgencyId || !code.trim()) return;
    run(async () => {
      const name = await requestPartnership(activeAgencyId, code.trim());
      await logActivity('settings', `a envoyé une demande de partenariat à ${name}`);
      addToast(`Demande envoyée à « ${name} ». Elle doit l’accepter dans son espace.`, 'success');
      setCode('');
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      addToast('Code partenaire copié.', 'success');
    } catch {
      addToast('Copie impossible : notez le code manuellement.', 'error');
    }
  };

  const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'incoming');
  const outgoing = rows.filter((r) => r.status === 'pending' && r.direction === 'outgoing');
  const accepted = rows.filter((r) => r.status === 'accepted');

  const AgencyLine: React.FC<{ p: Partnership }> = ({ p }) => (
    <div className="flex items-center gap-3 min-w-0">
      <AgencyLogo src={p.agencyLogo} name={p.agencyName} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 truncate">{p.agencyName}</div>
        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {[p.agencyCity, p.agencyCountry].filter(Boolean).join(', ')}
          </span>
          {p.agencyPhone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" /> {p.agencyPhone}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const pager = usePagination(accepted);

  return (
    <>
      <PageHeader
        title="Agences partenaires"
        subtitle="Travaillez avec des agences indépendantes (autre société) : confiez-leur des colis à livrer, elles mettent à jour le suivi."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Votre code partenaire">
          <p className="text-xs text-slate-600">Communiquez ce code à l’agence avec laquelle vous voulez travailler. Elle l’utilisera pour vous envoyer une demande.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-4 py-2 rounded-lg bg-slate-100 font-mono text-lg font-bold tracking-widest text-slate-900">{myCode || '—'}</span>
            {myCode && (
              <button className={btn.secondary} onClick={copyCode}>
                <Copy className="w-4 h-4" /> Copier
              </button>
            )}
          </div>
        </Card>

        <Card title="Ajouter un partenaire">
          {canEdit ? (
            <form onSubmit={sendRequest} className="space-y-3 text-xs">
              <Field label="Code partenaire de l’autre agence" hint="8 caractères, visible dans sa page « Partenaires »">
                <input className={`${inputClass} font-mono uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="EX. 17EE971A" />
              </Field>
              <button className={btn.primary} disabled={busy || code.trim().length < 8}>
                <Handshake className="w-4 h-4" /> Envoyer la demande
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">Votre rôle ne permet pas de gérer les partenariats.</p>
          )}
        </Card>
      </div>

      {incoming.length > 0 && (
        <Card title={`Demandes reçues (${incoming.length})`}>
          <ul className="divide-y divide-slate-100">
            {incoming.map((p) => (
              <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <AgencyLine p={p} />
                <span className="text-[11px] text-slate-400 sm:ml-auto">reçue le {formatDate(p.createdAt)}</span>
                {canEdit && (
                  <div className="flex gap-1">
                    <button
                      className={btn.primary}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await respondPartnership(p.id, true);
                          await logActivity('settings', `a accepté le partenariat avec ${p.agencyName}`);
                          addToast(`Partenariat avec « ${p.agencyName} » accepté.`, 'success');
                        })
                      }
                    >
                      <Check className="w-4 h-4" /> Accepter
                    </button>
                    <button
                      className={btn.secondary}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await respondPartnership(p.id, false);
                          addToast('Demande refusée.', 'info');
                        })
                      }
                    >
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={`Partenaires (${accepted.length})`}>
        {accepted.length === 0 ? (
          <EmptyState icon={Handshake} title="Aucun partenaire" text="Envoyez une demande avec le code partenaire d’une autre agence, ou partagez le vôtre." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {pager.items.map((p) => (
                <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <AgencyLine p={p} />
                  <Badge className="bg-emerald-100 text-emerald-800 sm:ml-auto self-start sm:self-auto">Partenaire depuis le {formatDate(p.respondedAt || p.createdAt)}</Badge>
                  {canEdit && (
                    <button className={btn.icon} title="Mettre fin au partenariat" onClick={() => setEnding(p)}>
                      <Unlink className="w-4 h-4 text-rose-600" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <Pagination pager={pager} />
          </>
        )}
      </Card>

      {outgoing.length > 0 && (
        <Card title={`Demandes envoyées en attente (${outgoing.length})`}>
          <ul className="divide-y divide-slate-100">
            {outgoing.map((p) => (
              <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <AgencyLine p={p} />
                <Badge className="bg-amber-100 text-amber-800 sm:ml-auto self-start sm:self-auto">En attente de réponse</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Comment ça marche</p>
        <p>• Une fois le partenariat accepté, choisissez le partenaire en enregistrant (ou modifiant) un colis : « Confier à une agence partenaire ».</p>
        <p>• Le partenaire voit le colis dans « Gestion colis → Colis reçus de partenaires » et met à jour son statut jusqu’à la livraison.</p>
        <p>• Il ne voit ni vos prix, ni vos paiements, ni les coordonnées de vos clients. Chaque agence garde son abonnement et ses données.</p>
      </div>

      <ConfirmDialog
        open={!!ending}
        title="Mettre fin au partenariat"
        text={`Vous ne pourrez plus confier de colis à « ${ending?.agencyName} ». Les colis déjà confiés reviennent sous votre seule gestion.`}
        confirmLabel="Mettre fin"
        onClose={() => setEnding(null)}
        onConfirm={() =>
          ending &&
          run(async () => {
            await endPartnership(ending.id);
            await logActivity('settings', `a mis fin au partenariat avec ${ending.agencyName}`);
            addToast('Partenariat terminé.', 'info');
          })
        }
      />
    </>
  );
};
