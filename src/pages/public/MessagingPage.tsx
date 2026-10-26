import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  MessageSquare,
  MapPin,
  ArrowLeft,
  ShieldCheck,
  CheckCheck,
  Languages,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClearConversationButton, isClearedFor, MessageDeleteMenu } from '../../components/common/MessageDeleteMenu';
import { useBuyerPhones, WhatsAppChatButton } from '../../components/common/WhatsAppChatButton';
import { AgencyLogo } from '../../components/common/AgencyImages';

// Traductions manuelles des messages (indexées par id de message)
const MESSAGE_TRANSLATIONS: Record<string, { zh: string; en: string; fr: string }> = {};

/** Membre d'agence dans Messages : WhatsApp vers le client */
const AgencySideWhatsApp: React.FC<{ agencyId: string; buyerId: string; buyerName: string; agencyName: string }> = ({ agencyId, buyerId, buyerName, agencyName }) => {
  const phones = useBuyerPhones(agencyId);
  return <WhatsAppChatButton phone={phones[buyerId]} title={`Écrire à ${buyerName} sur WhatsApp`} message={`Bonjour ${buyerName}, c’est ${agencyName}. `} />;
};

export const MessagingPage: React.FC = () => {
  const {
    conversations: allConversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    currentUser,
    language,
    t,
    agencies,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [manuallyTranslatedMsgIds, setManuallyTranslatedMsgIds] = useState<Record<string, boolean>>({});

  // Mon côté de chaque conversation ; les discussions effacées (sans nouveau message) ne sont plus listées
  const sideOf = (c: { buyerId: string }) => (c.buyerId === currentUser.id ? 'buyer' : 'agency') as 'buyer' | 'agency';
  const conversations = allConversations.filter((c) => !isClearedFor(c, sideOf(c)));
  const activeConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleSelectConv = (id: string) => {
    setActiveConversationId(id);
    setMobileView('chat');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;
    sendMessage(activeConv.id, inputText);
    setInputText('');
  };

  const handleQuickPrompt = (promptKey: 'promptBestPrice' | 'promptSeaFreight' | 'promptSample' | 'promptFeri') => {
    if (!activeConv) return;
    const textToSend = t[promptKey];
    sendMessage(activeConv.id, textToSend);
  };

  const toggleTranslateMessage = (msgId: string) => {
    setManuallyTranslatedMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Helper to get translated or original text
  const getRenderedMessageText = (msg: { id: string; text: string }) => {
    const isManuallyToggled = manuallyTranslatedMsgIds[msg.id];
    const shouldTranslate = autoTranslate ? isManuallyToggled !== false : isManuallyToggled === true;

    if (!shouldTranslate) {
      return { text: msg.text, isTranslated: false };
    }

    const dict = MESSAGE_TRANSLATIONS[msg.id];
    if (dict && dict[language]) {
      return { text: dict[language], isTranslated: dict[language] !== msg.text };
    }

    // Default simulation translation if dynamic message
    if (language === 'zh') {
      return { text: `[翻译] ${msg.text} (中刚双语智能转译已完成)`, isTranslated: true };
    } else if (language === 'en') {
      return { text: `[Translated] ${msg.text} (Auto-translated to English)`, isTranslated: true };
    }

    return { text: msg.text, isTranslated: false };
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 h-[calc(100dvh-130px)] sm:h-[calc(100vh-140px)] min-h-[480px] flex flex-col">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-blue-50 text-[#123B70] rounded-xl shadow-xs shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#123B70]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                {t.tradeChatTitle}
              </h1>
              <span className="px-2 py-0.2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                ASEP B2B
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {t.tradeChatSub}
            </p>
          </div>
        </div>

        {/* Translation active pill in chat header */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer border ${
              autoTranslate
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Activer/Désactiver la traduction instantanée des messages"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{t.autoTranslateToggle}</span>
            {autoTranslate ? (
              <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
            )}
          </button>

          <div className="text-xs text-slate-500 hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[11px] font-medium">{t.tradeChatOnline}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split Interface */}
      <div className="flex-1 min-h-0 mt-2 sm:mt-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex">
        {/* LEFT COLUMN: Conversation List */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.activeDiscussions} ({conversations.length})
            </div>
            <span className="text-[10px] text-slate-400 font-medium">B2B Live</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConv?.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-white cursor-pointer ${
                    isActive ? 'bg-white border-l-4 border-[#123B70] shadow-xs' : ''
                  }`}
                >
                  <AgencyLogo
                    src={agencies.find((a) => a.id === conv.agencyId)?.logo || conv.agencyAvatar}
                    name={conv.agencyName}
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`truncate font-bold ${
                          isActive ? 'text-[#123B70]' : 'text-slate-900'
                        }`}
                      >
                        {conv.agencyName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                      <MapPin className="w-3 h-3 text-[#FF8A00] shrink-0" />
                      <span>{conv.agencyCity}</span>
                      {conv.productName && (
                        <>
                          <span>·</span>
                          <span className="truncate text-slate-600 font-medium">{conv.productName}</span>
                        </>
                      )}
                    </div>

                    <p className="text-slate-500 line-clamp-1 leading-snug">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT COLUMN: Chat Area */}
        <main
          className={`flex-1 flex flex-col bg-white ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                    aria-label="Retour"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <AgencyLogo
                    src={agencies.find((a) => a.id === activeConv.agencyId)?.logo || activeConv.agencyAvatar}
                    name={activeConv.agencyName}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {activeConv.agencyName}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#FF8A00]" />
                        {activeConv.agencyCity}, Chine
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium">{t.usuallyReplies}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {sideOf(activeConv) === 'buyer' ? (
                    <WhatsAppChatButton
                      phone={agencies.find((a) => a.id === activeConv.agencyId)?.phoneWeChat}
                      title={`Écrire à ${activeConv.agencyName} sur WhatsApp`}
                      message={`Bonjour ${activeConv.agencyName}, je vous contacte depuis ASEP MARKET${activeConv.productName ? ` au sujet de « ${activeConv.productName} »` : ''}. `}
                    />
                  ) : (
                    <AgencySideWhatsApp agencyId={activeConv.agencyId} buyerId={activeConv.buyerId} buyerName={activeConv.buyerName} agencyName={activeConv.agencyName} />
                  )}
                  <ClearConversationButton conversation={activeConv} side={sideOf(activeConv)} onCleared={() => setMobileView('list')} />
                  <Link
                    to={`/catalog?agency=${activeConv.agencyId}`}
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {t.viewStore}
                  </Link>
                </div>
              </div>

              {/* Product Reference Bar */}
              {activeConv.productName && (
                <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeConv.productImage && (
                      <img
                        src={activeConv.productImage}
                        alt={activeConv.productName}
                        className="w-8 h-8 rounded object-cover border border-blue-200 shrink-0"
                      />
                    )}
                    <span className="font-semibold text-blue-950 truncate">
                      {t.productSubject} : {activeConv.productName}
                    </span>
                    {activeConv.productPrice && (
                      <span className="font-mono font-bold text-[#123B70] shrink-0">
                        (${activeConv.productPrice} USD)
                      </span>
                    )}
                  </div>
                  {activeConv.productId && (
                    <Link
                      to={`/product/${activeConv.productId}`}
                      className="text-[#123B70] font-semibold hover:underline shrink-0 text-[11px]"
                    >
                      {t.viewProductPage}
                    </Link>
                  )}
                </div>
              )}

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {activeConv.messages.map((msg) => {
                  // L'acheteur de la conversation voit ses messages à droite ; les membres de l'agence, ceux de l'agence
                  const isMe = activeConv.buyerId === currentUser.id ? msg.sender === 'buyer' : msg.sender === 'agency';

                  const rendered = getRenderedMessageText(msg);
                  const displayText = msg.deleted ? 'Ce message a été supprimé' : rendered.text;
                  const isTranslated = !msg.deleted && rendered.isTranslated;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                    >
                      <div
                        className={`max-w-md lg:max-w-lg rounded-2xl p-3.5 text-xs shadow-xs leading-relaxed transition-all ${
                          isMe
                            ? 'bg-[#123B70] text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {/* If message has an attachment */}
                        {msg.attachment && !msg.deleted && (
                          <div
                            className={`mb-2 p-2.5 rounded-lg border text-[11px] ${
                              isMe
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {msg.attachment.image && (
                                <img
                                  src={msg.attachment.image}
                                  alt=""
                                  className="w-10 h-10 object-cover rounded shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold truncate">{msg.attachment.title}</div>
                                {msg.attachment.price && (
                                  <div className="font-mono font-bold">
                                    ${msg.attachment.price} USD
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Translation status badge */}
                        {isTranslated && (
                          <div
                            className={`flex items-center gap-1 text-[10px] font-semibold mb-1.5 pb-1 border-b ${
                              isMe
                                ? 'text-amber-200 border-white/15'
                                : 'text-emerald-700 border-slate-100'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{t.translatedBadge}</span>
                          </div>
                        )}

                        <div className={`whitespace-pre-wrap ${msg.deleted ? 'italic opacity-70' : ''}`}>{displayText}</div>
                      </div>

                      {/* Footer under bubble: Timestamp, checkmark, and TRANSLATION BUTTON */}
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 px-1">
                        <span>{msg.timestamp}</span>
                        {isMe && <CheckCheck className="w-3 h-3 text-blue-600" />}

                        <MessageDeleteMenu
                          message={msg}
                          side={sideOf(activeConv)}
                          align={isMe ? 'right' : 'left'}
                          canDeleteForEveryone={isMe && msg.senderId === currentUser.id}
                        />

                        {/* Direct Translation Toggle Button on each message */}
                        {!msg.deleted && (
                          <button
                            type="button"
                            onClick={() => toggleTranslateMessage(msg.id)}
                            className="text-[#123B70] hover:text-[#FF8A00] font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                            title="Traduire / Afficher l'original"
                          >
                            <Languages className="w-3 h-3" />
                            <span>{isTranslated ? t.seeOriginal : t.translateAction}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Inquiry Prompts */}
              <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                  {t.quickPromptsTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('promptBestPrice')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t.promptBestPrice}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('promptSeaFreight')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t.promptSeaFreight}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('promptSample')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t.promptSample}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('promptFeri')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t.promptFeri}
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={t.typeMessagePlaceholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="py-2.5 px-4 bg-[#FF8A00] hover:bg-[#e57c00] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  aria-label="Envoyer"
                >
                  <span>{t.sendAction}</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              {t.selectDiscussionToStart}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
