import {
  SondaReadinessData,
  SondaLivenessData,
  UMBRAL_HEAP_BYTES,
  UMBRAL_RSS_BYTES,
} from '../types/observability.types';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function resolverDetallesLiveness(data: any): Record<string, any> {
  if (data?.details && Object.keys(data.details).length > 0) {
    return data.details;
  }
  return { ...data?.info, ...data?.error };
}

const REGEX_MEMORIA_MB = /\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}MB\b/i;
const REGEX_MEMORIA_MB_GB = /\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}(MB|GB)\b/i;

export function extraerBytesDesdeMensajeMemoria(mensaje: unknown, permiteGb: boolean): number {
  if (typeof mensaje !== 'string') {
    return 0;
  }
  const regex = permiteGb ? REGEX_MEMORIA_MB_GB : REGEX_MEMORIA_MB;
  const match = regex.exec(mensaje);
  if (!match) {
    return 0;
  }
  const valor = Number.parseFloat(match[1]);
  const multiplicador =
    permiteGb && match[2]?.toUpperCase() === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
  return Math.round(valor * multiplicador);
}

export function resolverBytesMemoria(
  info: any,
  fallbackBytes: number | undefined,
  permiteGb: boolean
): number {
  const bytesDirectos = info?.bytes || 0;
  if (bytesDirectos) {
    return bytesDirectos;
  }
  const bytesMensaje = extraerBytesDesdeMensajeMemoria(info?.message, permiteGb);
  if (bytesMensaje) {
    return bytesMensaje;
  }
  return fallbackBytes || 0;
}

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
    const details = resolverDetallesLiveness(data);
    const heapInfo = details.memory_heap || {};
    const rssInfo = details.memory_rss || {};

    const memoriaHeapBytes = resolverBytesMemoria(heapInfo, fallbackMetrics?.heapUsedBytes, false);
    const memoriaRssBytes = resolverBytesMemoria(rssInfo, fallbackMetrics?.rssBytes, true);

    const porcentajeHeap = Number(((memoriaHeapBytes / UMBRAL_HEAP_BYTES) * 100).toFixed(2));
    const porcentajeRss = Number(((memoriaRssBytes / UMBRAL_RSS_BYTES) * 100).toFixed(2));

    const estadoGlobal =
      data?.status === 'ok' || (heapInfo.status === 'up' && rssInfo.status === 'up') ? 'ok' : 'error';

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
