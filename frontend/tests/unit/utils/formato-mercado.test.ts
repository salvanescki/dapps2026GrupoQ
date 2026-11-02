import { describe, it, expect } from 'vitest';
import {
  formatearCreditos,
  formatearPorcentajeVariacion,
  obtenerVarianteTendencia,
  normalizarFechaDesdeIso,
  normalizarFechaHastaIso,
  formatearFechaHoraCorta,
  formatearContraparte,
} from '../../../src/utils/formato-mercado';

describe('Utilidades puras de formato financiero y fechas (formato-mercado)', () => {
  it('formatea créditos con separador de miles y exactamente 2 decimales', () => {
    expect(formatearCreditos(0)).toBe('0,00');
    expect(formatearCreditos(1.8)).toBe('1,80');
    expect(formatearCreditos(1000)).toBe('1.000,00');
    expect(formatearCreditos(12345.678)).toBe('12.345,68');
    expect(formatearCreditos(-42.5)).toBe('-42,50');
    expect(formatearCreditos(Number.NaN)).toBe('0,00');
  });

  it('formatea variación porcentual con signo explícito (+, -, 0,00%)', () => {
    expect(formatearPorcentajeVariacion(5.59)).toBe('+5,59%');
    expect(formatearPorcentajeVariacion(-3.1)).toBe('-3,10%');
    expect(formatearPorcentajeVariacion(0)).toBe('0,00%');
    expect(formatearPorcentajeVariacion(-0.001)).toBe('0,00%');
    expect(formatearPorcentajeVariacion(Number.NaN)).toBe('0,00%');
  });

  it('clasifica VarianteTendencia en positiva, negativa o neutra', () => {
    expect(obtenerVarianteTendencia(0.05)).toBe('positiva');
    expect(obtenerVarianteTendencia(-0.05)).toBe('negativa');
    expect(obtenerVarianteTendencia(0)).toBe('neutra');
    expect(obtenerVarianteTendencia(0.001)).toBe('neutra');
    expect(obtenerVarianteTendencia(Number.NaN)).toBe('neutra');
  });

  it('normaliza rangos YYYY-MM-DD hacia límites inclusivos ISO-8601 UTC', () => {
    expect(normalizarFechaDesdeIso('2026-11-02')).toBe('2026-11-02T00:00:00.000Z');
    expect(normalizarFechaHastaIso('2026-11-02')).toBe('2026-11-02T23:59:59.999Z');
    expect(normalizarFechaDesdeIso('2026-11-02T08:00:00.000Z')).toBe(
      '2026-11-02T08:00:00.000Z',
    );
    expect(normalizarFechaHastaIso('2026-11-02T19:00:00.000Z')).toBe(
      '2026-11-02T19:00:00.000Z',
    );
    expect(normalizarFechaDesdeIso('   ')).toBe('');
    expect(normalizarFechaHastaIso('')).toBe('');
  });

  it('formatea fechas ISO cortas y contrapartes legibles en español', () => {
    expect(formatearFechaHoraCorta('2026-11-02T14:35:00.000Z')).toMatch(
      /\d{2}\/\d{2}\/\d{4}/,
    );
    expect(formatearFechaHoraCorta('fecha-invalida')).toBe('—');

    expect(formatearContraparte('MERCADO_PRIMARIO')).toBe(
      'Mercado Primario (Emisión Oficial)',
    );
    expect(
      formatearContraparte('123e4567-e89b-12d3-a456-426614174000'),
    ).toBe('Inversor (123e4567…)');
    expect(formatearContraparte('')).toBe('—');
    expect(formatearContraparte('trader-corto')).toBe('trader-corto');
  });
});

