import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChatMessage, Conversation } from '../../types';

type Side = 'buyer' | 'agency';

/** Petite corbeille sur un message : « Supprimer pour moi » / « Supprimer pour tout le monde » */
export const MessageDeleteMenu: React.FC<{
  message: ChatMessage;
  side: Side;
  /** Le message vient de mon côté (et peut donc être supprimé pour tout le monde) */
  canDeleteForEveryone: boolean;
  align?: 'left' | 'right';
}> = ({ message, side, canDeleteForEveryone, align = 'right' }) => {
  const { deleteMessage } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const run = async (forEveryone: boolean) => {
    setBusy(true);
    await deleteMessage(message.id, side, forEveryone);
    setBusy(false);
    setOpen(false);
  };

  const item = 'w-full text-left px-3 py-2 text-[11px] font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-50';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title="Supprimer ce message"
        aria-label="Supprimer ce message"
        aria-expanded={open}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className={`absolute z-20 bottom-full mb-1 w-52 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <button type="button" className={`${item} text-slate-700`} disabled={busy} onClick={() => run(false)}>
            Supprimer pour moi
          </button>
          {canDeleteForEveryone && !message.deleted && (
            <button type="button" className={`${item} text-rose-600 border-t border-slate-100`} disabled={busy} onClick={() => run(true)}>
              Supprimer pour tout le monde
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Bouton « Effacer la discussion » (de mon côté), avec confirmation */
export const ClearConversationButton: React.FC<{ conversation: Conversation; side: Side; onCleared?: () => void }> = ({ conversation, side, onCleared }) => {
  const { clearConversation } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (conversation.messages.length === 0) return null;

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-slate-600 hidden sm:inline">Effacer toute la discussion ?</span>
        <button type="button" className="px-2 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer" onClick={() => setConfirm(false)}>
          Annuler
        </button>
        <button
          type="button"
          disabled={busy}
          className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            const ok = await clearConversation(conversation.id, side);
            setBusy(false);
            setConfirm(false);
            if (ok) onCleared?.();
          }}
        >
          Effacer
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
      title="Effacer la discussion (de votre côté)"
      aria-label="Effacer la discussion"
    >
      <Eraser className="w-4 h-4" />
    </button>
  );
};

/** Discussion effacée de ce côté et sans nouveau message : on ne l'affiche plus dans la liste */
export const isClearedFor = (c: Conversation, side: Side) =>
  c.messages.length === 0 && !!(side === 'buyer' ? c.buyerClearedAt : c.agencyClearedAt);
