import { Injectable, Logger, OnModuleInit, Optional, Inject } from '@nestjs/common';
import * as promClient from 'prom-client';
import {
  METRIC_NAMES,
  METRIC_BUCKETS,
  TipoOrdenMetrica,
  MercadoMetrica,
  EstadoOrdenMetrica,
  EstrategiaCotizacionMetrica,
  EstadoRecalculoMetrica,
  CategoriaEvaluacionMetrica,
  EstadoScrapingMetrica,
  LigaScrapingMetrica,
  DominioCacheMetrica,
  ResultadoCacheMetrica,
  ResultadoAuthMetrica,
  EstadoTotwMetrica,
} from '../constants/metric-names.constant';

let prometheusIoClient: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  prometheusIoClient = require('@prometheus-io/client');
} catch {
  prometheusIoClient = undefined;
}

@Injectable()
export class AppMetricsService implements OnModuleInit {
  private readonly logger = new Logger(AppMetricsService.name);
  private readonly registry: promClient.Registry;
  private readonly registries: promClient.Registry[];

  // Trading & OMS
  private ordersTotal!: promClient.Counter<string>;
  private transactionsTotal!: promClient.Counter<string>;
  private volumeCentsTotal!: promClient.Counter<string>;
  private settlementDuration!: promClient.Histogram<string>;
  private slippageRejectionsTotal!: promClient.Counter<string>;
  private activeSellOrders!: promClient.Gauge<string>;

  // Cotizaciones & Pricing
  private recalculationsTotal!: promClient.Counter<string>;
  private recalculationDuration!: promClient.Histogram<string>;
  private playersEvaluatedTotal!: promClient.Counter<string>;
  private activeStrategy!: promClient.Gauge<string>;

  // Scraping WhoScored
  private scrapingExecutionsTotal!: promClient.Counter<string>;
  private scrapingDuration!: promClient.Histogram<string>;
  private scrapingMatchRate!: promClient.Gauge<string>;
  private scrapingIncidentsTotal!: promClient.Counter<string>;

  // Integraciones Externas, Schedulers y Seguridad
  private footballDataRequestsTotal!: promClient.Counter<string>;
  private footballDataRateLimitRemaining!: promClient.Gauge<string>;
  private totwGenerationsTotal!: promClient.Counter<string>;
  private totwDuration!: promClient.Histogram<string>;
  private cacheRequestsTotal!: promClient.Counter<string>;
  private cacheFallbackTotal!: promClient.Counter<string>;
  private authAttemptsTotal!: promClient.Counter<string>;
  private passwordHashingDuration!: promClient.Histogram<string>;

  constructor(
    @Optional() @Inject('PROMETHEUS_REGISTRY') customRegistry?: promClient.Registry,
  ) {
    if (customRegistry) {
      this.registry = customRegistry;
      this.registries = [customRegistry];
    } else {
      const allRegistries: promClient.Registry[] = [promClient.register];
      if (prometheusIoClient && prometheusIoClient.register && prometheusIoClient.register !== promClient.register) {
        allRegistries.push(prometheusIoClient.register);
      }
      this.registries = allRegistries;
      this.registry = prometheusIoClient?.register || promClient.register;
    }
    this.initializeMetrics();
  }

  onModuleInit(): void {
    try {
      this.registerInitialValues();
    } catch (error: any) {
      this.logger.warn(`Error al inicializar valores base de métricas: ${error.message}`);
    }
  }

  public getRegistry(): promClient.Registry {
    return this.registry;
  }

