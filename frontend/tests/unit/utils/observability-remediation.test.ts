import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  observabilityApiClient,
  resolverDetallesLiveness,
  extraerBytesDesdeMensajeMemoria,
  resolverBytesMemoria,
  type ObservabilityApi,
} from '../../../src/api/observabilityApi';
import {
  useObservability,
  resolverResultadoSonda,
  aplicarFallbackRuntimeALiveness,
} from '../../../src/hooks/useObservability';
import { construirItemsNavegacion } from '../../../src/utils/navegacion';
import {
  construirMetricasMarketplace,
  construirMetricasCotizaciones,
  construirMetricasIngestion,
  construirMetricasIntegracionYCache,
  construirMetricasRuntime,
  procesarMetricasPrometheus,
} from '../../../src/utils/formato-observabilidad';
import {
  parsePrometheusText,
  parsearLabelsPrometheus,
} from '../../../src/utils/prometheus-parser';
import {
  UMBRAL_HEAP_BYTES,
  UMBRAL_RSS_BYTES,
  type SondaLivenessData,
  type MetricasCompletas,
} from '../../../src/types/observability.types';

describe('observability remediation — helpers de US1', () => {
  describe('observabilityApi helpers', () => {
    it('resuelve detalles desde details o combinando info y error', () => {
      expect(
        resolverDetallesLiveness({ details: { memory_heap: { status: 'up' } } })
      ).toEqual({ memory_heap: { status: 'up' } });

      expect(
        resolverDetallesLiveness({
          details: {},
          info: { memory_heap: { status: 'up', bytes: 1024 } },
          error: { memory_rss: { status: 'down', message: 'RSS 1.2 GB' } },
        })
      ).toEqual({
        memory_heap: { status: 'up', bytes: 1024 },
        memory_rss: { status: 'down', message: 'RSS 1.2 GB' },
      });

      expect(resolverDetallesLiveness(null)).toEqual({});
    });

    it('extrae bytes desde mensajes MB/GB y respeta fallback', () => {
      expect(extraerBytesDesdeMensajeMemoria(undefined, true)).toBe(0);
      expect(extraerBytesDesdeMensajeMemoria('sin unidad', true)).toBe(0);
      expect(extraerBytesDesdeMensajeMemoria('Heap en 150.5 MB', false)).toBe(
        Math.round(150.5 * 1024 * 1024)
      );
      expect(extraerBytesDesdeMensajeMemoria('RSS en 1.5 GB', true)).toBe(
        Math.round(1.5 * 1024 * 1024 * 1024)
      );
      expect(resolverBytesMemoria({ bytes: 2048 }, 9999, false)).toBe(2048);
      expect(resolverBytesMemoria({ bytes: 0, message: '10 MB' }, 9999, false)).toBe(
        10 * 1024 * 1024
      );
      expect(resolverBytesMemoria({ bytes: 0, message: 'sin datos' }, 4096, false)).toBe(4096);
      expect(resolverBytesMemoria({}, undefined, true)).toBe(0);
    });

    it('mapea liveness con estado ok/error y fallbacks', () => {
      const liveness = observabilityApiClient.mapearTerminusLiveness(
        {
          status: 'error',
          info: { memory_heap: { status: 'up', bytes: 0 } },
          error: { memory_rss: { status: 'down', message: 'Usando 1.1 GB' } },
        },
        { heapUsedBytes: 50 * 1024 * 1024 }
      );

      expect(liveness.estadoGlobal).toBe('error');
      expect(liveness.memoriaHeapBytes).toBe(50 * 1024 * 1024);
      expect(liveness.memoriaRssBytes).toBe(Math.round(1.1 * 1024 * 1024 * 1024));
    });
  });

  describe('useObservability helpers', () => {
    it('resuelve resultados fulfilled y rejected con mensaje fallback', () => {
      expect(
        resolverResultadoSonda({ status: 'fulfilled', value: { ok: true } }, 'fallback')
      ).toEqual({ valor: { ok: true }, error: null });

      expect(
        resolverResultadoSonda(
          { status: 'rejected', reason: new Error('fallo de red') },
          'fallback'
        )
      ).toEqual({ valor: null, error: 'fallo de red' });

      expect(
        resolverResultadoSonda({ status: 'rejected', reason: {} }, 'fallback por defecto')
      ).toEqual({ valor: null, error: 'fallback por defecto' });
    });

    it('aplica fallback de runtime sobre liveness solo cuando faltan bytes', () => {
      const baseLiveness: SondaLivenessData = {
        estadoGlobal: 'ok',
        memoriaHeapBytes: 0,
        umbralHeapBytes: UMBRAL_HEAP_BYTES,
        porcentajeHeap: 0,
        memoriaRssBytes: 0,
        umbralRssBytes: UMBRAL_RSS_BYTES,
        porcentajeRss: 0,
      };
      const metricas = procesarMetricasPrometheus(
        parsePrometheusText(`
nodejs_heap_size_used_bytes 104857600
process_resident_memory_bytes 209715200
`)
      );

      expect(aplicarFallbackRuntimeALiveness(null, metricas)).toBeNull();
      expect(aplicarFallbackRuntimeALiveness(baseLiveness, null)).toBe(baseLiveness);

      const actualizado = aplicarFallbackRuntimeALiveness(baseLiveness, metricas);
      expect(actualizado?.memoriaHeapBytes).toBe(104857600);
      expect(actualizado?.memoriaRssBytes).toBe(209715200);
      expect(actualizado?.porcentajeHeap).toBeGreaterThan(0);

      // Si ya tenía valores, retorna la misma referencia sin recalcular
      const conDatos: SondaLivenessData = {
        ...baseLiveness,
        memoriaHeapBytes: 1234,
        memoriaRssBytes: 5678,
      };
      const sinCambio = aplicarFallbackRuntimeALiveness(
        conDatos,
        metricas as MetricasCompletas
      );
      expect(sinCambio).toBe(conDatos);
    });
  });

  describe('formato-observabilidad y prometheus-parser helpers', () => {
    it('descompone y procesa bloques de métricas Prometheus coherentemente', () => {
      const samples = parsePrometheusText(`
# HELP marketplace_orders_total Ordenes
# TYPE marketplace_orders_total counter
# Comentario ignorado
linea invalida sin valor
metrica_nan NaN
marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 5
marketplace_transactions_total{mercado="personalizado",estrategia="GLOBAL_v1"} 3
quotes_recalculations_total{estado="exito"} 2
quotes_active_strategy{estrategia="POSICIONAL_v1"} 1
scraping_executions_total{estado="exitoso"} 4
scraping_execution_duration_seconds_sum{liga="LaLiga"} 12
scraping_execution_duration_seconds_count{liga="LaLiga"} 3
scraping_execution_duration_seconds_sum{otro="sin_liga"} 5
scraping_player_match_rate{liga="LaLiga"} 95
scraping_incidents_total{liga="LaLiga"} 1
cache_requests_total{resultado="hit"} 8
cache_requests_total{resultado="miss"} 2
totw_generations_total 1
auth_attempts_total{resultado="exito"} 7
process_start_time_seconds 1700000000
nodejs_version_info{version="v20.11.0"} 1
`);

      expect(construirMetricasMarketplace(samples).ordenesTotales).toBe(5);
      expect(construirMetricasCotizaciones(samples).estrategiaActiva).toBe('POSICIONAL_v1');
      expect(construirMetricasIngestion(samples).duracionPorLiga.LaLiga).toBe(4);
      expect(construirMetricasIntegracionYCache(samples).cacheHitRatio).toBe(80);
      expect(construirMetricasRuntime(samples).versionNode).toBe('v20.11.0');
      expect(parsearLabelsPrometheus('a="1",b="2"')).toEqual({ a: '1', b: '2' });
    });
  });

  describe('anti-ReDoS O(n) y casos de borde de US2', () => {
    it('procesa mensajes extensos de memoria en tiempo lineal y soporta decimales MB/GB', () => {
      const secuenciaLargaDigitos = `${'9'.repeat(50_000)} sin unidad`;
      const inicio = Date.now();

      const resSinUnidad = observabilityApiClient.mapearTerminusLiveness({
        status: 'ok',
        details: {
          memory_heap: { status: 'up', message: secuenciaLargaDigitos },
          memory_rss: { status: 'up', message: secuenciaLargaDigitos },
        },
      });

      expect(resSinUnidad.memoriaHeapBytes).toBe(0);
      expect(resSinUnidad.memoriaRssBytes).toBe(0);
      expect(Date.now() - inicio).toBeLessThan(1000);

      const resDecimales = observabilityApiClient.mapearTerminusLiveness({
        status: 'ok',
        details: {
          memory_heap: { status: 'up', message: 'Consumo actual: 128.25 MB' },
          memory_rss: { status: 'up', message: 'Consumo RSS: 0.75 GB' },
        },
      });
      expect(resDecimales.memoriaHeapBytes).toBe(Math.round(128.25 * 1024 * 1024));
      expect(resDecimales.memoriaRssBytes).toBe(Math.round(0.75 * 1024 * 1024 * 1024));
    });

    it('parsea labels Prometheus con comas internas, claves inválidas y cadenas extensas sin "=" en O(n)', () => {
      expect(
        parsearLabelsPrometheus(
          'msg="hola, mundo, 2026",clave_valida="ok",clave-invalida="ignorar",vacia=""'
        )
      ).toEqual({
        msg: 'hola, mundo, 2026',
        clave_valida: 'ok',
        vacia: '',
      });
      expect(parsearLabelsPrometheus('sin_cierre="incompleto')).toEqual({});

      const etiquetaLargaSinIgual = 'a'.repeat(50_000);
      const inicio = Date.now();
      expect(parsearLabelsPrometheus(etiquetaLargaSinIgual)).toEqual({});
      expect(
        parsePrometheusText(`custom_metric{${etiquetaLargaSinIgual}} 42`)
      ).toEqual([
        {
          name: 'custom_metric',
          labels: {},
          value: 42,
          help: undefined,
          type: undefined,
        },
      ]);
      expect(Date.now() - inicio).toBeLessThan(1000);
    });
  });

  describe('casos límite de US4 (intervaloInicial: 0, timestamps Prometheus y navegación ADMIN)', () => {
    it('preserva intervaloInicial: 0 (refresco pausado) en useObservability', async () => {
      const apiMock: ObservabilityApi = {
        obtenerHealthReady: vi.fn().mockResolvedValue({
          estadoGlobal: 'ok',
          baseDatos: { estado: 'up' },
          redis: { estado: 'up' },
          footballData: { estado: 'up' },
        }),
        obtenerHealthLive: vi.fn().mockResolvedValue({
          estadoGlobal: 'ok',
          memoriaHeapBytes: 1024,
          umbralHeapBytes: UMBRAL_HEAP_BYTES,
          porcentajeHeap: 0.01,
          memoriaRssBytes: 2048,
          umbralRssBytes: UMBRAL_RSS_BYTES,
          porcentajeRss: 0.01,
        }),
        obtenerMetrics: vi.fn().mockResolvedValue('marketplace_active_sell_orders 2'),
      };

      const { result } = renderHook(() =>
        useObservability({ apiClient: apiMock, intervaloInicial: 0 })
      );

      expect(result.current.intervaloRefresco).toBe(0);
      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.intervaloRefresco).toBe(0);
      expect(apiMock.obtenerMetrics).toHaveBeenCalledTimes(1);
    });

    it('maneja texto vacío o solo espacios y líneas con timestamp numérico en parsePrometheusText', () => {
      expect(parsePrometheusText('')).toEqual([]);
      expect(parsePrometheusText('   \n\t  \n ')).toEqual([]);

      const parsed = parsePrometheusText(
        'app_latency_seconds{env="prod"} 12.5 1700000000123'
      );
      expect(parsed).toEqual([
        {
          name: 'app_latency_seconds',
          labels: { env: 'prod' },
          value: 12.5,
          help: undefined,
          type: undefined,
        },
      ]);
    });

    it('consolida los ítems de navegación para rol ADMIN manteniendo los de USUARIO', () => {
      const itemsUsuario = construirItemsNavegacion('USUARIO');
      expect(itemsUsuario).toHaveLength(5);

      const itemsAdmin = construirItemsNavegacion('ADMIN');
      expect(itemsAdmin).toHaveLength(7);
      expect(itemsAdmin.slice(-2)).toEqual([
        { label: 'Gobernanza', to: '/admin', id: 'nav-admin' },
        { label: 'Observabilidad', to: '/admin/observability', id: 'nav-observability' },
      ]);
    });
  });
});
