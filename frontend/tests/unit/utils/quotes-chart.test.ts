import { describe, it, expect } from 'vitest';
import {
  calcularDominioCotizacion,
  prepararSerieCotizaciones,
} from '../../../src/utils/quotes-chart';
import type { CotizacionJugador } from '../../../src/types/marketplace.types';

function crearCotizacion(
  parcial: Partial<CotizacionJugador> & Pick<CotizacionJugador, 'id' | 'valor' | 'fechaCotizacion'>,
): CotizacionJugador {
  return {
    id: parcial.id,
    jugadorId: parcial.jugadorId ?? 'jug-1',
    score: parcial.score ?? 0.65,
    valor: parcial.valor,
    estrategiaId: parcial.estrategiaId ?? 'GLOBAL',
    estrategiaVersion: parcial.estrategiaVersion ?? 'GLOBAL_v1',
    sinEstadisticas: parcial.sinEstadisticas ?? false,
    metricas: parcial.metricas ?? null,
    fechaCotizacion: parcial.fechaCotizacion,
  };
}

describe('quotes-chart utils (US2 — Gráfica Lineal de Cotizaciones)', () => {
  describe('calcularDominioCotizacion', () => {
    it('retorna [0, 1] cuando el arreglo de valores está vacío', () => {
      expect(calcularDominioCotizacion([])).toEqual([0, 1]);
    });

    it('aplica margen simétrico +-0.10 cuando todos los puntos tienen el mismo valor', () => {
      expect(calcularDominioCotizacion([1.5, 1.5, 1.5])).toEqual([1.4, 1.6]);
      expect(calcularDominioCotizacion([1.0])).toEqual([0.9, 1.1]);
    });

    it('nunca produce un límite inferior negativo cuando el valor es cercano a 0', () => {
      const [min, max] = calcularDominioCotizacion([0.05]);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeCloseTo(0.15, 2);
    });

    it('calcula dominio holgado cuando existen distintos valores de cotización', () => {
      const [min, max] = calcularDominioCotizacion([1.2, 1.8, 2.4]);
      expect(min).toBeLessThan(1.2);
      expect(max).toBeGreaterThan(2.4);
    });
  });

  describe('prepararSerieCotizaciones', () => {
    it('maneja 0 registros retornando puntos vacíos, cotizacionVigente null y esHistorialUnico false', () => {
      const res = prepararSerieCotizaciones([]);
      expect(res.puntos).toEqual([]);
      expect(res.cotizacionVigente).toBeNull();
      expect(res.esHistorialUnico).toBe(false);
      expect(res.dominioY).toEqual([0, 1]);
    });

    it('maneja 1 único registro marcando esHistorialUnico: true y margen +-0.10', () => {
      const unica = crearCotizacion({
        id: 'cot-1',
        valor: 1.0,
        score: 0,
        sinEstadisticas: true,
        fechaCotizacion: '2026-10-10T10:00:00.000Z',
      });

      const res = prepararSerieCotizaciones([unica]);
      expect(res.esHistorialUnico).toBe(true);
      expect(res.cotizacionVigente?.id).toBe('cot-1');
      expect(res.dominioY).toEqual([0.9, 1.1]);
      expect(res.puntos).toHaveLength(1);
      expect(res.puntos[0].sinEstadisticas).toBe(true);
    });

    it('invierte de forma inmutable el historial DESC del backend hacia orden cronológico ASC', () => {
      const entradaDesc: CotizacionJugador[] = [
        crearCotizacion({
          id: 'cot-3',
          valor: 1.95,
          score: 0.84,
          estrategiaVersion: 'POSICIONAL_v1',
          fechaCotizacion: '2026-10-12T12:00:00.000Z',
        }),
        crearCotizacion({
          id: 'cot-2',
          valor: 1.75,
          score: 0.72,
          estrategiaVersion: 'GLOBAL_v1',
          fechaCotizacion: '2026-10-11T12:00:00.000Z',
        }),
        crearCotizacion({
          id: 'cot-1',
          valor: 1.5,
          score: 0.61,
          estrategiaVersion: 'GLOBAL_v1',
          fechaCotizacion: '2026-10-10T12:00:00.000Z',
        }),
      ];
      const copiaOriginalIds = entradaDesc.map((c) => c.id);

      const res = prepararSerieCotizaciones(entradaDesc);

      // No muta el arreglo original
      expect(entradaDesc.map((c) => c.id)).toEqual(copiaOriginalIds);

      // Orden cronológico ASC en puntos
      expect(res.puntos.map((p) => p.id)).toEqual(['cot-1', 'cot-2', 'cot-3']);
      expect(res.puntos.map((p) => p.valor)).toEqual([1.5, 1.75, 1.95]);
      expect(res.cotizacionVigente?.id).toBe('cot-3');
      expect(res.esHistorialUnico).toBe(false);
    });

    it('desempata etiquetas del eje X cuando existen múltiples cotizaciones en la misma fecha', () => {
      const mismoDia: CotizacionJugador[] = [
        crearCotizacion({
          id: 'cot-b',
          valor: 2.1,
          fechaCotizacion: '2026-10-15T16:45:00.000Z',
        }),
        crearCotizacion({
          id: 'cot-a',
          valor: 1.85,
          fechaCotizacion: '2026-10-15T09:15:00.000Z',
        }),
      ];

      const res = prepararSerieCotizaciones(mismoDia);
      expect(res.puntos).toHaveLength(2);
      expect(res.puntos[0].id).toBe('cot-a');
      expect(res.puntos[1].id).toBe('cot-b');
      // Las etiquetas del eje X deben distinguirse para que Recharts no colapse puntos del mismo día
      expect(res.puntos[0].etiquetaEjeX).not.toBe(res.puntos[1].etiquetaEjeX);
    });

    it('desempata determinísticamente incluso cuando dos cotizaciones comparten minuto exacto', () => {
      const mismoMinuto: CotizacionJugador[] = [
        crearCotizacion({
          id: 'cot-2',
          valor: 2.0,
          fechaCotizacion: '2026-10-15T09:15:00.000Z',
        }),
        crearCotizacion({
          id: 'cot-1',
          valor: 1.9,
          fechaCotizacion: '2026-10-15T09:15:00.000Z',
        }),
      ];

      const res = prepararSerieCotizaciones(mismoMinuto);
      expect(res.puntos.map((p) => p.id)).toEqual(['cot-1', 'cot-2']);
      expect(res.puntos[0].etiquetaEjeX).not.toBe(res.puntos[1].etiquetaEjeX);
    });
  });
});

