---
description: "Task list for Backend Observability, Domain Metrics & Health Checks implementation"
---

# Tasks: Backend Observability, Domain Metrics & Health Checks

**Input**: Design documents from `/specs/017-backend-observability/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/openapi-observability.yaml`)

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are explicitly mandated by `FR-025`, `SC-007` and the Project Constitution (Principles III, IV and VI) requiring $\ge 80\%$ line and branch coverage without modifying pre-existing tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/test/`
- **Postman**: `postman/collection.json`
- **Specifications & Contracts**: `specs/017-backend-observability/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and foundational definitions

- [ ] T001 Install observability and health dependencies (`@willsoto/nestjs-prometheus`, `prom-client`, `@nestjs/terminus`) in backend/package.json
- [ ] T002 [P] Define canonical metric names, label enums, and bucket constants in backend/src/observability/constants/metric-names.constant.ts
- [ ] T003 [P] Define TypeScript interfaces and types for metrics and health checks with naming regex `^[a-zA-Z_:][a-zA-Z0-9_:]*$`, counters ending in `_total`, and histograms ending in `_seconds` in backend/src/observability/types/observability.types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement centralized, resilient AppMetricsService with prom-client registry, default runtime metrics, initial 0-value registration in onModuleInit, and error-safe wrappers (`try/catch` with logger warning) in backend/src/observability/services/app-metrics.service.ts
- [ ] T005 [P] Implement unit tests for AppMetricsService verifying metric registration, initial values, and error-resilience against failures in backend/test/unit/observability/app-metrics.service.spec.ts
- [ ] T006 [P] Configure and export ObservabilityModule with PrometheusModule registering `GET /metrics` in backend/src/observability/observability.module.ts
- [ ] T007 Configure HealthModule importing Terminus and database/redis providers in backend/src/health/health.module.ts
- [ ] T008 Register ObservabilityModule and HealthModule in root application module backend/src/app.module.ts
- [ ] T009 Integration test for Prometheus endpoint `GET /metrics` verifying HTTP 200, Content-Type `text/plain; version=0.0.4; charset=utf-8`, and default runtime metrics in backend/test/integration/observability/metrics.controller.spec.ts

**Checkpoint**: Foundation ready - Prometheus `/metrics` endpoint is operational and user story implementation can begin in parallel.

---

## Phase 3: User Story 1 - Métricas del Marketplace y Trading (Priority: P1) 🎯 MVP

**Goal**: Monitorizar en tiempo real el volumen de operaciones del marketplace: órdenes de compra/venta creadas, transacciones liquidadas, volumen acumulado en centavos, latencia de liquidación con locks pesimistas, rechazos por slippage y órdenes de venta activas.

**Independent Test**: Ejecutar operaciones de compra y venta en `OmsService` / `OrdersController` y verificar que el endpoint `GET /metrics` expone `marketplace_orders_total`, `marketplace_transactions_total`, `marketplace_volume_cents_total`, `marketplace_order_settlement_duration_seconds`, `marketplace_slippage_rejections_total` y `marketplace_active_sell_orders` con los valores y dimensiones correspondientes.

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Unit test for trading metrics instrumentation in backend/test/unit/observability/oms-metrics.spec.ts
- [ ] T011 [P] [US1] Integration test for marketplace metrics reporting via `GET /metrics` in backend/test/integration/observability/marketplace-metrics.integration.spec.ts

### Implementation for User Story 1

- [ ] T012 [P] [US1] Add trading metric methods (`recordOrderCreated`, `recordTransaction`, `recordSettlementDuration`, `recordSlippageRejection`, `updateActiveSellOrders`) to AppMetricsService with exact constraints (labels: `tipo` in `['compra', 'venta']`, `mercado` in `['primario', 'secundario']`, `estado` in `['creada', 'pendiente', 'completada', 'cancelada', 'rechazada']`; settlement buckets `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]`) in backend/src/observability/services/app-metrics.service.ts
- [ ] T013 [US1] Instrument OmsService with `@Optional() private readonly metricsService?: AppMetricsService` to track order creation, trade settlement duration, slippage rejections, volume in cents, and active sell orders in backend/src/services/oms.service.ts
- [ ] T014 [US1] Expose and document trading metrics in Swagger OpenAPI decorators within backend/src/observability/observability.module.ts according to contracts/openapi-observability.yaml

