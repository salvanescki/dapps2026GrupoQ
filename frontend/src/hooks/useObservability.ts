import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IntervaloRefresco,
  EstadoConexion,
  PanelDeObservabilidadEstado,
} from '../types/observability.types';
import { observabilityApiClient, ObservabilityApi } from '../api/observabilityApi';
import { parsePrometheusText } from '../utils/prometheus-parser';
import { procesarMetricasPrometheus } from '../utils/formato-observabilidad';

export interface UseObservabilityOptions {
  apiClient?: ObservabilityApi;
  intervaloInicial?: IntervaloRefresco;
}

export function useObservability(options?: UseObservabilityOptions) {
  const api = options?.apiClient || observabilityApiClient;

  const [intervaloRefresco, setIntervaloRefresco] = useState<IntervaloRefresco>(
    options?.intervaloInicial !== undefined ? options?.intervaloInicial : 10000
  );
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );

  const [estado, setEstado] = useState<PanelDeObservabilidadEstado>({
    intervaloRefresco: options?.intervaloInicial !== undefined ? options?.intervaloInicial : 10000,
    ultimaSincronizacion: null,
    estadoConexion: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setEstadoConexion('offline');
        setEstado((prev) => ({
          ...prev,
          cargando: false,
          actualizando: false,
          estadoConexion: 'offline',
        }));
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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

      let errorReadiness: string | null = null;
      let readiness = null;
      if (readyResult.status === 'fulfilled') {
        readiness = readyResult.value;
      } else {
        errorReadiness = readyResult.reason?.message || 'Error al consultar /health/ready';
      }

      let errorLiveness: string | null = null;
      let liveness = null;
      if (liveResult.status === 'fulfilled') {
        liveness = liveResult.value;
      } else {
        errorLiveness = liveResult.reason?.message || 'Error al consultar /health/live';
      }

      let errorMetrics: string | null = null;
      let metricas = null;
      if (metricsResult.status === 'fulfilled') {
        const samples = parsePrometheusText(metricsResult.value);
        metricas = procesarMetricasPrometheus(samples);
      } else {
        errorMetrics = metricsResult.reason?.message || 'Error al consultar /metrics';
      }

      // Fallback resiliente: si /health/live no reporta bytes (0 MB) pero /metrics proveyó métricas de Node.js
      if (liveness && metricas?.runtime) {
        let heapBytes = liveness.memoriaHeapBytes;
        let rssBytes = liveness.memoriaRssBytes;
        let recalcular = false;

        if ((!heapBytes || heapBytes === 0) && metricas.runtime.heapUsedBytes) {
          heapBytes = metricas.runtime.heapUsedBytes;
          recalcular = true;
        }
        if ((!rssBytes || rssBytes === 0) && metricas.runtime.rssBytes) {
          rssBytes = metricas.runtime.rssBytes;
          recalcular = true;
        }

        if (recalcular) {
          liveness = {
            ...liveness,
            memoriaHeapBytes: heapBytes,
            porcentajeHeap: Number(((heapBytes / liveness.umbralHeapBytes) * 100).toFixed(2)),
            memoriaRssBytes: rssBytes,
            porcentajeRss: Number(((rssBytes / liveness.umbralRssBytes) * 100).toFixed(2)),
          };
        }
      }

      const fallaronTodas =
        readyResult.status === 'rejected' &&
        liveResult.status === 'rejected' &&
        metricsResult.status === 'rejected';

      const errorGeneral = fallaronTodas
        ? 'No fue posible sincronizar ninguna fuente de telemetría del servidor.'
        : null;

      setEstado((prev) => ({
        ...prev,
        cargando: false,
        actualizando: false,
        ultimaSincronizacion: fallaronTodas ? prev.ultimaSincronizacion : new Date(),
        error: errorGeneral,
        errorReadiness,
        errorLiveness,
        errorMetrics,
        readiness: readiness || prev.readiness,
        liveness: liveness || prev.liveness,
        metricas: metricas || prev.metricas,
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
