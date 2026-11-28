# Implementation Plan: Remediación Integral de los 49 Issues Abiertos en SonarQube Cloud

**Branch**: `020-remediate-sonarcloud-issues` | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-remediate-sonarcloud-issues/spec.md`

## Summary

Remediar de forma integral los **49 issues abiertos** reportados por SonarQube Cloud (`salvanescki_dapps2026GrupoQ`, 17 reglas activas: **6 `CRITICAL`**, **8 `MAJOR`**, **35 `MINOR`**; **26** en `backend` y **23** en `frontend`; 337 minutos de deuda técnica) llevando el conteo a **0 hallazgos abiertos** sin regresiones funcionales ni cambios en contratos públicos REST/DB. El enfoque técnico (detallado en [research.md](research.md)) descompone las 6 funciones con complejidad cognitiva > 15 (`typescript:S3776`) en helpers puros cohesivos dentro de sus mismas capas, elimina los 5 patrones de retroceso superlineal (`typescript:S8786`) mediante cuantificadores acotados y escáneres lineales O(n), fortalece la inmutabilidad en las entidades `EquipoSemanal` (`typescript:S4043` compatible con `ES2021`) y `EstadisticaJugador` (`typescript:S2933` encapsulando métricas bajo `private readonly _metricas`), centraliza la serialización segura de valores desconocidos en auditoría (`typescript:S6551`), alinea contratos `async` en `HealthController`/`MetricsController` (`typescript:S7503`), aplica higiene expresiva y tipado estricto en ambos módulos, protege la cobertura ≥ 80% con suites unitarias aditivas y resguarda bajo compuerta explícita de autorización del usuario (Principio IV) el único ajuste de aserción ubicado en una prueba existente (`typescript:S5906`).

## Technical Context

**Language/Version**: TypeScript `^5.3.3` (`target: ES2021`, `strictNullChecks: false`) en `backend`; TypeScript `~5.6.0` (`target: ES2022`, `strict: true`) en `frontend`; Node.js `20+`.

**Primary Dependencies**:
- `backend`: NestJS `^11.2.5`, `@nestjs/swagger ^11.4.7`, `@nestjs/terminus ^11.1.1`, `@willsoto/nestjs-prometheus ^7.0.0`, `prom-client ^15.1.3`, `nestjs-pino ^4.6.1`, `pino ^9.14.0`, TypeORM `^0.3.20`, `ioredis ^5.5.0`.
- `frontend`: React `^18.3.1`, React Router `^7.18.4`, Vite `^6.0.0`, Recharts `^2.15.4`, Zod `^4.6.5`.

**Storage**: PostgreSQL (relacional A.C.I.D.) + Redis (L1 Cache) — **sin modificaciones de esquema, tablas ni migraciones** en esta feature.

**Testing**:
- `backend`: Jest `^30.5.2` + `ts-jest` (tests unitarios de dominio/utilidades aislados y tests de integración/E2E con `@testcontainers/postgresql ^10.7.1`).
- `frontend`: Vitest `^4.1.11` + `@vitest/coverage-v8` + Testing Library + `jsdom` (tests unitarios, integración y E2E).

**Target Platform**: Linux server / Docker (backend NestJS Stateless) y navegador web moderno (frontend SPA React/Vite).

**Project Type**: Web application full-stack (`backend/` + `frontend/`).

**Performance Goals**: Tiempo de ejecución estrictamente lineal O(n) en los 5 puntos de sanitización de auditoría y parseo de observabilidad/Prometheus remediados (`typescript:S8786`), sin degradación ante entradas extensas o malformadas.

**Constraints**:
- Cero cambios de contrato externo REST, Swagger/OpenAPI o colección Postman (`postman/football_tokens_auth.postman_collection.json`).
- Compatibilidad estricta con `target: ES2021` en `backend/tsconfig.json` (sin usar `Array.prototype.toSorted`).
- Cobertura independiente **≥ 80% en líneas y ≥ 80% en bifurcaciones** tanto en `backend` como en `frontend`, y **≥ 80%** en todo código nuevo sin reducir umbrales vigentes (Principio VI).
- Inmutabilidad estricta de pruebas existentes para los 48 hallazgos de producción y autorización `"sí"` explícita del usuario antes de tocar `backend/test/unit/observability/audit-sanitizer.spec.ts` L74 (Principio IV).
- Seguridad de credenciales: `SONARQUBE_TOKEN` nunca en archivos versionados.

**Scale/Scope**: 49 issues abiertos en 17 reglas de SonarQube Cloud distribuidos en 19 archivos exactos (12 de producción + 1 de prueba en `backend`; 6 de producción en `frontend`), más 2 archivos nuevos de pruebas unitarias aditivas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluación Pre-Phase 0 y Re-evaluación Post-Phase 1

| Principio / Criterio Constitucional | Estado Pre-Phase 0 | Estado Post-Phase 1 | Evidencia y Decisión Técnica |
| --- | --- | --- | --- |
| **I. Arquitectura en 5 Capas y Backend Stateless** | PASS | PASS | Todos los helpers extraídos (`S3776`, `S6551`, `S8786`) permanecen dentro de su propia capa y módulo (`observability/utils`, `observability/services`, `frontend/src/api`, `frontend/src/hooks`, `frontend/src/utils`). Los cambios en `HealthController` y `MetricsController` (`S7503`) solo remueven `async` redundante; los `Controller` siguen siendo adaptadores puros sin lógica de negocio y el `backend` permanece 100% `Stateless`. |
| **II. Rich Domain Model y DDD** | PASS | PASS | Las remediaciones en `EquipoSemanal` (`S4043`: ordenamiento no mutante en sentencia separada) y `EstadisticaJugador` (`S2933`: encapsulación tipada de 25 métricas en `private readonly _metricas` eliminando cast `as unknown as Record<string, unknown>`) refuerzan el `Rich Domain Model` manteniendo intactas todas las invariantes y reglas de negocio dentro de la capa `Model`. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | PASS | PASS | Se conservan y ejecutan las suites unitarias aisladas, de integración y E2E con Testcontainers PostgreSQL en `backend` y las suites unitarias/integración/E2E en `frontend`. Se incorporan suites unitarias aditivas cubriendo *happy paths* y *edge cases* (anti-ReDoS, objetos circulares, `intervaloInicial: 0`, mensajes `MB`/`GB`). |
| **IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)** | CONDITIONAL GATE | PASS (GATED) | Los 48 issues en código de producción se remedian con **0 ediciones** a pruebas existentes. El único issue ubicado en un archivo de prueba (`typescript:S5906` en `backend/test/unit/observability/audit-sanitizer.spec.ts:74`) queda documentado y bloqueado en la tabla de *Complexity Tracking / Gate Exceptions* para exigir confirmación explícita `"sí"` del usuario antes de aplicar la edición en `speckit-implement` (verificando además el mismo contrato exacto de longitud `700`). |
| **V. Convenciones de Idioma y Terminología Técnica** | PASS | PASS | Documentación, comentarios y mensajes de error en español; identificadores de dominio/helpers en español sin acentos ni `'ñ'` (ej.: `convertirValorATextoSeguro`, `redactarCredencialUrlSinParser`, `parsearLabelsPrometheus`, `inicializarMetricasTrading`); términos técnicos normativos en inglés (`Controller`, `Service`, `Repository`, `Stateless`, `Testcontainers`, `Rich Domain Model`). |
| **VI. Calidad de Testing: Test Coverage Mínimo (≥ 80% independiente)** | PASS | PASS | Se exige verificación independiente de `lines >= 80%` y `branches >= 80%` en `backend` (`npm run test:cov`) y `frontend` (`npm run test:coverage`), más ≥ 80% en el código nuevo mediante pruebas unitarias aditivas, sin bajar umbrales de CI (*ratchet effect*). |
| **DoD #1, #2 y #3 (Tests, Compilación/Despliegue y Postman/Swagger)** | PASS | PASS | `quickstart.md` y `contracts/observability-endpoints-preservation.md` cubren compilación (`nest build`, `tsc -b && vite build`), ejecución completa de tests por stack y verificación documentada de sincronización entre Swagger/OpenAPI y `postman/football_tokens_auth.postman_collection.json` (sin cambios de contrato API). |

## Project Structure

### Documentation (this feature)

```text
specs/020-remediate-sonarcloud-issues/
├── plan.md                                             # Este plan (/speckit-plan)
├── research.md                                         # Phase 0: análisis y patrones exactos por regla/archivo
├── data-model.md                                       # Phase 1: refinamiento interno de dominio y tipos
├── quickstart.md                                       # Phase 1: guía ejecutable de validación y cobertura
├── contracts/
│   └── observability-endpoints-preservation.md         # Phase 1: verificación de preservación REST/Swagger/Postman
└── tasks.md                                            # Phase 2 (/speckit-tasks - no creado en esta fase)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   └── equipo-semanal.entity.ts                    # S4043 (L177)
│   ├── scraping/
│   │   └── domain/
│   │       └── estadistica-jugador.entity.ts           # S2933 (L72)
│   ├── health/
│   │   └── health.controller.ts                        # S7503 (L39, L62)
│   └── observability/
│       ├── aspects/
│       │   └── auditar-operacion.decorator.ts          # S7772 (L2), S6551 (L107)
│       ├── config/
│       │   └── pino-logger.config.ts                   # S7772 (L1, L2), S6551 (L76, L81, L83, L84)
│       ├── constants/
│       │   └── audit-events.constant.ts                # S8786 (L75), S5869 (L77)
│       ├── controllers/
│       │   └── metrics.controller.ts                   # S7503 (L23)
│       ├── interceptors/
│       │   └── audit-logging.interceptor.ts            # S7772 (L9), S6551 (L154, L179)
│       ├── services/
│       │   ├── app-metrics.service.ts                  # S6582 (L72), S3776 (L232)
│       │   ├── audit-context.service.ts                # S7772 (L2)
│       │   └── audit-logger.service.ts                 # S6606 (L80-82)
│       └── utils/
│           └── audit-sanitizer.util.ts                 # S8786 (L61), S3776 (L70), S6551 (L171) + helpers seguros
└── test/
    └── unit/
        └── observability/
            ├── audit-sanitizer.spec.ts                 # S5906 (L74) — COMPLEMENTARIO, CONDICIONADO A PRINCIPIO IV
            └── audit-sanitizer-remediation.spec.ts     # NUEVO: tests unitarios aditivos (cobertura ≥ 80% código nuevo)

