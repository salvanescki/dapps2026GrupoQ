import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpRequest, HttpError } from '../../../src/api/http-client';
import {
  obtenerRankingJugadores,
  obtenerHistorialCotizaciones,
  obtenerEstrategiaActiva,
} from '../../../src/api/marketplaceApi';
import {
  listarOrdenesVenta,
  comprarTokens,
  publicarOrdenVenta,
  cancelarOrdenVenta,
} from '../../../src/api/ordersApi';
import {
  obtenerPortfolioUsuario,
  obtenerTransaccionesUsuario,
} from '../../../src/api/portfolioApi';
import {
  cambiarEstrategiaMercado,
  ejecutarRecalculoManual,
  obtenerTransaccionesAuditoria,
} from '../../../src/api/adminApi';

describe('Clientes HTTP/REST del Marketplace y preservación de cabeceras', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('preserva Content-Type: application/json cuando se envía Authorization Bearer en httpRequest', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    globalThis.fetch = mockFetch;

    await httpRequest('/orders/buy', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-token-123' },
      body: JSON.stringify({ jugadorId: 'j1', cantidad: 2 }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/orders/buy',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token-123',
        },
      }),
    );
  });

  it('propaga intacto AbortError cuando una petición en vuelo es cancelada', async () => {
    const abortErr = new DOMException('The operation was aborted.', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValue(abortErr);

    await expect(httpRequest('/players/ranking')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  describe('marketplaceApi', () => {
    it('omite posicion cuando es Todas y acota limite entre 1 y 100 con default 20 en obtenerRankingJugadores', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      });
      globalThis.fetch = mockFetch;

      await obtenerRankingJugadores({ posicion: 'Todas', limite: 250 });
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/players/ranking?limite=100',
        expect.anything(),
      );

      await obtenerRankingJugadores({ posicion: 'Delantero', limite: 0 });
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/players/ranking?limite=1&posicion=Delantero',
        expect.anything(),
      );

      await obtenerRankingJugadores();
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/players/ranking?limite=20',
        expect.anything(),
      );
    });

    it('consulta historial de cotizaciones acotando limite 1..100 (default 50) y estrategia activa', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      });
      globalThis.fetch = mockFetch;

      await obtenerHistorialCotizaciones('uuid-j1', 500);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/players/uuid-j1/quotes?limite=100',
        expect.anything(),
      );

      await obtenerHistorialCotizaciones('uuid-j1');
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/players/uuid-j1/quotes?limite=50',
        expect.anything(),
      );

      await obtenerEstrategiaActiva();
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/quotes/strategy',
        expect.anything(),
      );
    });
  });

  describe('ordersApi', () => {
    it('lista ordenes acotando limite 1..100 y envia siempre jugadorId en POST /orders/buy omitiendo precioMaximoUnitario vacio', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });
      globalThis.fetch = mockFetch;

      await listarOrdenesVenta({
        jugadorId: 'j-1',
        estado: 'ACTIVA',
        limite: 999,
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/orders?jugadorId=j-1&estado=ACTIVA&limite=100',
        expect.anything(),
      );

      await comprarTokens('tok-1', {
        jugadorId: 'j-1',
        cantidad: 3,
        precioMaximoUnitario: undefined,
      });
      const [, buyPrimaryOpts] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(JSON.parse(buyPrimaryOpts.body as string)).toEqual({
        jugadorId: 'j-1',
        cantidad: 3,
      });
      expect(buyPrimaryOpts.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-1',
      });

      await comprarTokens('tok-2', {
        jugadorId: 'j-1',
        cantidad: 2,
        ordenVentaId: 'ord-9',
        precioMaximoUnitario: 2.45,
      });
      const [, buySecondaryOpts] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(JSON.parse(buySecondaryOpts.body as string)).toEqual({
        jugadorId: 'j-1',
        cantidad: 2,
        ordenVentaId: 'ord-9',
        precioMaximoUnitario: 2.45,
      });
    });

    it('publica orden de venta (POST /orders/sell) y cancela orden (DELETE /orders/:id)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ ordenId: 'o1', estado: 'PENDIENTE' }),
      });
      globalThis.fetch = mockFetch;

      await publicarOrdenVenta('tok-sell', {
        jugadorId: 'j-1',
        cantidad: 4,
        precioUnitario: 1.85,
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/orders/sell',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-sell',
          },
          body: JSON.stringify({
            jugadorId: 'j-1',
            cantidad: 4,
            precioUnitario: 1.85,
          }),
        }),
      );

      await cancelarOrdenVenta('tok-sell', 'ord-77');
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/orders/ord-77',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-sell',
          },
        }),
      );
    });
  });

  describe('portfolioApi y adminApi', () => {
    it('acota limite a 1..100 en obtenerTransaccionesUsuario y normaliza fechas desde/hasta ISO', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      });
      globalThis.fetch = mockFetch;

      await obtenerPortfolioUsuario('tok-u', 'u-1');
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/users/u-1/portfolio',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok-u',
          },
        }),
      );

      await obtenerTransaccionesUsuario('tok-u', 'u-1', {
        tipo: 'COMPRA',
        desde: '2026-11-01',
        hasta: '2026-11-02',
        limite: 300,
      });
      const [calledUrl] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(calledUrl).toContain('/api/users/u-1/transactions?');
      expect(calledUrl).toContain('tipo=COMPRA');
      expect(calledUrl).toContain('limite=100');
      expect(calledUrl).toContain(encodeURIComponent('2026-11-01T00:00:00.000Z'));
      expect(calledUrl).toContain(encodeURIComponent('2026-11-02T23:59:59.999Z'));
    });

    it('omite body en POST /quotes/recalculate, acota limite a 1..200 y omite filtros vacios en adminApi', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });
      globalThis.fetch = mockFetch;

      await cambiarEstrategiaMercado('tok-admin', 'POSICIONAL');
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/quotes/strategy',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ estrategiaId: 'POSICIONAL' }),
        }),
      );

      await ejecutarRecalculoManual('tok-admin');
      const [, recalcOpts] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(recalcOpts.method).toBe('POST');
      expect(recalcOpts.body).toBeUndefined();

      await obtenerTransaccionesAuditoria('tok-admin', {
        jugadorId: '   ',
        usuarioId: '',
        tipoMercado: 'SECUNDARIO',
        limite: 999,
      });
      const [auditUrl] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(auditUrl).toBe('/api/admin/transactions?tipoMercado=SECUNDARIO&limite=200');
    });
  });

  describe('Mapeo de errores HTTP (400, 401, 403, 404, 409) y error de red (0)', () => {
    it.each([
      [400, 'Saldo monetario insuficiente.'],
      [401, 'No autorizado.'],
      [403, 'Acceso restringido al rol ADMIN.'],
      [404, 'La orden de venta solicitada no existe.'],
      [409, 'La orden ya fue completada o cancelada por otro inversor.'],
    ])('mapea HTTP %i a HttpError con mensaje en español', async (status, mensaje) => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: vi.fn().mockResolvedValue({
          codigoEstado: status,
          mensaje,
          marcaDeTiempo: '2026-11-02T03:00:00.000Z',
        }),
      });

      await expect(
        comprarTokens('tok', { jugadorId: 'j1', cantidad: 1 }),
      ).rejects.toMatchObject({
        name: 'HttpError',
        codigoEstado: status,
        message: mensaje,
      });
    });

    it('mapea fallo de red a HttpError con codigoEstado 0 en español', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network down'));

      try {
        await obtenerEstrategiaActiva();
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).codigoEstado).toBe(0);
        expect((err as HttpError).message).toContain('No fue posible conectar');
      }
    });
  });
});

