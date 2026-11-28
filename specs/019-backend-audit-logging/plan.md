# Implementation Plan: Auditoría de Web-Services y Eventos Críticos de Negocio

**Branch**: `019-backend-audit-logging` (`feature/logger`) | **Date**: 2026-11-28 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `specs/019-backend-audit-logging/spec.md`

---

## Summary

Implementar una capa transversal de auditoría estructurada en el backend NestJS basada en **`nestjs-pino`** (`nestjs-pino@^4.6.1`, `pino@^9.14.0`, `pino-http@^10.5.0`, y `pino-pretty@^13.2.0` solo en desarrollo local) diseñada bajo **Aspect-Oriented Programming (AOP)** para reutilizar íntegramente el código del logger sin duplicación, emitiendo en formato **JSON NDJSON hacia `stdout`**:

1. **Aspecto de Auditoría HTTP (`AuditLoggingInterceptor` + fallback `pino-http` → `HTTP_AUDIT`)**: un interceptor AOP global (`APP_INTERCEPTOR`) centraliza el cronometraje (`tiempoEjecucion`), extracción de actor (autenticado o anónimo), operación (`Controller.metodo` + método/ruta), parámetros sanitizados, `codigoEstado` y errores, coordinado con `pino-http` como red de seguridad para fallos pre-interceptor (401/403/404) para garantizar **exactamente 1** registro estructurado por solicitud funcional, excluyendo rutas técnicas (`/health/*`, `/metrics`, `/api/docs*`) en nivel estándar.
2. **Aspecto de Auditoría de Negocio (`@AuditarOperacion` → `BUSINESS_AUDIT`)**: un decorador AOP reutilizable (*around advice* en TypeScript con preservación de metadatos `Reflect` para `@Cron` y resolución vía `AuditAspectRegistry` + `AuditContextService` sobre `AsyncLocalStorage`) centraliza medición de tiempo, correlación por `requestId`, clasificación de severidad (`EXITO`/`RECHAZADO`/`OMITIDO`/`FALLIDO`), sanitización y protección fail-safe para los 4 procesos críticos de negocio:
   - Transacciones de tokens (mercado primario y secundario, más creación/cancelación de órdenes de venta) en `OmsService`.
   - Cálculo/recálculo de cotizaciones y cambio de estrategia en `QuotesService` y `QuotesSchedulerService`.
   - Cálculo manual y programado del Team of the Week en `EquipoSemanalService` y `TeamOfTheWeekSchedulerService`.
   - Ejecuciones del scraper (manual, programado/standalone, por liga, recuperación de huérfanas y rechazo por concurrencia) en `ScrapingService` y `WhoScoredPlaywrightService`.
3. **Viabilidad Productiva (Free Tier) y Logger Global Unificado**: enrutamiento de todos los `Logger` preexistentes de `@nestjs/common` hacia Pino vía `app.useLogger(...)` (reemplazando `console.log` en `main.ts`), redacción en doble capa de contraseñas, tokens JWT y credenciales de proxy Webshare.io, cero persistencia de trazas HTTP en Supabase PostgreSQL, cero archivos en disco efímero de Render y supresión total de advertencias de Redis en producción cuando no esté configurado/habilitado (`esRedisHabilitado()`).

---

## Technical Context

**Language/Version**: TypeScript 5.3.3 sobre Node.js 20+ (CI y GitHub Actions fijados en Node 20; runtime local Node 24 compatible).

**Primary Dependencies**:
- Existentes: `@nestjs/common@^11.2.5`, `@nestjs/core@^11.2.5`, `@nestjs/platform-express@^11.2.5`, `@nestjs/schedule@^6.1.3`, `@nestjs/terminus@^11.1.1`, `@willsoto/nestjs-prometheus@^7.0.0`, `typeorm@^0.3.20`, `ioredis@^5.5.0`, `playwright@^1.64.1`.
- Nuevas a incorporar en `backend/package.json`: `nestjs-pino@^4.6.1`, `pino@^9.14.0`, `pino-http@^10.5.0` (dependencies) y `pino-pretty@^13.2.0` (devDependencies).