**Checkpoint**: At this point, User Story 1 is fully functional and delivers the MVP of operational monitoring for marketplace trading.

---

## Phase 4: User Story 2 - Métricas de Cotizaciones y Precios (Priority: P1)

**Goal**: Monitorizar el proceso de recálculo masivo de cotizaciones de jugadores: ejecuciones totales, duración, desglose de jugadores evaluados (procesados, sin estadísticas, fallidos) y estrategia activa.

**Independent Test**: Disparar un ciclo de recálculo en `QuotesService` / `QuotesSchedulerService` y verificar que `GET /metrics` refleja `quotes_recalculations_total`, `quotes_recalculation_duration_seconds`, `quotes_players_evaluated_total` y `quotes_active_strategy`.

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Unit test for quotes metrics instrumentation in backend/test/unit/observability/quotes-metrics.spec.ts
- [ ] T016 [P] [US2] Integration test for quotes metrics verification via `GET /metrics` in backend/test/integration/observability/quotes-metrics.integration.spec.ts

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add pricing metric methods (`recordRecalculation`, `recordRecalculationDuration`, `recordPlayersEvaluated`, `setActiveStrategy`) to AppMetricsService with constraints (labels: `estrategia` in `['GLOBAL_v1', 'POSICIONAL_v1']`, `estado` in `['exito', 'fallo']`, `categoria` in `['procesados', 'sin_estadisticas', 'fallidos']`; duration buckets `[0.1, 0.5, 1, 2, 5, 10, 30]`) in backend/src/observability/services/app-metrics.service.ts
- [ ] T018 [US2] Instrument QuotesService with `@Optional() private readonly metricsService?: AppMetricsService` to record evaluation categories, strategy gauge, and recalculation counts in backend/src/services/quotes.service.ts
- [ ] T019 [US2] Instrument QuotesSchedulerService with `@Optional() private readonly metricsService?: AppMetricsService` to measure scheduled recalculation duration and execution status in backend/src/services/scheduler/quotes-scheduler.service.ts

**Checkpoint**: User Stories 1 and 2 are functional; business trading and pricing mechanisms are fully observable.

---

## Phase 5: User Story 5 - Health Check de Readiness (Priority: P1)

**Goal**: Exponer la sonda `GET /health/ready` verificando PostgreSQL (TypeORM ping con timeout de 3000 ms), Redis (ping L1 con timeout de 2000 ms) y Football-Data.org API (conectividad con timeout de 3000 ms), respondiendo `200 OK` si todas las dependencias están operativas y `503 Service Unavailable` si alguna falla.

**Independent Test**: Consultar `GET /health/ready` con todas las dependencias arriba (esperando status `ok` y HTTP 200) y simular desconexión de Redis o API externa (esperando status `error`, HTTP 503 y detalle del componente en `down`).

### Tests for User Story 5 ⚠️

- [ ] T020 [P] [US5] Unit test for RedisHealthIndicator validating 'up' and 'down' statuses with 2000 ms timeout in backend/test/unit/observability/redis-health.indicator.spec.ts
- [ ] T021 [P] [US5] Unit test for FootballDataHealthIndicator validating 'up' and 'down' statuses with 3000 ms timeout in backend/test/unit/observability/football-data-health.indicator.spec.ts
- [ ] T022 [P] [US5] Integration test with Testcontainers for `GET /health/ready` verifying HTTP 200 and HTTP 503 on dependency failure in backend/test/integration/observability/health-readiness.controller.spec.ts

### Implementation for User Story 5

- [ ] T023 [P] [US5] Implement RedisHealthIndicator executing `ioredis.ping()` with 2000 ms timeout in backend/src/health/indicators/redis-health.indicator.ts
- [ ] T024 [P] [US5] Implement FootballDataHealthIndicator executing connectivity check with 3000 ms timeout in backend/src/health/indicators/football-data-health.indicator.ts
- [ ] T025 [US5] Implement HealthController with endpoint `GET /health/ready` checking TypeORM, Redis, and Football-Data under `@HealthCheck()` with OpenAPI decorators in backend/src/health/health.controller.ts

