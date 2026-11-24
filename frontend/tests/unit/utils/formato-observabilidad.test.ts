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

  it('procesarMetricasPrometheus procesa correctamente la telemetría real del backend', () => {
    const rawMetrics = `
# HELP quotes_active_strategy Indicador de estrategia de cotización activa (1 para activa, 0 para inactiva)
# TYPE quotes_active_strategy gauge
quotes_active_strategy{estrategia="GLOBAL_v1"} 1
quotes_active_strategy{estrategia="POSICIONAL_v1"} 0

# HELP scraping_executions_total Cantidad total de ejecuciones del pipeline de scraping de WhoScored
# TYPE scraping_executions_total counter
scraping_executions_total{estado="exitoso"} 1
scraping_executions_total{estado="fallido"} 0
scraping_executions_total{estado="recuperada_atasco"} 0

# HELP scraping_execution_duration_seconds Duración de extracción y sincronización de scraping por liga en segundos
# TYPE scraping_execution_duration_seconds histogram
scraping_execution_duration_seconds_bucket{le="1",liga="PL"} 0
scraping_execution_duration_seconds_sum{liga="PL"} 285.146
scraping_execution_duration_seconds_count{liga="PL"} 1
scraping_execution_duration_seconds_sum{liga="PD"} 325.288
scraping_execution_duration_seconds_count{liga="PD"} 1
scraping_execution_duration_seconds_sum{liga="SA"} 316.698
scraping_execution_duration_seconds_count{liga="SA"} 1
scraping_execution_duration_seconds_sum{liga="BL1"} 262.747
scraping_execution_duration_seconds_count{liga="BL1"} 1
scraping_execution_duration_seconds_sum{liga="FL1"} 296.861
scraping_execution_duration_seconds_count{liga="FL1"} 1

# HELP scraping_player_match_rate Tasa porcentual de asociación exacta de jugadores extraídos (0 a 100)
# TYPE scraping_player_match_rate gauge
scraping_player_match_rate{liga="PL"} 96.52928416485899
scraping_player_match_rate{liga="PD"} 90.26369168356997
scraping_player_match_rate{liga="SA"} 92.67326732673268
scraping_player_match_rate{liga="BL1"} 95.75471698113208
scraping_player_match_rate{liga="FL1"} 88.63636363636364
scraping_player_match_rate{liga="GLOBAL"} 0

# HELP scraping_incidents_total Cantidad total de incidentes o reintentos anómalos durante el scraping
# TYPE scraping_incidents_total counter
scraping_incidents_total{liga="PL"} 0
scraping_incidents_total{liga="PD"} 0
scraping_incidents_total{liga="SA"} 0
scraping_incidents_total{liga="BL1"} 0
scraping_incidents_total{liga="FL1"} 0
scraping_incidents_total{liga="GLOBAL"} 0

# HELP football_data_requests_total Cantidad total de peticiones HTTP enviadas a Football-Data.org
# TYPE football_data_requests_total counter
football_data_requests_total{endpoint="/competitions/PL/teams",status="200"} 1
football_data_requests_total{endpoint="/competitions/PD/teams",status="200"} 1
football_data_requests_total{endpoint="/competitions/SA/teams",status="200"} 1
football_data_requests_total{endpoint="/competitions/BL1/teams",status="200"} 1
football_data_requests_total{endpoint="/competitions/FL1/teams",status="200"} 1

# HELP football_data_rate_limit_remaining Peticiones restantes reportadas por el encabezado X-Requests-Available-Minute de Football-Data.org
# TYPE football_data_rate_limit_remaining gauge
football_data_rate_limit_remaining 9

# HELP cache_requests_total Consultas a caché Redis L1 clasificadas por dominio y resultado (hit/miss)
# TYPE cache_requests_total counter
cache_requests_total{dominio="marketplace",resultado="hit"} 2
cache_requests_total{dominio="marketplace",resultado="miss"} 1
cache_requests_total{dominio="scraping",resultado="hit"} 0
cache_requests_total{dominio="scraping",resultado="miss"} 5

# HELP auth_attempts_total Cantidad total de intentos de autenticación clasificados por resultado
# TYPE auth_attempts_total counter
auth_attempts_total{resultado="exito"} 1
auth_attempts_total{resultado="fallo"} 0

# HELP password_hashing_duration_seconds Duración del cómputo de hashing de contraseñas con bcrypt en segundos
# TYPE password_hashing_duration_seconds histogram
password_hashing_duration_seconds_sum 0.095
password_hashing_duration_seconds_count 1

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 302.64

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1795476518

# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.007296

# HELP nodejs_active_handles_total Total number of active handles.
# TYPE nodejs_active_handles_total gauge
nodejs_active_handles_total 12

# HELP nodejs_active_resources_total Total number of active resources.
# TYPE nodejs_active_resources_total gauge
nodejs_active_resources_total 15

# HELP nodejs_version_info Node.js version info.
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v24.21.0",major="24",minor="21",patch="0"} 1
`;
    const samples = parsePrometheusText(rawMetrics);
    const metricas = procesarMetricasPrometheus(samples);

    // Ingestion & Scraping
    expect(metricas.ingestion.ejecucionesExitosas).toBe(1);
    expect(metricas.ingestion.ejecucionesFallidas).toBe(0);
    expect(metricas.ingestion.ejecucionesRecuperadas).toBe(0);
    expect(metricas.ingestion.duracionPorLiga['PL']).toBe(285.15);
    expect(metricas.ingestion.duracionPorLiga['PD']).toBe(325.29);
    expect(metricas.ingestion.duracionPorLiga['SA']).toBe(316.7);
    expect(metricas.ingestion.duracionPorLiga['BL1']).toBe(262.75);
    expect(metricas.ingestion.duracionPorLiga['FL1']).toBe(296.86);
    expect(metricas.ingestion.tasaAsociacionPorLiga['PL']).toBeCloseTo(96.53, 2);
    expect(metricas.ingestion.tasaAsociacionPorLiga['PD']).toBeCloseTo(90.26, 2);

    // Integración, Caché y Auth
    expect(metricas.integracionYCache.footballDataRequests).toBe(5);
    expect(metricas.integracionYCache.footballDataRateLimitRemaining).toBe(9);
    expect(metricas.integracionYCache.cacheHits).toBe(2);
    expect(metricas.integracionYCache.cacheMisses).toBe(6);
    expect(metricas.integracionYCache.cacheHitRatio).toBe(25);
    expect(metricas.integracionYCache.authIntentosExitosos).toBe(1);
    expect(metricas.integracionYCache.authIntentosFallidos).toBe(0);
    expect(metricas.integracionYCache.authLatenciaHashingPromedio).toBe(0.095);

    // Runtime de Node.js
    expect(metricas.runtime?.cpuSegundosTotal).toBe(302.64);
    expect(metricas.runtime?.eventLoopLagMs).toBe(7.3);
    expect(metricas.runtime?.activeHandles).toBe(12);
    expect(metricas.runtime?.activeResources).toBe(15);
    expect(metricas.runtime?.versionNode).toBe('v24.21.0');
    expect(metricas.ingestion.incidentesPorLiga?.['PL']).toBe(0);
  });
});
