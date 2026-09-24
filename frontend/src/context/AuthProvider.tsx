// ============================================================
// AuthProvider — Proveedor del estado global de autenticación
// Gestiona login, logout, hidratación desde localStorage
// ============================================================

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { StorageService } from '../services/storage.service';
import {
  loginUsuario as apiLogin,
  obtenerPerfilAutenticado,
  HttpError,
} from '../api/auth-api.client';
import { sanitizarCredenciales } from '../utils/validaciones';
import type {
  PerfilUsuario,
  CredencialesLogin,
  EstadoAutenticacion,
} from '../types/auth.types';

const ESTADO_INICIAL: EstadoAutenticacion = {
  estaAutenticado: false,
  cargando: true,
  usuario: null,
  tokenDeAcceso: null,
  error: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [estado, setEstado] = useState<EstadoAutenticacion>(ESTADO_INICIAL);

  // Hidratar sesión solo después de validar el token y el perfil con el backend.
  useEffect(() => {
    let montado = true;

    const hidratarSesion = async () => {
      const sesion = StorageService.obtenerSesion();
      if (!sesion) {
        if (montado) setEstado((prev) => ({ ...prev, cargando: false }));
        return;
      }

      try {
        const usuario = await obtenerPerfilAutenticado(sesion.tokenDeAcceso);
        if (!montado) return;

        StorageService.guardarSesion(sesion.tokenDeAcceso, usuario);
        setEstado({
          estaAutenticado: true,
          cargando: false,
          usuario,
          tokenDeAcceso: sesion.tokenDeAcceso,
          error: null,
        });
      } catch {
        StorageService.eliminarSesion();
        if (montado) {
          setEstado({
            estaAutenticado: false,
            cargando: false,
            usuario: null,
            tokenDeAcceso: null,
            error: 'La sesión expiró. Inicie sesión nuevamente.',
          });
        }
      }
    };

    void hidratarSesion();
    return () => {
      montado = false;
    };
  }, []);

  const login = useCallback(async (credenciales: CredencialesLogin) => {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));

    try {
      const credencialesSanitizadas = sanitizarCredenciales(credenciales);
      const respuesta = await apiLogin(credencialesSanitizadas);

      // Persistir sesión
      StorageService.guardarSesion(respuesta.tokenDeAcceso, respuesta.usuario);

      setEstado({
        estaAutenticado: true,
        cargando: false,
        usuario: respuesta.usuario,
        tokenDeAcceso: respuesta.tokenDeAcceso,
        error: null,
      });
    } catch (error) {
      let mensaje = 'Ocurrió un error inesperado. Intente nuevamente.';

      if (error instanceof HttpError) {
        if (error.codigoEstado === 401) {
          mensaje = 'Credenciales inválidas.';
        } else if (error.codigoEstado === 0) {
          mensaje = error.message;
        } else {
          mensaje = error.message || mensaje;
        }
      }

      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error: mensaje,
      }));
    }
  }, []);

  const logout = useCallback(() => {
    StorageService.eliminarSesion();
    setEstado({
      estaAutenticado: false,
      cargando: false,
      usuario: null,
      tokenDeAcceso: null,
      error: null,
    });
  }, []);

  const limpiarError = useCallback(() => {
    setEstado((prev) => ({ ...prev, error: null }));
  }, []);

  const contextValue = {
    ...estado,
    login,
    logout,
    limpiarError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
