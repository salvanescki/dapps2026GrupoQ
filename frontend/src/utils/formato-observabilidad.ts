import {
  DesgloseOrdenes,
  MetricasCompletas,
  MetricaDeMarketplace,
  MetricaDeCotizaciones,
  MetricaDeIngestion,
  MetricaDeIntegracionYCache,
} from '../types/observability.types';
import { PrometheusSample, extractSingleMetricValue, sumMetricValues } from './prometheus-parser';

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
  const transaccionesTotales = sumMetricValues(samples, 'marketplace_transactions_total');
  const volumenCentavosTotal = sumMetricValues(samples, 'marketplace_volume_cents_total');
  const ordenesVentaActivas = extractSingleMetricValue(samples, 'marketplace_active_sell_orders');
  const rechazosSlippage = sumMetricValues(samples, 'marketplace_slippage_rejections_total');

  const settlementSum = sumMetricValues(samples, [
    'marketplace_order_settlement_duration_seconds_sum',
    'marketplace_settlement_duration_seconds_sum',
  ]);
  const settlementCount = sumMetricValues(samples, [
    'marketplace_order_settlement_duration_seconds_count',
    'marketplace_settlement_duration_seconds_count',
  ]);
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
  const recalculosExitosos = sumMetricValues(samples, 'quotes_recalculations_total', (l) =>
    ['exito', 'exitoso', 'success'].includes(l.estado || l.status)
  );
  const recalculosFallidos = sumMetricValues(samples, 'quotes_recalculations_total', (l) =>
    ['fallo', 'fallido', 'failure'].includes(l.estado || l.status)
  );
  const tasaExitoRecalculos = calcularTasaExito(recalculosExitosos, recalculosFallidos);

  const recalculoSum = sumMetricValues(samples, 'quotes_recalculation_duration_seconds_sum');
  const recalculoCount = sumMetricValues(samples, 'quotes_recalculation_duration_seconds_count');
  const duracionPromedioSegundos = calcularLatenciaPromedio(recalculoSum, recalculoCount);

  const jugadoresProcesados = sumMetricValues(samples, 'quotes_players_evaluated_total', (l) =>
    ['procesados', 'con_estadisticas', 'with_stats', 'processed'].includes(l.categoria || l.category)
  );
  const jugadoresSinEstadisticas = sumMetricValues(samples, 'quotes_players_evaluated_total', (l) =>
    ['sin_estadisticas', 'without_stats'].includes(l.categoria || l.category)
  );
  const jugadoresFallidos = sumMetricValues(samples, 'quotes_players_evaluated_total', (l) =>
    ['fallidos', 'failed'].includes(l.categoria || l.category)
  );

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
  const ejecucionesExitosas = sumMetricValues(samples, 'scraping_executions_total', (l) =>
    ['exitoso', 'exito', 'success'].includes(l.estado || l.status)
  );
  const ejecucionesFallidas = sumMetricValues(samples, 'scraping_executions_total', (l) =>
    ['fallido', 'fallo', 'failure'].includes(l.estado || l.status)
  );
  const ejecucionesRecuperadas = sumMetricValues(samples, 'scraping_executions_total', (l) =>
    ['recuperada_atasco', 'recuperado', 'recovered'].includes(l.estado || l.status)
  );

  const duracionPorLiga: Record<string, number> = {};
  const durationSumSamples = samples.filter(
    (s) =>
      s.name === 'scraping_execution_duration_seconds_sum' ||
      s.name === 'scraping_league_duration_seconds_sum'
  );
  for (const sumSample of durationSumSamples) {
    const liga = sumSample.labels.league || sumSample.labels.liga;
    if (liga) {
      const count = sumMetricValues(
        samples,
        [
          'scraping_execution_duration_seconds_count',
          'scraping_league_duration_seconds_count',
        ],
        (l) => (l.league || l.liga) === liga
      );
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

  const incidentesTotales = sumMetricValues(samples, 'scraping_incidents_total');

  const ingestion: MetricaDeIngestion = {
    ejecucionesExitosas,
    ejecucionesFallidas,
    ejecucionesRecuperadas,
    duracionPorLiga,
    tasaAsociacionPorLiga,
    incidentesTotales,
  };

  // Integracion y Cache
  const footballDataRequests = sumMetricValues(samples, 'football_data_requests_total');
  const footballDataRateLimitRemaining = extractSingleMetricValue(samples, 'football_data_rate_limit_remaining', {}, 10);

  const cacheHits = sumMetricValues(samples, 'cache_requests_total', (l) =>
    ['hit'].includes(l.resultado || l.result)
  );
  const cacheMisses = sumMetricValues(samples, 'cache_requests_total', (l) =>
    ['miss'].includes(l.resultado || l.result)
  );
  const cacheHitRatio = calcularCacheHitRatio(cacheHits, cacheMisses);
  const cacheFallbacks = sumMetricValues(samples, 'cache_fallback_total');

  const totwGeneraciones = sumMetricValues(
    samples,
    ['totw_generations_total', 'totw_generation_executions_total'],
    (l) => !l.estado && !l.status || ['exito', 'exitoso', 'success'].includes(l.estado || l.status)
  );
  const totwSum = sumMetricValues(samples, 'totw_generation_duration_seconds_sum');
  const totwCount = sumMetricValues(samples, 'totw_generation_duration_seconds_count');
  const totwDuracionSegundos = calcularLatenciaPromedio(totwSum, totwCount);

  const authIntentosExitosos = sumMetricValues(samples, 'auth_attempts_total', (l) =>
    ['exito', 'exitoso', 'success'].includes(l.resultado || l.estado || l.status)
  );
  const authIntentosFallidos = sumMetricValues(samples, 'auth_attempts_total', (l) =>
    ['fallo', 'fallido', 'failure'].includes(l.resultado || l.estado || l.status)
  );

  const authHashSum = sumMetricValues(samples, [
    'password_hashing_duration_seconds_sum',
    'auth_hashing_duration_seconds_sum',
  ]);
  const authHashCount = sumMetricValues(samples, [
    'password_hashing_duration_seconds_count',
    'auth_hashing_duration_seconds_count',
  ]);
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