**Checkpoint**: Container orchestrators can rely on `GET /health/ready` to safely route traffic to healthy backend instances.

---

## Phase 6: User Story 6 - Health Check de Liveness (Priority: P1)

**Goal**: Exponer la sonda `GET /health/live` verificando el consumo de memoria para detectar estados irrecuperables (fugas de memoria de Chromium/Playwright): Heap $< 300$ MB (`300 * 1024 * 1024` bytes) y RSS $< 1$ GB (`1024 * 1024 * 1024` bytes), respondiendo `200 OK` dentro de los límites y `503 Service Unavailable` ante excesos.

**Independent Test**: Consultar `GET /health/live` en condiciones normales (esperando `200 OK` con `memory_heap` y `memory_rss` en `up`) y simular exceso de umbral (esperando `503 Service Unavailable` con `status: 'down'`).

### Tests for User Story 6 ⚠️

- [ ] T026 [P] [US6] Unit test for Liveness memory checks validating Heap and RSS threshold comparisons in backend/test/unit/observability/memory-health.spec.ts
- [ ] T027 [P] [US6] Integration test for `GET /health/live` verifying HTTP 200 and HTTP 503 payload structure conforming to OpenAPI in backend/test/integration/observability/health-liveness.controller.spec.ts

### Implementation for User Story 6

- [ ] T028 [US6] Add endpoint `GET /health/live` in HealthController evaluating MemoryHealthIndicator Heap (300 MB) and RSS (1024 MB) with OpenAPI decorators in backend/src/health/health.controller.ts

**Checkpoint**: Sondas de Liveness y Readiness completadas y operativas para despliegue en contenedores.

---

## Phase 7: User Story 3 - Métricas de Scraping WhoScored / Playwright (Priority: P2)

**Goal**: Monitorizar el pipeline de extracción de WhoScored: ejecuciones por estado, duración por liga (`PL`, `PD`, `SA`, `BL1`, `FL1`, `GLOBAL`), tasa de asociación de jugadores extraídos (gauge 0-100) y contador de incidentes.

**Independent Test**: Disparar una corrida de extracción en `ScrapingService` y verificar en `GET /metrics` que `scraping_executions_total`, `scraping_execution_duration_seconds`, `scraping_player_match_rate` y `scraping_incidents_total` registran los eventos.

### Tests for User Story 3 ⚠️

- [ ] T029 [P] [US3] Unit test for scraping metrics instrumentation in backend/test/unit/observability/scraping-metrics.spec.ts
- [ ] T030 [P] [US3] Integration test for scraping metrics exposure via `GET /metrics` in backend/test/integration/observability/scraping-metrics.integration.spec.ts

### Implementation for User Story 3

- [ ] T031 [P] [US3] Add scraping metric methods (`recordScrapingExecution`, `recordScrapingDuration`, `setPlayerMatchRate`, `recordScrapingIncident`) to AppMetricsService with constraints (labels: `estado` in `['exitoso', 'fallido', 'recuperada_atasco']`, `liga` in `['PL', 'PD', 'SA', 'BL1', 'FL1', 'GLOBAL']`; duration buckets `[1, 5, 10, 30, 60, 120, 300]`; `scraping_player_match_rate` gauge 0-100) in backend/src/observability/services/app-metrics.service.ts
- [ ] T032 [US3] Instrument ScrapingService with `@Optional() private readonly metricsService?: AppMetricsService` to record execution outcomes, league durations, match rate, and incident counts in backend/src/scraping/services/scraping.service.ts

**Checkpoint**: Scraping pipeline is fully observable, detecting source site changes or Playwright stalls.

---

## Phase 8: User Story 4 - Métricas de Integraciones Externas, Schedulers y Seguridad (Priority: P2)

