-- =====================================================================
-- Suppression des messages
-- - « Supprimer pour moi » : n'importe quel message, masqué de mon côté seulement
-- - « Supprimer pour tout le monde » : mes propres messages (ou ceux de l'agence
--   pour un membre ayant le droit « Conversations → Supprimer ») ; le contenu est
--   effacé et remplacé par « Ce message a été supprimé »
-- - « Effacer la discussion » : vide la conversation de mon côté ; elle réapparaît
--   avec les nouveaux messages
-- =====================================================================

alter table public.messages
  add column if not exists deleted_at timestamptz,
  add column if not exists hidden_for_buyer boolean not null default false,
  add column if not exists hidden_for_agency boolean not null default false;

alter table public.conversations
  add column if not exists buyer_cleared_at timestamptz,
  add column if not exists agency_cleared_at timestamptz;

-- Chaque côté ne voit que les messages qu'il n'a pas supprimés ou effacés
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (exists (
    select 1 from public.conversations c
     where c.id = conversation_id
       and (
         (c.buyer_id = auth.uid() and not hidden_for_buyer and (c.buyer_cleared_at is null or created_at > c.buyer_cleared_at))
         or (public.has_agency_permission(c.agency_id, 'conversations', 'view') and not hidden_for_agency
             and (c.agency_cleared_at is null or created_at > c.agency_cleared_at))
       )
  ));

-- Vérifie que l'utilisateur peut agir pour ce côté de la conversation
create or replace function public.conversation_side_allowed(c conversations, p_side text)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_side
    when 'buyer' then c.buyer_id = auth.uid()
    when 'agency' then public.has_agency_permission(c.agency_id, 'conversations', 'view')
    else false
  end;
$$;

-- Aperçu de la conversation après une suppression pour tout le monde
create or replace function public.refresh_conversation_preview(p_conversation uuid)
returns void language sql security definer set search_path = public as $$
  update conversations c
     set last_message = coalesce((
       select case when m.deleted_at is not null then 'Message supprimé'
                   else coalesce(nullif(m.text, ''), m.attachment ->> 'title', 'Pièce jointe') end
         from messages m where m.conversation_id = c.id
        order by m.created_at desc limit 1), '')
   where c.id = p_conversation;
$$;

create or replace function public.delete_message(p_message uuid, p_side text, p_for_everyone boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  m messages%rowtype;
  c conversations%rowtype;
begin
  select * into m from messages where id = p_message;
  if found then
    select * into c from conversations where id = m.conversation_id;
  end if;
  if not found or not conversation_side_allowed(c, p_side) then
    raise exception 'Message introuvable';
  end if;

  if p_for_everyone then
    if not (m.sender_id = auth.uid()
            or (p_side = 'agency' and m.sender = 'agency' and has_agency_permission(c.agency_id, 'conversations', 'delete'))) then
      raise exception 'Vous ne pouvez supprimer pour tout le monde que vos propres messages';
    end if;
    if m.sender <> p_side then
      raise exception 'Vous ne pouvez supprimer pour tout le monde que vos propres messages';
    end if;
    update messages set text = '', attachment = null, deleted_at = now() where id = p_message;
    perform refresh_conversation_preview(c.id);
  elsif p_side = 'buyer' then
    update messages set hidden_for_buyer = true where id = p_message;
  else
    update messages set hidden_for_agency = true where id = p_message;
  end if;
end;
$$;

create or replace function public.clear_conversation(p_conversation uuid, p_side text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c conversations%rowtype;
begin
  select * into c from conversations where id = p_conversation;
  if not found or not conversation_side_allowed(c, p_side) then
    raise exception 'Conversation introuvable';
  end if;
  if p_side = 'buyer' then
    update conversations set buyer_cleared_at = now() where id = p_conversation;
  else
    update conversations set agency_cleared_at = now() where id = p_conversation;
  end if;
end;
$$;

revoke execute on function public.conversation_side_allowed(conversations, text) from public, anon, authenticated;
revoke execute on function public.refresh_conversation_preview(uuid) from public, anon, authenticated;
revoke execute on function public.delete_message(uuid, text, boolean) from public, anon;
revoke execute on function public.clear_conversation(uuid, text) from public, anon;
grant execute on function public.delete_message(uuid, text, boolean) to authenticated;
grant execute on function public.clear_conversation(uuid, text) to authenticated;
