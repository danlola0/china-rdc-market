import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Phone, Plane, Ship, ShoppingCart, X } from 'lucide-react';
import { QuantityStepper, unitPriceFor } from './QuantityStepper';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface OrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  /** Option choisie sur la fiche (couleur, taille…) */
  variants?: Record<string, string>;
  /** Quantité choisie sur la fiche article */
  initialQuantity?: number;
}

const usd = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Commande directe d'un article auprès de l'agence qui l'a publié */
export const OrderModal: React.FC<OrderModalProps> = ({ product, isOpen, onClose, variants = {}, initialQuantity }) => {
  const { currentUser, placeOrder } = useApp();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(product.moq || 1);
  const [mode, setMode] = useState<'Fret Maritime (Conteneur)' | 'Fret Aérien Express'>('Fret Maritime (Conteneur)');
  const [city, setCity] = useState(currentUser.city || 'Kinshasa');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const variantText = Object.entries(variants)
    .map(([k, v]) => `${k} : ${v}`)
    .join(', ');

  useEffect(() => {
    if (isOpen) {
      setDone(null);
      setQuantity(Math.max(initialQuantity || 0, product.moq || 1));
      setNote(variantText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product.id]);

  if (!isOpen) return null;

  const minQty = Math.max(product.moq || 1, 1);
  // Mêmes paliers que sur la fiche article (calculés aussi par la base)
  const unit = unitPriceFor(product, quantity);
  const tooFew = quantity < minQty;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooFew || busy) return;
    setBusy(true);
    const number = await placeOrder({ productId: product.id, agencyId: product.agencyId, productName: product.name, quantity, city, address, phone, shippingMode: mode, note });
    setBusy(false);
    if (number) setDone(number);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#123B70] text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg">Commander cet article</h3>
            <p className="text-[11px] sm:text-xs text-blue-200">
              Vendu par : {product.agencyName}
              {product.agencyCity ? ` (${product.agencyCity})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <img src={product.images[0]} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-slate-200 shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{product.name}</h4>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
              <span>Prix unitaire : {usd(unit)} (selon la quantité)</span>
              <span>
                Minimum : {minQty} {product.unit}
              </span>
            </div>
          </div>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">Commande {done} envoyée</h4>
            <p className="text-xs text-slate-600">
              {product.agencyName} a été prévenue. Elle va confirmer le prix final, les frais d’acheminement et le délai. Vous suivez l’avancement dans « Mes commandes » et pouvez lui écrire dans Messages.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                className="px-4 py-2.5 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-semibold cursor-pointer"
                onClick={() => {
                  onClose();
                  navigate('/buyer/orders');
                }}
              >
                Voir mes commandes
              </button>
              <button
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  onClose();
                  navigate('/messages');
                }}
              >
                Écrire à l’agence
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantité ({product.unit}) *</label>
                <QuantityStepper value={quantity} onChange={setQuantity} min={minQty} />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ville de livraison *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transport</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['Fret Maritime (Conteneur)', 'Maritime', Ship],
                    ['Fret Aérien Express', 'Aérien', Plane],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setMode(value)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                      mode === value ? 'border-[#123B70] bg-[#123B70]/5 text-[#123B70]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse de livraison</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Commune, avenue, numéro"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 …"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Précisions pour l’agence</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Couleur, taille, emballage…"
              />
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>
                  {quantity || 0} × {usd(unit)}
                </span>
                <span className="font-bold text-slate-900 text-sm">{usd((quantity || 0) * unit)}</span>
              </div>
              <p className="text-[11px] text-slate-500">Hors frais d’acheminement : l’agence confirme le prix final, le transport et le délai avant de lancer la commande.</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer">
                Annuler
              </button>
              <button
                type="submit"
                disabled={tooFew || busy || !city.trim()}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" /> {busy ? 'Envoi…' : 'Confirmer la commande'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
