# Implementation Plan: Backend Observability, Domain Metrics & Health Checks

**Branch**: `017-backend-observability` | **Date**: 2026-11-16 | **Spec**: [specs/017-backend-observability/spec.md](spec.md)

**Input**: Feature specification from `/specs/017-backend-observability/spec.md`, hallazgos de investigación en `research.md`, modelo de datos en `data-model.md` y contrato OpenAPI en `contracts/openapi-observability.yaml`.

## Summary

Implementar un ecosistema integral y desacoplado de observabilidad, métricas de dominio y sondas de salud en el backend de NestJS utilizando `@willsoto/nestjs-prometheus`, `prom-client` y `@nestjs/terminus`:
1. **Endpoint de Métricas Prometheus (`GET /metrics`)**:
   - Exposición de métricas de runtime por defecto (CPU, memoria, event loop lag, descriptores de archivos).
   - Métricas de dominio de Trading / OMS: contadores de órdenes, transacciones y volumen en centavos, histograma de latencia de liquidación con locks pesimistas, contador de rechazos por slippage y gauge de órdenes de venta activas.
   - Métricas de Cotizaciones / Pricing: contador de recálculos, histograma de duración, contador de jugadores evaluados (procesados, sin estadísticas, fallidos) y gauge de estrategia activa.
   - Métricas de Scraping WhoScored / Playwright: ejecuciones por estado, histograma de duración por liga, gauge de tasa de asociación y contador de incidentes.
   - Métricas de Infraestructura, Seguridad y Soporte: peticiones y rate limit de Football-Data.org, generación de Team of the Week, aciertos/fallos y degradaciones de caché Redis L1, e intentos de autenticación y latencia de hashing bcrypt.
2. **Sondas de Salud Estandarizadas (Health Checks)**:
   - **Readiness Probe (`GET /health/ready`)**: Verificación de PostgreSQL (TypeORM), Redis (Ping L1) y accesibilidad de la API externa Football-Data.org, respondiendo 200 OK únicamente cuando todas las dependencias estén operativas (503 Service Unavailable ante degradación).
   - **Liveness Probe (`GET /health/live`)**: Detección de estados irrecuperables y fugas de memoria (Playwright/Chromium) mediante verificación de umbrales: Heap < 300 MB y RSS < 1 GB.
3. **Resiliencia, Desacoplamiento y Retrocompatibilidad (Principio IV)**:
   - Centralización de telemetría en `AppMetricsService` con captura interna de errores (`try/catch`), garantizando que ningún fallo en métricas impacte las transacciones de negocio.
   - Inyección `@Optional()` de `AppMetricsService` en los servicios preexistentes (`OmsService`, `QuotesService`, `AuthService`, etc.), garantizando la inmutabilidad de los tests existentes que instancian servicios directamente mediante `new Service(...)`.
4. **Documentación OpenAPI y Sincronización de Postman**:
   - Integración completa con Swagger OpenAPI y adición de la carpeta "Observabilidad" en `postman/collection.json`.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (Node v24.21.0 disponible en entorno)  
**Primary Dependencies**: NestJS 11.x, `@willsoto/nestjs-prometheus` (^6.x), `prom-client` (^15.x), `@nestjs/terminus` (^11.x), `@nestjs/swagger`, `typeorm` (0.3.x), `ioredis` (5.x)  
**Storage**: PostgreSQL 16 (persistencia relacional del backend), Redis (caché L1); las métricas residen en memoria en el registro Prometheus (`prom-client`) y son expuestas vía HTTP  
**Testing**: Jest (Unit testing para `AppMetricsService` e indicadores de salud), Testcontainers con PostgreSQL dinámico (Integration testing para `HealthController` y `MetricsController`)  
**Target Platform**: Linux Server / Docker Container (orquestación Kubernetes/Docker Compose)  
**Project Type**: Web Service API REST (arquitectura desacoplada en 5 capas)  
**Performance Goals**: Endpoint `/metrics` responde en $<2$ s bajo carga; sondas de health check responden en $<1$ s con timeouts configurables (2-3 s máx); recolección de métricas introduce sobrecarga $<5$ ms en operaciones de negocio  
**Constraints**: Inmutabilidad estricta de tests existentes (Principio IV); cobertura mínima de pruebas $\ge 80\%$ en líneas y branches (Principio VI); aislamiento total ante fallos de recolección (FR-024)  
**Scale/Scope**: Telemetría sobre ~2.500 jugadores, catálogo completo de ligas (PL, PD, SA, BL1, FL1), cientos de órdenes concurrentes y scraping periódico  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Evidencia y Justificación Técnica |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas y Stateless** | **PASA** | `HealthController` y `PrometheusController` actúan estrictamente como adaptadores HTTP / pasamanos sin lógica de negocio. `HealthCheckService` y `AppMetricsService` encapsulan los diagnósticos y la telemetría. El backend permanece 100% Stateless. |
| **II. Rich Domain Model y DDD** | **PASA** | La observabilidad es una capacidad transversal de infraestructura y orquestación. Los modelos y entidades de dominio ricos (`Dinero`, `Orden`, `Cotizacion`, `Usuario`) no se alteran ni degradan a modelos anémicos. |
| **III. Estrategia de Testing y Testcontainers** | **PASA** | Tests unitarios puros para `AppMetricsService` y los health indicators con dobles de prueba aislados. Tests de integración para `HealthController` y `MetricsController` sobre PostgreSQL real mediante Testcontainers (`MarketplaceTestDatabaseHelper` / `TestDatabaseHelper`). |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASA** | Ningún test preexistente se modifica ni elimina. La inyección de `AppMetricsService` en `OmsService`, `QuotesService`, `AuthService`, etc. se realiza mediante `@Optional()`, permitiendo que todos los tests existentes que invocan `new Service(...)` funcionen sin cambios. |
| **V. Convenciones de Idioma y Terminología** | **PASA** | Las dimensiones y valores de dominio de métricas utilizan español (`compra`, `venta`, `primario`, `secundario`, `procesados`, `sin_estadisticas`); los términos técnicos y patrones de arquitectura se expresan en inglés (`Controller`, `Service`, `HealthCheck`, `Counter`, `Gauge`, `Histogram`). |
| **VI. Calidad de Testing: Test Coverage Mínimo** | **PASA** | Todo el código nuevo en `src/observability/` y `src/health/` contará con una suite completa de pruebas unitarias y de integración que superará el umbral mínimo exigido del 80% en líneas y branches. |
| **Definition of Done (DoD) & Postman** | **PASA** | Contratos OpenAPI documentados en `contracts/openapi-observability.yaml` y decoradores Swagger en los controladores. La colección de Postman (`postman/collection.json`) se actualizará con los nuevos endpoints y sus assertions de validación. |

