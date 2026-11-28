/**
 * Nombres canónicos de métricas de Prometheus para el Marketplace.
 * Siguen las convenciones de Prometheus:
 * - Formato: ^[a-zA-Z_:][a-zA-Z0-9_:]*$
 * - Contadores terminan en '_total'
 * - Histogramas terminan en '_seconds'
 */
export const METRIC_NAMES = {
  // Trading & OMS (User Story 1)
  MARKETPLACE_ORDERS_TOTAL: 'marketplace_orders_total',
  MARKETPLACE_TRANSACTIONS_TOTAL: 'marketplace_transactions_total',
  MARKETPLACE_VOLUME_CENTS_TOTAL: 'marketplace_volume_cents_total',
  MARKETPLACE_ORDER_SETTLEMENT_DURATION_SECONDS: 'marketplace_order_settlement_duration_seconds',
  MARKETPLACE_SLIPPAGE_REJECTIONS_TOTAL: 'marketplace_slippage_rejections_total',
  MARKETPLACE_ACTIVE_SELL_ORDERS: 'marketplace_active_sell_orders',

  // Cotizaciones & Pricing (User Story 2)
  QUOTES_RECALCULATIONS_TOTAL: 'quotes_recalculations_total',
  QUOTES_RECALCULATION_DURATION_SECONDS: 'quotes_recalculation_duration_seconds',
  QUOTES_PLAYERS_EVALUATED_TOTAL: 'quotes_players_evaluated_total',
  QUOTES_ACTIVE_STRATEGY: 'quotes_active_strategy',

  // Scraping WhoScored & Playwright (User Story 3)
  SCRAPING_EXECUTIONS_TOTAL: 'scraping_executions_total',
  SCRAPING_EXECUTION_DURATION_SECONDS: 'scraping_execution_duration_seconds',
  SCRAPING_PLAYER_MATCH_RATE: 'scraping_player_match_rate',
  SCRAPING_INCIDENTS_TOTAL: 'scraping_incidents_total',

  // Integraciones Externas, Schedulers y Seguridad (User Story 4)
  FOOTBALL_DATA_REQUESTS_TOTAL: 'football_data_requests_total',
  FOOTBALL_DATA_RATE_LIMIT_REMAINING: 'football_data_rate_limit_remaining',
  TOTW_GENERATIONS_TOTAL: 'totw_generations_total',
  TOTW_GENERATION_DURATION_SECONDS: 'totw_generation_duration_seconds',
  CACHE_REQUESTS_TOTAL: 'cache_requests_total',
  CACHE_FALLBACK_TOTAL: 'cache_fallback_total',
  AUTH_ATTEMPTS_TOTAL: 'auth_attempts_total',
  PASSWORD_HASHING_DURATION_SECONDS: 'password_hashing_duration_seconds',
} as const;

/**
 * Buckets de agregación de histogramas (en segundos)
 */
export const METRIC_BUCKETS = {
  SETTLEMENT_DURATION: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  RECALCULATION_DURATION: [0.1, 0.5, 1, 2, 5, 10, 30],
  SCRAPING_DURATION: [1, 5, 10, 30, 60, 120, 300],
  TOTW_DURATION: [0.1, 0.5, 1, 2, 5, 10],
  PASSWORD_HASHING_DURATION: [0.01, 0.05, 0.1, 0.2, 0.5, 1],
} as const;

/**
 * Enums de etiquetas de métricas
 */
export enum TipoOrdenMetrica {
  COMPRA = 'compra',
  VENTA = 'venta',
}

export enum MercadoMetrica {
  PRIMARIO = 'primario',
  SECUNDARIO = 'secundario',
}

export enum EstadoOrdenMetrica {
  CREADA = 'creada',
  PENDIENTE = 'pendiente',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
  RECHAZADA = 'rechazada',
}

export enum EstrategiaCotizacionMetrica {
  GLOBAL_V1 = 'GLOBAL_v1',
  POSICIONAL_V1 = 'POSICIONAL_v1',
}

export enum EstadoRecalculoMetrica {
  EXITO = 'exito',
  FALLO = 'fallo',
}

export enum CategoriaEvaluacionMetrica {
  PROCESADOS = 'procesados',
  SIN_ESTADISTICAS = 'sin_estadisticas',
  FALLIDOS = 'fallidos',
}

export enum EstadoScrapingMetrica {
  EXITOSO = 'exitoso',
  FALLIDO = 'fallido',
  RECUPERADA_ATASCO = 'recuperada_atasco',
}

export enum LigaScrapingMetrica {
  PL = 'PL',
  PD = 'PD',
  SA = 'SA',
  BL1 = 'BL1',
  FL1 = 'FL1',
  GLOBAL = 'GLOBAL',
}

export enum DominioCacheMetrica {
  MARKETPLACE = 'marketplace',
  SCRAPING = 'scraping',
}

export enum ResultadoCacheMetrica {
  HIT = 'hit',
  MISS = 'miss',
}

export enum ResultadoAuthMetrica {
  EXITO = 'exito',
  FALLO = 'fallo',
}

export enum EstadoTotwMetrica {
  EXITO = 'exito',
  FALLO = 'fallo',
}
