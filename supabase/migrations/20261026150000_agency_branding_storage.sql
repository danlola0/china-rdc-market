-- Logo et photo de couverture des agences : stockés comme des images (bucket public « product-images »,
-- dossier <agency_id>/) au lieu d'être enregistrés en texte dans la fiche de l'agence.
-- Les membres qui gèrent les Paramètres de l'agence peuvent y déposer ces images.
create policy agency_branding_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.has_agency_permission(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit')
  );
