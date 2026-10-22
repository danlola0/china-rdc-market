/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { FloatingTranslateWidget } from './components/common/FloatingTranslateWidget';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { SplashScreen } from './components/common/SplashScreen';
import { HomePage } from './pages/public/HomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { AgenciesPage } from './pages/public/AgenciesPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { TrackingPage } from './pages/public/TrackingPage';
import { MessagingPage } from './pages/public/MessagingPage';
import { BuyerDashboard } from './pages/buyer/BuyerDashboard';
import { AgencyApp } from './agency/AgencyApp';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterBuyerPage } from './pages/auth/RegisterBuyerPage';
import { RegisterAgencyPage } from './pages/auth/RegisterAgencyPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { RegisterChoicePage } from './pages/auth/RegisterChoicePage';
import { isSupabaseConfigured } from './lib/supabase';

/** Réserve une page aux utilisateurs connectés (et éventuellement à l'administrateur) */
const RequireAuth: React.FC<{ children: React.ReactNode; admin?: boolean }> = ({ children, admin }) => {
  const { authReady, isAuthenticated, profile } = useApp();
  const location = useLocation();

  if (!authReady || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-xs text-slate-500" role="status">
        Chargement…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && !profile?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** Pages de connexion : inutile d'y rester une fois connecté */
const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authReady, isAuthenticated, profile } = useApp();
  const location = useLocation();
  if (authReady && isAuthenticated && profile) {
    // Retour à la page demandée, sinon vers l'espace correspondant au type de compte
    const from = (location.state as { from?: string } | null)?.from;
    const home = profile.isAdmin ? '/admin' : profile.accountType === 'agency' ? '/agency' : '/';
    return <Navigate to={from || home} replace />;
  }
  return <>{children}</>;
};

const ConfigWarning: React.FC = () =>
  isSupabaseConfigured ? null : (
    <div className="bg-rose-600 text-white text-xs text-center px-4 py-2">
      Base de données non configurée : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le fichier .env.local.
    </div>
  );

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-[#123B70] selection:text-white">
          <ConfigWarning />
          <Navbar />

          <div className="flex-1 pb-16 md:pb-0">
            <Routes>
              {/* Pages publiques */}
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/agencies" element={<AgenciesPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/suivi/:token" element={<TrackingPage />} />

              {/* Pages réservées aux comptes connectés */}
              <Route path="/messages" element={<RequireAuth><MessagingPage /></RequireAuth>} />
              <Route path="/buyer" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
              <Route path="/buyer/rfqs" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
              <Route path="/buyer/orders" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
              <Route path="/buyer/favorites" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
              <Route path="/agency/*" element={<RequireAuth><AgencyApp /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth admin><AdminDashboard /></RequireAuth>} />

              {/* Authentification */}
              <Route path="/auth/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
              <Route path="/auth/register" element={<GuestOnly><RegisterChoicePage /></GuestOnly>} />
              <Route path="/auth/register-buyer" element={<GuestOnly><RegisterBuyerPage /></GuestOnly>} />
              <Route path="/auth/register-agency" element={<GuestOnly><RegisterAgencyPage /></GuestOnly>} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          <Footer />
          <ToastContainer />
          <SplashScreen />
          <FloatingTranslateWidget />
          <MobileBottomNav />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
