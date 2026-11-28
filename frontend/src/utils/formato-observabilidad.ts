import {
  DesgloseOrdenes,
  DesgloseTransacciones,
  MetricasCompletas,
  MetricaDeMarketplace,
  MetricaDeCotizaciones,
  MetricaDeIngestion,
  MetricaDeIntegracionYCache,
  MetricaDeRuntimeNode,
} from '../types/observability.types';
import { PrometheusSample, extractSingleMetricValue, sumMetricValues } from './prometheus-parser';

/**
 * División segura contra NaN e Infinity
 */
export function calcularDivisionSegura(dividendo: number, divisor: number, valorDefault = 0): number {
  if (!divisor || Number.isNaN(divisor) || divisor === 0) {
    return valorDefault;
  }
  const res = dividendo / divisor;
  return Number.isNaN(res) || !Number.isFinite(res) ? valorDefault : res;
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

function obtenerLiga(labels: Record<string, string>): string | undefined {
  return labels.league || labels.liga;
}

function mapearMetricaPorLiga(
  samples: PrometheusSample[],
  metricName: string
): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (const sample of samples) {
    if (sample.name !== metricName) continue;
    const liga = obtenerLiga(sample.labels);
    if (liga) {
      resultado[liga] = sample.value;
    }
  }
  return resultado;
}

export function construirMetricasMarketplace(samples: PrometheusSample[]): MetricaDeMarketplace {
  const orderSamples = samples.filter((s) => s.name === 'marketplace_orders_total');
  const ordenesDesglose: DesgloseOrdenes[] = orderSamples.map((s) => ({
    tipo: (s.labels.tipo as any) || 'compra',
    mercado: (s.labels.mercado as any) || 'secundario',
    estado: (s.labels.estado as any) || 'creada',
    cantidad: s.value,
  }));

  const ordenesTotales = ordenesDesglose.reduce((acc, curr) => acc + curr.cantidad, 0);
  const transaccionesTotales = sumMetricValues(samples, 'marketplace_transactions_total');
  const txSamples = samples.filter((s) => s.name === 'marketplace_transactions_total');
  const transaccionesDesglose: DesgloseTransacciones[] = txSamples.map((s) => ({
    mercado: s.labels.mercado || 'secundario',
    estrategiaVersion: s.labels.estrategia_version || s.labels.estrategia || 'N/A',
    cantidad: s.value,
  }));
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

  return {
    ordenesTotales,
    ordenesDesglose,
    transaccionesTotales,
    transaccionesDesglose,
    volumenCentavosTotal,
    volumenMonetarioFormateado: convertirCentavosAMoneda(volumenCentavosTotal),
    ordenesVentaActivas,
    rechazosSlippage,
    latenciaLiquidacionPromedioSegundos,
  };
}

export function construirMetricasCotizaciones(samples: PrometheusSample[]): MetricaDeCotizaciones {
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

  const strategySamples = samples.filter((s) => s.name === 'quotes_active_strategy' && s.value === 1);
  const estrategiaActiva =
    strategySamples.length > 0
      ? strategySamples[0].labels.strategy || strategySamples[0].labels.estrategia || 'GLOBAL_v1'
      : 'GLOBAL_v1';

  return {
    recalculosExitosos,
    recalculosFallidos,
    tasaExitoRecalculos,
    duracionPromedioSegundos,
    jugadoresProcesados,
    jugadoresSinEstadisticas,
    jugadoresFallidos,
    estrategiaActiva,
  };
}

export function construirMetricasIngestion(samples: PrometheusSample[]): MetricaDeIngestion {
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
    const liga = obtenerLiga(sumSample.labels);
    if (!liga) continue;
    const count = sumMetricValues(
      samples,
      [
        'scraping_execution_duration_seconds_count',
        'scraping_league_duration_seconds_count',
      ],
      (l) => obtenerLiga(l) === liga
    );
    duracionPorLiga[liga] = count > 0 ? Number((sumSample.value / count).toFixed(2)) : sumSample.value;
  }

  const tasaAsociacionPorLiga = mapearMetricaPorLiga(samples, 'scraping_player_match_rate');
  const incidentesTotales = sumMetricValues(samples, 'scraping_incidents_total');
  const incidentesPorLiga = mapearMetricaPorLiga(samples, 'scraping_incidents_total');

  return {
    ejecucionesExitosas,
    ejecucionesFallidas,
    ejecucionesRecuperadas,
    duracionPorLiga,
    tasaAsociacionPorLiga,
    incidentesTotales,
    incidentesPorLiga,
  };
}

export function construirMetricasIntegracionYCache(
  samples: PrometheusSample[]
): MetricaDeIntegracionYCache {
  const footballDataRequests = sumMetricValues(samples, 'football_data_requests_total');
  const footballDataRateLimitRemaining = extractSingleMetricValue(
    samples,
    'football_data_rate_limit_remaining',
    {},
    10
  );

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
    (l) => (!l.estado && !l.status) || ['exito', 'exitoso', 'success'].includes(l.estado || l.status)
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

  return {
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
}

export function construirMetricasRuntime(samples: PrometheusSample[]): MetricaDeRuntimeNode {
  const cpuSegundosTotal = sumMetricValues(samples, 'process_cpu_seconds_total');
  const startTime = extractSingleMetricValue(samples, 'process_start_time_seconds');
  const uptimeSegundos = startTime > 0 ? Math.max(0, Math.floor(Date.now() / 1000 - startTime)) : 0;
  const lagSeconds = extractSingleMetricValue(samples, 'nodejs_eventloop_lag_seconds');
  const eventLoopLagMs = Number((lagSeconds * 1000).toFixed(2));
  const activeHandles = extractSingleMetricValue(samples, 'nodejs_active_handles_total');
  const activeResources = extractSingleMetricValue(samples, 'nodejs_active_resources_total');
  const versionSample = samples.find((s) => s.name === 'nodejs_version_info');
  const versionNode = versionSample?.labels.version || '';
  const heapUsedBytes = extractSingleMetricValue(samples, 'nodejs_heap_size_used_bytes');
  const rssBytes = extractSingleMetricValue(samples, 'process_resident_memory_bytes');

  return {
    cpuSegundosTotal,
    uptimeSegundos,
    eventLoopLagMs,
    activeHandles,
    activeResources,
    versionNode,
    heapUsedBytes: heapUsedBytes > 0 ? heapUsedBytes : undefined,
    rssBytes: rssBytes > 0 ? rssBytes : undefined,
  };
}

/**
 * Transforma la lista de muestras Prometheus en la estructura de MetricasCompletas
 */
export function procesarMetricasPrometheus(samples: PrometheusSample[]): MetricasCompletas {
  return {
    marketplace: construirMetricasMarketplace(samples),
    cotizaciones: construirMetricasCotizaciones(samples),
    ingestion: construirMetricasIngestion(samples),
    integracionYCache: construirMetricasIntegracionYCache(samples),
    runtime: construirMetricasRuntime(samples),
  };
}
