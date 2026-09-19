// ============================================================
// ProtectedRoute — Guard que exige autenticación
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Si el usuario no está autenticado, redirige a /login.
 * Muestra un indicador de carga durante la hidratación de sesión.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} aria-label="Cargando sesión" />
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
