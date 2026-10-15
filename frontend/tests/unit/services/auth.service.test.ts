import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth.service';
import * as authApi from '../../../src/api/auth-api.client';
import { StorageService } from '../../../src/services/storage.service';
import { createMockUser, createMockAuthResponse } from '../../helpers/test-mock-factories';

vi.mock('../../../src/api/auth-api.client', () => ({
  loginUsuario: vi.fn(),
  registrarUsuario: vi.fn(),
  obtenerPerfilAutenticado: vi.fn(),
  HttpError: class HttpError extends Error {},
}));

describe('Frontend AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login() debe delegar a loginUsuario', async () => {
    const credenciales = { correo: 'a@b.com', contrasena: 'Pass123' };
    const mockRes = createMockAuthResponse();
    vi.mocked(authApi.loginUsuario).mockResolvedValueOnce(mockRes);

    const res = await AuthService.login(credenciales);
    expect(res).toBe(mockRes);
    expect(authApi.loginUsuario).toHaveBeenCalledWith(credenciales);
  });

  it('register() debe delegar a registrarUsuario', async () => {
    const datos = { nombre: 'User', correo: 'a@b.com', contrasena: 'Pass123' };
    const mockRes = createMockAuthResponse();
    vi.mocked(authApi.registrarUsuario).mockResolvedValueOnce(mockRes);

    const res = await AuthService.register(datos);
    expect(res).toBe(mockRes);
    expect(authApi.registrarUsuario).toHaveBeenCalledWith(datos);
  });

  it('getMe() debe delegar a obtenerPerfilAutenticado', async () => {
    const mockUser = createMockUser();
    vi.mocked(authApi.obtenerPerfilAutenticado).mockResolvedValueOnce(mockUser);

    const res = await AuthService.getMe('test-jwt');
    expect(res).toBe(mockUser);
    expect(authApi.obtenerPerfilAutenticado).toHaveBeenCalledWith('test-jwt');
  });

  it('logout() debe invocar StorageService.eliminarSesion', () => {
    const spy = vi.spyOn(StorageService, 'eliminarSesion');
    AuthService.logout();
    expect(spy).toHaveBeenCalled();
  });
});
