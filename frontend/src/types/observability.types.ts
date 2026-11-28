/**
 * Tipos e interfaces de datos para el Panel de Observabilidad y Monitoreo en Tiempo Real
 * Feature: 018-frontend-observability-dashboard
 */

export type IntervaloRefresco = 0 | 5000 | 10000 | 30000;
export type EstadoConexion = 'online' | 'offline';
export type EstadoSonda = 'ok' | 'error' | 'degradado';
export type EstadoDependenciaTipo = 'up' | 'down';

export const UMBRAL_HEAP_BYTES = 314572800; // 300 MB
export const UMBRAL_RSS_BYTES = 1073741824; // 1 GB

export interface EstadoDependencia {
  estado: EstadoDependenciaTipo;
  mensaje?: string;
  tiempoRespuestaMs?: number;
}

export interface SondaReadinessData {
  estadoGlobal: EstadoSonda;
  baseDatos: EstadoDependencia;
  redis: EstadoDependencia;
  footballData: EstadoDependencia;
  error?: string;
}

export interface SondaLivenessData {
  estadoGlobal: 'ok' | 'error';
  memoriaHeapBytes: number;
  umbralHeapBytes: number;
  porcentajeHeap: number;
  memoriaRssBytes: number;
  umbralRssBytes: number;
  porcentajeRss: number;
  error?: string;
}

export interface SondaDeSalud {
  readiness: SondaReadinessData;
  liveness: SondaLivenessData;
}

export interface DesgloseOrdenes {
  tipo: 'compra' | 'venta';
  mercado: 'primario' | 'secundario';
  estado: 'creada' | 'pendiente' | 'completada' | 'cancelada' | 'rechazada';
  cantidad: number;
}

export interface DesgloseTransacciones {
  mercado: 'primario' | 'secundario' | string;
  estrategiaVersion: string;
  cantidad: number;
}

export interface MetricaDeMarketplace {
  ordenesTotales: number;
  ordenesDesglose: DesgloseOrdenes[];
  transaccionesTotales: number;
  transaccionesDesglose?: DesgloseTransacciones[];
  volumenCentavosTotal: number;
  volumenMonetarioFormateado: string;
  ordenesVentaActivas: number;
  rechazosSlippage: number;
  latenciaLiquidacionPromedioSegundos: number;
}

export interface MetricaDeCotizaciones {
  recalculosExitosos: number;
  recalculosFallidos: number;
  tasaExitoRecalculos: number; // 0 - 100
  duracionPromedioSegundos: number;
  jugadoresProcesados: number;
  jugadoresSinEstadisticas: number;
  jugadoresFallidos: number;
  estrategiaActiva: string;
}

export interface MetricaDeIngestion {
  ejecucionesExitosas: number;
  ejecucionesFallidas: number;
  ejecucionesRecuperadas: number;
  duracionPorLiga: Record<string, number>;
  tasaAsociacionPorLiga: Record<string, number>;
  incidentesTotales: number;
  incidentesPorLiga?: Record<string, number>;
}

export interface MetricaDeRuntimeNode {
  cpuSegundosTotal: number;
  uptimeSegundos: number;
  eventLoopLagMs: number;
  activeHandles: number;
  activeResources: number;
  versionNode: string;
  heapUsedBytes?: number;
  rssBytes?: number;
}

export interface MetricaDeIntegracionYCache {
  footballDataRequests: number;
  footballDataRateLimitRemaining: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number; // 0 - 100
  cacheFallbacks: number;
  totwGeneraciones: number;
  totwDuracionSegundos: number;
  authIntentosExitosos: number;
  authIntentosFallidos: number;
  authLatenciaHashingPromedio: number;
}

export interface MetricasCompletas {
  marketplace: MetricaDeMarketplace;
  cotizaciones: MetricaDeCotizaciones;
  ingestion: MetricaDeIngestion;
  integracionYCache: MetricaDeIntegracionYCache;
  runtime?: MetricaDeRuntimeNode;
}

export interface PanelDeObservabilidadEstado {
  intervaloRefresco: IntervaloRefresco;
  ultimaSincronizacion: Date | null;
  estadoConexion: EstadoConexion;
  cargando: boolean;
  actualizando: boolean;
  error: string | null;
  errorReadiness: string | null;
  errorLiveness: string | null;
  errorMetrics: string | null;
  readiness: SondaReadinessData | null;
  liveness: SondaLivenessData | null;
  metricas: MetricasCompletas | null;
}
