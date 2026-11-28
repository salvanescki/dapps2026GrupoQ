import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObservability } from '../../../src/hooks/useObservability';
import { ObservabilityApi } from '../../../src/api/observabilityApi';

describe('useObservability (US6 Hook Integration)', () => {
  let mockApi: ObservabilityApi;

  beforeEach(() => {
    vi.useFakeTimers();
    mockApi = {
      obtenerMetrics: vi.fn().mockResolvedValue('marketplace_volume_cents_total 1000\n'),
      obtenerHealthReady: vi.fn().mockResolvedValue({
        estadoGlobal: 'ok',
        baseDatos: { estado: 'up' },
        redis: { estado: 'up' },
        footballData: { estado: 'up' },
      }),
      obtenerHealthLive: vi.fn().mockResolvedValue({
        estadoGlobal: 'ok',
        memoriaHeapBytes: 100,
        umbralHeapBytes: 300,
        porcentajeHeap: 33.3,
        memoriaRssBytes: 200,
        umbralRssBytes: 1000,
        porcentajeRss: 20,
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('inicia cargando, consulta las 3 fuentes y actualiza ultimaSincronizacion', async () => {
    const { result } = renderHook(() =>
      useObservability({ apiClient: mockApi, intervaloInicial: 0 })
    );

    expect(result.current.cargando).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.cargando).toBe(false);
    expect(result.current.readiness?.estadoGlobal).toBe('ok');
    expect(result.current.liveness?.estadoGlobal).toBe('ok');
    expect(result.current.metricas?.marketplace.volumenCentavosTotal).toBe(1000);
    expect(result.current.ultimaSincronizacion).not.toBeNull();
  });

  it('ejecuta polling automático según el intervalo configurado', async () => {
    const { result } = renderHook(() =>
      useObservability({ apiClient: mockApi, intervaloInicial: 5000 })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApi.obtenerMetrics).toHaveBeenCalledTimes(1);

    // Avanza 5 segundos
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockApi.obtenerMetrics).toHaveBeenCalledTimes(2);
  });

  it('aísla fallos: si falla /metrics, readiness y liveness continúan funcionando y errorMetrics se establece', async () => {
    mockApi.obtenerMetrics = vi.fn().mockRejectedValue(new Error('Prometheus caído'));

    const { result } = renderHook(() =>
      useObservability({ apiClient: mockApi, intervaloInicial: 0 })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.cargando).toBe(false);
    expect(result.current.readiness?.estadoGlobal).toBe('ok');
    expect(result.current.errorMetrics).toContain('Prometheus caído');
    expect(result.current.error).toBeNull(); // No fallaron todas
  });

  it('permite refresco manual vía invocación de refrescar()', async () => {
    const { result } = renderHook(() =>
      useObservability({ apiClient: mockApi, intervaloInicial: 0 })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApi.obtenerMetrics).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refrescar();
    });
    expect(mockApi.obtenerMetrics).toHaveBeenCalledTimes(2);
  });

  it('aplica fallback de Prometheus a liveness cuando /health/live no reporta bytes (0 MB)', async () => {
    mockApi.obtenerHealthLive = vi.fn().mockResolvedValue({
      estadoGlobal: 'ok',
      memoriaHeapBytes: 0,
      umbralHeapBytes: 314572800,
      porcentajeHeap: 0,
      memoriaRssBytes: 0,
      umbralRssBytes: 1073741824,
      porcentajeRss: 0,
    });
    mockApi.obtenerMetrics = vi.fn().mockResolvedValue(
      '# HELP nodejs_heap_size_used_bytes Heap used\n# TYPE nodejs_heap_size_used_bytes gauge\nnodejs_heap_size_used_bytes 157286400\n# HELP process_resident_memory_bytes RSS\n# TYPE process_resident_memory_bytes gauge\nprocess_resident_memory_bytes 536870912\n'
    );

    const { result } = renderHook(() =>
      useObservability({ apiClient: mockApi, intervaloInicial: 0 })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.liveness?.memoriaHeapBytes).toBe(157286400);
    expect(result.current.liveness?.porcentajeHeap).toBeCloseTo(50, 0);
    expect(result.current.liveness?.memoriaRssBytes).toBe(536870912);
    expect(result.current.liveness?.porcentajeRss).toBeCloseTo(50, 0);
  });
});
