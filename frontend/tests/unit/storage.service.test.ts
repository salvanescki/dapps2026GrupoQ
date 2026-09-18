// ============================================================
// Tests unitarios para StorageService
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../src/services/storage.service';
import type { PerfilUsuario } from '../../src/types/auth.types';

const mockUsuario: PerfilUsuario = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nombre: 'Inversor Demo',
  correo: 'inversor@tokens.com',
  activo: true,
  creadoEn: '2026-09-16T22:30:00.000Z',
};

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('guardarSesion', () => {
    it('debería almacenar el token y el usuario en localStorage', () => {
      StorageService.guardarSesion(mockToken, mockUsuario);

      const stored = localStorage.getItem('football_marketplace_session');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.tokenDeAcceso).toBe(mockToken);
      expect(parsed.usuario).toEqual(mockUsuario);
      expect(parsed.guardadoEn).toBeTypeOf('number');
    });

    it('debería incluir un timestamp de guardado', () => {
      const before = Date.now();
      StorageService.guardarSesion(mockToken, mockUsuario);
      const after = Date.now();

      const stored = JSON.parse(localStorage.getItem('football_marketplace_session')!);
      expect(stored.guardadoEn).toBeGreaterThanOrEqual(before);
      expect(stored.guardadoEn).toBeLessThanOrEqual(after);
    });

    it('no debería lanzar error si localStorage falla', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => StorageService.guardarSesion(mockToken, mockUsuario)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('obtenerSesion', () => {
    it('debería retornar null si no hay sesión almacenada', () => {
      expect(StorageService.obtenerSesion()).toBeNull();
    });

    it('debería retornar la sesión almacenada correctamente', () => {
      StorageService.guardarSesion(mockToken, mockUsuario);
      const sesion = StorageService.obtenerSesion();

      expect(sesion).not.toBeNull();
      expect(sesion!.tokenDeAcceso).toBe(mockToken);
      expect(sesion!.usuario.nombre).toBe('Inversor Demo');
    });

    it('debería retornar null si el JSON es inválido', () => {
      localStorage.setItem('football_marketplace_session', 'invalid-json');
      expect(StorageService.obtenerSesion()).toBeNull();
    });

    it('debería retornar null si la estructura es incompleta', () => {
      localStorage.setItem('football_marketplace_session', JSON.stringify({ tokenDeAcceso: 'abc' }));
      expect(StorageService.obtenerSesion()).toBeNull();
    });

    it('debería retornar null si falta el id del usuario', () => {
      localStorage.setItem(
        'football_marketplace_session',
        JSON.stringify({
          tokenDeAcceso: 'abc',
          usuario: { nombre: 'Test' },
          guardadoEn: Date.now(),
        })
      );
      expect(StorageService.obtenerSesion()).toBeNull();
    });
  });

  describe('eliminarSesion', () => {
    it('debería eliminar la sesión del localStorage', () => {
      StorageService.guardarSesion(mockToken, mockUsuario);
      expect(localStorage.getItem('football_marketplace_session')).not.toBeNull();

      StorageService.eliminarSesion();
      expect(localStorage.getItem('football_marketplace_session')).toBeNull();
    });

    it('no debería lanzar error si no hay sesión para eliminar', () => {
      expect(() => StorageService.eliminarSesion()).not.toThrow();
    });
  });

  describe('existeSesion', () => {
    it('debería retornar false si no hay sesión', () => {
      expect(StorageService.existeSesion()).toBe(false);
    });

    it('debería retornar true si hay una sesión válida', () => {
      StorageService.guardarSesion(mockToken, mockUsuario);
      expect(StorageService.existeSesion()).toBe(true);
    });
  });
});
