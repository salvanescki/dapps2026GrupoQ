import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../src/services/storage.service';
import type { PerfilUsuario } from '../../src/types/auth.types';

const TOKEN_VALIDO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sig';

const usuarioBase: PerfilUsuario = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nombre: 'Inversor Prueba',
  correo: 'inversor@marketplace.com',
  activo: true,
  creadoEn: '2026-11-02T03:00:00.000Z',
};

describe('StorageService — Extensión retrocompatible de rol y saldo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('acepta sesiones legadas sin rol ni saldo preservando compatibilidad', () => {
    StorageService.guardarSesion(TOKEN_VALIDO, usuarioBase);
    const sesion = StorageService.obtenerSesion();

    expect(sesion).not.toBeNull();
    expect(sesion?.usuario).toEqual(usuarioBase);
    expect(sesion?.usuario.rol).toBeUndefined();
    expect(sesion?.usuario.saldo).toBeUndefined();
  });

  it('persiste y recupera sesiones con rol USUARIO y saldo >= 0 (incluyendo 0 y decimales)', () => {
    const usuarioConSaldo: PerfilUsuario = {
      ...usuarioBase,
      rol: 'USUARIO',
      saldo: 985.45,
    };

    StorageService.guardarSesion(TOKEN_VALIDO, usuarioConSaldo);
    const sesion = StorageService.obtenerSesion();

    expect(sesion?.usuario.rol).toBe('USUARIO');
    expect(sesion?.usuario.saldo).toBe(985.45);

    StorageService.guardarSesion(TOKEN_VALIDO, {
      ...usuarioBase,
      rol: 'ADMIN',
      saldo: 0,
    });
    const sesionAdmin = StorageService.obtenerSesion();
    expect(sesionAdmin?.usuario.rol).toBe('ADMIN');
    expect(sesionAdmin?.usuario.saldo).toBe(0);
  });

  it('rechaza valores de rol fuera del enum permitido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    StorageService.guardarSesion(TOKEN_VALIDO, {
      ...usuarioBase,
      rol: 'SUPERROOT' as unknown as 'ADMIN',
      saldo: 100,
    });

    expect(StorageService.obtenerSesion()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('rechaza saldo negativo tanto al guardar como al hidratar desde localStorage', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    StorageService.guardarSesion(TOKEN_VALIDO, {
      ...usuarioBase,
      rol: 'USUARIO',
      saldo: -0.01,
    });

    expect(StorageService.obtenerSesion()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    localStorage.setItem(
      'football_marketplace_session',
      JSON.stringify({
        tokenDeAcceso: TOKEN_VALIDO,
        usuario: { ...usuarioBase, rol: 'USUARIO', saldo: -50 },
        guardadoEn: Date.now(),
      }),
    );

    expect(StorageService.obtenerSesion()).toBeNull();
  });

  it('rechaza propiedades desconocidas gracias a .strict()', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    StorageService.guardarSesion(
      TOKEN_VALIDO,
      {
        ...usuarioBase,
        rol: 'USUARIO',
        saldo: 500,
        campoIntruso: true,
      } as unknown as PerfilUsuario,
    );

    expect(StorageService.obtenerSesion()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

