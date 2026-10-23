import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Order, RFQ } from '../../types';
import { ProductCard } from '../../components/product/ProductCard';
import { BuyerProfileForm } from './BuyerProfileForm';
import {
  FileText,
  Package,
  Heart,
  MessageSquare,
  User as UserIcon,
  Bell,
  Clock,
  MapPin,
  Ship,
  Plane,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const BuyerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const {
    currentUser,
    rfqs,
    orders,
    favorites,
    products,
    conversations,
    acceptRFQ,
    t,
    language,
  } = useApp();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const myRfqs = rfqs.filter((r) => r.buyerId === currentUser.id);
  const myOrders = orders.filter((o) => o.buyerId === currentUser.id);
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const getOrderStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'en_attente':
        return { label: t.statusPending, color: 'bg-amber-100 text-amber-800' };
      case 'en_production':
        return { label: t.statusInProduction, color: 'bg-blue-100 text-blue-800' };
      case 'expedie_chine':
        return { label: t.statusShippedChina, color: 'bg-indigo-100 text-indigo-800' };
      case 'transit_maritime':
        return { label: t.statusSeaTransit, color: 'bg-cyan-100 text-cyan-800' };
      case 'douane_matadi':
        return { label: t.statusCustomsMatadi, color: 'bg-purple-100 text-purple-800' };
      case 'arrive_kinshasa':
      case 'livre':
        return { label: t.statusDeliveredKinshasa, color: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner with Buyer Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-slate-200 shrink-0 bg-[#123B70] text-white flex items-center justify-center text-2xl font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
              <span className="text-xs bg-blue-100 text-[#123B70] font-semibold px-2 py-0.5 rounded">
                Acheteur RDC Vérifié
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {[currentUser.companyName, currentUser.city, currentUser.country].filter(Boolean).join(' · ')}
            </p>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>{currentUser.email}</span>
              <span>·</span>
              <span>{currentUser.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            to="/catalog"
            className="px-4 py-2 bg-[#FF8A00] hover:bg-[#e57c00] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            Nouveau Sourcing Chine
          </Link>
          <Link
            to="/messages"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Messagerie B2B
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-medium">
        <button
          onClick={() => setTab('overview')}
          className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#123B70] text-[#123B70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.buyerOverviewTab}
        </button>
        <button
          onClick={() => setTab('rfqs')}
          className={`pb-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'rfqs'
              ? 'border-[#123B70] text-[#123B70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t.buyerRfqsTab}</span>
          <span className="text-[10px] bg-blue-100 text-[#123B70] px-1.5 py-0.2 rounded-full font-bold">
            {myRfqs.length}
          </span>
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`pb-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#123B70] text-[#123B70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t.buyerOrdersTab}</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
            {myOrders.length}
          </span>
        </button>
        <button
          onClick={() => setTab('favorites')}
          className={`pb-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'favorites'
              ? 'border-[#123B70] text-[#123B70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t.buyerFavoritesTab} ({favoriteProducts.length})</span>
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#123B70] text-[#123B70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.buyerProfileTab}
        </button>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Demandes de devis</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {myRfqs.length}
              </div>
              <div className="text-[11px] text-blue-600 mt-1">
                {myRfqs.filter((r) => r.status === 'quoted').length} devis chiffrés reçus
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Commandes en cours</div>
              <div className="text-2xl font-black text-[#123B70] font-mono mt-1">
                {myOrders.filter((o) => o.status !== 'livre').length}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                En transit vers Matadi / Kinshasa
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Fournisseurs contactés</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {conversations.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Guangzhou, Yiwu, Shenzhen</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Articles sauvegardés</div>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                {favorites.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Dans vos favoris</div>
            </div>
          </div>

          {/* Active Orders Quick Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Suivi des Expéditions en Cours</h3>
              <button onClick={() => setTab('orders')} className="text-xs text-[#123B70] font-semibold hover:underline">
                Voir toutes les commandes
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {myOrders.slice(0, 3).map((order) => {
                const statusInfo = getOrderStatusLabel(order.status);
                return (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{order.productName}</div>
                        <div className="text-slate-500 flex items-center gap-2">
                          <span>N° {order.orderNumber}</span>
                          <span>·</span>
                          <span>{order.quantity} pièces</span>
                          <span>·</span>
                          <span className="font-mono font-bold text-slate-800">${order.totalUSD} USD</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Destination : {order.destinationCity} · Suivi : {order.trackingNumber}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                      >
                        Détails & Suivi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent RFQs Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Dernières Demandes de Devis (RFQs)</h3>
              <button onClick={() => setTab('rfqs')} className="text-xs text-[#123B70] font-semibold hover:underline">
                Gérer les devis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRfqs.slice(0, 2).map((rfq) => (
                <div key={rfq.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900 truncate">{rfq.productName}</div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        rfq.status === 'quoted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rfq.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rfq.status === 'quoted' ? 'Devis Chiffré Prêt' : rfq.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Quantité : {rfq.quantity} unités</span>
                    <span>Port : {rfq.deliveryPort}</span>
                  </div>

                  {rfq.status === 'quoted' && rfq.quotedPriceUSD && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-emerald-700">Offre reçue du fabricant :</div>
                        <div className="font-black text-sm font-mono">${rfq.quotedPriceUSD} USD / unité</div>
                      </div>
                      <button
                        onClick={() => acceptRFQ(rfq.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs"
                      >
                        Accepter l’offre
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. RFQS */}
      {activeTab === 'rfqs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mes Demandes de Devis (RFQs)</h2>
              <p className="text-xs text-slate-500">Suivi des négociations de prix en USD avec les agences chinoises</p>
            </div>
            <Link
              to="/catalog"
              className="px-3 py-1.5 bg-[#FF8A00] text-white text-xs font-semibold rounded-lg"
            >
              Demander un autre devis
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="p-3 font-semibold">Produit & N° RFQ</th>
                  <th className="p-3 font-semibold">Fournisseur (Chine)</th>
                  <th className="p-3 font-semibold">Quantité</th>
                  <th className="p-3 font-semibold">Port RDC</th>
                  <th className="p-3 font-semibold">Offre reçue</th>
                  <th className="p-3 font-semibold">Statut</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {myRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rfq.productImage}
                          alt={rfq.productName}
                          className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{rfq.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{rfq.rfqNumber} · {rfq.createdAt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{rfq.agencyName}</td>
                    <td className="p-3 font-mono font-bold">{rfq.quantity}</td>
                    <td className="p-3 text-slate-600">{rfq.deliveryPort}</td>
                    <td className="p-3">
                      {rfq.quotedPriceUSD ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-700 text-sm">${rfq.quotedPriceUSD} USD</span>
                          {rfq.quotedShippingUSD && (
                            <div className="text-[10px] text-slate-400">+ Fret ${rfq.quotedShippingUSD}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">En attente de chiffrage</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rfq.status === 'quoted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rfq.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rfq.status === 'quoted' ? 'Devis Prêt' : rfq.status === 'accepted' ? 'Accepté' : 'En attente'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {rfq.status === 'quoted' && (
                        <button
                          onClick={() => acceptRFQ(rfq.id)}
                          className="px-3 py-1 bg-[#123B70] text-white hover:bg-[#0c274c] text-xs font-semibold rounded"
                        >
                          Accepter & Commander
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mes Commandes & Suivi Logistique RDC</h2>
            <p className="text-xs text-slate-500">
              Traçabilité complète depuis l’usine en Chine jusqu’aux ports de Matadi, Boma ou aux aéroports congolais
            </p>
          </div>

          <div className="space-y-4">
            {myOrders.map((order) => {
              const statusInfo = getOrderStatusLabel(order.status);
              return (
                <div key={order.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm font-mono">{order.orderNumber}</span>
                      <span className="text-slate-400 ml-2">Date : {order.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="font-mono font-black text-sm text-[#123B70]">
                        ${order.totalUSD.toLocaleString('fr-FR')} USD
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="text-xs space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{order.productName}</h4>
                        <div className="text-slate-600">
                          Fournisseur : <span className="font-semibold">{order.agencyName}</span>
                        </div>
                        <div className="text-slate-500">
                          Quantité : <span className="font-bold">{order.quantity} unités</span> · Mode : {order.shippingMode}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Numéro de connaissement / Suivi : <span className="font-mono text-slate-700">{order.trackingNumber}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-[#123B70] text-white hover:bg-[#0c274c] text-xs font-semibold rounded-lg self-start md:self-center transition-colors flex items-center gap-1.5"
                    >
                      <Ship className="w-3.5 h-3.5" />
                      <span>Voir la timeline maritime</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. FAVORITES */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Mes Articles Favoris ({favoriteProducts.length})</h2>
            <Link to="/catalog" className="text-xs text-[#123B70] font-semibold hover:underline">
              Explorer le catalogue
            </Link>
          </div>

          {favoriteProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Vous n'avez pas encore d'article en favori.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Coordonnées de l'Acheteur en RD Congo</h2>
            <p className="text-xs text-slate-500">Utilisées pour la facturation proforma et le dédouanement à l'arrivée</p>
          </div>

          <BuyerProfileForm />
        </div>
      )}

      {/* MODAL: ORDER DETAILS & SHIPPING TIMELINE */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95">
            <div className="px-6 py-4 bg-[#123B70] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Suivi Logistique de Commande</h3>
                <div className="text-xs text-blue-200">
                  {selectedOrder.orderNumber} · B/L : {selectedOrder.trackingNumber}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:bg-white/10 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product and Order Overview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <img
                  src={selectedOrder.productImage}
                  alt={selectedOrder.productName}
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{selectedOrder.productName}</div>
                  <div className="text-slate-500 mt-0.5">
                    Fournisseur : {selectedOrder.agencyName} · Quantité : {selectedOrder.quantity}
                  </div>
                  <div className="text-[#123B70] font-black font-mono mt-0.5">
                    Montant Total : ${selectedOrder.totalUSD} USD ({selectedOrder.shippingMode})
                  </div>
                </div>
              </div>

              {/* Realistic Milestone Timeline */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Étapes du Couloir Logistique Chine ➔ RD Congo
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedOrder.timeline.map((step, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div
                        className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          step.completed
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : 'border-slate-300 text-slate-300'
                        }`}
                      >
                        {step.completed && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className={`font-semibold ${step.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono shrink-0">{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  <span>Adresse de livraison en RDC :</span>
                </div>
                <div className="pl-5 text-amber-800">{selectedOrder.deliveryAddress}</div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
