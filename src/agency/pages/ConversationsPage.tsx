import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { btn, EmptyState, inputClass, PageHeader } from '../ui';
import { ClearConversationButton, isClearedFor, MessageDeleteMenu } from '../../components/common/MessageDeleteMenu';
import { useBuyerPhones, WhatsAppChatButton } from '../../components/common/WhatsAppChatButton';

export const ConversationsPage: React.FC = () => {
  const { sendMessage, currentUser } = useApp();
  const { conversations: allConversations, can, logActivity, activeAgencyId, activeAgency } = useWorkspace();
  const buyerPhones = useBuyerPhones(activeAgencyId);
  // Les discussions effacées de notre côté (sans nouveau message) ne sont plus listées
  const conversations = allConversations.filter((c) => !isClearedFor(c, 'agency'));
  const [params] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(params.get('c'));
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [active?.messages.length, activeId]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    sendMessage(active.id, text.trim(), undefined, 'agency');
    if (active.messages.filter((m) => m.sender === 'agency').length === 0) {
      logActivity('conversations', `a répondu à ${active.buyerName}`);
    }
    setText('');
  };

  return (
    <>
      <PageHeader title="Conversations" subtitle="Messages échangés avec les acheteurs de la marketplace" />

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={MessageSquare} title="Aucune conversation" text="Les acheteurs peuvent vous écrire depuis la fiche d’un de vos articles." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid md:grid-cols-3 min-h-[480px]">
          <ul className={`border-r border-slate-100 divide-y divide-slate-100 ${active ? 'hidden md:block' : ''}`}>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer ${c.id === activeId ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">{c.buyerName}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{c.lastMessageTime}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{c.buyerCity}{c.productName ? ` · ${c.productName}` : ''}</div>
                  <div className="text-[11px] text-slate-600 truncate mt-0.5">{c.lastMessage}</div>
                </button>
              </li>
            ))}
          </ul>

          <div className={`md:col-span-2 flex flex-col ${active ? '' : 'hidden md:flex'}`}>
            {active ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <button className={`${btn.icon} md:hidden`} onClick={() => setActiveId(null)} aria-label="Retour">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{active.buyerName}</div>
                    <div className="text-[11px] text-slate-400">{active.productName || active.buyerCity}</div>
                  </div>
                  <WhatsAppChatButton
                    phone={buyerPhones[active.buyerId]}
                    title={`Écrire à ${active.buyerName} sur WhatsApp`}
                    message={`Bonjour ${active.buyerName}, c’est ${activeAgency?.name || 'votre fournisseur'}${active.productName ? ` au sujet de « ${active.productName} »` : ''}. `}
                  />
                  <ClearConversationButton conversation={active} side="agency" onCleared={() => setActiveId(null)} />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 max-h-[420px]">
                  {active.messages.map((m) => (
                    <div key={m.id} className={`group flex items-end gap-1 ${m.sender === 'agency' ? 'justify-end' : 'justify-start'}`}>
                      <div className={m.sender === 'agency' ? 'order-first' : 'order-last'}>
                        <MessageDeleteMenu
                          message={m}
                          side="agency"
                          align={m.sender === 'agency' ? 'right' : 'left'}
                          canDeleteForEveryone={m.sender === 'agency' && (m.senderId === currentUser.id || can('conversations', 'delete'))}
                        />
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                          m.sender === 'agency' ? 'bg-[#123B70] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                        }`}
                      >
                        {m.deleted ? (
                          <p className="italic opacity-70">Ce message a été supprimé</p>
                        ) : (
                          <p className="whitespace-pre-line">{m.text}</p>
                        )}
                        <p className={`mt-1 text-[10px] ${m.sender === 'agency' ? 'text-blue-200' : 'text-slate-400'}`}>{m.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                {can('conversations', 'create') ? (
                  <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2">
                    <input className={inputClass} placeholder="Votre réponse…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
                    <button className={btn.primary} disabled={!text.trim()} aria-label="Envoyer">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <p className="p-3 border-t border-slate-100 text-[11px] text-slate-500">Lecture seule : votre rôle ne permet pas de répondre.</p>
                )}
              </>
            ) : (
              <EmptyState icon={MessageSquare} title="Sélectionnez une conversation" />
            )}
          </div>
        </div>
      )}
    </>
  );
};
