import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AgencyWorkspaceProvider } from './AgencyWorkspaceContext';
import { AgencyLayout, ModuleGuard } from './AgencyLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FreightPage } from './pages/FreightPage';
import { ParcelsPage } from './pages/ParcelsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { StaffPage } from './pages/StaffPage';
import { ReportsPage } from './pages/ReportsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { SettingsPage } from './pages/SettingsPage';
import { BranchesPage } from './pages/BranchesPage';
import { PartnersPage } from './pages/PartnersPage';

/** Espace agence multi-agences et multi-utilisateurs, monté sous /agency/* */
export const AgencyApp: React.FC = () => (
  <AgencyWorkspaceProvider>
    <Routes>
      <Route element={<AgencyLayout />}>
        <Route index element={<ModuleGuard module="dashboard"><DashboardPage /></ModuleGuard>} />
        <Route path="products" element={<ModuleGuard module="products"><ProductsPage /></ModuleGuard>} />
        <Route path="orders" element={<ModuleGuard module="orders"><OrdersPage /></ModuleGuard>} />
        {/* Ancienne adresse des devis */}
        <Route path="rfqs" element={<Navigate to="/agency/orders?tab=rfqs" replace />} />
        <Route path="customers" element={<ModuleGuard module="customers"><CustomersPage /></ModuleGuard>} />
        <Route path="customers/:customerId" element={<ModuleGuard module="customers"><CustomersPage /></ModuleGuard>} />
        <Route path="expenses" element={<ModuleGuard module="expenses"><ExpensesPage /></ModuleGuard>} />
        <Route path="freight" element={<ModuleGuard module="freight"><FreightPage /></ModuleGuard>} />
        <Route path="freight/:shipmentId" element={<ModuleGuard module="freight"><FreightPage /></ModuleGuard>} />
        <Route path="parcels" element={<ModuleGuard module="freight"><ParcelsPage /></ModuleGuard>} />
        <Route path="conversations" element={<ModuleGuard module="conversations"><ConversationsPage /></ModuleGuard>} />
        <Route path="staff" element={<ModuleGuard module="staff"><StaffPage /></ModuleGuard>} />
        <Route path="reports" element={<ModuleGuard module="reports"><ReportsPage /></ModuleGuard>} />
        <Route path="subscription" element={<ModuleGuard module="subscription"><SubscriptionPage /></ModuleGuard>} />
        <Route path="branches" element={<ModuleGuard module="settings"><BranchesPage /></ModuleGuard>} />
        <Route path="partners" element={<ModuleGuard module="settings"><PartnersPage /></ModuleGuard>} />
        <Route path="settings" element={<ModuleGuard module="settings"><SettingsPage /></ModuleGuard>} />
        <Route path="*" element={<Navigate to="/agency" replace />} />
      </Route>
    </Routes>
  </AgencyWorkspaceProvider>
);
