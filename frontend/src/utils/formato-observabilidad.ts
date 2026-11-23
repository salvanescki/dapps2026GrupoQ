import {
  DesgloseOrdenes,
  MetricasCompletas,
  MetricaDeMarketplace,
  MetricaDeCotizaciones,
  MetricaDeIngestion,
  MetricaDeIntegracionYCache,
} from '../types/observability.types';
import { PrometheusSample, extractSingleMetricValue } from './prometheus-parser';

/**
 * División segura contra NaN e Infinity
 */
export function calcularDivisionSegura(dividendo: number, divisor: number, valorDefault = 0): number {
  if (!divisor || isNaN(divisor) || divisor === 0) {
    return valorDefault;
  }
  const res = dividendo / divisor;
  return isNaN(res) || !isFinite(res) ? valorDefault : res;
}

/**
 * Tasa de éxito porcentual (0 - 100). Si total es 0, retorna 100% por defecto nominal.
 */
export function calcularTasaExito(exitosos: number, fallidos: number): number {
  const total = exitosos + fallidos;
  if (total === 0) return 100;
  return Number(((exitosos / total) * 100).toFixed(2));
}

/**
 * Ratio de acierto de caché (0 - 100). Si total es 0, retorna 100%.
 */
export function calcularCacheHitRatio(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 100;
  return Number(((hits / total) * 100).toFixed(2));
}

/**
 * Calcula latencia promedio a partir de histograma _sum y _count
 */
export function calcularLatenciaPromedio(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Number(calcularDivisionSegura(sum, count, 0).toFixed(4));
}

/**
 * Convierte un monto en centavos a formato de moneda estándar en español
 */
export function convertirCentavosAMoneda(centavos: number): string {
  const monto = (centavos || 0) / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(monto)
    .replace('ARS', '$')
    .trim();
}

/**
 * Determina el nivel de alerta visual según el porcentaje de consumo de memoria
 */
export function determinarEstadoAlertaMemoria(porcentaje: number): 'nominal' | 'warning' | 'critical' {
  if (porcentaje > 95) return 'critical';
  if (porcentaje > 80) return 'warning';
  return 'nominal';
}

/**
 * Transforma la lista de muestras Prometheus en la estructura de MetricasCompletas
 */
