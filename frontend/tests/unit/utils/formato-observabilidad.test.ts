import { describe, it, expect } from 'vitest';
import {
  calcularDivisionSegura,
  calcularTasaExito,
  calcularCacheHitRatio,
  calcularLatenciaPromedio,
  convertirCentavosAMoneda,
  determinarEstadoAlertaMemoria,
  procesarMetricasPrometheus,
} from '../../../src/utils/formato-observabilidad';
import { parsePrometheusText } from '../../../src/utils/prometheus-parser';

describe('formato-observabilidad', () => {
  it('calcularDivisionSegura no devuelve NaN ni Infinity si el divisor es 0', () => {
    expect(calcularDivisionSegura(10, 0, 0)).toBe(0);
    expect(calcularDivisionSegura(10, 0, 100)).toBe(100);
    expect(calcularDivisionSegura(50, 2)).toBe(25);
  });

  it('calcularTasaExito retorna 100% si el total es 0, y calcula porcentaje correctamente', () => {
    expect(calcularTasaExito(0, 0)).toBe(100);
    expect(calcularTasaExito(8, 2)).toBe(80);
    expect(calcularTasaExito(10, 0)).toBe(100);
  });

  it('calcularCacheHitRatio retorna 100% si total es 0', () => {
    expect(calcularCacheHitRatio(0, 0)).toBe(100);
    expect(calcularCacheHitRatio(90, 10)).toBe(90);
  });

  it('calcularLatenciaPromedio devuelve 0 si count es 0', () => {
    expect(calcularLatenciaPromedio(15.5, 0)).toBe(0);
    expect(calcularLatenciaPromedio(2.5, 10)).toBe(0.25);
  });

  it('convertirCentavosAMoneda divide entre 100 y formatea correctamente', () => {
    const formatted = convertirCentavosAMoneda(125050);
    expect(formatted).toContain('1.250,50');
    expect(convertirCentavosAMoneda(0)).toContain('0,00');
  });

  it('determinarEstadoAlertaMemoria clasifica nominal, warning (>80%) y critical (>95%)', () => {
    expect(determinarEstadoAlertaMemoria(50)).toBe('nominal');
    expect(determinarEstadoAlertaMemoria(80)).toBe('nominal');
    expect(determinarEstadoAlertaMemoria(80.1)).toBe('warning');
    expect(determinarEstadoAlertaMemoria(95)).toBe('warning');
    expect(determinarEstadoAlertaMemoria(95.1)).toBe('critical');
    expect(determinarEstadoAlertaMemoria(102)).toBe('critical');
  });

  it('procesarMetricasPrometheus transforma muestras a MetricasCompletas', () => {
    const text = `
marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 10
marketplace_orders_total{tipo="venta",mercado="secundario",estado="creada"} 5
marketplace_transactions_total 8
marketplace_volume_cents_total 500000
marketplace_active_sell_orders 5
marketplace_slippage_rejections_total 1
marketplace_settlement_duration_seconds_sum 1.5
marketplace_settlement_duration_seconds_count 3

quotes_recalculations_total{status="success"} 20
quotes_recalculations_total{status="failure"} 0
quotes_recalculation_duration_seconds_sum 10
quotes_recalculation_duration_seconds_count 5
quotes_players_evaluated_total{category="with_stats"} 150
quotes_players_evaluated_total{category="without_stats"} 20
quotes_players_evaluated_total{category="failed"} 2
quotes_active_strategy{strategy="GLOBAL_v1"} 1
quotes_active_strategy{strategy="POSICIONAL_v1"} 0

scraping_executions_total{status="success"} 15
scraping_executions_total{status="failure"} 1
scraping_executions_total{status="recovered"} 2
scraping_league_duration_seconds_sum{league="PL"} 45
scraping_league_duration_seconds_count{league="PL"} 3
scraping_player_match_rate{league="PL"} 98.5
scraping_incidents_total 1

football_data_requests_total 45
football_data_rate_limit_remaining 8
cache_requests_total{result="hit"} 180
cache_requests_total{result="miss"} 20
cache_fallback_total 0
totw_generation_executions_total 4
totw_generation_duration_seconds_sum 8
totw_generation_duration_seconds_count 2
auth_attempts_total{status="success"} 50
auth_attempts_total{status="failure"} 5
auth_hashing_duration_seconds_sum 2.5
auth_hashing_duration_seconds_count 10
`;
    const samples = parsePrometheusText(text);
    const metricas = procesarMetricasPrometheus(samples);

    expect(metricas.marketplace.ordenesTotales).toBe(15);
    expect(metricas.marketplace.volumenCentavosTotal).toBe(500000);
    expect(metricas.marketplace.volumenMonetarioFormateado).toContain('5.000,00');
    expect(metricas.marketplace.latenciaLiquidacionPromedioSegundos).toBe(0.5);

    expect(metricas.cotizaciones.recalculosExitosos).toBe(20);
    expect(metricas.cotizaciones.tasaExitoRecalculos).toBe(100);
    expect(metricas.cotizaciones.estrategiaActiva).toBe('GLOBAL_v1');

    expect(metricas.ingestion.ejecucionesExitosas).toBe(15);
    expect(metricas.ingestion.duracionPorLiga['PL']).toBe(15);
    expect(metricas.ingestion.tasaAsociacionPorLiga['PL']).toBe(98.5);

    expect(metricas.integracionYCache.cacheHitRatio).toBe(90);
    expect(metricas.integracionYCache.footballDataRateLimitRemaining).toBe(8);
  });
});