  private initializeMetrics(): void {
    // Trading
    this.ordersTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.MARKETPLACE_ORDERS_TOTAL,
      help: 'Cantidad total de órdenes procesadas por el OMS',
      labelNames: ['tipo', 'mercado', 'estado'],
    });

    this.transactionsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.MARKETPLACE_TRANSACTIONS_TOTAL,
      help: 'Cantidad total de transacciones liquidadas',
      labelNames: ['mercado', 'estrategia_version'],
    });

    this.volumeCentsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.MARKETPLACE_VOLUME_CENTS_TOTAL,
      help: 'Volumen acumulado operado en centavos de crédito',
      labelNames: ['mercado'],
    });

    this.settlementDuration = this.getOrCreateHistogram({
      name: METRIC_NAMES.MARKETPLACE_ORDER_SETTLEMENT_DURATION_SECONDS,
      help: 'Duración de liquidación de órdenes con locks pesimistas en segundos',
      labelNames: ['mercado'],
      buckets: [...METRIC_BUCKETS.SETTLEMENT_DURATION],
    });

    this.slippageRejectionsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.MARKETPLACE_SLIPPAGE_REJECTIONS_TOTAL,
      help: 'Cantidad total de órdenes de compra rechazadas por protección de slippage',
      labelNames: ['mercado'],
    });

    this.activeSellOrders = this.getOrCreateGauge({
      name: METRIC_NAMES.MARKETPLACE_ACTIVE_SELL_ORDERS,
      help: 'Cantidad actual de órdenes de venta activas en el mercado secundario',
    });

    // Pricing
    this.recalculationsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.QUOTES_RECALCULATIONS_TOTAL,
      help: 'Cantidad total de ciclos de recálculo de cotizaciones ejecutados',
      labelNames: ['estrategia', 'estado'],
    });

    this.recalculationDuration = this.getOrCreateHistogram({
      name: METRIC_NAMES.QUOTES_RECALCULATION_DURATION_SECONDS,
      help: 'Duración del proceso masivo de recálculo de cotizaciones en segundos',
      labelNames: ['estrategia'],
      buckets: [...METRIC_BUCKETS.RECALCULATION_DURATION],
    });

    this.playersEvaluatedTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.QUOTES_PLAYERS_EVALUATED_TOTAL,
      help: 'Cantidad total de jugadores evaluados en recálculos de cotizaciones',
      labelNames: ['categoria'],
    });

    this.activeStrategy = this.getOrCreateGauge({
      name: METRIC_NAMES.QUOTES_ACTIVE_STRATEGY,
      help: 'Indicador de estrategia de cotización activa (1 para activa, 0 para inactiva)',
      labelNames: ['estrategia'],
    });

    // Scraping
    this.scrapingExecutionsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.SCRAPING_EXECUTIONS_TOTAL,
      help: 'Cantidad total de ejecuciones del pipeline de scraping de WhoScored',
      labelNames: ['estado'],
    });

    this.scrapingDuration = this.getOrCreateHistogram({
      name: METRIC_NAMES.SCRAPING_EXECUTION_DURATION_SECONDS,
      help: 'Duración de extracción y sincronización de scraping por liga en segundos',
      labelNames: ['liga'],
      buckets: [...METRIC_BUCKETS.SCRAPING_DURATION],
    });

    this.scrapingMatchRate = this.getOrCreateGauge({
      name: METRIC_NAMES.SCRAPING_PLAYER_MATCH_RATE,
      help: 'Tasa porcentual de asociación exacta de jugadores extraídos (0 a 100)',
      labelNames: ['liga'],
    });

    this.scrapingIncidentsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.SCRAPING_INCIDENTS_TOTAL,
      help: 'Cantidad total de incidentes o reintentos anómalos durante el scraping',
      labelNames: ['liga'],
    });

    // Integraciones Externas, Schedulers y Seguridad
    this.footballDataRequestsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.FOOTBALL_DATA_REQUESTS_TOTAL,
      help: 'Cantidad total de peticiones HTTP enviadas a Football-Data.org',
      labelNames: ['endpoint', 'status'],
    });

    this.footballDataRateLimitRemaining = this.getOrCreateGauge({
      name: METRIC_NAMES.FOOTBALL_DATA_RATE_LIMIT_REMAINING,
      help: 'Peticiones restantes reportadas por el encabezado X-Requests-Available-Minute de Football-Data.org',
    });

    this.totwGenerationsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.TOTW_GENERATIONS_TOTAL,
      help: 'Cantidad total de generaciones de Equipo de la Semana',
      labelNames: ['estado'],
    });

    this.totwDuration = this.getOrCreateHistogram({
      name: METRIC_NAMES.TOTW_GENERATION_DURATION_SECONDS,
      help: 'Duración de la generación del Equipo de la Semana en segundos',
      buckets: [...METRIC_BUCKETS.TOTW_DURATION],
    });

    this.cacheRequestsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.CACHE_REQUESTS_TOTAL,
      help: 'Consultas a caché Redis L1 clasificadas por dominio y resultado (hit/miss)',
      labelNames: ['dominio', 'resultado'],
    });

    this.cacheFallbackTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.CACHE_FALLBACK_TOTAL,
      help: 'Cantidad de degradaciones a base de datos por fallo o indisponibilidad de Redis',
      labelNames: ['dominio'],
    });

    this.authAttemptsTotal = this.getOrCreateCounter({
      name: METRIC_NAMES.AUTH_ATTEMPTS_TOTAL,
      help: 'Cantidad total de intentos de autenticación clasificados por resultado',
      labelNames: ['resultado'],
    });

    this.passwordHashingDuration = this.getOrCreateHistogram({
      name: METRIC_NAMES.PASSWORD_HASHING_DURATION_SECONDS,
      help: 'Duración del cómputo de hashing de contraseñas con bcrypt en segundos',
      buckets: [...METRIC_BUCKETS.PASSWORD_HASHING_DURATION],
    });
  }

  private registerInitialValues(): void {
    // Inicializar contadores de trading
    for (const tipo of Object.values(TipoOrdenMetrica)) {
      for (const mercado of Object.values(MercadoMetrica)) {
        for (const estado of Object.values(EstadoOrdenMetrica)) {
          this.ordersTotal.inc({ tipo, mercado, estado }, 0);
        }
      }
    }

    for (const mercado of Object.values(MercadoMetrica)) {
      for (const estrategia of Object.values(EstrategiaCotizacionMetrica)) {
        this.transactionsTotal.inc({ mercado, estrategia_version: estrategia }, 0);
      }
      this.volumeCentsTotal.inc({ mercado }, 0);
      this.slippageRejectionsTotal.inc({ mercado }, 0);
    }
    this.activeSellOrders.set(0);

    // Inicializar contadores de cotizaciones
    for (const estrategia of Object.values(EstrategiaCotizacionMetrica)) {
      for (const estado of Object.values(EstadoRecalculoMetrica)) {
        this.recalculationsTotal.inc({ estrategia, estado }, 0);
      }
      this.activeStrategy.set({ estrategia }, estrategia === EstrategiaCotizacionMetrica.GLOBAL_V1 ? 1 : 0);
    }

    for (const categoria of Object.values(CategoriaEvaluacionMetrica)) {
      this.playersEvaluatedTotal.inc({ categoria }, 0);
    }

    // Inicializar scraping
    for (const estado of Object.values(EstadoScrapingMetrica)) {
      this.scrapingExecutionsTotal.inc({ estado }, 0);
    }

    for (const liga of Object.values(LigaScrapingMetrica)) {
      this.scrapingMatchRate.set({ liga }, 0);
      this.scrapingIncidentsTotal.inc({ liga }, 0);
    }

    // Inicializar integraciones y soporte
    this.footballDataRateLimitRemaining.set(10);

    for (const estado of Object.values(EstadoTotwMetrica)) {
      this.totwGenerationsTotal.inc({ estado }, 0);
    }

    for (const dominio of Object.values(DominioCacheMetrica)) {
      for (const resultado of Object.values(ResultadoCacheMetrica)) {
        this.cacheRequestsTotal.inc({ dominio, resultado }, 0);
      }
      this.cacheFallbackTotal.inc({ dominio }, 0);
    }

    for (const resultado of Object.values(ResultadoAuthMetrica)) {
      this.authAttemptsTotal.inc({ resultado }, 0);
    }
  }

  // --- MÉTODOS PÚBLICOS DE TELEMETRÍA (RESILIENTES CON TRY/CATCH) ---

  // User Story 1: Trading & OMS
  recordOrderCreated(tipo: TipoOrdenMetrica | string, mercado: MercadoMetrica | string, estado: EstadoOrdenMetrica | string): void {
    try {
      this.ordersTotal.inc({ tipo, mercado, estado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordOrderCreated: ${err.message}`);
    }
  }

  recordTransaction(mercado: MercadoMetrica | string, estrategiaVersion: string): void {
    try {
      this.transactionsTotal.inc({ mercado, estrategia_version: estrategiaVersion || 'N/A' }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordTransaction: ${err.message}`);
    }
  }

  recordVolumeCents(mercado: MercadoMetrica | string, cents: number): void {
    try {
      if (cents > 0) {
        this.volumeCentsTotal.inc({ mercado }, cents);
      }
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordVolumeCents: ${err.message}`);
    }
  }

  recordSettlementDuration(mercado: MercadoMetrica | string, durationSeconds: number): void {
    try {
      this.settlementDuration.observe({ mercado }, Math.max(0, durationSeconds));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordSettlementDuration: ${err.message}`);
    }
  }

  recordSlippageRejection(mercado: MercadoMetrica | string = MercadoMetrica.SECUNDARIO): void {
    try {
      this.slippageRejectionsTotal.inc({ mercado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordSlippageRejection: ${err.message}`);
    }
  }

  setActiveSellOrders(count: number): void {
    try {
      this.activeSellOrders.set(Math.max(0, count));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica setActiveSellOrders: ${err.message}`);
    }
  }

  updateActiveSellOrders(delta: number): void {
    try {
      if (delta > 0) {
        this.activeSellOrders.inc(delta);
      } else if (delta < 0) {
        this.activeSellOrders.dec(Math.abs(delta));
      }
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica updateActiveSellOrders: ${err.message}`);
    }
  }

  // User Story 2: Cotizaciones & Pricing
  recordRecalculation(estrategia: EstrategiaCotizacionMetrica | string, estado: EstadoRecalculoMetrica | string): void {
    try {
      this.recalculationsTotal.inc({ estrategia, estado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordRecalculation: ${err.message}`);
    }
  }

  recordRecalculationDuration(estrategia: EstrategiaCotizacionMetrica | string, durationSeconds: number): void {
    try {
      this.recalculationDuration.observe({ estrategia }, Math.max(0, durationSeconds));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordRecalculationDuration: ${err.message}`);
    }
  }

  recordPlayersEvaluated(categoria: CategoriaEvaluacionMetrica | string, count: number = 1): void {
    try {
      if (count > 0) {
        this.playersEvaluatedTotal.inc({ categoria }, count);
      }
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordPlayersEvaluated: ${err.message}`);
    }
  }

  setActiveStrategy(estrategiaActiva: EstrategiaCotizacionMetrica | string): void {
    try {
      for (const est of Object.values(EstrategiaCotizacionMetrica)) {
        this.activeStrategy.set({ estrategia: est }, est === estrategiaActiva ? 1 : 0);
      }
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica setActiveStrategy: ${err.message}`);
    }
  }

  // User Story 3: Scraping WhoScored
  recordScrapingExecution(estado: EstadoScrapingMetrica | string): void {
    try {
      this.scrapingExecutionsTotal.inc({ estado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordScrapingExecution: ${err.message}`);
    }
  }

  recordScrapingDuration(liga: LigaScrapingMetrica | string, durationSeconds: number): void {
    try {
      this.scrapingDuration.observe({ liga }, Math.max(0, durationSeconds));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordScrapingDuration: ${err.message}`);
    }
  }

  setPlayerMatchRate(liga: LigaScrapingMetrica | string, rate: number): void {
    try {
      const normalizedRate = Math.min(100, Math.max(0, rate));
      this.scrapingMatchRate.set({ liga }, normalizedRate);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica setPlayerMatchRate: ${err.message}`);
    }
  }

  recordScrapingIncident(liga: LigaScrapingMetrica | string): void {
    try {
      this.scrapingIncidentsTotal.inc({ liga }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordScrapingIncident: ${err.message}`);
    }
  }

  // User Story 4: Soporte, Caché, TOTW y Auth
  recordFootballDataRequest(endpoint: string, status: string | number): void {
    try {
      this.footballDataRequestsTotal.inc({ endpoint: endpoint || 'unknown', status: String(status) }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordFootballDataRequest: ${err.message}`);
    }
  }

  setFootballDataRateLimitRemaining(remaining: number): void {
    try {
      this.footballDataRateLimitRemaining.set(Math.max(0, remaining));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica setFootballDataRateLimitRemaining: ${err.message}`);
    }
  }

  recordTotwGeneration(estado: EstadoTotwMetrica | string): void {
    try {
      this.totwGenerationsTotal.inc({ estado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordTotwGeneration: ${err.message}`);
    }
  }

  recordTotwDuration(durationSeconds: number): void {
    try {
      this.totwDuration.observe(Math.max(0, durationSeconds));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordTotwDuration: ${err.message}`);
    }
  }

  recordCacheRequest(dominio: DominioCacheMetrica | string, resultado: ResultadoCacheMetrica | string): void {
    try {
      this.cacheRequestsTotal.inc({ dominio, resultado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordCacheRequest: ${err.message}`);
    }
  }

  recordCacheFallback(dominio: DominioCacheMetrica | string): void {
    try {
      this.cacheFallbackTotal.inc({ dominio }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordCacheFallback: ${err.message}`);
    }
  }

  recordAuthAttempt(resultado: ResultadoAuthMetrica | string): void {
    try {
      this.authAttemptsTotal.inc({ resultado }, 1);
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordAuthAttempt: ${err.message}`);
    }
  }

  recordPasswordHashingDuration(durationSeconds: number): void {
    try {
      this.passwordHashingDuration.observe(Math.max(0, durationSeconds));
    } catch (err: any) {
      this.logger.warn(`Fallo al registrar métrica recordPasswordHashingDuration: ${err.message}`);
    }
  }

  // --- HELPERS PARA REGISTRO SEGURO EN PROM-CLIENT ---

  private getOrCreateCounter(config: promClient.CounterConfiguration<string>): promClient.Counter<string> {
    for (const reg of this.registries) {
      const existing = reg.getSingleMetric(config.name);
      if (existing) {
        return existing as promClient.Counter<string>;
      }
    }
    return new promClient.Counter({ ...config, registers: this.registries });
  }

  private getOrCreateGauge(config: promClient.GaugeConfiguration<string>): promClient.Gauge<string> {
    for (const reg of this.registries) {
      const existing = reg.getSingleMetric(config.name);
      if (existing) {
        return existing as promClient.Gauge<string>;
      }
    }
    return new promClient.Gauge({ ...config, registers: this.registries });
  }

  private getOrCreateHistogram(config: promClient.HistogramConfiguration<string>): promClient.Histogram<string> {
    for (const reg of this.registries) {
      const existing = reg.getSingleMetric(config.name);
      if (existing) {
        return existing as promClient.Histogram<string>;
      }
    }
    return new promClient.Histogram({ ...config, registers: this.registries });
  }
}
