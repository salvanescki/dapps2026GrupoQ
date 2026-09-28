import { createContext } from 'react';
import type { ContextoAutenticacion } from '../types/auth.types';

export const AuthContext = createContext<ContextoAutenticacion | undefined>(undefined);
