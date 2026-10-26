-- Correctif : la date comparée doit être celle du message (et non celle de la conversation)
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (exists (
    select 1 from public.conversations c
     where c.id = messages.conversation_id
       and (
         (c.buyer_id = auth.uid() and not messages.hidden_for_buyer
          and (c.buyer_cleared_at is null or messages.created_at > c.buyer_cleared_at))
         or (public.has_agency_permission(c.agency_id, 'conversations', 'view') and not messages.hidden_for_agency
             and (c.agency_cleared_at is null or messages.created_at > c.agency_cleared_at))
       )
  ));
