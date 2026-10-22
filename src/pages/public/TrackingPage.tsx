import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, MessageCircle, Package, Plane, Ship } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ShipmentMode, ShipmentStatus } from '../../agency/types';
import { SHIPMENT_MODE_LABELS, SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_ORDER, whatsappUrl } from '../../agency/utils';

interface PublicTracking {
  trackingRef: string;
  description: string;
  mode: ShipmentMode;
  originCity: string;
  destinationCity: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  customerFirstName: string;
  agencyName: string;
  agencyPhone: string;
  agencyLogo: string;
  events: { status: ShipmentStatus; note: string; createdAt: string }[];
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Page publique de suivi d'un colis : /suivi/<jeton> (aucun compte nécessaire) */
export const TrackingPage: React.FC = () => {
  const { token } = useParams();
  const [data, setData] = useState<PublicTracking | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    const valid = /^[0-9a-f-]{36}$/i.test(token || '');
    if (!valid) {
      setState('notfound');
      return;
    }
    supabase.rpc('public_track_shipment', { p_token: token }).then(({ data: res, error }) => {
      if (error || !res) setState('notfound');
      else {
        setData(res as PublicTracking);
        setState('ok');
      }
    });
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500" role="status">
        Chargement du suivi…
      </div>
    );
  }

  if (state === 'notfound' || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Package className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Colis introuvable</h1>
        <p className="mt-1 text-sm text-slate-500">Ce lien de suivi n’est pas valide ou le colis a été supprimé. Contactez votre agence.</p>
      </div>
    );
  }

  const reached = SHIPMENT_STATUS_ORDER.indexOf(data.status);
  const eventFor = (s: ShipmentStatus) => [...data.events].reverse().find((e) => e.status === s);
  const ModeIcon = data.mode === 'air' ? Plane : Ship;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {data.agencyLogo && <img src={data.agencyLogo} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />}
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Suivi de colis · {data.agencyName}</p>
            <h1 className="text-lg font-extrabold text-slate-900 font-mono">{data.trackingRef}</h1>
          </div>
        </div>
        {data.customerFirstName && <p className="mt-4 text-sm text-slate-700">Bonjour {data.customerFirstName}, voici l’avancement de votre colis.</p>}

        <div className="mt-4 p-4 rounded-xl bg-[#123B70] text-white">
          <p className="text-xs text-blue-200">Statut actuel</p>
          <p className="text-xl font-extrabold">{SHIPMENT_STATUS_LABELS[data.status]}</p>
          <p className="mt-1 text-xs text-blue-100">Dernière mise à jour : {dateTime(data.updatedAt)}</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Contenu</dt>
            <dd className="font-semibold text-slate-900">{data.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Transport</dt>
            <dd className="font-semibold text-slate-900 inline-flex items-center gap-1">
              <ModeIcon className="w-4 h-4" /> {SHIPMENT_MODE_LABELS[data.mode]}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Trajet</dt>
            <dd className="font-semibold text-slate-900">
              {data.originCity} (Chine) → {data.destinationCity} (RDC)
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Étapes du voyage</h2>
        <ol className="space-y-0">
          {SHIPMENT_STATUS_ORDER.map((s, i) => {
            const done = i <= reached;
            const ev = eventFor(s);
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {done ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <Circle className="w-6 h-6 text-slate-300 shrink-0" />}
                  {i < SHIPMENT_STATUS_ORDER.length - 1 && <span className={`w-0.5 flex-1 min-h-6 ${i < reached ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
                <div className="pb-5">
                  <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{SHIPMENT_STATUS_LABELS[s]}</p>
                  {ev && (
                    <>
                      <p className="text-xs text-slate-500">{dateTime(ev.createdAt)}</p>
                      {ev.note && ev.note !== SHIPMENT_STATUS_LABELS[s] && <p className="text-xs text-slate-700 mt-0.5">{ev.note}</p>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {data.agencyPhone && (
        <a
          href={whatsappUrl(data.agencyPhone, `Bonjour ${data.agencyName}, je vous contacte au sujet de mon colis ${data.trackingRef}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-semibold"
        >
          <MessageCircle className="w-5 h-5" /> Contacter {data.agencyName} sur WhatsApp
        </a>
      )}
    </div>
  );
};
