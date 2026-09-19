// ============================================================
// useAuth — Custom hook para acceder al contexto de autenticación
// ============================================================

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { ContextoAutenticacion } from '../types/auth.types';

/**
 * Hook personalizado para acceder al estado y acciones de autenticación.
 * Debe usarse dentro de un AuthProvider.
 */
export function useAuth(): ContextoAutenticacion {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider.');
  }
  return context;
}
