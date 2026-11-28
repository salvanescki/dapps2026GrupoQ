# Phase 0: Research & Technical Decisions - Panel de Observabilidad y Monitoreo en Tiempo Real

**Feature**: `018-frontend-observability-dashboard`  
**Date**: 2026-11-23  
**Status**: Completed

---

## 1. Parser de Métricas Prometheus en el Frontend

### Contexto
El backend expone en `/metrics` la totalidad de las métricas de la aplicación en el formato estándar de texto de Prometheus (`text/plain; version=0.0.4; charset=utf-8`). Este formato incluye metadatos (`# HELP`, `# TYPE`) y líneas de muestra con identificadores, etiquetas opcionales entre llaves (`{key="value",...}`) y valores numéricos (enteros, flotantes, notación científica, `+Inf`, `-Inf`, `NaN`). Entre las métricas de dominio se incluyen contadores (como `marketplace_orders_total`, `quotes_recalculations_total`, `scraping_executions_total`), medidores/gauges (como `marketplace_active_sell_orders`, `football_data_rate_limit_remaining`) e histogramas (como `marketplace_order_settlement_duration_seconds_bucket`, `_sum`, `_count`).

### Decisión
Implementar un parser puro en TypeScript (`parsePrometheusText`) en `frontend/src/utils/prometheus-parser.ts`, sin dependencias externas pesadas de npm.

### Justificación
1. **Ligereza y compatibilidad**: La biblioteca oficial `prom-client` está diseñada para Node.js y depende de APIs nativas del sistema (`process`, `fs`). Las bibliotecas client-side de Prometheus en npm son pesadas o están obsoletas.
2. **Determinismo y testabilidad**: Una función pura que procesa línea por línea mediante expresiones regulares optimizadas es 100% determinista, no tiene efectos secundarios y puede ser testeada exhaustivamente con cobertura unitaria >95% en Vitest sin simular APIs complejas.
3. **Estructura tipada de salida**: Permite transformar directamente el texto en un diccionario estructurado de métricas (`Map<string, PrometheusMetricSeries[]>` o interfaz tipada `PrometheusParsedMetrics`) que los hooks y componentes de React pueden consumir de manera inmediata y con tipado estricto.

### Alternativas consideradas
- *Modificar el backend para exponer un endpoint JSON alternativo (ej. `/admin/metrics/json`)*: Rechazado porque la especificación indica explícitamente: "Con la observabilidad ya implementada en el backend (módulo de métricas Prometheus en /metrics y health checks Terminus en /health/ready y /health/live), necesitamos implementar en el frontend...". Modificar el backend violaría la separación de alcances y añadiría código redundante.
- *Usar parser de terceros como `prom-query` o `@prometheus-io/client` en el navegador*: Rechazado por problemas de compatibilidad en entornos Vite/browser (requieren polyfills de Node.js) y sobrecoste en el tamaño del bundle.

---

## 2. Consumo de Sondas de Salud Terminus (/health/ready y /health/live)

### Contexto
El módulo de salud del backend (`@nestjs/terminus`) expone dos sondas:
- `/health/ready`: Verifica dependencias críticas (`database`, `redis`, `footballData`). Responde con HTTP 200 cuando todas están disponibles y HTTP 503 cuando alguna falla o agota el tiempo de espera.
- `/health/live`: Verifica la memoria de ejecución (`memory_heap` contra umbral de 300 MB y `memory_rss` contra 1 GB). Responde con HTTP 200 en estado nominal y HTTP 503 ante excesos.

En ambos casos (200 o 503), Terminus devuelve un cuerpo JSON con el formato canónico `HealthCheckResult`:
```json
{
  "status": "ok" | "error" | "shutting_down",
  "info": { "database": { "status": "up" }, ... },
  "error": { "redis": { "status": "down", "message": "Connection refused" } },
  "details": { ... }
}
```

### Decisión
Crear un cliente específico en `frontend/src/api/observabilityApi.ts` que interprete tanto el código de estado HTTP 200 como el 503 como respuestas estructuradas válidas de diagnóstico, extrayendo el cuerpo JSON para identificar con precisión qué indicador está degradado o fuera de línea. Si ocurre un error de red real (ej. servidor completamente caído o código 500 no estructurado), se captura como error de conectividad general.

