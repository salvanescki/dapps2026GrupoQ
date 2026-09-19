// ============================================================
// PublicRoute — Guard que redirige usuarios autenticados
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * Si el usuario ya está autenticado, redirige a /.
 * Muestra un indicador de carga durante la hidratación de sesión.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} aria-label="Cargando sesión" />
      </div>
    );
  }

  if (estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
