import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpRequest, HttpError } from '../../../src/api/http-client';

describe('http-client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('HttpError', () => {
    it('debe instanciar con codigoEstado y mensaje', () => {
      const err = new HttpError(404, 'No encontrado');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(HttpError);
      expect(err.codigoEstado).toBe(404);
      expect(err.message).toBe('No encontrado');
      expect(err.name).toBe('HttpError');
    });
  });

  describe('httpRequest', () => {
    it('debe realizar petición exitosa y parsear respuesta JSON', async () => {
      const mockData = { id: 1, name: 'Item Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockData),
      });

      const res = await httpRequest<typeof mockData>('/test-endpoint');

      expect(res).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test-endpoint', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('debe lanzar HttpError con codigo 0 si fetch falla a nivel de red', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(httpRequest('/network-failure')).rejects.toThrow(
        'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
      );
    });

    it('debe extraer mensaje del servidor cuando es un string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ mensaje: 'Datos inválidos' }),
      });

      await expect(httpRequest('/bad-request')).rejects.toThrow(
        'Datos inválidos'
      );
    });

    it('debe extraer y unir mensajes del servidor cuando es un arreglo de strings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          mensaje: ['El campo nombre es requerido.', 'El correo es inválido.'],
        }),
      });

      await expect(httpRequest('/bad-request-array')).rejects.toThrow(
        'El campo nombre es requerido. El correo es inválido.'
      );
    });

    it('debe usar mensaje por defecto si la respuesta de error no es JSON o no tiene campo mensaje', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(httpRequest('/server-error')).rejects.toThrow(
        'Error inesperado del servidor.'
      );
    });
  });
});
