// Calculs de volume des colis (CBM ↔ dimensions en cm)

export const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Volume total (CBM) à partir des dimensions d'un carton en cm et du nombre de cartons */
export const cbmFromDimensions = (l: number, w: number, h: number, packages = 1) =>
  l > 0 && w > 0 && h > 0 ? round((l * w * h * Math.max(1, packages)) / 1_000_000, 3) : 0;

/**
 * Dimensions d'un carton à partir du volume total.
 * Avec longueur et largeur connues : la hauteur exacte. Sinon : un carton cubique de même volume.
 */
export const dimensionsFromCbm = (cbm: number, packages = 1, l = 0, w = 0) => {
  const perPackageCm3 = (cbm * 1_000_000) / Math.max(1, packages);
  if (cbm <= 0) return { lengthCm: l || null, widthCm: w || null, heightCm: null, cube: false };
  if (l > 0 && w > 0) return { lengthCm: l, widthCm: w, heightCm: round(perPackageCm3 / (l * w), 1), cube: false };
  const side = round(Math.cbrt(perPackageCm3), 1);
  return { lengthCm: side, widthCm: side, heightCm: side, cube: true };
};