### Justificación
1. **Visibilidad operativa**: Cuando un servicio como Redis se degrada, el backend responde legítimamente 503. Si el cliente frontend tratara el 503 como una excepción genérica no controlada, la pantalla del administrador se rompería o mostraría un error vacío, impidiendo ver qué componente falló.
2. **Resiliencia**: Permite que el panel de salud muestre las tarjetas individuales con su estado real (verde para los servicios sanos, rojo con mensaje explicativo para el servicio caído).

### Alternativas consideradas
- *Usar el cliente estándar `httpRequest` sin modificar*: `httpRequest` lanza un `HttpError` en cualquier código `>= 400`. Si bien se podría capturar el error y verificar si `codigoEstado === 503`, el body devuelto por Terminus debe ser parseado explícitamente. Manejarlo directamente en `observabilityApi.ts` garantiza la extracción segura de `HealthCheckResult`.

---

## 3. Arquitectura del Hook de Estado y Auto-actualización (`useObservability`)

### Contexto
El panel de observabilidad requiere:
- Carga inicial automática de todas las fuentes de datos.
- Refresco manual instantáneo accionado por el usuario.
- Auto-actualización periódica configurable (Pausado [0], 5 segundos, 10 segundos, 30 segundos).
- Marca de tiempo visible de la última sincronización exitosa.
- Cancelación limpia de peticiones y temporizadores al desmontar el componente o navegar fuera.
- Pausa y limpieza de datos si la sesión expira (error 401/403).

### Decisión
Implementar un hook dedicado `useObservability` en `frontend/src/hooks/useObservability.ts` que gestione:
1. Estado del temporizador (`intervaloRefresco`: 0 | 5000 | 10000 | 30000 ms, con 10000 ms por defecto).
2. Peticiones paralelas mediante `Promise.allSettled` hacia `/metrics`, `/health/ready` y `/health/live`.
3. Estados independientes de carga (`cargandoMetricas`, `cargandoReadiness`, `cargandoLiveness`) y de error (`errorMetricas`, `errorReadiness`, `errorLiveness`).
4. Marca de tiempo de última sincronización exitosa (`ultimaSincronizacion: Date | null`).
5. AbortController para abortar peticiones en vuelo cuando se desmonte el componente o se solicite una nueva actualización.
6. Manejo de desconexión mediante `navigator.onLine` / eventos `online` y `offline` para pausar consultas si se pierde conectividad.

### Justificación
- Sigue el patrón establecido en otros hooks del proyecto como `useAdminGovernance` y `useMarketplace`.
- `Promise.allSettled` asegura que si `/metrics` falla, `/health/ready` y `/health/live` se sigan renderizando y viceversa (aislamiento de fallos).
- Limpieza garantizada en el retorno de `useEffect`, previniendo fugas de memoria o peticiones huérfanas en segundo plano.

### Alternativas consideradas
- *Librerías de consulta externa (SWR o TanStack React Query)*: No están instaladas en el frontend del proyecto. Introducirlas solo para esta vista generaría inconsistencia arquitectónica con el resto de la aplicación.
- *WebSockets / Server-Sent Events*: El backend no dispone de canal WebSocket o SSE para telemetría; los endpoints expuestos son REST y HTTP estándar. El polling configurable satisface plenamente los requisitos.

---

## 4. Visualización de Métricas con shadcn / Recharts (`chart.tsx`)

### Contexto
El frontend dispone del componente reutilizable `frontend/src/components/ui/chart.tsx` que envuelve a Recharts mediante `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` y gestión de CSS variables.