**Goal**: Monitorizar peticiones y rate limit de Football-Data.org, generaciones de Team of the Week, rendimiento de caché Redis L1 (hits/misses y fallbacks) e intentos de login y duración del hashing de contraseñas.

**Independent Test**: Realizar llamadas en `FootballDataClient`, disparar `TeamOfTheWeekSchedulerService`, consultar `BaseRedisCacheService` e invocar `AuthService.login`, comprobando que `GET /metrics` actualiza todas las métricas de soporte.

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Unit test for external integrations, cache, and auth metrics instrumentation in backend/test/unit/observability/infrastructure-metrics.spec.ts
- [ ] T034 [P] [US4] Integration test for external, cache, TOTW, and auth metrics via `GET /metrics` in backend/test/integration/observability/infrastructure-metrics.integration.spec.ts

### Implementation for User Story 4

- [ ] T035 [P] [US4] Add support metric methods (`recordFootballDataRequest`, `setFootballDataRateLimitRemaining`, `recordTotwGeneration`, `recordTotwDuration`, `recordCacheRequest`, `recordCacheFallback`, `recordAuthAttempt`, `recordPasswordHashingDuration`) to AppMetricsService with constraints (`cache_requests_total` with `dominio` in `['marketplace', 'scraping']`, `resultado` in `['hit', 'miss']`; TOTW buckets `[0.1, 0.5, 1, 2, 5, 10]`; bcrypt hashing buckets `[0.01, 0.05, 0.1, 0.2, 0.5, 1]`) in backend/src/observability/services/app-metrics.service.ts
- [ ] T036 [US4] Instrument FootballDataClient with `@Optional() private readonly metricsService?: AppMetricsService` to record request endpoint/status and rate limit remaining header in backend/src/services/clients/football-data.client.ts
- [ ] T037 [US4] Instrument TeamOfTheWeekSchedulerService with `@Optional() private readonly metricsService?: AppMetricsService` to measure generation duration and status in backend/src/services/scheduler/team-of-the-week-scheduler.service.ts
- [ ] T038 [US4] Instrument BaseRedisCacheService with `@Optional() private readonly metricsService?: AppMetricsService` to track hits, misses, and fallback degradations in backend/src/services/base-redis-cache.service.ts
- [ ] T039 [US4] Instrument AuthService with `@Optional() private readonly metricsService?: AppMetricsService` to track login attempts and measure bcrypt password hashing latency in backend/src/services/auth.service.ts

**Checkpoint**: All 6 user stories are fully implemented, instrumented, and observable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Compliance with Constitution (DoD, Postman sync, OpenAPI, coverage thresholds $\ge 80\%$)

- [ ] T040 [P] Update Postman collection adding the "Observabilidad" folder with requests and assertion scripts for `GET /metrics`, `GET /health/ready`, and `GET /health/live` in postman/collection.json
- [ ] T041 [P] Ensure full Swagger OpenAPI configuration and tag "Observabilidad" documented in backend/src/main.ts matching contracts/openapi-observability.yaml
- [ ] T042 Verify all unit, integration (Testcontainers), and e2e test suites pass with $\ge 80\%$ line and branch coverage without breaking pre-existing tests in backend/
- [ ] T043 Execute quickstart manual validation scenarios from specs/017-backend-observability/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - **BLOCKS** all user stories.
- **User Story 1 (Phase 3 - P1 🎯 MVP)**: Depends on Foundational (Phase 2).
- **User Story 2 (Phase 4 - P1)**: Depends on Foundational (Phase 2). Can execute in parallel with US1.
- **User Story 5 (Phase 5 - P1)**: Depends on Foundational (Phase 2). Can execute in parallel with US1 and US2.
- **User Story 6 (Phase 6 - P1)**: Depends on Foundational (Phase 2) and Phase 5 (`HealthController` base).
- **User Story 3 (Phase 7 - P2)**: Depends on Foundational (Phase 2).
- **User Story 4 (Phase 8 - P2)**: Depends on Foundational (Phase 2).
- **Polish (Final Phase 9)**: Depends on all user story phases being completed.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of other stories. Modifies `oms.service.ts` and `app-metrics.service.ts`.
- **User Story 2 (P1)**: Independent of other stories. Modifies `quotes.service.ts`, `quotes-scheduler.service.ts` and `app-metrics.service.ts`.
- **User Story 5 (P1)**: Independent of other stories. Establishes `HealthController` and health indicators.
- **User Story 6 (P1)**: Extends `HealthController` with memory health checks.
- **User Story 3 (P2)**: Independent of other stories. Modifies `scraping.service.ts` and `app-metrics.service.ts`.
- **User Story 4 (P2)**: Independent of other stories. Modifies `football-data.client.ts`, `team-of-the-week-scheduler.service.ts`, `base-redis-cache.service.ts`, and `auth.service.ts`.

