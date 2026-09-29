import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RouteLoading } from '../components/layout/RouteLoading';
import type { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return <RouteLoading />;
  }

  if (estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
