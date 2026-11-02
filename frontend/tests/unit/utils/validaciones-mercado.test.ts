import { describe, it, expect } from 'vitest';
import {
  esEnteroPositivo,
  tieneMaximoDosDecimales,
  validarCambioEstrategia,
  validarCompraSecundaria,
  validarFiltrosAuditoriaAdmin,
  validarOrdenCompraPrimaria,
  validarPublicacionOrdenVenta,
} from '../../../src/utils/validaciones-mercado';

describe('validaciones-mercado utils (US2 — Compra Primaria)', () => {
  describe('esEnteroPositivo', () => {
    it('acepta enteros >= 1 y rechaza 0, negativos, decimales, NaN e infinitos', () => {
      expect(esEnteroPositivo(1)).toBe(true);
      expect(esEnteroPositivo(100)).toBe(true);
      expect(esEnteroPositivo(0)).toBe(false);
      expect(esEnteroPositivo(-3)).toBe(false);
      expect(esEnteroPositivo(1.5)).toBe(false);
      expect(esEnteroPositivo(Number.NaN)).toBe(false);
      expect(esEnteroPositivo(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe('tieneMaximoDosDecimales', () => {
    it('acepta montos positivos con hasta 2 decimales y rechaza <= 0 o > 2 decimales', () => {
      expect(tieneMaximoDosDecimales(1)).toBe(true);
      expect(tieneMaximoDosDecimales(1.8)).toBe(true);
      expect(tieneMaximoDosDecimales(12.75)).toBe(true);
      expect(tieneMaximoDosDecimales(0)).toBe(false);
      expect(tieneMaximoDosDecimales(-2.5)).toBe(false);
      expect(tieneMaximoDosDecimales(1.239)).toBe(false);
      expect(tieneMaximoDosDecimales(Number.NaN)).toBe(false);
    });
  });

  describe('validarOrdenCompraPrimaria', () => {
    it('bloquea preventivamente la autocompra primaria cuando rol === ADMIN', () => {
      const res = validarOrdenCompraPrimaria({
        cantidad: 2,
        cotizacionActual: 1.5,
        stockPrimarioConocido: 80,
        saldoDisponible: 1000,
        rol: 'ADMIN',
      });

      expect(res.esValido).toBe(false);
      expect(res.bloqueadoAdmin).toBe(true);
      expect(res.error).toMatch(/Administradora.*no puede autocomprar/i);
    });

    it('informa agotamiento de inventario primario cuando stockPrimarioConocido === 0', () => {
      const res = validarOrdenCompraPrimaria({
        cantidad: 1,
        cotizacionActual: 2.0,
        stockPrimarioConocido: 0,
        saldoDisponible: 500,
        rol: 'USUARIO',
      });

      expect(res.esValido).toBe(false);
      expect(res.agotadoPrimario).toBe(true);
      expect(res.error).toMatch(/agotado|mercado secundario/i);
    });

    it('rechaza cantidades vacías, decimales, 0 o negativas', () => {
      for (const invalida of [0, -1, 2.5, Number.NaN]) {
        const res = validarOrdenCompraPrimaria({
          cantidad: invalida,
          cotizacionActual: 1.5,
          stockPrimarioConocido: 50,
          saldoDisponible: 500,
          rol: 'USUARIO',
        });
        expect(res.esValido).toBe(false);
        expect(res.error).toMatch(/cantidad entera de al menos 1 token/i);
      }
    });

    it('rechaza cantidad que supera el stockPrimarioConocido disponible (/ 100)', () => {
      const res = validarOrdenCompraPrimaria({
        cantidad: 15,
        cotizacionActual: 1.5,
        stockPrimarioConocido: 10,
        saldoDisponible: 1000,
        rol: 'USUARIO',
      });

      expect(res.esValido).toBe(false);
      expect(res.error).toMatch(/supera los tokens disponibles en emisión primaria \(10\)/i);
    });

    it('valida precioMaximoUnitario opcional (> 0, <= 2 decimales y >= cotizacionActual)', () => {
      const menorACotizacion = validarOrdenCompraPrimaria({
        cantidad: 2,
        cotizacionActual: 1.85,
        stockPrimarioConocido: 50,
        precioMaximoUnitario: 1.8,
        saldoDisponible: 500,
        rol: 'USUARIO',
      });
      expect(menorACotizacion.esValido).toBe(false);
      expect(menorACotizacion.error).toMatch(/precio máximo/i);

      const tresDecimales = validarOrdenCompraPrimaria({
        cantidad: 2,
        cotizacionActual: 1.85,
        stockPrimarioConocido: 50,
        precioMaximoUnitario: 1.955,
        saldoDisponible: 500,
        rol: 'USUARIO',
      });
      expect(tresDecimales.esValido).toBe(false);

      const valido = validarOrdenCompraPrimaria({
        cantidad: 2,
        cotizacionActual: 1.85,
        stockPrimarioConocido: 50,
        precioMaximoUnitario: 1.9,
        saldoDisponible: 500,
        rol: 'USUARIO',
      });
      expect(valido.esValido).toBe(true);
      expect(valido.costoEstimado).toBe(3.7);
    });

    it('bloquea la orden cuando costoEstimado supera saldoDisponible', () => {
      const res = validarOrdenCompraPrimaria({
        cantidad: 10,
        cotizacionActual: 2.5,
        stockPrimarioConocido: 50,
        saldoDisponible: 24.99,
        rol: 'USUARIO',
      });

      expect(res.esValido).toBe(false);
      expect(res.costoEstimado).toBe(25);
      expect(res.error).toMatch(/Saldo insuficiente/i);
    });

    it('aprueba una orden válida calculando costoEstimado exacto al centavo', () => {
      const res = validarOrdenCompraPrimaria({
        cantidad: 3,
        cotizacionActual: 1.85,
        stockPrimarioConocido: 82,
        saldoDisponible: 100,
        rol: 'USUARIO',
      });

      expect(res.esValido).toBe(true);
      expect(res.error).toBeNull();
      expect(res.costoEstimado).toBe(5.55);
    });
  });

  describe('validarPublicacionOrdenVenta (US4 — Mercado Secundario)', () => {
    it('exige cantidad entera >= 1 y <= cantidadTokensDisponibles libre de custodia', () => {
      expect(
        validarPublicacionOrdenVenta({
          cantidad: 0,
          precioUnitario: 1.8,
          cantidadTokensDisponibles: 5,
        }).esValido,
      ).toBe(false);

      expect(
        validarPublicacionOrdenVenta({
          cantidad: 2.5,
          precioUnitario: 1.8,
          cantidadTokensDisponibles: 5,
        }).esValido,
      ).toBe(false);

      const exceso = validarPublicacionOrdenVenta({
        cantidad: 6,
        precioUnitario: 1.8,
        cantidadTokensDisponibles: 5,
      });
      expect(exceso.esValido).toBe(false);
      expect(exceso.error).toMatch(/Solo puedes ofertar hasta 5 tokens libres de custodia/i);
    });

    it('exige precioUnitario > 0 con hasta 2 decimales exactos y calcula ingresoBrutoEstimado en centavos', () => {
      expect(
        validarPublicacionOrdenVenta({
          cantidad: 2,
          precioUnitario: 0,
          cantidadTokensDisponibles: 5,
        }).esValido,
      ).toBe(false);

      expect(
        validarPublicacionOrdenVenta({
          cantidad: 2,
          precioUnitario: 1.855,
          cantidadTokensDisponibles: 5,
        }).esValido,
      ).toBe(false);

      const ok = validarPublicacionOrdenVenta({
        cantidad: 3,
        precioUnitario: 1.8,
        cantidadTokensDisponibles: 5,
      });
      expect(ok.esValido).toBe(true);
      expect(ok.ingresoBrutoEstimado).toBe(5.4);
    });
  });

  describe('validarCompraSecundaria (US4 — Libro de Órdenes P2P)', () => {
    const ordenBase = {
      ordenId: 'ord-sec-1',
      jugadorId: 'jug-saka',
      vendedorId: 'seller-1',
      cantidad: 5,
      cantidadRestante: 3,
      precioUnitario: 1.8,
      estado: 'PARCIAL' as const,
      creadoEn: '2026-10-20T10:00:00.000Z',
      actualizadoEn: '2026-10-20T11:00:00.000Z',
    };

    it('bloquea autocompra cuando orden.vendedorId === usuarioId', () => {
      const res = validarCompraSecundaria({
        orden: ordenBase,
        cantidad: 1,
        usuarioId: 'seller-1',
        saldoDisponible: 500,
      });
      expect(res.esValido).toBe(false);
      expect(res.bloqueadoAutocompra).toBe(true);
      expect(res.error).toMatch(/propia oferta|autocomprar/i);
    });

    it('exige cantidad entera entre 1 y orden.cantidadRestante y verifica saldoDisponible', () => {
      expect(
        validarCompraSecundaria({
          orden: ordenBase,
          cantidad: 0,
          usuarioId: 'buyer-2',
          saldoDisponible: 500,
        }).esValido,
      ).toBe(false);

      const superaRemanente = validarCompraSecundaria({
        orden: ordenBase,
        cantidad: 4,
        usuarioId: 'buyer-2',
        saldoDisponible: 500,
      });
      expect(superaRemanente.esValido).toBe(false);
      expect(superaRemanente.error).toMatch(/remanente disponible.*\(3\)/i);

      const sinSaldo = validarCompraSecundaria({
        orden: ordenBase,
        cantidad: 3,
        usuarioId: 'buyer-2',
        saldoDisponible: 5.0,
      });
      expect(sinSaldo.esValido).toBe(false);
      expect(sinSaldo.costoEstimado).toBe(5.4);
      expect(sinSaldo.error).toMatch(/Saldo insuficiente/i);

      const valida = validarCompraSecundaria({
        orden: ordenBase,
        cantidad: 2,
        usuarioId: 'buyer-2',
        saldoDisponible: 10.0,
      });
      expect(valida.esValido).toBe(true);
      expect(valida.costoEstimado).toBe(3.6);
    });
  });

  describe('validarFiltrosAuditoriaAdmin y validarCambioEstrategia (US5 — Gobernanza ADMIN)', () => {
    const uuidValido1 = '123e4567-e89b-42d3-a456-426614174000';
    const uuidValido2 = '987e6543-e21b-43d3-b654-426614174999';

    it('acepta filtros vacíos o con UUID v4 válidos, tipoMercado válido, desde <= hasta y limite 1..200', () => {
      expect(validarFiltrosAuditoriaAdmin({})).toMatchObject({
        esValido: true,
        error: null,
      });

      const completo = validarFiltrosAuditoriaAdmin({
        jugadorId: uuidValido1,
        usuarioId: uuidValido2,
        tipoMercado: 'SECUNDARIO',
        desde: '2026-10-01',
        hasta: '2026-10-31',
        limite: 150,
      });
      expect(completo.esValido).toBe(true);
    });

    it('rechaza jugadorId o usuarioId que no respeten formato UUID v4', () => {
      const jugInvalido = validarFiltrosAuditoriaAdmin({
        jugadorId: 'no-es-un-uuid',
      });
      expect(jugInvalido.esValido).toBe(false);
      expect(jugInvalido.error).toMatch(/UUID v4/i);

      const usrInvalido = validarFiltrosAuditoriaAdmin({
        usuarioId: '12345',
      });
      expect(usrInvalido.esValido).toBe(false);
      expect(usrInvalido.error).toMatch(/UUID v4/i);
    });

    it('rechaza desde > hasta y limite fuera de 1..200', () => {
      const fechasInv = validarFiltrosAuditoriaAdmin({
        desde: '2026-11-10',
        hasta: '2026-11-01',
      });
      expect(fechasInv.esValido).toBe(false);
      expect(fechasInv.error).toMatch(/Desde.*posterior.*Hasta/i);

      expect(validarFiltrosAuditoriaAdmin({ limite: 0 }).esValido).toBe(false);
      expect(validarFiltrosAuditoriaAdmin({ limite: 201 }).esValido).toBe(false);
    });

    it('valida estrategiaId dentro de GLOBAL | POSICIONAL y detecta estrategia ya activa', () => {
      expect(
        validarCambioEstrategia('DESCONOCIDA' as never, 'GLOBAL').esValido,
      ).toBe(false);

      const misma = validarCambioEstrategia('GLOBAL', 'GLOBAL');
      expect(misma.esValido).toBe(false);
      expect(misma.error).toMatch(/ya se encuentra activa/i);

      const cambioOk = validarCambioEstrategia('POSICIONAL', 'GLOBAL');
      expect(cambioOk.esValido).toBe(true);
    });
  });
});
