import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as httpClient from '../../../src/api/http-client';
import {
  loginUsuario,
  obtenerPerfilAutenticado,
  registrarUsuario,
} from '../../../src/api/auth-api.client';
import {
  getPlayers,
  getPlayerById,
  getPlayerFilterOptions,
} from '../../../src/api/playersApi';

vi.mock('../../../src/api/http-client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/http-client')>(
    '../../../src/api/http-client'
  );
  return {
    ...actual,
    httpRequest: vi.fn(),
  };
});

describe('API Clients Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth-api.client', () => {
    it('loginUsuario debe invocar /auth/login con POST y credenciales serializadas', async () => {
      const credenciales = { correo: 'test@ejemplo.com', contrasena: 'Pass1234' };
      const respuestaMock = { tokenDeAcceso: 'jwt', tipo: 'Bearer', usuario: {} as any };
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce(respuestaMock);

      const resultado = await loginUsuario(credenciales);

      expect(resultado).toBe(respuestaMock);
      expect(httpClient.httpRequest).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciales),
      });
    });

    it('obtenerPerfilAutenticado debe enviar header Authorization Bearer a /auth/me', async () => {
      const perfilMock = { id: 'u-1', nombre: 'Test', correo: 'a@b.com', activo: true, creadoEn: '' };
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce(perfilMock);

      const resultado = await obtenerPerfilAutenticado('mi-token-jwt');

      expect(resultado).toBe(perfilMock);
      expect(httpClient.httpRequest).toHaveBeenCalledWith('/auth/me', {
        headers: {
          Authorization: 'Bearer mi-token-jwt',
        },
      });
    });

    it('registrarUsuario debe llamar /auth/register y mapear errores 409, 400, 500 adecuadamente', async () => {
      const datos = { nombre: 'Test User', correo: 'test@ejemplo.com', contrasena: 'Pass1234' };

      // Caso 409 Conflict
      vi.mocked(httpClient.httpRequest).mockRejectedValueOnce(
        new httpClient.HttpError(409, 'Conflict original')
      );
      await expect(registrarUsuario(datos)).rejects.toThrow(
        'El correo electrónico ya se encuentra registrado. Intenta iniciar sesión o utiliza otra dirección.'
      );

      // Caso 400 Bad Request
      const error400 = new httpClient.HttpError(400, 'Nombre muy corto');
      vi.mocked(httpClient.httpRequest).mockRejectedValueOnce(error400);
      await expect(registrarUsuario(datos)).rejects.toThrow(error400);

      // Caso 500 Server Error
      vi.mocked(httpClient.httpRequest).mockRejectedValueOnce(
        new httpClient.HttpError(500, 'Database dead')
      );
      await expect(registrarUsuario(datos)).rejects.toThrow(
        'Ocurrió un error inesperado en el servidor. Por favor intenta nuevamente más tarde.'
      );

      // Caso Error genérico no HttpError
      vi.mocked(httpClient.httpRequest).mockRejectedValueOnce(new Error('Unknown crash'));
      await expect(registrarUsuario(datos)).rejects.toThrow('Unknown crash');
    });
  });

  describe('playersApi', () => {
    it('getPlayers debe construir query string con todos los parámetros opcionales', async () => {
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce({ items: [], total: 0 } as any);

      await getPlayers({
        page: 2,
        limit: 15,
        league: 'PL',
        teamId: 't-1',
        position: 'Delantero',
        search: ' Haaland ',
      });

      expect(httpClient.httpRequest).toHaveBeenCalledWith(
        '/players?page=2&limit=15&league=PL&teamId=t-1&position=Delantero&search=Haaland'
      );
    });

    it('getPlayers sin parámetros debe consultar /players sin query string', async () => {
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce({ items: [], total: 0 } as any);

      await getPlayers({});

      expect(httpClient.httpRequest).toHaveBeenCalledWith('/players');
    });

    it('getPlayerById debe consultar endpoint por ID', async () => {
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce({ id: 'p-1' } as any);

      const res = await getPlayerById('p-1');
      expect(res).toEqual({ id: 'p-1' });
      expect(httpClient.httpRequest).toHaveBeenCalledWith('/players/p-1');
    });

    it('getPlayerFilterOptions debe consultar endpoint /players/filters', async () => {
      vi.mocked(httpClient.httpRequest).mockResolvedValueOnce({ ligas: [], equipos: [], posiciones: [] } as any);

      await getPlayerFilterOptions();
      expect(httpClient.httpRequest).toHaveBeenCalledWith('/players/filters');
    });
  });
});
