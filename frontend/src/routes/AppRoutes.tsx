// ============================================================
// AppRoutes — Configuración principal de rutas
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from '../views/LoginView';
import { HomeView } from '../views/HomeView';
import { PlayersCatalogView } from '../views/PlayersCatalogView';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginView />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/players"
        element={
          <ProtectedRoute>
            <PlayersCatalogView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
