import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { whatsappUrl } from '../../agency/utils';

/** Bouton vert « WhatsApp » : ouvre la discussion WhatsApp avec un message déjà rédigé */
export const WhatsAppChatButton: React.FC<{ phone?: string; message: string; title: string }> = ({ phone, message, title }) =>
  phone ? (
    <a
      href={whatsappUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold shrink-0"
      title={title}
      aria-label={title}
    >
      <MessageCircle className="w-4 h-4" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  ) : null;

/** Numéros des clients d'une agence (compte acheteur, devis, conversations) */
export const useBuyerPhones = (agencyId: string | null | undefined) => {
  const [phones, setPhones] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!agencyId) return;
    supabase.rpc('agency_buyer_phones', { p_agency: agencyId }).then(({ data }) => setPhones((data as Record<string, string>) || {}));
  }, [agencyId]);
  return phones;
};