**Storage**: N/A para auditoría HTTP (emisión exclusiva en `stdout` JSON NDJSON sin archivos locales ni nuevas tablas PostgreSQL; las tablas existentes `transacciones`, `ordenes`, `cotizaciones`, `equipos_semanales` y `ejecuciones_scraping` proveen el respaldo histórico persistente del negocio en Supabase PostgreSQL). Redis L1 cache en desarrollo local y degradación silenciosa sin warnings en producción cuando no está provisionado.

**Testing**: Jest 30 (`ts-jest`), Supertest 6.3, Testcontainers (`@testcontainers/postgresql@^10.7.1`) para integración con PostgreSQL real. Umbral CI actual `>= 75%` global y exigencia constitucional `>= 80%` líneas y branches en todo código nuevo sin reducir coverage global ni modificar tests preexistentes.

**Target Platform**: Linux Server — Render (plan gratuito ~512 MB RAM, CPU compartida, disco efímero) + GitHub Actions (workflow semanal del scraper en Node 20) + Docker Compose local.

**Project Type**: Web-service (Backend NestJS dentro de monorepo `backend/` + `frontend/`; cambios focalizados exclusivamente en `backend/`).

**Performance Goals**: Incremento promedio `< 5 ms` por solicitud web-service (SC-004); `0` registros de ruido técnico de `/health/*`, `/metrics`, `/api/docs*` en nivel `info` (reducción `>= 90%`, SC-005); `0` warnings de Redis no configurado en producción.

**Constraints**:
- Memoria acotada (~512 MB RAM en Render plan gratuito): prohibido `pino-pretty` en producción; límites estrictos de profundidad (5), tamaño de strings (512 chars), ítems de arrays (25) y presupuesto por `parametros` (4 KB).
- Cuota Supabase PostgreSQL (500 MB): prohibido crear tablas de logs HTTP.
- Filesystem efímero en Render: prohibido escribir archivos de log en disco.
- Cero exposición de credenciales (`Authorization`, `Cookie`, `password`, `contrasena`, JWT, `SCRAPING_PROXY_URL`/`USERNAME`/`PASSWORD`) en texto claro (SC-003).
- Compatibilidad Node 20 obligatoria (impide usar `nestjs-pino@5.x` que exige `node >= 22.12.0`).
- Retrocompatibilidad estricta con todos los tests existentes (Política de Inmutabilidad de Tests).

**Scale/Scope**: Backend NestJS de 8 controllers REST funcionales + 2 endpoints de observabilidad/salud + 2 schedulers `@Cron` + 2 scripts standalone (`run-scraper.ts`, `run-sync-players.ts`); ~8.640 sondas mensuales de UptimeRobot filtradas; sin cambios en frontend ni en contratos REST/Postman.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluación Pre-Diseño (Antes de Fase 0)

| Principio Constitucional | Estado | Evidencia / Verificación |
|---|---|---|
| **I. Arquitectura en 5 Capas y Backend Stateless** | PASS | La auditoría se implementa mediante **AOP** en la capa transversal `observability/` (`AuditLoggingInterceptor` como `APP_INTERCEPTOR` + decorador `@AuditarOperacion` sobre métodos de `Service`). No se introduce estado persistente en memoria ni en disco (backend 100% Stateless), ni lógica de negocio en Controllers o Repositories. |
| **II. Rich Domain Model y DDD** | PASS | La capa `domain/` (`src/domain/` y `src/scraping/domain/`) permanece intacta, pura y libre de dependencias de infraestructura o logging. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | PASS | Se planifican tests unitarios aislados para sanitización, configuración Pino, `AuditLoggerService`, aspecto AOP (`@AuditarOperacion` + `AuditAspectRegistry`), `AuditLoggingInterceptor` y política Redis, más tests de integración HTTP (`supertest`) y de servicios de negocio (con PostgreSQL Testcontainers cuando aplica) cubriendo happy paths y edge cases. |
| **IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)** | PASS | Ningún test preexistente será modificado ni eliminado. Gracias al aspecto AOP `@AuditarOperacion` + `AuditAspectRegistry`, los servicios no requieren cambios obligatorios en constructores (haciendo no-op seguro en tests unitarios aislados), los nuevos argumentos en métodos/controllers son opcionales con defaults retrocompatibles, y en `run-scraper.ts` y `HttpExceptionFilter` se protegen llamadas contra mocks parciales de tests existentes. |
| **V. Convenciones de Idioma y Terminología Técnica** | PASS | Documentación, mensajes y nombres de dominio en español sin acentos/ñ (`tiempoEjecucion`, `codigoEstado`, `compradorId`, `vendedorId`, `semanaIso`, `ano`, `esRedisHabilitado`). Términos técnicos y arquitectónicos en inglés (`Controller`, `Service`, `Interceptor`, `Middleware`, `Aspect`, `Around Advice`, `AsyncLocalStorage`, `Stateless`). |
| **VI. Calidad de Testing: Test Coverage Mínimo (>= 80% nuevo)** | PASS | Todos los módulos nuevos de auditoría (`utils/`, `config/`, `aspects/`, `services/`, `interceptors/`, `middleware/`) tendrán tests dedicados superando el 80% de líneas y branches sin disminuir el coverage global del backend. |
| **DoD #3: OpenAPI (Swagger) y Colección Postman** | PASS | Esta feature no altera contratos REST existentes (solo agrega encabezado estándar de correlación `x-request-id`). En la fase de implementación se verificará explícitamente contra Swagger y `postman/` y se documentará el resultado. |

