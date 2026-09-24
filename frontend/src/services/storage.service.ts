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
      const contenidoSerializado = JSON.stringify(sesion);
      const contenidoSeguro = decodeURIComponent(encodeURIComponent(contenidoSerializado));
      localStorage.setItem(STORAGE_KEY, contenidoSeguro);
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

      let sesion: unknown;
      try {
        sesion = JSON.parse(datos);
      } catch {
        sesion = JSON.parse(decodeURIComponent(datos));
      }
      if (!esSesionAlmacenada(sesion)) {
        this.eliminarSesion();
        return null;
      }

      return sesion;
    } catch {
      this.eliminarSesion();
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

function esSesionAlmacenada(valor: unknown): valor is SesionAlmacenada {
  if (!valor || typeof valor !== 'object') return false;

  const sesion = valor as Record<string, unknown>;
  const usuario = sesion.usuario;
  if (!usuario || typeof usuario !== 'object') return false;

  const perfil = usuario as Record<string, unknown>;
  return (
    typeof sesion.tokenDeAcceso === 'string' &&
    sesion.tokenDeAcceso.length > 0 &&
    typeof sesion.guardadoEn === 'number' &&
    Number.isFinite(sesion.guardadoEn) &&
    typeof perfil.id === 'string' &&
    perfil.id.length > 0 &&
    typeof perfil.nombre === 'string' &&
    typeof perfil.correo === 'string' &&
    typeof perfil.activo === 'boolean' &&
    typeof perfil.creadoEn === 'string'
  );
}