frontend/
├── src/
│   ├── api/
│   │   └── observabilityApi.ts                         # S3776 (L122), S7744 (L129 x2), S8786 (L136, L147), S7773 (L138, L149)
│   ├── hooks/
│   │   └── useObservability.ts                         # S6606 (L20, L27), S3776 (L44)
│   ├── types/
│   │   └── observability.types.ts                      # S6571 (L52 x2)
│   └── utils/
│       ├── formato-observabilidad.ts                   # S7773 (L17, L21 x2), S3776 (L78)
│       ├── navegacion.ts                               # S7778 (L39)
│       └── prometheus-parser.ts                        # S3776 (L13), S6582 (L14), S6353 (L49, L63), S6594 (L49), S8786 (L63)
└── tests/
    └── unit/
        └── utils/
            └── observability-remediation.test.ts       # NUEVO: tests unitarios aditivos (cobertura ≥ 80% código nuevo)

postman/
└── football_tokens_auth.postman_collection.json        # Verificado sin cambios de contrato (DoD #3)
```

**Structure Decision**: Se preserva íntegramente la estructura monorepo existente de aplicación web en 2 stacks independientes (`backend/` con arquitectura en 5 capas NestJS/TypeScript y `frontend/` React/Vite/TypeScript). No se crean módulos, controladores, tablas ni rutas nuevas; únicamente se refactorizan los 18 archivos de producción en alcance, se agregan 2 archivos de pruebas unitarias aditivas para cubrir los helpers y casos límite nuevos, y se resguarda la edición condicional de 1 línea en `backend/test/unit/observability/audit-sanitizer.spec.ts` bajo la compuerta del Principio IV.

## Complexity Tracking

> **Registro explícito de la compuerta constitucional aplicable al Principio IV**

| Gate / Exception | Why Needed | Safeguard & Alternative if Denied |
| --- | --- | --- |
| **Principio IV — Compuerta condicionada en 1 línea de test existente** (`backend/test/unit/observability/audit-sanitizer.spec.ts:74`, regla `typescript:S5906`) | 1 de los 49 issues abiertos confirmados en el alcance por el usuario reside dentro de una aserción existente (`expect(sanitizarTexto(largo, false).length).toBe(700)` → `.toHaveLength(700)`). Sin resolverlo en el archivo o administrativamente en SonarQube Cloud, el conteo de issues abiertos quedaría en 1 en lugar de 0. | **Compuerta obligatoria**: Ninguna tarea puede modificar `audit-sanitizer.spec.ts` automáticamente sin solicitar y recibir un `"sí"` explícito del usuario en la fase de implementación (`speckit-implement`). La aserción preserva idéntico contrato de verificación (`700`). Si el usuario declina la autorización, el archivo de prueba permanece inalterado (48/49 en código) y el hallazgo se deja documentado para cierre administrativo opcional en SonarQube Cloud respetando la supremacía absoluta del Principio IV. |
