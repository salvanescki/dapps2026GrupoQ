# Research Findings: Observabilidad, Métricas de Dominio y Health Checks en el Backend

**Feature Branch**: `017-backend-observability`  
**Date**: 2026-11-16  
**Status**: Completed  

---

## 1. Arquitectura de Módulos y Gestión de Métricas (@willsoto/nestjs-prometheus y prom-client)

### Contexto y Necesidad
El backend requiere exponer un endpoint `/metrics` en formato estándar Prometheus (FR-001) que recolecte métricas de runtime por defecto (CPU, memoria, event loop lag, descriptores de archivos) y métricas personalizadas de negocio que cubran:
- Trading y gestión de órdenes (OMS)
- Cotizaciones y pricing de jugadores
- Scraping WhoScored / Playwright
- Integraciones externas (Football-Data.org), Team of the Week, caché Redis y autenticación

### Decision
Crear un módulo dedicado `ObservabilityModule` (o `MetricsModule`) dentro de `src/observability/` que configure `@willsoto/nestjs-prometheus` mediante:
```typescript
PrometheusModule.register({
  path: '/metrics',
  defaultMetrics: {
    enabled: true,
  },
})
```
Encapsular todas las métricas de dominio en un servicio centralizado `AppMetricsService` que gestione instancias fuertemente tipadas de `Counter`, `Gauge` e `Histogram` de `prom-client`. `AppMetricsService` expondrá métodos de alto nivel protegidos contra fallos para registrar eventos de observabilidad sin que los servicios que lo invoquen requieran importar o manipular primitivas directas de `prom-client`.

### Rationale
- **Desacoplamiento arquitectónico (FR-022, FR-023)**: La capa de dominio y los servicios de orquestación no conocen detalles de bajo nivel de Prometheus ni lidian con strings o nombres de métricas dispersos.
- **Tolerancia a fallos y resiliencia (FR-024, SC-006)**: Cualquier error al registrar o actualizar una métrica es capturado dentro de `AppMetricsService` mediante bloques `try/catch` y registrado con logger a nivel `warn`, garantizando que la ejecución de la lógica de negocio nunca se interrumpa.
- **Preservación estricta de tests existentes (Principio Constitucional IV)**: Al inyectarse como `@Optional() private readonly metricsService?: AppMetricsService` (o proveer un método seguro con fallback no-op), las suites de tests preexistentes que instancian servicios mediante `new QuotesService(...)` o `new OmsService(...)` continúan funcionando sin ninguna modificación.
- **Inicialización temprana (SC-005)**: Durante el ciclo de vida `onModuleInit()` de `AppMetricsService`, todos los contadores e histogramas se inicializan con sus combinaciones de etiquetas base en 0, y los gauges con sus valores iniciales, garantizando que el primer `GET /metrics` exponga inmediatamente todas las métricas esperadas.

### Alternatives Considered
- **Inyección directa de providers individuales (`makeCounterProvider`, etc.)**: Descartada. Requeriría inyectar decenas de tokens de inyección (`@InjectMetric(...)`) en múltiples constructores de servicios existentes, rompiendo los constructores directos en tests unitarios e incrementando innecesariamente el acoplamiento a NestJS.
- **Interceptors globales para todas las métricas**: Descartada. Los interceptors solo operan a nivel de solicitudes HTTP en los Controllers, mientras que las métricas de dominio clave (latencia de liquidación con locks pesimistas, slippage rejections, fallos en recálculo de cotizaciones, degradación de caché Redis o tasa de asociación de scraping) ocurren en lo profundo de transacciones y servicios de fondo (`Scheduler`, `ScrapingService`).

---

## 2. Implementación de Health Checks de Readiness y Liveness (@nestjs/terminus)

### Contexto y Necesidad
Para orquestación en contenedores (Kubernetes/Docker Compose) y balanceo de carga, se deben exponer sondas diferenciadas de salud (FR-020, FR-021):
- **Readiness (`GET /health/ready`)**: Verifica si el contenedor puede recibir tráfico del usuario, evaluando la disponibilidad de PostgreSQL, Redis y la API Football-Data.
- **Liveness (`GET /health/live`)**: Verifica si el proceso Node.js se encuentra vivo y libre de estados irrecuperables (como fugas de memoria provocadas por Playwright/Chromium), evaluando umbrales de memoria Heap (< 300 MB) y RSS (< 1 GB).

