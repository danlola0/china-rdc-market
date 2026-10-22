-- =====================================================================
-- Catalogue plus rapide :
-- 1. Les photos d'articles sont stockées dans Supabase Storage (bucket public « product-images »)
--    au lieu d'être enregistrées en texte dans chaque ligne d'article.
-- 2. Le catalogue est mis à jour en temps réel (nouvel article, modification, validation d'agence).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Chemin des fichiers : <agency_id>/<fichier>. Lecture publique (bucket public), écriture par l'agence.
create policy product_images_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (
      public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'products', 'create')
      or public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'products', 'edit')
    )
  );
create policy product_images_update on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'products', 'edit')
  );
create policy product_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'products', 'delete')
  );

-- Temps réel sur le catalogue
alter publication supabase_realtime add table public.products, public.agencies;
