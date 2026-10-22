import { supabase } from './supabase';

const BUCKET = 'product-images';

/**
 * Envoie la photo d'un article dans Supabase Storage et renvoie son adresse publique.
 * Seule une courte adresse est enregistrée dans l'article : le catalogue reste léger et rapide.
 */
export const uploadProductImage = async (agencyId: string, dataUrl: string): Promise<string> => {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${agencyId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

/** true si l'image est encore stockée en texte dans l'article (ancien format) */
export const isInlineImage = (src: string) => src.startsWith('data:');
