import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Handshake, MessageSquare, Package, ShieldCheck, ShoppingCart, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { errorMessage, supabase } from '../../lib/supabase';
import { Pagination, usePagination } from '../../agency/ui';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, React.ElementType> = {
  order: ShoppingCart,
  rfq: ShoppingCart,
  message: MessageSquare,
  shipment: Package,
  partner: Handshake,
  verification: ShieldCheck,
  admin: ShieldCheck,
};

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const fromRow = (r: any): AppNotification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body,
  link: r.link,
  readAt: r.read_at,
  createdAt: r.created_at,
});

/** Cloche de notifications : lire, ouvrir, supprimer une notification ou tout effacer */
export const NotificationBell: React.FC = () => {
  const { profile, addToast } = useApp();
  const navigate = useNavigate();
  const userId = profile?.id;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pager = usePagination(items);
  const unread = items.filter((n) => !n.readAt).length;

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error) setItems((data || []).map(fromRow));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    load();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Fermer en cliquant à l'extérieur ou avec Échap
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);

  const run = async (fn: () => PromiseLike<{ error: any }>, optimistic: (list: AppNotification[]) => AppNotification[]) => {
    const before = items;
    setItems(optimistic(items));
    const { error } = await fn();
    if (error) {
      setItems(before);
      addToast(errorMessage(error), 'error');
    }
  };

  const markRead = (n: AppNotification) =>
    !n.readAt &&
    run(
      () => supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id),
      (list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    );

  const markAllRead = () =>
    run(
      () => supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId!).is('read_at', null),
      (list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() }))
    );

  const remove = (n: AppNotification) =>
    run(
      () => supabase.from('notifications').delete().eq('id', n.id),
      (list) => list.filter((x) => x.id !== n.id)
    );

  const clearAll = async () => {
    await run(
      () => supabase.from('notifications').delete().eq('user_id', userId!),
      () => []
    );
    setConfirmClear(false);
  };

  const openItem = (n: AppNotification) => {
    markRead(n);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-700 hover:text-[#123B70] hover:bg-slate-100 rounded-lg transition-colors flex flex-col items-center cursor-pointer"
        title="Notifications"
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        <span className="text-[10px] hidden sm:inline font-medium">Notifications</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-900">
              Notifications {unread > 0 && <span className="text-[11px] font-semibold text-rose-600">· {unread} non lue(s)</span>}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-[#123B70] hover:bg-slate-100 cursor-pointer" title="Tout marquer comme lu" onClick={markAllRead}>
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {items.length > 0 && (
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Tout effacer" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer" title="Fermer" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {confirmClear && (
            <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 text-xs text-rose-900 flex items-center gap-2">
              <span className="flex-1">Supprimer définitivement les {items.length} notification(s) ?</span>
              <button className="px-2.5 py-1 rounded-md bg-white border border-rose-200 font-semibold cursor-pointer" onClick={() => setConfirmClear(false)}>
                Annuler
              </button>
              <button className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer" onClick={clearAll}>
                Tout effacer
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Aucune notification pour le moment.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {pager.items.map((n) => {
                  const Icon = ICONS[n.type] || Bell;
                  return (
                    <li key={n.id} className={`group flex items-start gap-3 px-4 py-3 ${n.readAt ? 'bg-white' : 'bg-blue-50/60'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.readAt ? 'bg-slate-100 text-slate-500' : 'bg-[#123B70] text-white'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <button className="flex-1 min-w-0 text-left cursor-pointer" onClick={() => openItem(n)}>
                        <div className={`text-xs leading-snug ${n.readAt ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</div>
                        {n.body && <div className="text-[11px] text-slate-500 line-clamp-2">{n.body}</div>}
                        <div className="text-[10px] text-slate-400 mt-0.5">{ago(n.createdAt)}</div>
                      </button>
                      <button
                        className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                        title="Supprimer cette notification"
                        aria-label={`Supprimer la notification « ${n.title} »`}
                        onClick={() => remove(n)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Pagination pager={pager} />
            </>
          )}
        </div>
      )}
    </div>
  );
};
