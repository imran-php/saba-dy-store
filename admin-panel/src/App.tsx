import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/common/Layout';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
