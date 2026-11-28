---

description: "Lista de tareas ejecutable para Auditoría de Web-Services y Eventos Críticos de Negocio"
---

# Tasks: Auditoría de Web-Services y Eventos Críticos de Negocio

**Input**: Design documents from `/specs/019-backend-audit-logging/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/audit-log-events.schema.json`, `contracts/audit-runtime-contract.md`, `quickstart.md`

**Tests**: Explicitly requested by `FR-012`, `SC-003`, `SC-006`, and Constitution Principles III & VI (`>= 80%` lines and branches on all new code, Testcontainers for PostgreSQL integration tests). **Política Estricta de Inmutabilidad de Tests (Constitución Principio IV)**: bajo ninguna circunstancia modificar ni eliminar ningún archivo de test preexistente en `backend/test/`.

**Organization**: Tasks are grouped by user story (P1 → P2) to enable independent implementation, testing, and incremental delivery using an Aspect-Oriented Programming (AOP) design over `nestjs-pino`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`, `US4`, `US5`)
- Every task includes exact repository-relative file paths (`backend/...` or `specs/...`)

## Path Conventions

- **Backend**: `backend/src/`, `backend/test/`
- **Specs & Contracts**: `specs/019-backend-audit-logging/`
- **No changes** in `frontend/`, `backend/src/domain/`, `backend/src/scraping/domain/`, `backend/src/migrations/`, or pre-existing test files.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Node 20-compatible `nestjs-pino` dependencies and document runtime environment variables.

- [ ] T001 Install `nestjs-pino@^4.6.1`, `pino@^9.14.0`, `pino-http@^10.5.0` in `dependencies` and `pino-pretty@^13.2.0` in `devDependencies` (compatible with Node.js 20+ CI and `@nestjs/common@^11.2.5`) in `backend/package.json` and update `backend/package-lock.json`
- [ ] T002 [P] Document `LOG_LEVEL`, `LOG_PRETTY`, and `REDIS_ENABLED` environment variables with allowed values and defaults (`production`/`development`/`test` behavior) per `contracts/audit-runtime-contract.md` in `backend/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core transversal audit primitives, sanitization engine, `AsyncLocalStorage` context propagation, centralized fail-safe emitter, and AOP business decorator (`@AuditarOperacion` + `AuditAspectRegistry`) required before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Create standardized audit constants in `backend/src/observability/constants/audit-events.constant.ts`: `SERVICIO_AUDITORIA = 'football-tokens-backend'`, closed event catalog (`TRANSACCION_TOKENS`, `ORDEN_MERCADO_SECUNDARIO`, `CALCULO_COTIZACIONES`, `CAMBIO_ESTRATEGIA_COTIZACION`, `CALCULO_TEAM_OF_THE_WEEK`, `SCRAPING_ESTADISTICAS`, `SCRAPING_LIGA`), excluded technical routes (`/health`, `/health/*`, `/metrics`, `/api/docs`, `/api/docs/*`, `/api/docs-json`, `/api/docs-yaml`), sensitive property key list (`password`, `contrasena`, `contraseña`, `passwordhash`, `contrasenahash`, `passwd`, `pwd`, `authorization`, `cookie`, `set-cookie`, `token`, `tokendeacceso`, `accesstoken`, `refreshtoken`, `idtoken`, `jwt`, `bearer`, `secret`, `apikey`, `x-api-key`, `x-auth-token`, `clientsecret`, `proxy`, `proxyurl`, `proxyusername`, `proxypassword`, `scraping_proxy_url`, `scraping_proxy_server`, `scraping_proxy_username`, `scraping_proxy_password`, `http_proxy`, `https_proxy`), and text redaction regexes (`/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:@\s/]+):([^@\s/]+)@/g` and `/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi`)
- [ ] T004 [P] Create strict TypeScript interfaces and literal union types matching `data-model.md` and `contracts/audit-log-events.schema.json` in `backend/src/observability/types/audit-log.types.ts`: `RegistroAuditoriaHttp` (`level` enum `10|20|30|40|50|60`, `timestamp` ISO-8601, `servicio: 'football-tokens-backend'`, `entorno`, `tipoEvento: 'HTTP_AUDIT'`, `requestId` length `1..128`, `usuario: ActorAuditoriaHttp`, `operacion: OperacionHttp`, `parametros: ParametrosHttpSanitizados`, `codigoEstado` `100..599`, `tiempoEjecucion >= 0`, optional `error: ResumenErrorHttp`, `msg`), `EventoAuditoriaNegocio` (`tipoEvento: 'BUSINESS_AUDIT'`, `evento: NombreEventoNegocio`, `requestId: string | null`, `origen: 'HTTP' | 'MANUAL' | 'PROGRAMADO' | 'PROGRAMADO_TOTW' | 'STANDALONE' | 'SISTEMA'`, `usuarioId: string | null`, `resultado: 'EXITO' | 'RECHAZADO' | 'OMITIDO' | 'FALLIDO'`, `motivo: string | null`, `tiempoEjecucion >= 0`, `datos`), specialized `datos` types for all 7 business events (including `mercado: 'PRIMARIO' | 'SECUNDARIO'`, `operacion: 'COMPRA'`, `accion: 'CREAR_VENTA' | 'CANCELAR_VENTA'`, `estadoOrden: 'PENDIENTE' | 'CANCELADA' | null`, `semanaIso` `1..53`, `subtipo: 'EJECUCION_COMPLETA' | 'RECUPERACION_HUERFANA' | 'RECUPERACION_ATASCADA' | 'RECHAZO_CONCURRENCIA'`, `estadoFinal: 'EXITOSO' | 'FALLIDO' | 'RECHAZADO' | 'EN_PROGRESO'`), and `OpcionesAspectoAuditoria` (including optional `debeEmitir` and `debeEmitirError`)
- [ ] T005 [P] Implement pure recursive sanitizer (`sanitizarValor`, `sanitizarParametrosHttp`, `sanitizarTexto`, `sanitizarUrlProxy`) in `backend/src/observability/utils/audit-sanitizer.util.ts` enforcing: case-insensitive normalized key matching to `'[REDACTED]'`, URL credentials regex replacement to `'$1[REDACTED]@'`, Bearer token regex replacement to `'Bearer [REDACTED]'`, max recursion depth `5` (`'[MAX_DEPTH]'`), circular reference detection via `WeakSet` (`'[CIRCULAR]'`), `Buffer` formatting (`'[Buffer N bytes]'`), max string length `512` chars (suffix `'...[TRUNCATED]'`), max array elements `25` (`'[+N items]'`), max object keys `30` (`_truncatedKeys: N`), and max serialized `parametros` budget `4096` bytes preserving the 3 schema-required keys (`{ ruta: {}, consulta: {}, cuerpo: { _truncated: true, bytesOriginales: N } }`)
- [ ] T006 [P] Implement typed `AsyncLocalStorage` context service (`AuditContextService`) in `backend/src/observability/services/audit-context.service.ts` managing `{ requestId: string | null; metadatosOperacion: Record<string, unknown> }` with `ejecutarEnContexto`, `ejecutarEnAlcanceOperacion`, `obtenerRequestId`, `registrarMetadatos`, and `obtenerMetadatos`
- [ ] T007 Implement centralized fail-safe `AuditLoggerService` in `backend/src/observability/services/audit-logger.service.ts` (depends on T003, T004, T005, T006) wrapping `PinoLogger` to emit `HTTP_AUDIT` (`codigoEstado < 400` → `info`, `400..499` → `warn`, `>= 500` → `error`, excluded route at `LOG_LEVEL=debug` → `debug`) and `BUSINESS_AUDIT` (`EXITO` → `info`, `RECHAZADO`/`OMITIDO` → `warn`, `FALLIDO` → `error`), auto-correlating `requestId` via `AuditContextService`, sanitizing payloads, and isolating all serializer/logger errors in `try/catch` (FR-011)
- [ ] T008 Implement decoupled `AuditAspectRegistry` (`registerLogger`, `registerContext`, `getLogger`, `getContext`, `clear`) in `backend/src/observability/aspects/audit-aspect.registry.ts` (depends on T006, T007) enabling `@AuditarOperacion` to operate as a safe no-op in isolated unit tests without `ObservabilityModule` or service constructor changes (Constitution Principle IV)
- [ ] T009 Implement reusable AOP method decorator `@AuditarOperacion(opciones: OpcionesAspectoAuditoria)` (around advice) in `backend/src/observability/aspects/auditar-operacion.decorator.ts` (depends on T004, T006, T007, T008): open ephemeral operation metadata scope, measure `tiempoEjecucion` (`>= 0`), evaluate `debeEmitir`, extract success payload via `extraerResultadoExito`, evaluate `debeEmitirError` and automatically deduplicate re-thrown errors already audited by an inner `@AuditarOperacion` with the same `evento` (tagging the error via a non-enumerable `Symbol`), classify thrown errors (`HttpException` 4xx or `ReglaDeNegocioException` → `'RECHAZADO'`; 5xx/unexpected → `'FALLIDO'`), sanitize `motivo`, emit fail-safe via `AuditLoggerService` without mutating return values or swallowing business exceptions, and copy all `Reflect.getMetadataKeys(originalMethod)` to the wrapper function to preserve `@Cron(...)` and NestJS metadata
- [ ] T010 [P] Write unit tests covering recursive sensitive key redaction, embedded proxy URL credentials, Bearer tokens, circular references, `Buffer`, max depth `5`, string length `512`, array length `25`, object key count `30`, and `4096`-byte `parametros` budget (verifying `{ ruta: {}, consulta: {}, cuerpo: { _truncated: true, bytesOriginales: N } }`) in `backend/test/unit/observability/audit-sanitizer.spec.ts`
- [ ] T011 [P] Write unit tests for `AuditLoggerService` and `AuditContextService` covering `HTTP_AUDIT` and `BUSINESS_AUDIT` emission, severity transitions, `AsyncLocalStorage` `requestId` correlation (`string` vs `null`), metadata isolation across nested/concurrent scopes, and fail-safe resilience when Pino throws in `backend/test/unit/observability/audit-logger.service.spec.ts`
- [ ] T012 [P] Write unit tests for `@AuditarOperacion` and `AuditAspectRegistry` covering around-advice success, `debeEmitir: false`, `debeEmitirError: false`, nested same-event error deduplication (inner decorated method throws → outer decorated method with same `evento` does not duplicate), 4xx/`ReglaDeNegocioException` (`RECHAZADO`) vs 5xx/unexpected (`FALLIDO`), `Reflect` metadata preservation for `@Cron`, safe no-op when registry is empty, and fail-safe error isolation when callbacks or logger fail in `backend/test/unit/observability/auditar-operacion.decorator.spec.ts`

