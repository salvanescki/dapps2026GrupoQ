import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { ContextoAutenticacion } from '../types/auth.types';

export function useAuth(): ContextoAutenticacion {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider.');
  }
  return context;
}
