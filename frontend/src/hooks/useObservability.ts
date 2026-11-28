import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IntervaloRefresco,
  EstadoConexion,
  PanelDeObservabilidadEstado,
  SondaLivenessData,
  MetricasCompletas,
} from '../types/observability.types';
import { observabilityApiClient, ObservabilityApi } from '../api/observabilityApi';
import { parsePrometheusText } from '../utils/prometheus-parser';
import { procesarMetricasPrometheus } from '../utils/formato-observabilidad';

export interface UseObservabilityOptions {
  apiClient?: ObservabilityApi;
  intervaloInicial?: IntervaloRefresco;
}

function estaNavegadorOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function resolverResultadoSonda<T>(
  result: PromiseSettledResult<T>,
  mensajeFallback: string
): { valor: T | null; error: string | null } {
  if (result.status === 'fulfilled') {
    return { valor: result.value, error: null };
  }
  const reason = result.reason as { message?: string } | undefined;
  return {
    valor: null,
    error: reason?.message || mensajeFallback,
  };
}

export function aplicarFallbackRuntimeALiveness(
  liveness: SondaLivenessData | null,
  metricas: MetricasCompletas | null
): SondaLivenessData | null {
  const runtime = metricas?.runtime;
  if (!liveness || !runtime) {
    return liveness;
  }

  const heapBytes =
    !liveness.memoriaHeapBytes && runtime.heapUsedBytes
      ? runtime.heapUsedBytes
      : liveness.memoriaHeapBytes;
  const rssBytes =
    !liveness.memoriaRssBytes && runtime.rssBytes
      ? runtime.rssBytes
      : liveness.memoriaRssBytes;

  if (heapBytes === liveness.memoriaHeapBytes && rssBytes === liveness.memoriaRssBytes) {
    return liveness;
  }

  return {
    ...liveness,
    memoriaHeapBytes: heapBytes,
    porcentajeHeap: Number(((heapBytes / liveness.umbralHeapBytes) * 100).toFixed(2)),
    memoriaRssBytes: rssBytes,
    porcentajeRss: Number(((rssBytes / liveness.umbralRssBytes) * 100).toFixed(2)),
  };
}

export function useObservability(options?: UseObservabilityOptions) {
  const api = options?.apiClient || observabilityApiClient;
  const intervaloInicial = options?.intervaloInicial ?? 10000;

  const [intervaloRefresco, setIntervaloRefresco] = useState<IntervaloRefresco>(intervaloInicial);
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>(
    estaNavegadorOffline() ? 'offline' : 'online'
  );

  const [estado, setEstado] = useState<PanelDeObservabilidadEstado>({
    intervaloRefresco: intervaloInicial,
    ultimaSincronizacion: null,
    estadoConexion: estaNavegadorOffline() ? 'offline' : 'online',
    cargando: true,
    actualizando: false,
    error: null,
    errorReadiness: null,
    errorLiveness: null,
    errorMetrics: null,
    readiness: null,
    liveness: null,
    metricas: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sincronizar = useCallback(
    async (esInicial = false) => {
      if (estaNavegadorOffline()) {
        setEstadoConexion('offline');
        setEstado((prev) => ({
          ...prev,
          cargando: false,
          actualizando: false,
          estadoConexion: 'offline',
        }));
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setEstado((prev) => ({
        ...prev,
        cargando: esInicial,
        actualizando: !esInicial,
      }));

      const [readyResult, liveResult, metricsResult] = await Promise.allSettled([
        api.obtenerHealthReady(signal),
        api.obtenerHealthLive(signal),
        api.obtenerMetrics(signal),
      ]);

      if (signal.aborted) return;

      const ready = resolverResultadoSonda(readyResult, 'Error al consultar /health/ready');
      const live = resolverResultadoSonda(liveResult, 'Error al consultar /health/live');
      const metricsRes = resolverResultadoSonda(metricsResult, 'Error al consultar /metrics');

      const metricas =
        metricsRes.valor !== null
          ? procesarMetricasPrometheus(parsePrometheusText(metricsRes.valor))
          : null;
      const liveness = aplicarFallbackRuntimeALiveness(live.valor, metricas);

      const fallaronTodas =
        readyResult.status === 'rejected' &&
        liveResult.status === 'rejected' &&
        metricsResult.status === 'rejected';

      const errorGeneral = fallaronTodas
        ? 'No fue posible sincronizar ninguna fuente de telemetría del servidor.'
        : null;
      const fechaSincronizacion = fallaronTodas ? null : new Date();

      setEstado((prev) => ({
        ...prev,
        cargando: false,
        actualizando: false,
        ultimaSincronizacion: fechaSincronizacion ?? prev.ultimaSincronizacion,
        error: errorGeneral,
        errorReadiness: ready.error,
        errorLiveness: live.error,
        errorMetrics: metricsRes.error,
        readiness: ready.valor ?? prev.readiness,
        liveness: liveness ?? prev.liveness,
        metricas: metricas ?? prev.metricas,
        estadoConexion: 'online',
      }));
    },
    [api]
  );

  // Escucha de eventos de red
  useEffect(() => {
    const handleOnline = () => {
      setEstadoConexion('online');
      void sincronizar(false);
    };
    const handleOffline = () => {
      setEstadoConexion('offline');
      setEstado((prev) => ({ ...prev, estadoConexion: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sincronizar]);

  // Ejecución inicial y polling
  useEffect(() => {
    void sincronizar(true);
  }, [sincronizar]);

  useEffect(() => {
    if (intervaloRefresco === 0 || estadoConexion === 'offline') {
      return;
    }

    const timer = setInterval(() => {
      void sincronizar(false);
    }, intervaloRefresco);

    return () => {
      clearInterval(timer);
    };
  }, [intervaloRefresco, estadoConexion, sincronizar]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...estado,
    intervaloRefresco,
    setIntervaloRefresco,
    refrescar: () => sincronizar(false),
  };
}