---

## Project Structure

### Documentation (this feature)

```text
specs/017-backend-observability/
├── plan.md              # Este plan de implementación (/speckit-plan)
├── research.md          # Hallazgos técnicos y decisiones de diseño (Phase 0)
├── data-model.md        # Modelos de datos de telemetría y sondas de salud (Phase 1)
├── quickstart.md        # Guía de validación y escenarios de prueba (Phase 1)
├── contracts/           # Contratos de interfaz externa (Phase 1)
│   └── openapi-observability.yaml
└── checklists/          # Checklists de requerimientos y calidad
    └── requirements.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.module.ts                                # Importación de ObservabilityModule y HealthModule
│   ├── observability/
│   │   ├── observability.module.ts                 # Módulo de métricas Prometheus y registro
│   │   ├── services/
│   │   │   └── app-metrics.service.ts              # Servicio centralizado de métricas fuertemente tipado
│   │   └── constants/
│   │       └── metric-names.constant.ts            # Nombres canónicos de métricas y labels
│   ├── health/
│   │   ├── health.module.ts                        # Módulo Terminus para sondas
│   │   ├── health.controller.ts                    # Endpoints GET /health/ready y GET /health/live
│   │   └── indicators/
│   │       ├── redis-health.indicator.ts           # Indicador de salud de Redis (ping L1)
│   │       └── football-data-health.indicator.ts   # Indicador de salud de Football-Data.org
│   └── services/
│       ├── oms.service.ts                          # Instrumentación opcional de métricas de trading
│       ├── quotes.service.ts                       # Instrumentación opcional de cotizaciones
│       ├── auth.service.ts                         # Instrumentación opcional de auth
│       ├── base-redis-cache.service.ts             # Instrumentación opcional de hits/misses de caché
│       ├── clients/
│       │   └── football-data.client.ts             # Instrumentación opcional de peticiones y rate limit
│       ├── scheduler/
│       │   ├── quotes-scheduler.service.ts         # Instrumentación de recálculo programado
│       │   └── team-of-the-week-scheduler.service.ts # Instrumentación de TOTW
│       └── scraping/
│           └── services/
│               └── scraping.service.ts             # Instrumentación de scraping WhoScored
├── test/
│   ├── unit/
│   │   └── observability/
│   │       ├── app-metrics.service.spec.ts         # Tests unitarios de métricas y resiliencia
│   │       ├── redis-health.indicator.spec.ts      # Tests unitarios de indicador Redis
│   │       └── football-data-health.indicator.spec.ts # Tests unitarios de indicador Football-Data
│   └── integration/
│       └── observability/
│           ├── health.controller.spec.ts           # Tests de integración para sondas de salud
│           └── metrics.controller.spec.ts          # Tests de integración para endpoint /metrics
└── postman/
    └── collection.json                             # Sincronización de colección con carpeta "Observabilidad"
```

**Structure Decision**: Se adopta una arquitectura modular limpia con dos módulos desacoplados: `ObservabilityModule` (encargado del registro de Prometheus, configuración de `@willsoto/nestjs-prometheus` y el servicio `AppMetricsService`) y `HealthModule` (encargado del `HealthController` con `@nestjs/terminus` e indicadores de conectividad y memoria). Los servicios existentes reciben `AppMetricsService` como dependencia `@Optional()`, asegurando que no haya acoplamiento duro ni regresión en ningún test preexistente.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No existen violaciones a la Constitución. La arquitectura en 5 capas, DDD, inmutabilidad de tests preexistentes y cobertura mínima de pruebas se respetan plenamente.*
