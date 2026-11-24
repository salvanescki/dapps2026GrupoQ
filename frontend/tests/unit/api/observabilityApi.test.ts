import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { observabilityApiClient } from '../../../src/api/observabilityApi';

describe('observabilityApi client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('obtenerMetrics consume /metrics y devuelve el texto plano', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('# HELP test\ntest_metric 1\n'),
    } as any);

    const metricsText = await observabilityApiClient.obtenerMetrics();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/metrics$/),
      expect.objectContaining({ headers: { Accept: 'text/plain' } })
    );
    expect(metricsText).toContain('test_metric 1');
  });

  it('obtenerHealthReady interpreta respuesta 200 y mapea dependencias', async () => {
    const terminus200 = {
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
        'football-data': { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
        redis: { status: 'up' },
        'football-data': { status: 'up' },
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(terminus200),
    } as any);

    const ready = await observabilityApiClient.obtenerHealthReady();
    expect(ready.estadoGlobal).toBe('ok');
    expect(ready.baseDatos.estado).toBe('up');
    expect(ready.redis.estado).toBe('up');
    expect(ready.footballData.estado).toBe('up');
  });

  it('obtenerHealthReady interpreta respuesta 503 Terminus como degradado/error estructurado', async () => {
    const terminus503 = {
      status: 'error',
      info: { database: { status: 'up' } },
      error: {
        redis: { status: 'down', message: 'Connection refused' },
      },
      details: {
        database: { status: 'up' },
        redis: { status: 'down', message: 'Connection refused' },
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue(terminus503),
    } as any);

    const ready = await observabilityApiClient.obtenerHealthReady();
    expect(ready.estadoGlobal).toBe('degradado');
    expect(ready.baseDatos.estado).toBe('up');
    expect(ready.redis.estado).toBe('down');
    expect(ready.redis.mensaje).toBe('Connection refused');
  });

  it('obtenerHealthLive mapea Heap y RSS y calcula porcentajes contra umbrales', async () => {
    const liveness200 = {
      status: 'ok',
      info: {
        memory_heap: { status: 'up', bytes: 157286400 }, // 150 MB (50%)
        memory_rss: { status: 'up', bytes: 536870912 }, // 512 MB (50%)
      },
      details: {},
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(liveness200),
    } as any);

    const live = await observabilityApiClient.obtenerHealthLive();
    expect(live.estadoGlobal).toBe('ok');
    expect(live.memoriaHeapBytes).toBe(157286400);
    expect(live.porcentajeHeap).toBeCloseTo(50, 0);
    expect(live.memoriaRssBytes).toBe(536870912);
    expect(live.porcentajeRss).toBeCloseTo(50, 0);
  });

  it('mapearTerminusLiveness usa fallback de Prometheus cuando /health/live devuelve 200 sin bytes', () => {
    const livenessTerminusNominal = {
      status: 'ok',
      info: {
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
      },
      details: {
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
      },
    };

    const resultado = observabilityApiClient.mapearTerminusLiveness(livenessTerminusNominal, {
      heapUsedBytes: 157286400,
      rssBytes: 536870912,
    });

    expect(resultado.estadoGlobal).toBe('ok');
    expect(resultado.memoriaHeapBytes).toBe(157286400);
    expect(resultado.porcentajeHeap).toBeCloseTo(50, 0);
    expect(resultado.memoriaRssBytes).toBe(536870912);
    expect(resultado.porcentajeRss).toBeCloseTo(50, 0);
  });
});