### Within Each User Story

- Tests MUST be written first and verify assertions before or alongside implementation.
- Prerequisite metric definitions in `AppMetricsService` before service instrumentation.
- Service instrumentation using `@Optional() private readonly metricsService?: AppMetricsService` to guarantee non-breaking backward compatibility.
- Story complete and tested before proceeding to production validation.

### Parallel Opportunities

- In **Phase 1**: `T002` and `T003` can run in parallel once `T001` starts.
- In **Phase 2**: `T005` (unit tests) and `T006` (module setup) can run in parallel once `T004` is defined.
- Once **Phase 2** is complete, all User Story phases (US1, US2, US5, US3, US4) can be worked on in parallel by different developers.
- Within **Phase 5 & 6**: Health indicators (`T023`, `T024`) and their unit tests (`T020`, `T021`) can run in parallel.
- In **Phase 9**: `T040` (Postman) and `T041` (Swagger main.ts) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch test and metric helper implementation in parallel:
Task T010: "Unit test for trading metrics instrumentation in backend/test/unit/observability/oms-metrics.spec.ts"
Task T012: "Add trading metric methods to AppMetricsService in backend/src/observability/services/app-metrics.service.ts"

# Then instrument OmsService:
Task T013: "Instrument OmsService in backend/src/services/oms.service.ts"
```

## Parallel Example: User Story 5 & 6 (Health Checks)

```bash
# Launch indicator implementations in parallel:
Task T020 & T023: "RedisHealthIndicator and unit test in backend/src/health/indicators/redis-health.indicator.ts"
Task T021 & T024: "FootballDataHealthIndicator and unit test in backend/src/health/indicators/football-data-health.indicator.ts"
Task T026 & T028: "Memory health checks in backend/src/health/health.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001` - `T003`)
2. Complete Phase 2: Foundational (`T004` - `T009`)
3. Complete Phase 3: User Story 1 (`T010` - `T014`)
4. **STOP and VALIDATE**: Verify trading metrics in `GET /metrics` independently.
5. Deploy/demo MVP operational visibility.

### Incremental Delivery

1. Setup + Foundational $\rightarrow$ Base Prometheus endpoint `/metrics` operational.
2. Add US1 (Trading) $\rightarrow$ Validate trading metrics $\rightarrow$ MVP achieved.
3. Add US2 (Pricing) $\rightarrow$ Validate quotes recalculation metrics.
4. Add US5 + US6 (Health Checks) $\rightarrow$ Validate `GET /health/ready` & `GET /health/live` for container orchestration.
5. Add US3 (Scraping) + US4 (External/Auth/Cache) $\rightarrow$ Full observability across 100% of backend services.
6. Phase 9 Polish $\rightarrow$ Postman collection sync, OpenAPI docs, and Testcontainers test suite validation ($\ge 80\%$ coverage).

---

## Notes

- **Constitution Compliance**: Adheres to 5-layer architecture, DDD, Testcontainers integration testing, and non-negotiable test immutability via `@Optional()` metric service injection.
- **Resilience**: All metric tracking operations are wrapped in `try/catch` within `AppMetricsService` so telemetry failures never break core business workflows (`FR-024`, `SC-006`).
- **Initial Values**: Initial metric values (0 for counters, baseline for gauges) are registered in `onModuleInit` to guarantee presence upon server startup (`SC-005`).