### Decision
Implementar un `HealthModule` y `HealthController` utilizando `@nestjs/terminus` exponiendo dos rutas:
1. `GET /health/ready`:
   - Utiliza `TypeOrmHealthIndicator.pingCheck('database', { timeout: 3000 })` para validar la conexión con PostgreSQL.
   - Utiliza un indicador personalizado `RedisHealthIndicator` que ejecuta `redisClient.ping()` con un timeout estricto de 2000 ms.
   - Utiliza un indicador personalizado `FootballDataHealthIndicator` (o `HttpHealthIndicator`) que ejecuta una petición ligera tipo `HEAD` o `GET /competitions` con timeout de 3000 ms a la API externa de Football-Data.
   - Responde con HTTP `200 OK` si todos los componentes están saludables, o HTTP `503 Service Unavailable` con el detalle del componente averiado si alguno falla.
2. `GET /health/live`:
   - Utiliza `MemoryHealthIndicator.checkHeap('memory_heap', 300 * 1024 * 1024)` para validar que el Heap esté por debajo de 300 MB.
   - Utiliza `MemoryHealthIndicator.checkRSS('memory_rss', 1024 * 1024 * 1024)` para validar que el RSS esté por debajo de 1024 MB (1 GB).
   - Responde con HTTP `200 OK` si ambos umbrales se respetan, o HTTP `503 Service Unavailable` si alguno se excede.

### Rationale
- Cumple fielmente con los estándares nativos de Kubernetes (`livenessProbe` vs `readinessProbe`).
- Evita reinicios catastróficos e innecesarios de pods: si la base de datos o Redis sufren una degradación temporal de red, la sonda de readiness saca el pod del tráfico sin reiniciar el proceso; mientras que si la memoria se dispara por Chromium (Playwright), la sonda de liveness fuerza el reinicio saludable del contenedor.
- Permite a los orquestadores y monitores externos recibir un payload JSON estructurado con status individual de cada dependencia (`up` / `down`).

### Alternatives Considered
- **Endpoint único `/health` sin distinción**: Descartada. Mezclar liveness con dependencias externas hace que un fallo temporal en una API de terceros provoque que Kubernetes reinicie constantemente los contenedores locales (crash-looping), empeorando el problema.
- **Sondas implementadas ad-hoc sin Terminus**: Descartada. `@nestjs/terminus` es el estándar oficial del ecosistema NestJS, mantenido activamente, con manejo robusto de excepciones de salud, timeouts y formato JSON estándar.

---

## 3. Catálogo Dimensional de Métricas y Convenciones de Nombres

### Contexto y Necesidad
Estandarizar los nombres de métricas de dominio, tipos (Counter, Gauge, Histogram), dimensiones/etiquetas (*labels*) y rangos de buckets según las mejores prácticas de Prometheus y los requerimientos funcionales (FR-002 a FR-019).

### Decision
Definir el siguiente conjunto de métricas con prefijos consistentes y unidades en el sufijo:

