// ============================================================
// AuthContext — Contexto global de autenticación
// ============================================================

import { createContext } from 'react';
import type { ContextoAutenticacion } from '../types/auth.types';

/**
 * Contexto React para el estado global de autenticación.
 * El valor por defecto es undefined para forzar el uso dentro de AuthProvider.
 */
export const AuthContext = createContext<ContextoAutenticacion | undefined>(undefined);