**Checkpoint**: Foundation ready — `audit-sanitizer`, `AuditContextService`, `AuditLoggerService`, `AuditAspectRegistry`, and `@AuditarOperacion` are tested and verified. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Auditoría Estructurada de Solicitudes a los Web-Services (Priority: P1) 🎯 MVP

**Goal**: Emit exactly 1 structured `HTTP_AUDIT` JSON record per functional HTTP request (including pre-interceptor 400/401/403/404 errors via coordinated `pino-http` fallback) with ISO-8601 `timestamp`, `requestId` (`x-request-id` correlation), authenticated/anonymous `usuario`, `operacion` (`metodo`, `ruta`, `controlador`), sanitized `parametros`, `codigoEstado`, `tiempoEjecucion` (ms), and optional `error`, while excluding `/health/*`, `/metrics`, and `/api/docs*` at standard log levels.

**Independent Test**: Invoke public, authenticated, invalid, unauthorized (401/403), and nonexistent (404) endpoints plus `/health/live`, `/metrics`, and `/api/docs-json` via Supertest capturing Pino NDJSON output; verify 100% conformance to `contracts/audit-log-events.schema.json`, exactly 1 `HTTP_AUDIT` record per functional request, 0 records for excluded technical routes at `LOG_LEVEL=info`, and 0 exposed secrets (`password`, `contrasena`, `Authorization`, `Cookie`).

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `createPinoLoggerConfig` factory in `backend/src/observability/config/pino-logger.config.ts`: custom `timestamp: () => ',"timestamp":"' + new Date().toISOString() + '"'` (overriding Pino's default `"time"` key to emit `"timestamp"` in ISO-8601 UTC), base fields `{ servicio: 'football-tokens-backend', entorno }`, `LOG_LEVEL` defaults (`info` in `production`/`development`, `silent` in `test`), `pino-pretty` transport strictly restricted to `NODE_ENV === 'development' && LOG_PRETTY !== 'false'`, native Pino `redact` (`req.headers.authorization`, `req.headers.cookie`, `res.headers['set-cookie']`, sensitive body/query paths with `censor: '[REDACTED]'`), `genReqId` accepting trimmed `x-request-id` matching `/^[a-zA-Z0-9._:-]{1,128}$/` or generating `crypto.randomUUID()`, technical route exclusion (`/health/*`, `/metrics`, `/api/docs*` ignored unless `LOG_LEVEL === 'debug'`), and `pino-http` pre-interceptor fallback (`autoLogging.ignore` skipping when `req.__httpAuditLogged === true`) configured with `customAttributeKeys: { responseTime: 'tiempoEjecucion', reqId: 'requestId' }`, suppressed raw `req`/`res` serializers, `customLogLevel` (`<400` → `info`, `4xx` → `warn`, `>=500` → `error`), `customSuccessMessage`/`customErrorMessage`, and `customProps` populating `tipoEvento: 'HTTP_AUDIT'`, `usuario`, `operacion`, sanitized `parametros`, `codigoEstado`, and conditional `error` (from `res.locals?.auditError`) so fallback logs strictly match `contracts/audit-log-events.schema.json`
- [ ] T014 [P] [US1] Implement `AuditContextMiddleware` in `backend/src/observability/middleware/audit-context.middleware.ts` to extract/normalize incoming `x-request-id` (or reuse `req.id` / generate UUID v4), set response header `x-request-id`, and run `next()` inside `AuditContextService.ejecutarEnContexto(requestId, ...)`
- [ ] T015 [US1] Implement global AOP HTTP interceptor `AuditLoggingInterceptor` (`NestInterceptor` around advice) in `backend/src/observability/interceptors/audit-logging.interceptor.ts` (depends on T003, T005, T006, T007): skip excluded technical routes unless `LOG_LEVEL === 'debug'`, record start time with `performance.now()`, capture `operacion` (`metodo`, normalized route `req.baseUrl + req.route.path` or clean `pathname`, `controlador: `${ClassName}.${handlerName}``), capture sanitized `parametros` (`ruta`, `consulta`, `cuerpo`), emit `HTTP_AUDIT` on `tap` and `catchError` (extracting authenticated `{ autenticado: true, id, email, rol }` or anonymous `{ autenticado: false, tipo: 'ANONIMO', id: null, email: null, rol: null }`, `codigoEstado`, `tiempoEjecucion`, and sanitized `error` when `>= 400`), set `req.__httpAuditLogged = true`, and re-throw errors intact
- [ ] T016 [US1] Update `HttpExceptionFilter` in `backend/src/common/filters/http-exception.filter.ts` to attach sanitized `{ codigoEstado: status, mensaje }` to `response.locals.auditError` guarded by `if (response?.locals)` so pre-existing unit tests with partial response mocks remain 100% compatible
- [ ] T017 [US1] Wire `LoggerModule.forRootAsync({ useFactory: createPinoLoggerConfig })`, `AuditContextService`, `AuditLoggerService`, `AuditAspectRegistry` registration in `onModuleInit()` and cleanup in `onModuleDestroy()`, global `APP_INTERCEPTOR` (`AuditLoggingInterceptor`), and `NestModule.configure` applying `AuditContextMiddleware` to `'*'` in `backend/src/observability/observability.module.ts` (depends on T006, T007, T008, T013, T014, T015)

### Tests for User Story 1

- [ ] T018 [P] [US1] Write unit tests for `createPinoLoggerConfig` in `backend/test/unit/observability/pino-logger.config.spec.ts` verifying environment presets (`production`, `development`, `test`), `LOG_PRETTY` guard in production, custom `"timestamp"` ISO-8601 key formatter, `customAttributeKeys` (`tiempoEjecucion`, `requestId`), `customProps` `HTTP_AUDIT` fallback fields, `genReqId` validation/truncation/UUID fallback, native redact paths, technical route filtering at `info` vs `debug`, and `autoLogging.ignore` deduplication when `req.__httpAuditLogged === true`
- [ ] T019 [P] [US1] Write unit tests for `AuditLoggingInterceptor` and `AuditContextMiddleware` in `backend/test/unit/observability/audit-logging.interceptor.spec.ts` covering 2xx/4xx/5xx flows, authenticated vs `ANONIMO` actor, excluded routes, `req.__httpAuditLogged` flag, `tiempoEjecucion >= 0`, `x-request-id` header propagation, and fail-safe isolation
- [ ] T020 [US1] Write HTTP E2E integration tests with Supertest in `backend/test/integration/observability/http-audit-logging.integration.spec.ts` capturing Pino NDJSON stream and asserting against `contracts/audit-log-events.schema.json`: exactly 1 `HTTP_AUDIT` record for 2xx, 400 (`ValidationPipe`), 401 (Guard), 403 (RolesGuard), 404 (unknown route), and 500; `x-request-id` echo & UUID generation; redaction of `contrasena`, `password`, `Authorization`, `Cookie`; 0 records for `/health/live`, `/health/ready`, `/metrics`, `/api/docs-json` at `LOG_LEVEL=info` and `debug` emission at `LOG_LEVEL=debug`; and verification that a pre-existing `@nestjs/common` `Logger` routes through `app.useLogger(app.get(Logger))` as structured JSON (FR-009)

**Checkpoint**: User Story 1 (MVP) is complete and independently verifiable — every functional web-service request emits a single schema-valid, redacted `HTTP_AUDIT` record with `x-request-id` correlation and zero technical probe noise.

---

## Phase 4: User Story 2 - Auditoría de Transacciones de Tokens entre Usuarios y del Marketplace (Priority: P1)

**Goal**: Audit every token transaction (secondary P2P and primary market purchases) and secondary sell-order creation/cancellation—both successful and business-rejected—emitting `TRANSACCION_TOKENS` and `ORDEN_MERCADO_SECUNDARIO` `BUSINESS_AUDIT` events correlated via `requestId`.

**Independent Test**: Execute primary purchase, secondary P2P purchase, sell-order creation/cancellation, and business rejections (insufficient balance, slippage, self-buy, already settled order) against real PostgreSQL via Testcontainers, verifying emitted `BUSINESS_AUDIT` events include all mandatory fields (`mercado`, `operacion`/`accion`, `compradorId`, `vendedorId`, `transaccionId`, `ordenId`, `jugadorId`, `cantidad`, `precioUnitario`, `montoTotal`, `resultado`, `motivo`, `tiempoEjecucion`) and correlate with `requestId`.

### Implementation for User Story 2

- [ ] T021 [US2] Apply `@AuditarOperacion` (`TRANSACCION_TOKENS` on `ejecutarCompraPrimaria` and `ejecutarCompraSecundaria`, and `ORDEN_MERCADO_SECUNDARIO` on `crearOrdenVenta` and `cancelarOrdenVenta`) in `backend/src/services/oms.service.ts` (without modifying the constructor or return DTOs), recording intermediate execution metadata (`vendedorId`, `precioUnitario`, `estrategiaCotizacion`, `jugadorId`, `cantidad`, `ordenId`) via `AuditAspectRegistry.getContext()?.registrarMetadatos(...)` so both `EXITO` and `RECHAZADO`/`FALLIDO` paths populate every required field of `contracts/audit-log-events.schema.json`

### Tests for User Story 2

- [ ] T022 [US2] Create business audit integration test suite with real PostgreSQL Testcontainers in `backend/test/integration/observability/business-audit-logging.integration.spec.ts` covering US2: `TRANSACCION_TOKENS` for primary purchase (`mercado: 'PRIMARIO'`), secondary P2P purchase (`mercado: 'SECUNDARIO'` with `compradorId` and `vendedorId`), rejected purchases (insufficient balance, slippage, self-buy, liquidated order → `resultado: 'RECHAZADO'`, non-null `motivo`), `ORDEN_MERCADO_SECUNDARIO` (`CREAR_VENTA` and `CANCELAR_VENTA` success + rejection), and `requestId` correlation via `AuditContextService`

**Checkpoint**: User Stories 1 and 2 both work independently and correlate HTTP requests with token transaction business audit events.

---

## Phase 5: User Story 3 - Auditoría de Cálculo de Cotizaciones y Team of the Week (Priority: P1)

**Goal**: Audit every quote recalculation (manual admin or `@Cron` scheduled), active strategy switch, and Team of the Week generation (manual admin or `@Cron` scheduled), including lock skips, pre-existence skips, business rejections, and unexpected failures, without breaking `@Cron` metadata or duplicating events.

**Independent Test**: Invoke `QuotesService` / `QuotesController` (`cambiarEstrategiaActiva`, `recalcularCotizacionesManual`, `recalcularCotizacionesActivas`), `QuotesSchedulerService.ejecutarRecalculoSemanal`, `EquipoSemanalService` / `TeamOfTheWeekController` (`generarEquipoSemanaActual`, `generarAutomatico`), and `TeamOfTheWeekSchedulerService.ejecutarGeneracionSemanal` across success, skip, and error paths, verifying `CALCULO_COTIZACIONES`, `CAMBIO_ESTRATEGIA_COTIZACION`, and `CALCULO_TEAM_OF_THE_WEEK` events match `contracts/audit-log-events.schema.json` and `@Cron` metadata is preserved.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Apply `@AuditarOperacion` (`CALCULO_COTIZACIONES` on `recalcularCotizacionesActivas` and `CAMBIO_ESTRATEGIA_COTIZACION` on `cambiarEstrategiaActiva`) in `backend/src/services/quotes.service.ts`: add optional backward-compatible `contexto?: { origen?: OrigenEventoNegocio; usuarioId?: string | null }` parameter to `recalcularCotizacionesActivas`, add optional `adminId?: string` to `recalcularCotizacionesManual` forwarding `{ origen: 'MANUAL', usuarioId: adminId ?? null }`, record `estrategiaAnterior`, `estrategiaId`, `estrategiaVersion` in operation context, and populate `procesados`, `sinEstadisticas`, `fallidos`
- [ ] T024 [US3] Update `recalcularManualmente` in `backend/src/controllers/quotes.controller.ts` (depends on T023) to accept optional `@Req() req?: any` and forward `req?.user?.id || req?.user?.sub` to `this.quotesService.recalcularCotizacionesManual(adminId)` while remaining backward-compatible when called without arguments in existing tests
- [ ] T025 [US3] Apply `@AuditarOperacion` (`CALCULO_COTIZACIONES` with `origen: 'PROGRAMADO'`) on `ejecutarRecalculoSemanal` in `backend/src/services/scheduler/quotes-scheduler.service.ts` (depends on T023): forward `{ origen: 'PROGRAMADO', usuarioId: null }` to `quotesService.recalcularCotizacionesActivas`, configure `debeEmitir: (res) => !res.ejecutado` to emit `resultado: 'OMITIDO'` when advisory lock is not acquired (preventing duplicate success events) and rely on T009's nested same-event error deduplication (emitting `FALLIDO` only when failure occurs outside `recalcularCotizacionesActivas`, e.g., DB lock/connection error), preserving `@Cron('0 0 * * 0')` metadata
- [ ] T026 [P] [US3] Apply `@AuditarOperacion` (`CALCULO_TEAM_OF_THE_WEEK`) on `generarEquipoSemanaActual(ahora?: Date, usuarioId?: string | null)` (`origen: 'MANUAL'`) and `generarAutomatico(ahora?: Date)` (`origen: 'PROGRAMADO'`) in `backend/src/services/equipo-semanal.service.ts` populating `ano`, `semanaIso` (`1..53`), `estrategiaId`, `estrategiaVersion`, `cantidadMiembros` (`11` on success, `0` on `OMITIDO`/`RECHAZADO`/`FALLIDO`), and `motivo`
- [ ] T027 [US3] Update `generarManualmente` in `backend/src/controllers/team-of-the-week.controller.ts` (depends on T026) to accept optional `@Req() req?: any` and pass `(undefined, req?.user?.id || req?.user?.sub)` to `this.equipoSemanalService.generarEquipoSemanaActual(...)` (preserving zero-arg calls in existing tests)
- [ ] T028 [US3] Apply `@AuditarOperacion` (`CALCULO_TEAM_OF_THE_WEEK` with `origen: 'PROGRAMADO'`) on `ejecutarGeneracionSemanal` in `backend/src/services/scheduler/team-of-the-week-scheduler.service.ts` (depends on T023, T026): pass `{ origen: 'PROGRAMADO_TOTW', usuarioId: null }` to `quotesService.recalcularCotizacionesActivas`, mark in operation context when `generarAutomatico()` was invoked so `debeEmitir` emits `OMITIDO` only on advisory-lock skip or pre-existing check before delegation (avoiding duplicate events), rely on T009's nested same-event error deduplication when `generarAutomatico()` throws, and preserve `@Cron` metadata

### Tests for User Story 3

- [ ] T029 [US3] Expand `backend/test/integration/observability/business-audit-logging.integration.spec.ts` with US3 tests covering `CALCULO_COTIZACIONES` (manual with `usuarioId`, scheduled with `requestId: null`, lock skipped → `OMITIDO`, inner service error emitting exactly 1 `FALLIDO` without scheduler duplication), `CAMBIO_ESTRATEGIA_COTIZACION` (`estrategiaAnterior`/`estrategiaNueva`/`versionNueva` and invalid strategy `RECHAZADO`), `CALCULO_TEAM_OF_THE_WEEK` (manual generation, automatic generation, pre-existing `OMITIDO`, lock `OMITIDO`, insufficient players `RECHAZADO` without scheduler duplication), and `Reflect` verification that `@Cron` metadata remains intact on both schedulers

**Checkpoint**: User Stories 1, 2, and 3 (all P1 stories) are complete and independently verified.

---

## Phase 6: User Story 4 - Auditoría de Ejecuciones del Scraper de Estadísticas (Priority: P2)

**Goal**: Audit every WhoScored scraper run (`manual`, `programado`, `STANDALONE`), per-league processing, orphan/stuck recovery, and concurrency rejections via `SCRAPING_ESTADISTICAS` and `SCRAPING_LIGA` events while guaranteeing 0% exposure of Webshare.io proxy credentials.

**Independent Test**: Run manual scraping (`ScrapingController`/`ScrapingService`), per-league processing, orphan recovery (`recuperarEjecucionesAtascadas`), and concurrent rejection (`ConflictException`) with an authenticated `SCRAPING_PROXY_URL`, asserting schema-valid `SCRAPING_ESTADISTICAS` and `SCRAPING_LIGA` events and 0 occurrences of proxy username/password across all emitted logs.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Sanitize proxy server URL using `sanitizarUrlProxy` (e.g. `Chromium configurado con proxy: ...`) and apply `sanitizarTexto` to logged navigation/browser error messages in `backend/src/scraping/services/whoscored-playwright.service.ts` so proxy credentials (`SCRAPING_PROXY_URL`, `SCRAPING_PROXY_USERNAME`, `SCRAPING_PROXY_PASSWORD`) can never appear in plaintext logs
- [ ] T031 [US4] Update `ejecutarScraping` in `backend/src/scraping/controllers/scraping.controller.ts` (depends on T032) to accept optional `@Req() req?: any` and forward `usuarioId` (`req?.user?.id || req?.user?.sub`) to `this.scrapingService.ejecutarPipeline('manual', usuarioId)` (preserving zero-arg calls in existing tests)
- [ ] T032 [P] [US4] Apply `@AuditarOperacion` in `backend/src/scraping/services/scraping.service.ts`: `SCRAPING_ESTADISTICAS` on `ejecutarPipeline(trigger = 'manual', usuarioId?: string | null)` (mapping `'manual'` → `'MANUAL'`, `'programado'` → `'PROGRAMADO'`, `'standalone'` → `'STANDALONE'`, aggregating `ejecucionId`, `disparador`, `ligasProcesadas`, `tasaAsociacion`, `conteoIncidencias`, `jugadoresProcesados`, `errores`, `estadoFinal` via operation context, and classifying `ConflictException` as `subtipo: 'RECHAZO_CONCURRENCIA'`, `estadoFinal: 'RECHAZADO'`), `SCRAPING_ESTADISTICAS` on `recuperarEjecucionesAtascadas()` (`subtipo: 'RECUPERACION_HUERFANA'`, `origen: 'SISTEMA'`, `debeEmitir` only when an orphan execution was recovered), `SCRAPING_ESTADISTICAS` on `resolverEjecucionEnProgreso()` (`subtipo: 'RECUPERACION_ATASCADA'`, `origen: 'SISTEMA'`, `debeEmitir` only when a stale execution exceeding `STALE_TIMEOUT_MS` was recovered, suppressing error emission on `ConflictException` via `debeEmitirError: () => false` so `ejecutarPipeline` emits `RECHAZO_CONCURRENCIA` once), and `SCRAPING_LIGA` on `procesarLiga(...)` (`ejecucionId`, `liga`, `descubiertos`, `deduplicados`, `asociados`, `descartados`, `tasaAsociacion`, `conteoIncidencias`, `rechazadaPorCobertura`)

### Tests for User Story 4

- [ ] T033 [US4] Expand `backend/test/integration/observability/business-audit-logging.integration.spec.ts` with US4 tests covering `SCRAPING_ESTADISTICAS` (manual with `usuarioId`, scheduled/standalone with `requestId: null`, `RECUPERACION_HUERFANA`, `RECUPERACION_ATASCADA`, `RECHAZO_CONCURRENCIA` on `ConflictException` emitted once), `SCRAPING_LIGA` metrics validated against `contracts/audit-log-events.schema.json`, and proxy redaction assertions confirming 0 occurrences of `demoUser`/`demoPass` from `SCRAPING_PROXY_URL` across stdout logs and error messages

**Checkpoint**: User Story 4 is complete and independently verified — all 4 critical business processes are audited via AOP with zero credential leaks.

---

## Phase 7: User Story 5 - Viabilidad Operativa en Producción y Gestión de Logs Preexistentes (Priority: P2)

**Goal**: Unify all pre-existing `@nestjs/common` `Logger` outputs under `nestjs-pino` (replacing `console.log` in `main.ts` and attaching Pino safely to standalone scripts) and suppress 100% of Redis-not-configured warnings in production (`NODE_ENV=production` without `REDIS_URL`/`REDIS_HOST` or `REDIS_ENABLED=false`) without altering dev/test or explicit Redis behavior.

**Independent Test**: Simulate `NODE_ENV=production` without `REDIS_URL`/`REDIS_HOST` and verify JSON NDJSON startup without `console.log` or `pino-pretty`, 0 Redis `WARN` logs on cache read/write/invalidation and health checks, while `NODE_ENV=test`/`development` and injected Redis clients preserve existing fallback warnings and pass all pre-existing cache/health tests unmodified.

### Implementation for User Story 5

- [ ] T034 [P] [US5] Implement pure environment policy function `esRedisHabilitado(env: NodeJS.ProcessEnv = process.env): boolean` in `backend/src/observability/utils/redis-policy.util.ts` (`REDIS_ENABLED === 'false'` → `false`; `REDIS_ENABLED === 'true'` → `true`; `NODE_ENV === 'production'` → `Boolean(env.REDIS_URL || env.REDIS_HOST)`; otherwise `true`)
- [ ] T035 [US5] Update `BaseRedisCacheService` constructor in `backend/src/services/base-redis-cache.service.ts` (depends on T034) so that when `injectedRedis === undefined && !esRedisHabilitado()`, `this.redisClient` is set to `null` silently without creating an `ioredis` instance or emitting `WARN` logs, preserving PostgreSQL fallback and existing behavior when Redis is enabled or injected
- [ ] T036 [US5] Update `RedisHealthIndicator.isHealthy` in `backend/src/health/indicators/redis-health.indicator.ts` (depends on T034) so that when `!this.isInjectedClient && !esRedisHabilitado()`, it avoids creating a Redis client/warnings and returns `this.getStatus(key, true, { mode: 'disabled' })`, preserving existing behavior for injected clients and non-production environments
- [ ] T037 [P] [US5] Update `backend/src/main.ts` to instantiate NestJS with `{ bufferLogs: true }`, register `nestjs-pino` `Logger` globally via `app.useLogger(app.get(Logger))`, and replace both `console.log(...)` startup statements with `logger.log(...)`
- [ ] T038 [P] [US5] Update `backend/src/run-scraper.ts` to pass `bufferLogs: true` in `NestFactory.createApplicationContext(...)` and attach `nestjs-pino` `Logger` defensively (`if (typeof app.useLogger === 'function')` with `app.get(Logger, { strict: false })`) while preserving the `ejecutarPipeline('programado')` call and full compatibility with partial `app` mocks in `run-scraper.spec.ts`
- [ ] T039 [P] [US5] Update `backend/src/run-sync-players.ts` to pass `bufferLogs: true` in `NestFactory.createApplicationContext(...)` and attach `nestjs-pino` `Logger` defensively (`if (typeof app.useLogger === 'function')` with `app.get(Logger, { strict: false })`) while preserving full compatibility with partial `app` mocks in `run-sync-players.spec.ts`

### Tests for User Story 5

- [ ] T040 [P] [US5] Write unit tests in `backend/test/unit/observability/redis-policy.spec.ts` covering `esRedisHabilitado` across `production`/`development`/`test` and `REDIS_ENABLED`/`REDIS_URL`/`REDIS_HOST` combinations, `BaseRedisCacheService` silent suppression (`0` warnings) in production without Redis vs active warnings when injected/dev/test, `RedisHealthIndicator` `{ mode: 'disabled' }` in production without Redis, and defensive `app.useLogger(pinoLogger)` attachment (both when `useLogger` is present and when omitted in partial mocks) for `bootstrapScraper` and `bootstrapSyncPlayers` (FR-009)

**Checkpoint**: All 5 user stories are independently functional and verified — production free-tier constraints (Render 512 MB, Supabase 500 MB, UptimeRobot noise, no-Redis production) are completely satisfied.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-cutting verification, DoD compliance (Swagger/Postman, build, full coverage, Test Immutability Policy), and quickstart validation.

- [ ] T041 Verify OpenAPI (Swagger) spec and Postman collection (`postman/`) synchronization confirming zero REST endpoint, payload, or status-code changes were introduced, and record the explicit verification evidence and date in `specs/019-backend-audit-logging/contracts/audit-runtime-contract.md` (Constitution DoD #3)
- [ ] T042 Run `npm run build` and `npm run test:cov -- --runInBand --testTimeout=60000` in `backend/` verifying: zero TypeScript errors, 100% of pre-existing tests pass unmodified (`git diff --name-only backend/test/` shows zero modified pre-existing test files per Constitution Principle IV), `>= 80%` lines and branches coverage on all new files in `backend/src/observability/` as well as newly introduced branches across modified files (Principle VI), and no global coverage drop
- [ ] T043 Execute end-to-end verification checklist from `specs/019-backend-audit-logging/quickstart.md` (production simulation `NODE_ENV=production LOG_LEVEL=info` without Redis, NDJSON output validation against `specs/019-backend-audit-logging/contracts/audit-log-events.schema.json`, Escenario E latency overhead benchmark `< 5 ms` per SC-004, `0` technical probe logs at `info` per SC-005, and `0` leaked credentials per SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (`T001`, `T002`).
- **Foundational (Phase 2)**: Depends on Setup (`T001`) — **BLOCKS** all user stories (`T003`–`T012`).
- **User Stories (Phases 3–7)**: All depend on Foundational (Phase 2) completion:
  - **US1 (Phase 3, P1)**: Core HTTP audit aspect + `ObservabilityModule` wiring. Should be completed first for the MVP and because `ObservabilityModule` registers `AuditAspectRegistry` (`T017`).
  - **US2 (Phase 4, P1)**, **US3 (Phase 5, P1)**, **US4 (Phase 6, P2)**, and **US5 (Phase 7, P2)**: Can proceed in parallel after Phase 2 (with integration tests that bootstrap `ObservabilityModule` depending on `T017`). Note: `T022`, `T029`, and `T033` append to the shared file `backend/test/integration/observability/business-audit-logging.integration.spec.ts`, so run those three sequentially or coordinate sections cleanly.
- **Polish (Phase 8)**: Depends on all desired user stories (`Phases 3–7`) being complete (`T041`–`T043`).

### User Story Dependencies

- **User Story 1 (P1 — MVP)**: Depends on Phase 2 (`T003`–`T012`). Independent of US2–US5.
- **User Story 2 (P1)**: Depends on Phase 2 (`@AuditarOperacion`, `AuditAspectRegistry`) + `T017` for full module integration tests. Independent of US3–US5.
- **User Story 3 (P1)**: Depends on Phase 2 + `T017` for full module integration tests. Within US3, `T025` depends on `T023`, and `T028` depends on `T023` & `T026`.
- **User Story 4 (P2)**: Depends on Phase 2 + `T017` for full module integration tests. Independent of US2, US3, US5.
- **User Story 5 (P2)**: `T034`–`T036` and `T040` depend only on Phase 1 (`T001`); `T037`–`T039` depend on `T017` (`LoggerModule` registered in `ObservabilityModule`). Independent of US2–US4.

### Parallel Opportunities

- **Phase 1**: `T002` in parallel with `T001`.
- **Phase 2**: `T003`, `T004`, `T005`, `T006` all in parallel; then `T007` → `T008` → `T009`; then unit tests `T010`, `T011`, `T012` in parallel.
- **Phase 3 (US1)**: `T013` and `T014` in parallel; then `T015` and `T016` in parallel; then `T017`; then `T018` and `T019` in parallel before `T020`.
- **Phase 5 (US3)**: `T023` and `T026` in parallel; then `T024`, `T025`, `T027`, and `T028` in parallel; then `T029`.
- **Phase 6 (US4)**: `T030` and `T032` in parallel; then `T031`; then `T033`.
- **Phase 7 (US5)**: `T034`, `T037`, `T038`, `T039` in parallel; then `T035`, `T036`, `T040` in parallel.

---

## Parallel Example: Foundational & User Story 3

```bash
# Phase 2 — Launch independent foundational modules together:
Task: "T003 [P] Create standardized audit constants in backend/src/observability/constants/audit-events.constant.ts"
Task: "T004 [P] Create strict TypeScript interfaces in backend/src/observability/types/audit-log.types.ts"
Task: "T005 [P] Implement recursive sanitizer in backend/src/observability/utils/audit-sanitizer.util.ts"
Task: "T006 [P] Implement AsyncLocalStorage context service in backend/src/observability/services/audit-context.service.ts"

# Phase 5 (US3) — Launch independent service edits together, then controllers & schedulers:
Task: "T023 [P] [US3] Apply @AuditarOperacion in backend/src/services/quotes.service.ts"
Task: "T026 [P] [US3] Apply @AuditarOperacion in backend/src/services/equipo-semanal.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (`T001`–`T002`)
2. Complete **Phase 2: Foundational** (`T003`–`T012`)
3. Complete **Phase 3: User Story 1** (`T013`–`T020`)
4. **STOP and VALIDATE**: Run `npx jest test/unit/observability/ test/integration/observability/http-audit-logging.integration.spec.ts --runInBand` and verify 100% of functional endpoints emit 1 schema-valid, redacted `HTTP_AUDIT` record with 0 noise from `/health/*`, `/metrics`, and `/api/docs*`.

### Incremental Delivery

1. **Setup + Foundational** → Core AOP audit infrastructure ready (`T001`–`T012`)
2. **Add US1 (MVP)** → Structured HTTP audit + redaction + correlation (`T013`–`T020`)
3. **Add US2** → Token transactions & secondary order audit via `@AuditarOperacion` (`T021`–`T022`)
4. **Add US3** → Quotes recalculation, strategy switch & Team of the Week audit (`T023`–`T029`)
5. **Add US4** → WhoScored scraper audit & Webshare.io proxy protection (`T030`–`T033`)
6. **Add US5** → Unified global Pino logger & silent production no-Redis policy (`T034`–`T040`)
7. **Polish & DoD** → Swagger/Postman check, build, full coverage `>= 80%` on new code, quickstart validation (`T041`–`T043`)

---

## Notes

- **[P]** tasks touch different files and have no incomplete dependencies.
- **Test Immutability (Constitución Principio IV)**: Never modify or delete pre-existing files under `backend/test/`. All new tests live strictly inside `backend/test/unit/observability/` and `backend/test/integration/observability/`.
- **AOP Discipline**: Keep all timing, correlation, error classification, sanitization, and fail-safe logic inside `AuditLoggingInterceptor`, `@AuditarOperacion`, and `AuditLoggerService` to prevent code duplication across services.
- **No Migrations / No Disk Logs**: Do not create TypeORM migrations or file log transports; emit NDJSON solely to `stdout`.