| Métrica | Tipo | Etiquetas (Labels) | Descripción |
| :--- | :---: | :--- | :--- |
| `marketplace_orders_total` | Counter | `tipo` (`compra`, `venta`), `mercado` (`primario`, `secundario`), `estado` (`creada`, `pendiente`, `completada`, `cancelada`, `rechazada`) | Cantidad total de órdenes procesadas por el OMS. |
| `marketplace_transactions_total` | Counter | `mercado` (`primario`, `secundario`), `estrategia_version` | Cantidad total de transacciones liquidadas. |
| `marketplace_volume_cents_total` | Counter | `mercado` (`primario`, `secundario`) | Volumen acumulado operado en centavos de crédito. |
| `marketplace_order_settlement_duration_seconds` | Histogram | `mercado` (`primario`, `secundario`) | Latencia de liquidación de órdenes (incluye locks pesimistas). Buckets: `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]`. |
| `marketplace_slippage_rejections_total` | Counter | `mercado` (`primario`, `secundario`) | Total de órdenes de compra rechazadas por exceder `precioMaximoUnitario`. |
| `marketplace_active_sell_orders` | Gauge | Ninguna | Cantidad actual de órdenes de venta activas en el libro secundario. |
| `quotes_recalculations_total` | Counter | `estrategia`, `estado` (`exito`, `fallo`) | Total de recálculos de cotizaciones ejecutados. |
| `quotes_recalculation_duration_seconds` | Histogram | `estrategia` | Duración del ciclo de recálculo masivo. Buckets: `[0.1, 0.5, 1, 2, 5, 10, 30]`. |
| `quotes_players_evaluated_total` | Counter | `categoria` (`procesados`, `sin_estadisticas`, `fallidos`) | Cantidad de jugadores evaluados en recálculos de cotizaciones. |
| `quotes_active_strategy` | Gauge | `estrategia` | Indicador de estrategia activa (1 para activa, 0 para inactiva). |
| `scraping_executions_total` | Counter | `estado` (`exitoso`, `fallido`, `recuperada_atasco`) | Cantidad de corridas del pipeline de scraping WhoScored. |
| `scraping_execution_duration_seconds` | Histogram | `liga` (`PL`, `PD`, `SA`, `BL1`, `FL1`, `GLOBAL`) | Duración de extracción y procesamiento por liga. Buckets: `[1, 5, 10, 30, 60, 120, 300]`. |
| `scraping_player_match_rate` | Gauge | Ninguna | Tasa de asociación de jugadores extraídos vs. catálogo interno (0 a 100). |
| `scraping_incidents_total` | Counter | `tipo` | Incidentes detectados durante el scraping (bloqueos, atascos, timeouts). |
| `external_football_data_requests_total` | Counter | `endpoint`, `status` | Cantidad de peticiones realizadas a la API Football-Data. |
| `external_football_data_rate_limit_remaining` | Gauge | Ninguna | Cantidad de peticiones disponibles restantes en el minuto según headers de la API. |
| `totw_generations_total` | Counter | `estado` (`exito`, `fallo`) | Generaciones automáticas/manuales del Equipo de la Semana. |
| `totw_generation_duration_seconds` | Histogram | Ninguna | Duración de la generación del Equipo de la Semana. Buckets: `[0.1, 0.5, 1, 2, 5, 10]`. |
| `cache_requests_total` | Counter | `dominio`, `resultado` (`hit`, `miss`) | Consultas de lectura al sistema de caché Redis L1. |
| `cache_fallback_degradations_total` | Counter | `dominio` | Cantidad de degradaciones controladas (bypass a BD/cálculo por error de Redis). |
| `auth_attempts_total` | Counter | `estado` (`exito`, `fallo`) | Intentos de inicio de sesión o autenticación. |
| `auth_password_hashing_duration_seconds` | Histogram | Ninguna | Duración del hashing de contraseñas con bcrypt. Buckets: `[0.01, 0.05, 0.1, 0.2, 0.5, 1]`. |

### Rationale
- Los sufijos estándar (`_total`, `_seconds`) cumplen con las directrices de la documentación oficial de Prometheus.
- Los histogramas usan segundos como unidad de tiempo, con buckets alineados con los SLOs y latencias típicas observadas en cada operación.

---

## 4. Estrategia de Testing y Aislamiento de Integración

### Contexto y Necesidad
La Constitución exige:
1. Tests unitarios puros sin dependencias externas para lógica aislada.
2. Tests de integración con Testcontainers para PostgreSQL real.
3. Inmutabilidad de tests preexistentes (Principio IV): ningún test anterior puede romperse ni modificarse sin permiso expreso.
4. Cobertura mínima de 80% en líneas y ramas en el código nuevo.

### Decision
- **Unit Tests**:
  - `AppMetricsService`: Validar registro correcto, actualización de valores en el registro de Prometheus y manejo tolerante a errores (pruebas con llamadas defectuosas para comprobar que no arroja excepciones).
  - `RedisHealthIndicator` y `FootballDataHealthIndicator`: Validar respuestas `up` y `down` simulando respuestas exitosas y errores/timeouts con mocks.
- **Integration Tests (NestJS TestingModule + Supertest)**:
  - `HealthController`: Probar `GET /health/ready` y `GET /health/live` montados en la aplicación con base de datos real (Testcontainers PostgreSQL) y cliente Redis mock/real, comprobando HTTP `200` y el esquema JSON de respuesta.
  - `MetricsController`: Probar `GET /metrics` verificando que devuelve status `200`, `Content-Type: text/plain; version=0.0.4; charset=utf-8` y contiene las métricas requeridas en formato de texto plano de Prometheus.
- **Retrocompatibilidad**:
  - En los servicios instrumentados (`OmsService`, `QuotesService`, `AuthService`, etc.), inyectar `AppMetricsService` con `@Optional()`. Si no se provee en un test unitario antiguo, el servicio comprueba `this.metricsService?.metodo(...)` sin lanzar error.
