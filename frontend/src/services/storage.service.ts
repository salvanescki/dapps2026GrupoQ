import type { SesionAlmacenada, PerfilUsuario } from '../types/auth.types';
import { z } from 'zod';

const STORAGE_KEY = 'football_marketplace_session';
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/;

const PerfilUsuarioSchema = z
  .object({
    id: z.uuid(),
    nombre: z.string().min(1).max(100),
    correo: z.email().max(254),
    activo: z.boolean(),
    creadoEn: z.iso.datetime({ offset: true }),
  })
  .strict();

const SesionAlmacenadaSchema = z
  .object({
    tokenDeAcceso: z.string().min(1).max(4096).regex(JWT_REGEX),
    usuario: PerfilUsuarioSchema,
    guardadoEn: z.number().int().positive(),
  })
  .strict();

export const StorageService = {
  guardarSesion(tokenDeAcceso: string, usuario: PerfilUsuario): void {
    const resultado = SesionAlmacenadaSchema.safeParse({
      tokenDeAcceso,
      usuario,
      guardadoEn: Date.now(),
    });

    if (!resultado.success) {
      console.error('Sesión inválida, no se guarda.');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resultado.data));
    } catch {
      console.error('Error al guardar la sesión en almacenamiento local.');
    }
  },

  obtenerSesion(): SesionAlmacenada | null {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      if (!datos) return null;

      const resultado = SesionAlmacenadaSchema.safeParse(JSON.parse(datos));
      if (!resultado.success) {
        this.eliminarSesion();
        return null;
      }

      return resultado.data;
    } catch {
      this.eliminarSesion();
      return null;
    }
  },

  eliminarSesion(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      console.error('Error al eliminar la sesión del almacenamiento local.');
    }
  },

  existeSesion(): boolean {
    return this.obtenerSesion() !== null;
  },
};
