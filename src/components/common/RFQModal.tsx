import React, { useState } from 'react';
import { NumberInput } from './NumberInput';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Send, ShieldCheck, MapPin, Package, DollarSign } from 'lucide-react';

interface RFQModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const RFQModal: React.FC<RFQModalProps> = ({ product, isOpen, onClose }) => {
  const { currentUser, submitRFQ, addToast } = useApp();

  const [quantity, setQuantity] = useState<number>(product.moq);
  const [targetPrice, setTargetPrice] = useState<string>(product.priceMin.toString());
  const [deliveryPort, setDeliveryPort] = useState<
    'Matadi (Maritime)' | 'Boma (Maritime)' | 'Aéroport Ndjili Kinshasa (Aérien)' | 'Aéroport Luano Lubumbashi (Aérien)'
  >('Matadi (Maritime)');
  const [notes, setNotes] = useState<string>(
    `Bonjour, nous souhaitons commander ce produit pour notre activité à ${currentUser.city || 'Kinshasa'}. Merci de nous transmettre votre meilleure offre de prix unitaire et devis d’acheminement.`
  );
  const [buyerPhone, setBuyerPhone] = useState(currentUser.phone || '');
  const [buyerCity, setBuyerCity] = useState(currentUser.city || 'Kinshasa');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < product.moq) {
      addToast(`La quantité minimale de commande (MOQ) est de ${product.moq} ${product.unit}.`, 'error');
      return;
    }

    submitRFQ({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0],
      agencyId: product.agencyId,
      agencyName: product.agencyName,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      buyerEmail: currentUser.email,
      buyerPhone,
      buyerCity,
      quantity,
      targetPriceUSD: targetPrice ? parseFloat(targetPrice) : undefined,
      notes,
      deliveryPort,
    });

    onClose();
  };

  const estimatedTotal = (parseFloat(targetPrice) || product.priceMin) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#123B70] text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg">Demande de Devis Officiel (RFQ)</h3>
            <p className="text-[11px] sm:text-xs text-blue-200">
              Fournisseur : {product.agencyName} ({product.agencyCity}, Chine)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product snapshot */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-slate-200 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{product.name}</h4>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
              <span>Prix indicatif : ${product.priceMin} - ${product.priceMax} USD</span>
              <span>MOQ : {product.moq} {product.unit}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantité souhaitée ({product.unit}s) *
              </label>
              <div className="relative">
                <Package className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <NumberInput
                  decimals={false}
                  value={quantity}
                  onChange={(v) => setQuantity(parseInt(v) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-500">Min. requis : {product.moq}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prix cible souhaité (USD / {product.unit})
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <NumberInput
                  value={targetPrice}
                  onChange={(v) => setTargetPrice(v)}
                  placeholder={`ex: ${product.priceMin}`}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                />
              </div>
              <span className="text-[11px] text-slate-500">Prix indicatif fabricant : ${product.priceMin}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Port ou destination d’arrivée en RDC *
              </label>
              <select
                value={deliveryPort}
                onChange={(e) => setDeliveryPort(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
              >
                <option value="Matadi (Maritime)">Port de Matadi (Maritime - Conteneur)</option>
                <option value="Boma (Maritime)">Port de Boma (Maritime)</option>
                <option value="Aéroport Ndjili Kinshasa (Aérien)">Aéroport Ndjili Kinshasa (Fret Express)</option>
                <option value="Aéroport Luano Lubumbashi (Aérien)">Aéroport Luano Lubumbashi (Fret Express)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ville de l’acheteur en RDC
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Téléphone WhatsApp pour suivi devis *
            </label>
            <input
              type="text"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions spéciales, emballage ou certificat FERI/BESC
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]"
              placeholder="Précisez la personnalisation, les tensions électriques, les certifications nécessaires..."
            ></textarea>
          </div>

          {/* Price preview banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Montant estimatif marchandise :</span>
            </div>
            <span className="font-bold text-sm text-[#123B70]">
              ~${estimatedTotal.toLocaleString('fr-FR')} USD
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#FF8A00] hover:bg-[#e57c00] rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              Envoyer la demande de devis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
