import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { Heart, MapPin, Building2, MessageSquare, FileText } from 'lucide-react';
import { RFQModal } from '../common/RFQModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, startOrOpenConversation, t, language, getProductName, getCategoryName } = useApp();
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isFav = favorites.includes(product.id);
  const displayName = getProductName(product);
  const displayCategory = getCategoryName(product.category);

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const greeting =
      language === 'zh'
        ? `您好，我对该商品很感兴趣："${displayName}"。请问有现货发往刚果(金)马塔迪港吗？`
        : language === 'en'
        ? `Hello, I would like information regarding "${displayName}". Is it ready for shipping to DR Congo?`
        : `Bonjour, je souhaite des informations sur le produit : "${displayName}". Est-il disponible pour expédition vers la RDC ?`;

    startOrOpenConversation(product.agencyId, product.id, greeting);
    navigate('/messages');
  };

  const handleRfqClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRfqModalOpen(true);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <>
      <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col h-full">
        {/* Product Image Slot */}
        <Link to={`/product/${product.id}`} className="relative block aspect-4/3 bg-slate-100 overflow-hidden">
          {!imgError ? (
            <img
              src={product.images[0]}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
              <Building2 className="w-8 h-8 mb-1 text-slate-300" />
              <span className="text-xs">{displayCategory}</span>
            </div>
          )}

          {/* Top Left: Category label */}
          <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
            {displayCategory}
          </div>

          {/* Top Right: Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${
              isFav
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </Link>

        {/* Content body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Price & MOQ */}
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <div className="text-[#123B70] font-black text-lg tracking-tight font-mono tabular-nums">
                ${product.priceMin.toLocaleString('fr-FR')}
                {product.priceMax > product.priceMin && (
                  <span className="text-sm font-semibold text-slate-500"> - ${product.priceMax}</span>
                )}{' '}
                <span className="text-xs font-normal text-slate-500">USD</span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {t.moq} <span className="text-slate-900 font-semibold">{product.moq} {t.unit}</span>
              </div>
            </div>

            {/* Product Title */}
            <Link to={`/product/${product.id}`} className="block group-hover:text-[#123B70] transition-colors">
              <h3 className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                {displayName}
              </h3>
            </Link>

            {/* Supplier & City */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium text-slate-700">{product.agencyName}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>{product.agencyCity}</span>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              onClick={handleChatClick}
              className="px-2 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer min-w-0"
              title={t.chatWithAgency}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#123B70] shrink-0" />
              <span className="truncate">{t.chatWithAgency}</span>
            </button>
            <button
              onClick={handleRfqClick}
              className="px-2 py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-[#FF8A00] hover:bg-[#e57c00] rounded-lg flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer min-w-0"
              title={t.requestQuote}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.requestQuote}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RFQ Modal */}
      <RFQModal
        product={product}
        isOpen={rfqModalOpen}
        onClose={() => setRfqModalOpen(false)}
      />
    </>
  );
};
