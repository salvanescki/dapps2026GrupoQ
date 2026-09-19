// ============================================================
// Servicio de almacenamiento local para sesión de usuario
// Clave: football_marketplace_session
// ============================================================

import type { SesionAlmacenada, PerfilUsuario } from '../types/auth.types';

const STORAGE_KEY = 'football_marketplace_session';

/**
 * Servicio desacoplado de persistencia local para la sesión del inversor.
 * Facilita el testing con mocks sin acoplarse directamente a las APIs del navegador.
 */
export const StorageService = {
  /**
   * Guarda la sesión del usuario en localStorage.
   */
  guardarSesion(tokenDeAcceso: string, usuario: PerfilUsuario): void {
    const sesion: SesionAlmacenada = {
      tokenDeAcceso,
      usuario,
      guardadoEn: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } catch {
      // Si localStorage no está disponible o está lleno, fallar silenciosamente
      console.error('Error al guardar la sesión en almacenamiento local.');
    }
  },

  /**
   * Recupera la sesión almacenada del usuario, si existe.
   */
  obtenerSesion(): SesionAlmacenada | null {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      if (!datos) return null;
      const sesion: SesionAlmacenada = JSON.parse(datos);
      // Validar estructura mínima
      if (sesion.tokenDeAcceso && sesion.usuario && sesion.usuario.id) {
        return sesion;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Elimina la sesión del almacenamiento local.
   */
  eliminarSesion(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      console.error('Error al eliminar la sesión del almacenamiento local.');
    }
  },

  /**
   * Verifica si existe una sesión almacenada.
   */
  existeSesion(): boolean {
    return this.obtenerSesion() !== null;
  },
};
