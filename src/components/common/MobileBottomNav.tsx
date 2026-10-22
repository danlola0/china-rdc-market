import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Home,
  Package,
  Building2,
  MessageSquare,
  User,
  Shield,
  Building,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { currentRole, conversations, t } = useApp();

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  // Determine account link based on current role
  const accountLink =
    currentRole === 'admin' ? '/admin' : currentRole === 'agency' ? '/agency' : '/buyer';

  const isHomeActive = location.pathname === '/';
  const isCatalogActive = location.pathname.startsWith('/catalog') || location.pathname.startsWith('/product');
  const isAgenciesActive = location.pathname.startsWith('/agencies');
  const isMessagesActive = location.pathname.startsWith('/messages');
  const isAccountActive =
    location.pathname.startsWith('/buyer') ||
    location.pathname.startsWith('/agency') ||
    location.pathname.startsWith('/admin');

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around text-[10px] font-semibold text-slate-500"
      style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* 1. Home */}
      <Link
        to="/"
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isHomeActive ? 'text-[#123B70]' : 'hover:text-slate-800'
        }`}
      >
        <Home className={`w-5 h-5 mb-0.5 ${isHomeActive ? 'text-[#123B70] stroke-[2.5]' : 'stroke-2'}`} />
        <span className="truncate max-w-[56px]">{t.home}</span>
      </Link>

      {/* 2. Catalog */}
      <Link
        to="/catalog"
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isCatalogActive ? 'text-[#123B70]' : 'hover:text-slate-800'
        }`}
      >
        <Package className={`w-5 h-5 mb-0.5 ${isCatalogActive ? 'text-[#123B70] stroke-[2.5]' : 'stroke-2'}`} />
        <span className="truncate max-w-[56px]">{t.allProducts}</span>
      </Link>

      {/* 3. Suppliers / Agencies */}
      <Link
        to="/agencies"
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isAgenciesActive ? 'text-[#123B70]' : 'hover:text-slate-800'
        }`}
      >
        <Building2 className={`w-5 h-5 mb-0.5 ${isAgenciesActive ? 'text-[#123B70] stroke-[2.5]' : 'stroke-2'}`} />
        <span className="truncate max-w-[56px]">Agences</span>
      </Link>

      {/* 4. Messages (Trade Chat) */}
      <Link
        to="/messages"
        className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
          isMessagesActive ? 'text-[#123B70]' : 'hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <MessageSquare className={`w-5 h-5 mb-0.5 ${isMessagesActive ? 'text-[#123B70] stroke-[2.5]' : 'stroke-2'}`} />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-[#FF8A00] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadMessagesCount}
            </span>
          )}
        </div>
        <span className="truncate max-w-[56px]">{t.messages}</span>
      </Link>

      {/* 5. Account / Space */}
      <Link
        to={accountLink}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isAccountActive ? 'text-[#123B70]' : 'hover:text-slate-800'
        }`}
      >
        {currentRole === 'admin' ? (
          <Shield className={`w-5 h-5 mb-0.5 ${isAccountActive ? 'text-purple-700 stroke-[2.5]' : 'stroke-2'}`} />
        ) : currentRole === 'agency' ? (
          <Building className={`w-5 h-5 mb-0.5 ${isAccountActive ? 'text-[#FF8A00] stroke-[2.5]' : 'stroke-2'}`} />
        ) : (
          <User className={`w-5 h-5 mb-0.5 ${isAccountActive ? 'text-[#123B70] stroke-[2.5]' : 'stroke-2'}`} />
        )}
        <span className="truncate max-w-[56px]">
          {currentRole === 'admin' ? 'Admin' : currentRole === 'agency' ? 'Fournisseur' : 'Compte'}
        </span>
      </Link>
    </nav>
  );
};
