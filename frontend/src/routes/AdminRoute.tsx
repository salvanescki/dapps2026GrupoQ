import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RouteLoading } from '../components/layout/RouteLoading';
import type { ReactNode } from 'react';

export interface AdminRouteProps {
  children: ReactNode;
  mensajeSeguridad?: string;
}

export function AdminRoute({ children, mensajeSeguridad }: Readonly<AdminRouteProps>) {
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
            mensajeSeguridad ||
            'Acceso restringido: el Panel de Gobernanza es exclusivo para cuentas Administradoras.',
        }}
      />
    );
  }

  return <>{children}</>;
}

