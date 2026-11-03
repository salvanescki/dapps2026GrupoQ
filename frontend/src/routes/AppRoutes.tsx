import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from '../views/LoginView';
import { RegisterView } from '../views/RegisterView';
import { HomeView } from '../views/HomeView';
import { PlayersCatalogView } from '../views/PlayersCatalogView';
import { MarketplaceView } from '../views/MarketplaceView';
import { PortfolioView } from '../views/PortfolioView';
import { TeamOfTheWeekView } from '../views/TeamOfTheWeekView';
import { AdminGovernanceView } from '../views/AdminGovernanceView';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
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
        path="/register"
        element={
          <PublicRoute>
            <RegisterView />
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
        path="/marketplace"
        element={
          <ProtectedRoute>
            <MarketplaceView />
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
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute>
            <PortfolioView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-of-the-week"
        element={
          <ProtectedRoute>
            <TeamOfTheWeekView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-of-the-week/:year/:week"
        element={
          <ProtectedRoute>
            <TeamOfTheWeekView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminGovernanceView />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
