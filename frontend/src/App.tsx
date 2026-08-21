import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import WorkOrders from './pages/WorkOrders';
import Transfers from './pages/Transfers';
import CustomerOrders from './pages/CustomerOrders';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* All authenticated routes share a single Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard — all roles */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Inventory — ADMIN and OPERATIONS_USER */}
            <Route
              path="inventory"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_USER']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* Work Orders — ADMIN and OPERATIONS_USER */}
            <Route
              path="work-orders"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_USER']}>
                  <WorkOrders />
                </ProtectedRoute>
              }
            />

            {/* Internal Transfers — ADMIN and OPERATIONS_USER */}
            <Route
              path="transfers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_USER']}>
                  <Transfers />
                </ProtectedRoute>
              }
            />

            {/* Customer Orders — ADMIN and SALES_USER */}
            <Route
              path="orders"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES_USER']}>
                  <CustomerOrders />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
