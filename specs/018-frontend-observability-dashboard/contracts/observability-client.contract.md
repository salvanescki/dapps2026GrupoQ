# Contract: Frontend Observability Client, Parser & Hooks

**Feature**: `018-frontend-observability-dashboard`  
**Date**: 2026-11-23  
**Status**: Draft

Este contrato define los tipos e interfaces que estructuran el consumo, parseo y renderizado de la observabilidad en el frontend.

---

## 1. Contrato del Parser de Prometheus

```typescript
export interface PrometheusSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export interface PrometheusMetricGroup {
  name: string;
  help?: string;
  type?: 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';
  samples: PrometheusSample[];
}

export type PrometheusParsedData = Map<string, PrometheusMetricGroup>;

/**
 * Función pura que analiza el texto plano de Prometheus y devuelve los datos agrupados por nombre de métrica.
 */
export function parsePrometheusText(text: string): PrometheusParsedData;
```

---

## 2. Contrato de Sondas de Salud Terminus

```typescript
export interface DetalleIndicadorTerminus {
  status: 'up' | 'down';
  message?: string;
  [key: string]: unknown;
}

export interface TerminusHealthResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, DetalleIndicadorTerminus>;
  error?: Record<string, DetalleIndicadorTerminus>;
  details?: Record<string, DetalleIndicadorTerminus>;
}

export interface SondaReadinessData {
  estadoGlobal: 'ok' | 'error';
  servicios: {
    baseDatos: { estado: 'up' | 'down'; mensaje?: string };
    redis: { estado: 'up' | 'down'; mensaje?: string };
    footballData: { estado: 'up' | 'down'; mensaje?: string };
  };
}

export interface SondaLivenessData {
  estadoGlobal: 'ok' | 'error';
  memoriaHeap: {
    estado: 'up' | 'down';
    usadoBytes: number;
    umbralBytes: number;
    porcentaje: number;
    mensaje?: string;
  };
  memoriaRss: {
    estado: 'up' | 'down';
    usadoBytes: number;
    umbralBytes: number;
    porcentaje: number;
    mensaje?: string;
  };
}
```

---

## 3. Contrato del Cliente API de Observabilidad (`observabilityApi.ts`)

```typescript
export interface ObservabilityApi {
  obtenerMetricasTexto(signal?: AbortSignal): Promise<string>;
  obtenerSondaReadiness(signal?: AbortSignal): Promise<SondaReadinessData>;
  obtenerSondaLiveness(metricasNode?: PrometheusParsedData, signal?: AbortSignal): Promise<SondaLivenessData>;
}
```

---

## 4. Contrato del Hook `useObservability`

```typescript
export interface UseObservabilityOptions {
  intervaloInicialMs?: number; // 0, 5000, 10000 (default), 30000
}

export interface UseObservabilityReturn {
  // Estado del panel
  cargando: boolean;
  actualizando: boolean;
  ultimaSincronizacion: Date | null;
  intervaloRefresco: number;
  conectado: boolean;

  // Datos consolidados
  sondaReadiness: SondaReadinessData | null;
  sondaLiveness: SondaLivenessData | null;
  metricasMarketplace: MetricaDeMarketplace | null;
  metricasCotizaciones: MetricaDeCotizaciones | null;
  metricasScraping: MetricaDeIngestion | null;
  metricasIntegracion: MetricaDeIntegracionYCache | null;

  // Errores por módulo (resiliencia y aislamiento)
  errorGeneral: string | null;
  errorReadiness: string | null;
  errorLiveness: string | null;
  errorMetricas: string | null;

  // Acciones operativas
  refrescar: () => Promise<void>;
  cambiarIntervalo: (nuevoIntervaloMs: number) => void;
}

export function useObservability(
  options?: UseObservabilityOptions
): UseObservabilityReturn;
```

---

## 5. Contrato de Rutas y Navegación

### Ruta
- Path: `/admin/observability`
- Wrapper: `<ProtectedRoute><AdminRoute mensajeSeguridad="..."><ObservabilityView /></AdminRoute></ProtectedRoute>`
- Requisitos de Acceso:
  - No autenticado: `Navigate to="/login" replace`
  - Autenticado sin rol ADMIN: `Navigate to="/" replace` con `state.avisoSeguridad`
  - Autenticado con rol ADMIN: Renderiza vista completa

### Elemento en Barra de Navegación (`navegacion.ts`)
```typescript
{
  label: 'Observabilidad',
  to: '/admin/observability',
  id: 'nav-observability',
}
```
*Condición:* Solo inyectado en `construirItemsNavegacion(rol)` cuando `rol === 'ADMIN'`.
