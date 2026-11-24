import {
  SondaReadinessData,
  SondaLivenessData,
  UMBRAL_HEAP_BYTES,
  UMBRAL_RSS_BYTES,
} from '../types/observability.types';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface ObservabilityApi {
  obtenerMetrics(signal?: AbortSignal): Promise<string>;
  obtenerHealthReady(signal?: AbortSignal): Promise<SondaReadinessData>;
  obtenerHealthLive(signal?: AbortSignal): Promise<SondaLivenessData>;
}

export class ObservabilityApiClient implements ObservabilityApi {
  async obtenerMetrics(signal?: AbortSignal): Promise<string> {
    const url = `${BASE_URL}/metrics`;
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'text/plain' },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener métricas de Prometheus`);
    }

    return response.text();
  }

  async obtenerHealthReady(signal?: AbortSignal): Promise<SondaReadinessData> {
    const url = `${BASE_URL}/health/ready`;
    try {
      const response = await fetch(url, {
        signal,
        headers: { Accept: 'application/json' },
      });

      const data = await response.json().catch(() => null);

      if (response.status === 200 || response.status === 503) {
        return this.mapearTerminusReadiness(data);
      }

      throw new Error(`Error HTTP ${response.status}`);
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      return {
        estadoGlobal: 'error',
        baseDatos: { estado: 'down', mensaje: 'No fue posible contactar la sonda' },
        redis: { estado: 'down', mensaje: 'No fue posible contactar la sonda' },
        footballData: { estado: 'down', mensaje: 'No fue posible contactar la sonda' },
        error: error?.message || 'Error de comunicación con /health/ready',
      };
    }
  }

  async obtenerHealthLive(signal?: AbortSignal): Promise<SondaLivenessData> {
    const url = `${BASE_URL}/health/live`;
    try {
      const response = await fetch(url, {
        signal,
        headers: { Accept: 'application/json' },
      });

      const data = await response.json().catch(() => null);

      if (response.status === 200 || response.status === 503) {
        return this.mapearTerminusLiveness(data);
      }

      throw new Error(`Error HTTP ${response.status}`);
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      return {
        estadoGlobal: 'error',
        memoriaHeapBytes: 0,
        umbralHeapBytes: UMBRAL_HEAP_BYTES,
        porcentajeHeap: 0,
        memoriaRssBytes: 0,
        umbralRssBytes: UMBRAL_RSS_BYTES,
        porcentajeRss: 0,
        error: error?.message || 'Error de comunicación con /health/live',
      };
    }
  }

  private mapearTerminusReadiness(data: any): SondaReadinessData {
    const details = data?.details || { ...data?.info, ...data?.error } || {};
    const db = details.database || {};
    const redis = details.redis || {};
    const football = details['football-data'] || details.footballData || {};

    const dbUp = db.status === 'up';
    const redisUp = redis.status === 'up';
    const footballUp = football.status === 'up';

    let estadoGlobal: 'ok' | 'error' | 'degradado' = 'ok';
    if (!dbUp && !redisUp && !footballUp) {
      estadoGlobal = 'error';
    } else if (!dbUp || !redisUp || !footballUp) {
      estadoGlobal = 'degradado';
    }

    return {
      estadoGlobal,
      baseDatos: {
        estado: dbUp ? 'up' : 'down',
        mensaje: db.message || (dbUp ? undefined : 'No disponible'),
      },
      redis: {
        estado: redisUp ? 'up' : 'down',
        mensaje: redis.message || (redisUp ? undefined : 'No disponible'),
      },
      footballData: {
        estado: footballUp ? 'up' : 'down',
        mensaje: football.message || (footballUp ? undefined : 'No disponible'),
      },
    };
  }

  mapearTerminusLiveness(
    data: any,
    fallbackMetrics?: { heapUsedBytes?: number; rssBytes?: number }
  ): SondaLivenessData {
    const details =
      data?.details && Object.keys(data.details).length > 0
        ? data.details
        : { ...(data?.info || {}), ...(data?.error || {}) };
    const heapInfo = details.memory_heap || {};
    const rssInfo = details.memory_rss || {};

    // Extrae bytes directos, parsea mensaje o usa fallback de Prometheus si viene en 0
    let memoriaHeapBytes = heapInfo.bytes || 0;
    if (!memoriaHeapBytes && typeof heapInfo.message === 'string') {
      const match = heapInfo.message.match(/(\d+(?:\.\d+)?)\s*MB/i);
      if (match) {
        memoriaHeapBytes = Math.round(parseFloat(match[1]) * 1024 * 1024);
      }
    }
    if (!memoriaHeapBytes && fallbackMetrics?.heapUsedBytes) {
      memoriaHeapBytes = fallbackMetrics.heapUsedBytes;
    }

    let memoriaRssBytes = rssInfo.bytes || 0;
    if (!memoriaRssBytes && typeof rssInfo.message === 'string') {
      const match = rssInfo.message.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        memoriaRssBytes = Math.round(val * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024));
      }
    }
    if (!memoriaRssBytes && fallbackMetrics?.rssBytes) {
      memoriaRssBytes = fallbackMetrics.rssBytes;
    }

    const porcentajeHeap = Number(((memoriaHeapBytes / UMBRAL_HEAP_BYTES) * 100).toFixed(2));
    const porcentajeRss = Number(((memoriaRssBytes / UMBRAL_RSS_BYTES) * 100).toFixed(2));

    const estadoGlobal = data?.status === 'ok' || (heapInfo.status === 'up' && rssInfo.status === 'up') ? 'ok' : 'error';

    return {
      estadoGlobal,
      memoriaHeapBytes,
      umbralHeapBytes: UMBRAL_HEAP_BYTES,
      porcentajeHeap,
      memoriaRssBytes,
      umbralRssBytes: UMBRAL_RSS_BYTES,
      porcentajeRss,
    };
  }
}

export const observabilityApiClient = new ObservabilityApiClient();