export function procesarMetricasPrometheus(samples: PrometheusSample[]): MetricasCompletas {
  // Marketplace
  const orderSamples = samples.filter((s) => s.name === 'marketplace_orders_total');
  const ordenesDesglose: DesgloseOrdenes[] = orderSamples.map((s) => ({
    tipo: (s.labels.tipo as any) || 'compra',
    mercado: (s.labels.mercado as any) || 'secundario',
    estado: (s.labels.estado as any) || 'creada',
    cantidad: s.value,
  }));

  const ordenesTotales = ordenesDesglose.reduce((acc, curr) => acc + curr.cantidad, 0);
  const transaccionesTotales = extractSingleMetricValue(samples, 'marketplace_transactions_total');
  const volumenCentavosTotal = extractSingleMetricValue(samples, 'marketplace_volume_cents_total');
  const ordenesVentaActivas = extractSingleMetricValue(samples, 'marketplace_active_sell_orders');
  const rechazosSlippage = extractSingleMetricValue(samples, 'marketplace_slippage_rejections_total');

  const settlementSum = extractSingleMetricValue(samples, 'marketplace_settlement_duration_seconds_sum');
  const settlementCount = extractSingleMetricValue(samples, 'marketplace_settlement_duration_seconds_count');
  const latenciaLiquidacionPromedioSegundos = calcularLatenciaPromedio(settlementSum, settlementCount);

  const marketplace: MetricaDeMarketplace = {
    ordenesTotales,
    ordenesDesglose,
    transaccionesTotales,
    volumenCentavosTotal,
    volumenMonetarioFormateado: convertirCentavosAMoneda(volumenCentavosTotal),
    ordenesVentaActivas,
    rechazosSlippage,
    latenciaLiquidacionPromedioSegundos,
  };

  // Cotizaciones
  const recalculosExitosos =
    extractSingleMetricValue(samples, 'quotes_recalculations_total', { status: 'success' }) ||
    extractSingleMetricValue(samples, 'quotes_recalculations_total', { estado: 'exito' });
  const recalculosFallidos =
    extractSingleMetricValue(samples, 'quotes_recalculations_total', { status: 'failure' }) ||
    extractSingleMetricValue(samples, 'quotes_recalculations_total', { estado: 'fallo' });
  const tasaExitoRecalculos = calcularTasaExito(recalculosExitosos, recalculosFallidos);

  const recalculoSum = extractSingleMetricValue(samples, 'quotes_recalculation_duration_seconds_sum');
  const recalculoCount = extractSingleMetricValue(samples, 'quotes_recalculation_duration_seconds_count');
  const duracionPromedioSegundos = calcularLatenciaPromedio(recalculoSum, recalculoCount);

  const jugadoresProcesados =
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { category: 'with_stats' }) ||
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { categoria: 'con_estadisticas' });
  const jugadoresSinEstadisticas =
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { category: 'without_stats' }) ||
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { categoria: 'sin_estadisticas' });
  const jugadoresFallidos =
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { category: 'failed' }) ||
    extractSingleMetricValue(samples, 'quotes_players_evaluated_total', { categoria: 'fallidos' });

  // Estrategia activa
  const strategySamples = samples.filter((s) => s.name === 'quotes_active_strategy' && s.value === 1);
  const estrategiaActiva =
    strategySamples.length > 0
      ? strategySamples[0].labels.strategy || strategySamples[0].labels.estrategia || 'GLOBAL_v1'
      : 'GLOBAL_v1';

  const cotizaciones: MetricaDeCotizaciones = {
    recalculosExitosos,
    recalculosFallidos,
    tasaExitoRecalculos,
    duracionPromedioSegundos,
    jugadoresProcesados,
    jugadoresSinEstadisticas,
    jugadoresFallidos,
    estrategiaActiva,
  };

  // Ingestion (Scraping)
  const ejecucionesExitosas =
    extractSingleMetricValue(samples, 'scraping_executions_total', { status: 'success' }) ||
    extractSingleMetricValue(samples, 'scraping_executions_total', { estado: 'exito' });
  const ejecucionesFallidas =
    extractSingleMetricValue(samples, 'scraping_executions_total', { status: 'failure' }) ||
    extractSingleMetricValue(samples, 'scraping_executions_total', { estado: 'fallo' });
  const ejecucionesRecuperadas =
    extractSingleMetricValue(samples, 'scraping_executions_total', { status: 'recovered' }) ||
    extractSingleMetricValue(samples, 'scraping_executions_total', { estado: 'recuperado' });

  const duracionPorLiga: Record<string, number> = {};
  const durationSumSamples = samples.filter((s) => s.name === 'scraping_league_duration_seconds_sum');
  for (const sumSample of durationSumSamples) {
    const liga = sumSample.labels.league || sumSample.labels.liga;
    if (liga) {
      const count =
        extractSingleMetricValue(samples, 'scraping_league_duration_seconds_count', { league: liga }) ||
        extractSingleMetricValue(samples, 'scraping_league_duration_seconds_count', { liga });
      duracionPorLiga[liga] = count > 0 ? Number((sumSample.value / count).toFixed(2)) : sumSample.value;
    }
  }

  const tasaAsociacionPorLiga: Record<string, number> = {};
  const matchRateSamples = samples.filter((s) => s.name === 'scraping_player_match_rate');
  for (const mrSample of matchRateSamples) {
    const liga = mrSample.labels.league || mrSample.labels.liga;
    if (liga) {
      tasaAsociacionPorLiga[liga] = mrSample.value;
    }
  }

  const incidentesTotales = extractSingleMetricValue(samples, 'scraping_incidents_total');

  const ingestion: MetricaDeIngestion = {
    ejecucionesExitosas,
    ejecucionesFallidas,
    ejecucionesRecuperadas,
    duracionPorLiga,
    tasaAsociacionPorLiga,
    incidentesTotales,
  };

  // Integracion y Cache
  const footballDataRequests = extractSingleMetricValue(samples, 'football_data_requests_total');
  const footballDataRateLimitRemaining = extractSingleMetricValue(samples, 'football_data_rate_limit_remaining', {}, 10);

  const cacheHits =
    extractSingleMetricValue(samples, 'cache_requests_total', { result: 'hit' }) ||
    extractSingleMetricValue(samples, 'cache_requests_total', { resultado: 'hit' });
  const cacheMisses =
    extractSingleMetricValue(samples, 'cache_requests_total', { result: 'miss' }) ||
    extractSingleMetricValue(samples, 'cache_requests_total', { resultado: 'miss' });
  const cacheHitRatio = calcularCacheHitRatio(cacheHits, cacheMisses);
  const cacheFallbacks = extractSingleMetricValue(samples, 'cache_fallback_total');

  const totwGeneraciones = extractSingleMetricValue(samples, 'totw_generation_executions_total');
  const totwSum = extractSingleMetricValue(samples, 'totw_generation_duration_seconds_sum');
  const totwCount = extractSingleMetricValue(samples, 'totw_generation_duration_seconds_count');
  const totwDuracionSegundos = calcularLatenciaPromedio(totwSum, totwCount);

  const authIntentosExitosos =
    extractSingleMetricValue(samples, 'auth_attempts_total', { status: 'success' }) ||
    extractSingleMetricValue(samples, 'auth_attempts_total', { estado: 'exito' });
  const authIntentosFallidos =
    extractSingleMetricValue(samples, 'auth_attempts_total', { status: 'failure' }) ||
    extractSingleMetricValue(samples, 'auth_attempts_total', { estado: 'fallo' });

  const authHashSum = extractSingleMetricValue(samples, 'auth_hashing_duration_seconds_sum');
  const authHashCount = extractSingleMetricValue(samples, 'auth_hashing_duration_seconds_count');
  const authLatenciaHashingPromedio = calcularLatenciaPromedio(authHashSum, authHashCount);

  const integracionYCache: MetricaDeIntegracionYCache = {
    footballDataRequests,
    footballDataRateLimitRemaining,
    cacheHits,
    cacheMisses,
    cacheHitRatio,
    cacheFallbacks,
    totwGeneraciones,
    totwDuracionSegundos,
    authIntentosExitosos,
    authIntentosFallidos,
    authLatenciaHashingPromedio,
  };

  return {
    marketplace,
    cotizaciones,
    ingestion,
    integracionYCache,
  };
}
