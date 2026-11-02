import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RouteLoading } from '../components/layout/RouteLoading';
import type { ReactNode } from 'react';

export interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: Readonly<AdminRouteProps>) {
  const { estaAutenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return <RouteLoading />;
  }

  if (!estaAutenticado || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol !== 'ADMIN') {
    return (
      <Navigate
        to="/"
        replace
        state={{
          avisoSeguridad:
            'Acceso restringido: el Panel de Gobernanza es exclusivo para cuentas Administradoras.',
        }}
      />
    );
  }

  return <>{children}</>;
}