### Re-Evaluación Post-Diseño (Después de Fase 1)

| Verificación Post-Diseño | Estado | Notas de Diseño Verificadas |
|---|---|---|
| Compatibilidad con Node 20 (CI y Scraper GitHub Action) | PASS | Resuelto en `research.md` §1 eligiendo `nestjs-pino@^4.6.1` + `pino@^9.14.0` + `pino-http@^10.5.0`. |
| Reutilización AOP y preservación de metadatos `@Cron` | PASS | `@AuditarOperacion` copia todas las claves `Reflect.getMetadataKeys` del método original hacia el wrapper, preservando `@Cron(...)` y evitando duplicar `Date.now()`/`try-catch`/logging en los 6 servicios. `AuditLoggingInterceptor` se coordina con `pino-http` vía `req.__httpAuditLogged` evitando duplicados en `HTTP_AUDIT`. |
| Cero ruptura en `base-redis-cache.service.spec.ts` y `modules-and-controllers.spec.ts` | PASS | `esRedisHabilitado()` mantiene Redis habilitado en `NODE_ENV=test` y `development`, y solo suprime la inicialización/warnings cuando `NODE_ENV=production` sin `REDIS_URL`/`REDIS_HOST` o cuando `REDIS_ENABLED=false`. |
| Cero ruptura en `run-scraper.spec.ts`, `domain-exception-filter.spec.ts`, `scraping-auditoria-operacion.spec.ts` y `team-of-the-week-scheduler.service.spec.ts` | PASS | Guards defensivos (`typeof app.useLogger === 'function'`, `if (response.locals)`), parámetros opcionales (`@Req() req?: any`, `usuarioId?: string | null`) y resolución no-op del aspecto en tests aislados sin `ObservabilityModule`. |
| Aislamiento fail-safe (FR-011) | PASS | Todos los aspectos, emisores y serializadores envueltos en `try/catch` para jamás interrumpir operaciones de negocio ni respuestas HTTP. |
| Violaciones constitucionales pendientes | **NINGUNA** | No se requieren excepciones en Complexity Tracking. |

---

## Project Structure

### Documentation (this feature)

