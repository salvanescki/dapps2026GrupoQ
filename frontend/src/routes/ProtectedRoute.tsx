import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RouteLoading } from '../components/layout/RouteLoading';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return <RouteLoading />;
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
