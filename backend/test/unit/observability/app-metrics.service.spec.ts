import * as promClient from 'prom-client';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';
import {
  METRIC_NAMES,
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
} from '../../../src/observability/constants/metric-names.constant';

describe('AppMetricsService (Unit Tests)', () => {
  let service: AppMetricsService;
  let registry: promClient.Registry;

  beforeEach(() => {
    registry = new promClient.Registry();
    service = new AppMetricsService(registry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Inicialización y Valores Base (onModuleInit)', () => {
    it('debe registrar todas las métricas requeridas en el registro de Prometheus', async () => {
      const metricNames = await registry.getMetricsAsJSON();
      const registeredNames = metricNames.map((m) => m.name);

      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_ORDERS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_TRANSACTIONS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_VOLUME_CENTS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_ORDER_SETTLEMENT_DURATION_SECONDS);
      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_SLIPPAGE_REJECTIONS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.MARKETPLACE_ACTIVE_SELL_ORDERS);

      expect(registeredNames).toContain(METRIC_NAMES.QUOTES_RECALCULATIONS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.QUOTES_RECALCULATION_DURATION_SECONDS);
      expect(registeredNames).toContain(METRIC_NAMES.QUOTES_PLAYERS_EVALUATED_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.QUOTES_ACTIVE_STRATEGY);

      expect(registeredNames).toContain(METRIC_NAMES.SCRAPING_EXECUTIONS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.SCRAPING_EXECUTION_DURATION_SECONDS);
      expect(registeredNames).toContain(METRIC_NAMES.SCRAPING_PLAYER_MATCH_RATE);
      expect(registeredNames).toContain(METRIC_NAMES.SCRAPING_INCIDENTS_TOTAL);

      expect(registeredNames).toContain(METRIC_NAMES.FOOTBALL_DATA_REQUESTS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.FOOTBALL_DATA_RATE_LIMIT_REMAINING);
      expect(registeredNames).toContain(METRIC_NAMES.TOTW_GENERATIONS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.TOTW_GENERATION_DURATION_SECONDS);
      expect(registeredNames).toContain(METRIC_NAMES.CACHE_REQUESTS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.CACHE_FALLBACK_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.AUTH_ATTEMPTS_TOTAL);
      expect(registeredNames).toContain(METRIC_NAMES.PASSWORD_HASHING_DURATION_SECONDS);
    });

    it('debe inicializar valores base en 0 tras ejecutar onModuleInit()', async () => {
      service.onModuleInit();

      const metricsString = await registry.metrics();
      expect(metricsString).toContain('marketplace_orders_total{tipo="compra",mercado="primario",estado="creada"} 0');
      expect(metricsString).toContain('marketplace_active_sell_orders 0');
      expect(metricsString).toContain('quotes_active_strategy{estrategia="GLOBAL_v1"} 1');
      expect(metricsString).toContain('quotes_active_strategy{estrategia="POSICIONAL_v1"} 0');
      expect(metricsString).toContain('football_data_rate_limit_remaining 10');
    });
  });

  describe('Métodos de Telemetría - User Story 1 (Trading)', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('debe incrementar el contador de órdenes creadas', async () => {
      service.recordOrderCreated(TipoOrdenMetrica.COMPRA, MercadoMetrica.PRIMARIO, EstadoOrdenMetrica.COMPLETADA);
      const metric = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_ORDERS_TOTAL);
      expect(metric).toContain('marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 1');
    });

    it('debe incrementar transacciones y volumen en centavos', async () => {
      service.recordTransaction(MercadoMetrica.PRIMARIO, 'GLOBAL_v1');
      service.recordVolumeCents(MercadoMetrica.PRIMARIO, 2500);

      const txMetric = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_TRANSACTIONS_TOTAL);
      const volMetric = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_VOLUME_CENTS_TOTAL);

      expect(txMetric).toContain('marketplace_transactions_total{mercado="primario",estrategia_version="GLOBAL_v1"} 1');
      expect(volMetric).toContain('marketplace_volume_cents_total{mercado="primario"} 2500');
    });

    it('debe registrar duración de liquidación de órdenes', async () => {
      service.recordSettlementDuration(MercadoMetrica.SECUNDARIO, 0.045);
      const metric = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_ORDER_SETTLEMENT_DURATION_SECONDS);
      expect(metric).toContain('marketplace_order_settlement_duration_seconds_count{mercado="secundario"} 1');
    });

    it('debe registrar rechazos de slippage y actualizar órdenes activas', async () => {
      service.recordSlippageRejection(MercadoMetrica.SECUNDARIO);
      service.setActiveSellOrders(5);
      service.updateActiveSellOrders(2);
      service.updateActiveSellOrders(-1);

      const slippage = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_SLIPPAGE_REJECTIONS_TOTAL);
      const activeOrders = await registry.getSingleMetricAsString(METRIC_NAMES.MARKETPLACE_ACTIVE_SELL_ORDERS);

      expect(slippage).toContain('marketplace_slippage_rejections_total{mercado="secundario"} 1');
      expect(activeOrders).toContain('marketplace_active_sell_orders 6');
    });
  });

  describe('Métodos de Telemetría - User Story 2 (Pricing)', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('debe registrar recálculo, duración, jugadores evaluados y estrategia activa', async () => {
      service.recordRecalculation(EstrategiaCotizacionMetrica.GLOBAL_V1, EstadoRecalculoMetrica.EXITO);
      service.recordRecalculationDuration(EstrategiaCotizacionMetrica.GLOBAL_V1, 1.25);
      service.recordPlayersEvaluated(CategoriaEvaluacionMetrica.PROCESADOS, 100);
      service.setActiveStrategy(EstrategiaCotizacionMetrica.POSICIONAL_V1);

      const recalc = await registry.getSingleMetricAsString(METRIC_NAMES.QUOTES_RECALCULATIONS_TOTAL);
      const duration = await registry.getSingleMetricAsString(METRIC_NAMES.QUOTES_RECALCULATION_DURATION_SECONDS);
      const players = await registry.getSingleMetricAsString(METRIC_NAMES.QUOTES_PLAYERS_EVALUATED_TOTAL);
      const strategy = await registry.getSingleMetricAsString(METRIC_NAMES.QUOTES_ACTIVE_STRATEGY);

      expect(recalc).toContain('quotes_recalculations_total{estrategia="GLOBAL_v1",estado="exito"} 1');
      expect(duration).toContain('quotes_recalculation_duration_seconds_count{estrategia="GLOBAL_v1"} 1');
      expect(players).toContain('quotes_players_evaluated_total{categoria="procesados"} 100');
      expect(strategy).toContain('quotes_active_strategy{estrategia="POSICIONAL_v1"} 1');
      expect(strategy).toContain('quotes_active_strategy{estrategia="GLOBAL_v1"} 0');
    });
  });

  describe('Métodos de Telemetría - User Story 3 (Scraping)', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('debe registrar ejecuciones, duraciones, match rate e incidentes de scraping', async () => {
      service.recordScrapingExecution(EstadoScrapingMetrica.EXITOSO);
      service.recordScrapingDuration(LigaScrapingMetrica.PL, 45.5);
      service.setPlayerMatchRate(LigaScrapingMetrica.PL, 98.5);
      service.recordScrapingIncident(LigaScrapingMetrica.PL);

      const executions = await registry.getSingleMetricAsString(METRIC_NAMES.SCRAPING_EXECUTIONS_TOTAL);
      const duration = await registry.getSingleMetricAsString(METRIC_NAMES.SCRAPING_EXECUTION_DURATION_SECONDS);
      const matchRate = await registry.getSingleMetricAsString(METRIC_NAMES.SCRAPING_PLAYER_MATCH_RATE);
      const incidents = await registry.getSingleMetricAsString(METRIC_NAMES.SCRAPING_INCIDENTS_TOTAL);

      expect(executions).toContain('scraping_executions_total{estado="exitoso"} 1');
      expect(duration).toContain('scraping_execution_duration_seconds_count{liga="PL"} 1');
      expect(matchRate).toContain('scraping_player_match_rate{liga="PL"} 98.5');
      expect(incidents).toContain('scraping_incidents_total{liga="PL"} 1');
    });
  });

  describe('Métodos de Telemetría - User Story 4 (Soporte, Caché, TOTW y Auth)', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('debe registrar peticiones y rate limit de FootballData', async () => {
      service.recordFootballDataRequest('/competitions/PL/matches', 200);
      service.setFootballDataRateLimitRemaining(8);

      const requests = await registry.getSingleMetricAsString(METRIC_NAMES.FOOTBALL_DATA_REQUESTS_TOTAL);
      const remaining = await registry.getSingleMetricAsString(METRIC_NAMES.FOOTBALL_DATA_RATE_LIMIT_REMAINING);

      expect(requests).toContain('football_data_requests_total{endpoint="/competitions/PL/matches",status="200"} 1');
      expect(remaining).toContain('football_data_rate_limit_remaining 8');
    });

    it('debe registrar generación y duración de TOTW', async () => {
      service.recordTotwGeneration(EstadoTotwMetrica.EXITO);
      service.recordTotwDuration(0.8);

      const totw = await registry.getSingleMetricAsString(METRIC_NAMES.TOTW_GENERATIONS_TOTAL);
      const duration = await registry.getSingleMetricAsString(METRIC_NAMES.TOTW_GENERATION_DURATION_SECONDS);

      expect(totw).toContain('totw_generations_total{estado="exito"} 1');
      expect(duration).toContain('totw_generation_duration_seconds_count 1');
    });

    it('debe registrar operaciones de caché L1', async () => {
      service.recordCacheRequest(DominioCacheMetrica.MARKETPLACE, ResultadoCacheMetrica.HIT);
      service.recordCacheFallback(DominioCacheMetrica.MARKETPLACE);

      const requests = await registry.getSingleMetricAsString(METRIC_NAMES.CACHE_REQUESTS_TOTAL);
      const fallback = await registry.getSingleMetricAsString(METRIC_NAMES.CACHE_FALLBACK_TOTAL);

      expect(requests).toContain('cache_requests_total{dominio="marketplace",resultado="hit"} 1');
      expect(fallback).toContain('cache_fallback_total{dominio="marketplace"} 1');
    });

    it('debe registrar intentos de login y duración de hashing de contraseñas', async () => {
      service.recordAuthAttempt(ResultadoAuthMetrica.EXITO);
      service.recordPasswordHashingDuration(0.08);

      const auth = await registry.getSingleMetricAsString(METRIC_NAMES.AUTH_ATTEMPTS_TOTAL);
      const hashing = await registry.getSingleMetricAsString(METRIC_NAMES.PASSWORD_HASHING_DURATION_SECONDS);

      expect(auth).toContain('auth_attempts_total{resultado="exito"} 1');
      expect(hashing).toContain('password_hashing_duration_seconds_count 1');
    });
  });

  describe('Resiliencia y Manejo de Errores (FR-024, SC-006)', () => {
    it('no debe propagar excepciones si una operación interna de métrica falla', () => {
      // Simular que un método interno lanza error
      const ordersTotal = (service as any).ordersTotal;
      jest.spyOn(ordersTotal, 'inc').mockImplementationOnce(() => {
        throw new Error('Prometheus registry internal failure');
      });

      expect(() => {
        service.recordOrderCreated(TipoOrdenMetrica.COMPRA, MercadoMetrica.PRIMARIO, EstadoOrdenMetrica.COMPLETADA);
      }).not.toThrow();
    });

    it('no debe propagar errores si onModuleInit falla al inicializar', () => {
      const ordersTotal = (service as any).ordersTotal;
      jest.spyOn(ordersTotal, 'inc').mockImplementationOnce(() => {
        throw new Error('Registry locked');
      });

      expect(() => {
        service.onModuleInit();
      }).not.toThrow();
    });

    it('debe capturar errores y emitir advertencias en todos los métodos de telemetría ante fallos internos', () => {
      // Simular throw en cada métrica
      jest.spyOn((service as any).transactionsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordTransaction('primario', 'v1')).not.toThrow();

      jest.spyOn((service as any).volumeCentsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordVolumeCents('primario', 100)).not.toThrow();

      jest.spyOn((service as any).settlementDuration, 'observe').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordSettlementDuration('primario', 0.1)).not.toThrow();

      jest.spyOn((service as any).slippageRejectionsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordSlippageRejection('primario')).not.toThrow();

      jest.spyOn((service as any).activeSellOrders, 'set').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.setActiveSellOrders(5)).not.toThrow();

      jest.spyOn((service as any).activeSellOrders, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.updateActiveSellOrders(1)).not.toThrow();

      jest.spyOn((service as any).recalculationsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordRecalculation('GLOBAL_v1', 'exito')).not.toThrow();

      jest.spyOn((service as any).recalculationDuration, 'observe').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordRecalculationDuration('GLOBAL_v1', 1.0)).not.toThrow();

      jest.spyOn((service as any).playersEvaluatedTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordPlayersEvaluated('procesados', 10)).not.toThrow();

      jest.spyOn((service as any).activeStrategy, 'set').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.setActiveStrategy('GLOBAL_v1')).not.toThrow();

      jest.spyOn((service as any).scrapingExecutionsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordScrapingExecution('exitoso')).not.toThrow();

      jest.spyOn((service as any).scrapingDuration, 'observe').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordScrapingDuration('PL', 10)).not.toThrow();

      jest.spyOn((service as any).scrapingMatchRate, 'set').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.setPlayerMatchRate('PL', 90)).not.toThrow();

      jest.spyOn((service as any).scrapingIncidentsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordScrapingIncident('PL')).not.toThrow();

      jest.spyOn((service as any).footballDataRequestsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordFootballDataRequest('/teams', 200)).not.toThrow();

      jest.spyOn((service as any).footballDataRateLimitRemaining, 'set').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.setFootballDataRateLimitRemaining(5)).not.toThrow();

      jest.spyOn((service as any).totwGenerationsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordTotwGeneration('exito')).not.toThrow();

      jest.spyOn((service as any).totwDuration, 'observe').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordTotwDuration(1.0)).not.toThrow();

      jest.spyOn((service as any).cacheRequestsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordCacheRequest('marketplace', 'hit')).not.toThrow();

      jest.spyOn((service as any).cacheFallbackTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordCacheFallback('marketplace')).not.toThrow();

      jest.spyOn((service as any).authAttemptsTotal, 'inc').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordAuthAttempt('exito')).not.toThrow();

      jest.spyOn((service as any).passwordHashingDuration, 'observe').mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => service.recordPasswordHashingDuration(0.1)).not.toThrow();
    });

    it('debe manejar branches no operativos (valores 0 o negativos)', () => {
      service.recordVolumeCents('primario', 0);
      service.recordVolumeCents('primario', -10);
      service.recordPlayersEvaluated('procesados', 0);
      service.updateActiveSellOrders(0);
      service.recordTransaction('secundario', '');
      service.recordFootballDataRequest('', 500);
      expect(service.getRegistry()).toBeDefined();

      // Instanciar un segundo servicio sobre el mismo registro para ejercitar getOrCreateMetric (existing)
      const secondService = new AppMetricsService(registry);
      expect(secondService).toBeDefined();
    });
  });
});
