import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { QuantityStepper, unitPriceFor } from '../../components/common/QuantityStepper';

const usd = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Fenêtre « Modifier la quantité » d'une commande encore en attente */
export const EditOrderQuantity: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
  const { products, updateOrderQuantity } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (order) setQuantity(order.quantity);
  }, [order]);

  if (!order) return null;
  const product = products.find((p) => p.id === order.productId);
  const min = Math.max(product?.moq || 1, 1);
  const unit = product ? unitPriceFor(product, quantity) : order.unitPriceUSD;
  const total = quantity * unit + (order.shippingUSD || 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < min) return;
    setBusy(true);
    const ok = await updateOrderQuantity(order.id, quantity);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" role="dialog" aria-modal="true">
      <form onSubmit={save} className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden text-xs">
        <div className="px-5 py-3.5 bg-[#123B70] text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Modifier la quantité</h3>
            <p className="text-[11px] text-blue-200">
              {order.orderNumber} · {order.productName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} min={min} size="lg" />
            <div className="text-right">
              <div className="text-[11px] text-slate-500">
                {quantity} × {usd(unit)}
                {order.shippingUSD ? ` + transport ${usd(order.shippingUSD)}` : ''}
              </div>
              <div className="text-lg font-black text-[#123B70]">{usd(total)}</div>
              <div className="text-[10px] text-slate-400">avant : {usd(order.totalUSD)}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Possible tant que l’agence n’a pas lancé la production. Le prix unitaire suit les paliers de quantité de l’article ; l’agence est prévenue.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer">
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy || quantity < min || quantity === order.quantity}
              className="px-4 py-2 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