### Decisión
Construir componentes de visualización especializados reutilizando `ChartContainer` y primitivas de Recharts:
1. **Trading & Órdenes**: `BarChart` agrupado/apilado para órdenes creadas por tipo (compra vs venta) y mercado (primario vs secundario); tarjetas métricas destacadas para volumen monetario acumulado, transacciones ejecutadas y órdenes de venta activas.
2. **Pricing & Cotizaciones**: Gráfico de barras comparativo de ejecuciones de recálculo (exitosas vs fallidas), gráfico de distribución de futbolistas evaluados (procesados, sin estadísticas, fallidos) y badge destacado para la estrategia activa (`quotes_active_strategy`).
3. **Scraping**: `BarChart` o `LineChart` para duración de scraping por liga (`PL`, `PD`, `SA`, `BL1`, `FL1`), tarjeta de tasa de concordancia con el catálogo oficial e incidentes registrados.
4. **Integraciones & Caché**: Indicador radial/progreso o `BarChart` para ratio de aciertos/fallos de caché Redis L1; barra de progreso / medidor para cuota restante de Football-Data.org (`football_data_rate_limit_remaining`); latencia promedio de hashing de contraseñas.
5. **Sondas de Salud e Infraestructura**: Tarjetas de estado con indicadores lumínicos (verde/rojo) para PostgreSQL, Redis y Football-Data; barras de consumo de memoria Heap y RSS contra sus límites de 300 MB y 1024 MB.

### Justificación
- Reutiliza el sistema de diseño existente (`chart.tsx`), asegurando compatibilidad completa con el mock de ResizeObserver en Vitest.
- Los gráficos son completamente interactivos con tooltips formateados en español y unidades legibles (segundos, centavos, porcentajes).

### Alternativas consideradas
- *Componentes gráficos HTML/CSS básicos*: No cumplirían con el requisito explícito de la especificación ("visuales mediante gráficos (shadcn chart / Recharts)").

---

## 5. Control de Acceso, Navegación y Resguardo de Telemetría

### Contexto
La vista `/admin/observability` debe estar protegida de tal manera que:
- Solo usuarios con rol `'ADMIN'` puedan visualizarla.
- Visitantes no autenticados sean redirigidos a `/login`.
- Usuarios estándar (`'USUARIO'`) sean redirigidos a `/` con una advertencia visible en español.
- El enlace en la barra de navegación (`navegacion.ts`) solo aparezca si `rol === 'ADMIN'`.

### Decisión
1. Extender `frontend/src/utils/navegacion.ts` en `construirItemsNavegacion` para incluir el ítem `{ label: 'Observabilidad', to: '/admin/observability', id: 'nav-observability' }` condicionado estrictamente a `rol === 'ADMIN'`.
2. Registrar la ruta en `frontend/src/routes/AppRoutes.tsx` envuelta con:
   ```tsx
   <Route
     path="/admin/observability"
     element={
       <ProtectedRoute>
         <AdminRoute mensajeSeguridad="Acceso restringido: el Panel de Observabilidad es exclusivo para cuentas Administradoras.">
           <ObservabilityView />
         </AdminRoute>
       </ProtectedRoute>
     }
   />
   ```
3. Parametrizar opcionalmente `AdminRoute` con `mensajeSeguridad?: string` para permitir mensajes contextualizados según la ruta administrativa accedida, manteniendo el mensaje por defecto preexistente para máxima retrocompatibilidad.

### Justificación
- Respeta la arquitectura de routing preexistente sin duplicar lógica de autorización.
- Garantiza que ninguna telemetría o solicitud a `/metrics` se ejecute si el usuario no tiene rol administrativo verificado.

---

## 6. Sincronización de Contratos y Colección Postman

### Contexto
El DoD constitucional exige que la colección de Postman refleje fielmente los contratos de API y que cada cambio verifique dicha sincronización.

### Decisión
Verificar que los endpoints consumidos (`/metrics`, `/health/ready`, `/health/live`):
1. Ya forman parte de la especificación Swagger / OpenAPI generada por NestJS en el backend.
2. Ya están incorporados en `postman/collection.json` bajo la carpeta de Observabilidad (líneas 1975-2096).
3. Documentar en el contrato de la feature (`specs/018-frontend-observability-dashboard/contracts/observability-api.contract.md`) los esquemas exactos de payload, códigos de respuesta (200, 503) y encabezados esperados, dejando constancia de que no se agregan nuevos endpoints backend en esta feature puramente frontend.
