import { describe, it, expect } from 'vitest';
import {
  construirResumenPatrimonial,
  enriquecerPosicionesPortfolio,
  reconstruirSeriePatrimonial,
} from '../../../src/utils/portfolio-chart';
import type {
  PortfolioUsuario,
  TransaccionUsuario,
} from '../../../src/types/marketplace.types';

describe('portfolio-chart utils (US3 — Reconstrucción Patrimonial en Centavos)', () => {
  it('maneja un usuario recién registrado con 0 operaciones sin NaN ni Infinity', () => {
    const portfolioVacio: PortfolioUsuario = {
      usuarioId: 'u-nuevo',
      saldoBilletera: 1000.0,
      valoracionTotalTokens: 0,
      patrimonioNetoTotal: 1000.0,
      posiciones: [],
    };

    const resumen = construirResumenPatrimonial(portfolioVacio, []);

    expect(resumen.sinOperaciones).toBe(true);
    expect(resumen.costoTotalAdquisicion).toBe(0);
    expect(resumen.gananciaLatenteConsolidada).toBe(0);
    expect(resumen.gananciaLatentePorcentaje).toBe(0);
    expect(Number.isNaN(resumen.gananciaLatentePorcentaje)).toBe(false);
    expect(resumen.tendenciaConsolidada).toBe('neutra');
    expect(resumen.serieTemporal).toHaveLength(1);
    expect(resumen.serieTemporal[0]).toMatchObject({
      etiquetaEjeX: 'Actual',
      saldoBilletera: 1000,
      valoracionTokens: 0,
      patrimonioNeto: 1000,
    });
  });

  it('enriquece posiciones calculando disponibles + enVenta y PnL positivo, negativo y neutro en centavos', () => {
    const posiciones = enriquecerPosicionesPortfolio([
      {
        jugadorId: 'j-pos',
        nombreJugador: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal FC',
        cantidadTokensDisponibles: 3,
        cantidadTokensEnVenta: 2, // total = 5
        precioPromedioAdquisicion: 1.5, // costo = 7.50
        cotizacionActual: 1.8,
        valoracionTotalPosicion: 9.0, // PnL = +1.50 (+20.00%)
      },
      {
        jugadorId: 'j-neg',
        nombreJugador: 'Luka Modric',
        posicion: 'Mediocampista',
        equipoNombre: 'Real Madrid CF',
        cantidadTokensDisponibles: 4,
        cantidadTokensEnVenta: 0,
        precioPromedioAdquisicion: 2.0, // costo = 8.00
        cotizacionActual: 1.75,
        valoracionTotalPosicion: 7.0, // PnL = -1.00 (-12.50%)
      },
      {
        jugadorId: 'j-neu',
        nombreJugador: 'Thibaut Courtois',
        posicion: 'Portero',
        equipoNombre: 'Real Madrid CF',
        cantidadTokensDisponibles: 2,
        cantidadTokensEnVenta: 0,
        precioPromedioAdquisicion: 1.0, // costo = 2.00
        cotizacionActual: 1.0,
        valoracionTotalPosicion: 2.0, // PnL = 0 (0%)
      },
    ]);

    expect(posiciones[0]).toMatchObject({
      cantidadTotalTenencia: 5,
      costoTotalAdquisicion: 7.5,
      gananciaLatenteCreditos: 1.5,
      gananciaLatentePorcentaje: 20,
      tendencia: 'positiva',
    });
    expect(posiciones[1]).toMatchObject({
      cantidadTotalTenencia: 4,
      costoTotalAdquisicion: 8.0,
      gananciaLatenteCreditos: -1.0,
      gananciaLatentePorcentaje: -12.5,
      tendencia: 'negativa',
    });
    expect(posiciones[2]).toMatchObject({
      cantidadTotalTenencia: 2,
      costoTotalAdquisicion: 2.0,
      gananciaLatenteCreditos: 0,
      gananciaLatentePorcentaje: 0,
      tendencia: 'neutra',
    });
  });

  it('reconstruye serie con 1 operación convergiendo exactamente en Valoración actual', () => {
    const portfolio: PortfolioUsuario = {
      usuarioId: 'u-1',
      saldoBilletera: 992.5,
      valoracionTotalTokens: 9.25, // cotización subió a 1.85
      patrimonioNetoTotal: 1001.75,
      posiciones: [
        {
          jugadorId: 'j-saka',
          nombreJugador: 'Bukayo Saka',
          posicion: 'Delantero',
          equipoNombre: 'Arsenal FC',
          cantidadTokensDisponibles: 5,
          cantidadTokensEnVenta: 0,
          precioPromedioAdquisicion: 1.5,
          cotizacionActual: 1.85,
          valoracionTotalPosicion: 9.25,
        },
      ],
    };

    const txUnica: TransaccionUsuario[] = [
      {
        transaccionId: 'tx-1',
        ordenId: 'ord-1',
        tipoOperacion: 'COMPRA',
        tipoMercado: 'PRIMARIO',
        jugadorId: 'j-saka',
        nombreJugador: 'Bukayo Saka',
        cantidadTokens: 5,
        precioUnitario: 1.5,
        montoTotal: 7.5,
        estrategiaCotizacion: 'GLOBAL_v1',
        contraparte: 'MERCADO_PRIMARIO',
        fecha: '2026-10-18T10:00:00.000Z',
      },
    ];

    const serie = reconstruirSeriePatrimonial(portfolio, txUnica);

    // Inicio (1000,00 efectivo) -> Compra 5x Saka (992,50 + 7,50 = 1000,00) -> Valoración actual (992,50 + 9,25 = 1001,75)
    expect(serie.length).toBeGreaterThanOrEqual(3);
    expect(serie[0].saldoBilletera).toBe(1000.0);
    expect(serie[0].patrimonioNeto).toBe(1000.0);

    const ultimo = serie[serie.length - 1];
    expect(ultimo.hitoOperativo).toBe('Valoración actual');
    expect(ultimo.saldoBilletera).toBe(portfolio.saldoBilletera);
    expect(ultimo.valoracionTokens).toBe(portfolio.valoracionTotalTokens);
    expect(ultimo.patrimonioNeto).toBe(portfolio.patrimonioNetoTotal);
  });

  it('reconstruye N operaciones COMPRA/VENTA en PRIMARIO/SECUNDARIO con desempate determinista por transaccionId', () => {
    // Escenario:
    // Inicio: 1000.00 cr.
    // tx-a (10:00): COMPRA 10 Saka @ 1.50 (-15.00) -> saldo 985.00, Saka = 10
    // tx-b (10:00, mismo instante, desempate por transaccionId): COMPRA 4 Modric @ 2.00 (-8.00) -> saldo 977.00, Modric = 4
    // tx-c (14:00): VENTA secundaria 3 Saka @ 2.10 (+6.30) -> saldo 983.30, Saka = 7 (5 disp + 2 custodia)
    const portfolio: PortfolioUsuario = {
      usuarioId: 'u-1',
      saldoBilletera: 983.3,
      valoracionTotalTokens: 21.75, // 7 Saka @ 1.95 (13.65) + 4 Modric @ 2.025 -> usemos 2.00 (8.00) => 21.65
      patrimonioNetoTotal: 1004.95,
      posiciones: [
        {
          jugadorId: 'j-saka',
          nombreJugador: 'Bukayo Saka',
          posicion: 'Delantero',
          equipoNombre: 'Arsenal FC',
          cantidadTokensDisponibles: 5,
          cantidadTokensEnVenta: 2,
          precioPromedioAdquisicion: 1.5,
          cotizacionActual: 1.95,
          valoracionTotalPosicion: 13.65,
        },
        {
          jugadorId: 'j-modric',
          nombreJugador: 'Luka Modric',
          posicion: 'Mediocampista',
          equipoNombre: 'Real Madrid CF',
          cantidadTokensDisponibles: 4,
          cantidadTokensEnVenta: 0,
          precioPromedioAdquisicion: 2.0,
          cotizacionActual: 2.025,
          valoracionTotalPosicion: 8.1,
        },
      ],
    };
    portfolio.patrimonioNetoTotal = 1005.05; // 983.30 + 21.75

    // Entregadas en orden DESC (como responde el backend) y con empate de timestamp entre tx-a y tx-b
    const transaccionesDesc: TransaccionUsuario[] = [
      {
        transaccionId: 'tx-c',
        ordenId: 'o-3',
        tipoOperacion: 'VENTA',
        tipoMercado: 'SECUNDARIO',
        jugadorId: 'j-saka',
        nombreJugador: 'Bukayo Saka',
        cantidadTokens: 3,
        precioUnitario: 2.1,
        montoTotal: 6.3,
        estrategiaCotizacion: 'MERCADO_SECUNDARIO',
        contraparte: 'user-comprador',
        fecha: '2026-10-19T14:00:00.000Z',
      },
      {
        transaccionId: 'tx-b',
        ordenId: 'o-2',
        tipoOperacion: 'COMPRA',
        tipoMercado: 'PRIMARIO',
        jugadorId: 'j-modric',
        nombreJugador: 'Luka Modric',
        cantidadTokens: 4,
        precioUnitario: 2.0,
        montoTotal: 8.0,
        estrategiaCotizacion: 'GLOBAL_v1',
        contraparte: 'MERCADO_PRIMARIO',
        fecha: '2026-10-18T10:00:00.000Z',
      },
      {
        transaccionId: 'tx-a',
        ordenId: 'o-1',
        tipoOperacion: 'COMPRA',
        tipoMercado: 'PRIMARIO',
        jugadorId: 'j-saka',
        nombreJugador: 'Bukayo Saka',
        cantidadTokens: 10,
        precioUnitario: 1.5,
        montoTotal: 15.0,
        estrategiaCotizacion: 'GLOBAL_v1',
        contraparte: 'MERCADO_PRIMARIO',
        fecha: '2026-10-18T10:00:00.000Z',
      },
    ];

    const copiaIds = transaccionesDesc.map((t) => t.transaccionId);
    const resumen = construirResumenPatrimonial(portfolio, transaccionesDesc);

    // No muta el arreglo recibido
    expect(transaccionesDesc.map((t) => t.transaccionId)).toEqual(copiaIds);
    expect(resumen.sinOperaciones).toBe(false);

    // El punto inicial reconstruye exactamente 1000,00 cr.
    expect(resumen.serieTemporal[0].saldoBilletera).toBe(1000.0);
    // Tras tx-a: 985.00; tras tx-b: 977.00; tras tx-c: 983.30
    expect(resumen.serieTemporal[1].saldoBilletera).toBe(985.0);
    expect(resumen.serieTemporal[2].saldoBilletera).toBe(977.0);
    expect(resumen.serieTemporal[3].saldoBilletera).toBe(983.3);

    // Convergencia 100% exacta en Valoración actual
    const final = resumen.serieTemporal[resumen.serieTemporal.length - 1];
    expect(final.hitoOperativo).toBe('Valoración actual');
    expect(final.saldoBilletera).toBe(portfolio.saldoBilletera);
    expect(final.valoracionTokens).toBe(portfolio.valoracionTotalTokens);
    expect(final.patrimonioNeto).toBe(portfolio.patrimonioNetoTotal);
  });
});