```text
specs/019-backend-audit-logging/
├── plan.md                                  # Este archivo (/speckit-plan)
├── research.md                              # Decisiones técnicas y análisis de viabilidad (Fase 0)
├── data-model.md                            # Esquemas estructurados de auditoría y políticas (Fase 1)
├── quickstart.md                            # Guía reproducible de validación E2E (Fase 1)
├── contracts/
│   ├── audit-log-events.schema.json         # JSON Schema Draft 2020-12 de eventos HTTP y negocio
│   └── audit-runtime-contract.md            # Contrato de x-request-id, env vars y verificación REST/Postman
├── checklists/
│   └── requirements.md                      # Checklist de calidad de especificación
└── tasks.md                                 # Generado en Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── package.json                                               # [MOD] Agregar nestjs-pino, pino, pino-http y pino-pretty (dev)
├── .env.example                                               # [MOD] Documentar LOG_LEVEL, LOG_PRETTY y REDIS_ENABLED
├── src/
│   ├── main.ts                                                # [MOD] bufferLogs: true, app.useLogger(pinoLogger), reemplazar console.log
│   ├── run-scraper.ts                                         # [MOD] Acoplar logger Pino de forma retrocompatible con mocks
│   ├── run-sync-players.ts                                    # [MOD] Acoplar logger Pino de forma retrocompatible con mocks
│   ├── common/
│   │   └── filters/
│   │       └── http-exception.filter.ts                       # [MOD] Adjuntar resumen de error en response.locals.auditError si existe
│   ├── observability/
│   │   ├── observability.module.ts                            # [MOD] Registrar LoggerModule.forRootAsync, AuditContextService, AuditLoggerService, AuditAspectRegistry (onModuleInit/onModuleDestroy), APP_INTERCEPTOR y AuditContextMiddleware
│   │   ├── aspects/
│   │   │   ├── audit-aspect.registry.ts                       # [NEW] Registro desacoplado de AuditLoggerService y AuditContextService para el aspecto AOP (no-op seguro en tests aislados)
│   │   │   └── auditar-operacion.decorator.ts                 # [NEW] Decorador AOP @AuditarOperacion (around advice reutilizable: cronometraje, correlación, clasificación de errores, fail-safe y preservación de metadatos Reflect/@Cron)
│   │   ├── config/
│   │   │   └── pino-logger.config.ts                          # [NEW] Factory de configuración pino/pino-http (ISO timestamp, redact, genReqId, exclusión técnica + fallback coordinado con AuditLoggingInterceptor)
│   │   ├── constants/
│   │   │   ├── metric-names.constant.ts                       # [EXISTING]
│   │   │   └── audit-events.constant.ts                       # [NEW] Nombres estandarizados de eventos, rutas excluidas y claves sensibles
│   │   ├── interceptors/
│   │   │   └── audit-logging.interceptor.ts                   # [NEW] Aspecto AOP HTTP global (NestInterceptor — around advice para HTTP_AUDIT con tap/catchError y marca req.__httpAuditLogged)
│   │   ├── middleware/
│   │   │   └── audit-context.middleware.ts                    # [NEW] Propaga requestId y metadatos efímeros de operación vía AsyncLocalStorage
│   │   ├── services/
│   │   │   ├── app-metrics.service.ts                         # [EXISTING]
│   │   │   ├── audit-context.service.ts                       # [NEW] Wrapper tipado sobre AsyncLocalStorage<{ requestId, metadatosOperacion }>
│   │   │   └── audit-logger.service.ts                        # [NEW] Emisor fail-safe centralizado para HTTP_AUDIT y BUSINESS_AUDIT sobre nestjs-pino
│   │   ├── types/
│   │   │   ├── observability.types.ts                         # [EXISTING]
│   │   │   └── audit-log.types.ts                             # [NEW] Tipos TypeScript estrictos para HTTP_AUDIT, BUSINESS_AUDIT y OpcionesAspectoAuditoria
│   │   └── utils/
│   │       ├── audit-sanitizer.util.ts                        # [NEW] Sanitizador recursivo, redacción de URLs/Bearer, límites de tamaño/profundidad/circulares
│   │       └── redis-policy.util.ts                           # [NEW] Función pura esRedisHabilitado(env) para política de producción sin Redis
│   ├── health/
│   │   └── indicators/
│   │       └── redis-health.indicator.ts                      # [MOD] Usar esRedisHabilitado() cuando no hay cliente inyectado para evitar warnings en producción sin Redis
│   ├── services/
│   │   ├── base-redis-cache.service.ts                        # [MOD] Usar esRedisHabilitado() para suprimir conexión y warnings en producción sin Redis
│   │   ├── oms.service.ts                                     # [MOD] Aplicar @AuditarOperacion en ejecutarCompraPrimaria, ejecutarCompraSecundaria, crearOrdenVenta y cancelarOrdenVenta
│   │   ├── quotes.service.ts                                  # [MOD] Aplicar @AuditarOperacion en recalcularCotizacionesActivas y cambiarEstrategiaActiva
│   │   ├── equipo-semanal.service.ts                          # [MOD] Aplicar @AuditarOperacion en generarEquipoSemanaActual y generarAutomatico
│   │   └── scheduler/
│   │       ├── quotes-scheduler.service.ts                    # [MOD] Aplicar @AuditarOperacion (preservando @Cron) para omisión por lock y fallos
│   │       └── team-of-the-week-scheduler.service.ts          # [MOD] Aplicar @AuditarOperacion (preservando @Cron) para omisión por lock/existencia y fallos
│   ├── controllers/
│   │   ├── quotes.controller.ts                               # [MOD] Pasar adminId opcional a recalcularCotizacionesManual(adminId)
│   │   └── team-of-the-week.controller.ts                     # [MOD] Pasar adminId opcional a generarEquipoSemanaActual(ahora, adminId)
│   └── scraping/
│       ├── controllers/
│       │   └── scraping.controller.ts                         # [MOD] Pasar usuarioId opcional desde @Req() req? a ejecutarPipeline('manual', usuarioId)
│       └── services/
│           ├── scraping.service.ts                            # [MOD] Aplicar @AuditarOperacion en ejecutarPipeline, procesarLiga, recuperarEjecucionesAtascadas y resolverEjecucionEnProgreso (RECUPERACION_ATASCADA)
│           └── whoscored-playwright.service.ts                # [MOD] Sanitizar URL de proxy y mensajes de error antes de loggear
└── test/
    ├── unit/
    │   └── observability/
    │       ├── audit-sanitizer.spec.ts                        # [NEW] Pruebas exhaustivas de redacción, proxies, circulares y truncamiento
    │       ├── pino-logger.config.spec.ts                     # [NEW] Pruebas de config por entorno, rutas ignoradas, niveles, ISO timestamp y reqId
    │       ├── audit-logger.service.spec.ts                   # [NEW] Pruebas de emisión HTTP_AUDIT / BUSINESS_AUDIT, correlación y resiliencia fail-safe
    │       ├── auditar-operacion.decorator.spec.ts            # [NEW] Pruebas del aspecto AOP @AuditarOperacion (around advice, preservación Reflect/@Cron, errores, no-op sin registro y fail-safe)
    │       ├── audit-logging.interceptor.spec.ts              # [NEW] Pruebas del aspecto AOP HTTP (éxito, errores 4xx/5xx, rutas excluidas, bandera anti-duplicado y tiempoEjecucion)
    │       └── redis-policy.spec.ts                           # [NEW] Pruebas de supresión en producción sin Redis vs dev/test/explícito
    └── integration/
        └── observability/
            ├── http-audit-logging.integration.spec.ts         # [NEW] Pruebas HTTP E2E con Supertest verificando exactamente 1 registro HTTP_AUDIT (interceptor + fallback 401/403/404), redacción, exclusión /health & /metrics y tiempoEjecucion
            └── business-audit-logging.integration.spec.ts     # [NEW] Pruebas de integración del aspecto @AuditarOperacion en OMS, Quotes, TOTW y Scraping (incluyendo Testcontainers PostgreSQL)
```

**Structure Decision**: Se adopta la estructura existente del monorepo web (`backend/` + `frontend/`), concentrando todos los componentes transversales y aspectos AOP (`AuditLoggingInterceptor`, `@AuditarOperacion`, `AuditAspectRegistry`, `AuditContextService`, `AuditLoggerService`) dentro de `backend/src/observability/` como módulo `@Global()` (coherente con `017-backend-observability`). Los servicios de aplicación únicamente declaran el decorador `@AuditarOperacion(...)`, eliminando código de logging repetitivo y evitando cambios en constructores. No se modifican archivos en `frontend/`, `backend/src/domain/`, `backend/src/migrations/` ni ningún test preexistente en `backend/test/`.

---

## Complexity Tracking

> No se detectaron violaciones a la Constitución; no se requieren justificaciones de complejidad adicionales.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *Ninguna* | *N/A* | *N/A* |
