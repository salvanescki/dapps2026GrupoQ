# Implementation Plan: Estandarización de Estrategia de Testing por Perfiles (Backend y Frontend)

**Branch**: `007-standardize-testing-profiles` | **Date**: 2026-10-13 | **Spec**: [spec.md](file:///home/nikkoros/dev/dapps2026GrupoQ/specs/007-standardize-testing-profiles/spec.md)

**Input**: Feature specification from `/specs/007-standardize-testing-profiles/spec.md`

## Summary

Estandarizar y segregar la suite de pruebas del backend y del frontend en tres perfiles independientes y reproducibles: **Unitario** (`unit`), **Integración** (`integration`) y **End-to-End** (`e2e`). La solución técnica articula configuraciones dedicadas de Jest en el backend (`jest-unit.json`, `jest-integration.json`, `jest-e2e.json`) y configuraciones dedicadas de Vitest en el frontend (`vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.e2e.config.ts`), con generación de métricas de cobertura aisladas en subdirectorios (`coverage/unit`, `coverage/integration`, `coverage/e2e`) compatibles con SonarQube Cloud, y etapas explícitas en el pipeline de GitHub Actions para garantizar diagnóstico inmediato de fallos sin violar la política estricta de inmutabilidad de tests preexistentes.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20 LTS  
**Primary Dependencies**:
- Backend: NestJS 11 (`@nestjs/core`, `@nestjs/testing`), TypeORM 0.3, Testcontainers PostgreSQL 10.7, Supertest 6.3, Jest 30.5
- Frontend: React 18, React Router 7, Vite 6, Vitest 4.1, Testing Library 16.1 (`@testing-library/react`, `@testing-library/user-event`), JSDOM 25  
**Storage**: PostgreSQL 16 (provisionado mediante Testcontainers para perfiles `integration` y `e2e` en backend)  
**Testing**: Jest (runner de backend) y Vitest (runner de frontend) con configuraciones y comandos por perfil  
**Target Platform**: Linux (Ubuntu 22.04/24.04), Node.js 20 LTS, Docker Engine (para contenedores de prueba)  
**Project Type**: Web application (Fullstack: NestJS REST API backend + React SPA frontend)  
**Performance Goals**:
- Perfil unitario: < 10 segundos en backend, < 5 segundos en frontend (total < 15s)
- Perfil de integración: < 45 segundos con ciclo de vida de Testcontainers
- Perfil E2E: < 45 segundos para flujos críticos de autenticación y catálogo  
**Constraints**:
- **Inmutabilidad estricta (Principio IV)**: 100% de los tests preexistentes deben mantenerse activos e inmutados sin debilitar aserciones.
- **Aislamiento unitario (Principio III y FR-004)**: Pruebas unitarias sin acceso a red, Docker o persistencia externa.
- **Transparencia en CI (FR-009 y SC-005)**: Etapas separadas por perfil en GitHub Actions para diagnóstico inmediato.
- **Cobertura no destructiva (FR-008)**: Rutas LCOV segregadas por perfil y agregadas en `sonar-project.properties`.  
**Scale/Scope**: 2 subproyectos (`backend` y `frontend`), 3 perfiles cada uno (`unit`, `integration`, `e2e`), integración continua en `.github/workflows/ci.yml`, análisis de calidad en `sonar-project.properties`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio I (Arquitectura en 5 Capas y Backend Stateless)**: **PASS**. La segregación de perfiles mapea directamente a las 5 capas: `unit` evalúa Model/Dominio, `integration` evalúa Services y Data Access (Repositories), y `e2e` evalúa Controllers/HTTP endpoints montados contra la aplicación.
- **Principio II (Rich Domain Model y DDD)**: **PASS**. El perfil unitario valida exclusivamente las invariantes de negocio y lógica de las entidades ricas (`Jugador`, `Usuario`, etc.) en memoria sin base de datos ni objetos anémicos.
- **Principio III (Estrategia de Testing Rigurosa y Testcontainers)**: **PASS**. Se cumple y formaliza plenamente: pruebas unitarias para dominio en aislamiento total, pruebas de integración con Testcontainers para Services y Repositories, y pruebas E2E complementarias para flujos críticos.
- **Principio IV (Política Estricta de Inmutabilidad de Tests - NON-NEGOTIABLE)**: **PASS**. Ningún test preexistente será modificado ni eliminado. Los tests actuales se preservan íntegros y son asignados a sus respectivos perfiles o referenciados de manera retrocompatible.
- **Principio V (Convenciones de Idioma y Terminología Técnica)**: **PASS**. Documentación, especificaciones y comentarios en español; términos normativos y nombres arquitectónicos en inglés (`unit`, `integration`, `e2e`, `Testcontainers`, `LCOV`).
- **Definición de Terminado (DoD)**: **PASS**. El plan garantiza que todas las suites de tests pasen exitosamente, la compilación de ambos proyectos sea limpia y se mantenga la integridad operativa local y en CI.

## Project Structure

### Documentation (this feature)

```text
specs/007-standardize-testing-profiles/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technology decisions & profile segregation analysis
├── data-model.md        # Phase 1: Conceptual entities & test lifecycle models
├── quickstart.md        # Phase 1: Quickstart validation scenarios
├── contracts/           # Phase 1: CLI and CI interface contracts
│   └── testing-profiles-contract.md
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2: Tasks (generated by /speckit-tasks)
```

### Source Code Layout

```text
backend/
├── jest.config.js                        # Configuración global / retrocompatible
├── package.json                          # Scripts: test:unit, test:integration, test:e2e, test:all
├── src/
│   ├── domain/                           # Cobertura de perfil unitario
│   ├── services/                         # Cobertura de perfil integración
│   ├── data-access/                      # Cobertura de perfil integración
│   └── controllers/                      # Cobertura de perfil E2E
└── test/
    ├── jest-unit.json                    # Configuración Jest perfil unitario
    ├── jest-integration.json             # Configuración Jest perfil integración (servicios/repos)
    ├── jest-e2e.json                     # Configuración Jest perfil E2E (HTTP/Supertest)
    ├── unit/                             # Tests unitarios de dominio
    │   └── domain/
    ├── integration/                      # Tests de integración con Testcontainers
    └── e2e/                              # Tests E2E de flujos de endpoints completos

frontend/
├── package.json                          # Scripts: test:unit, test:integration, test:e2e, test:all
├── vite.config.ts                        # Configuración global de Vite/Vitest
├── vitest.unit.config.ts                 # Configuración Vitest perfil unitario
├── vitest.integration.config.ts          # Configuración Vitest perfil integración
├── vitest.e2e.config.ts                  # Configuración Vitest perfil E2E
├── src/
└── tests/
    ├── unit/                             # Tests de lógica pura, storage y validaciones
    ├── integration/                      # Tests de integración de componentes y rutas
    ├── views/                            # Tests de integración de vistas de catálogo
    └── e2e/                              # Tests de flujos integrales de usuario (auth + catálogo)

.github/
└── workflows/
    └── ci.yml                            # Pipeline de CI con pasos diferenciados por perfil

sonar-project.properties                  # Inclusión agregada de rutas LCOV por perfil
```

**Structure Decision**: Se mantiene la estructura dual existente (`backend` y `frontend`) agregando las configuraciones por perfil sin alterar la jerarquía de código fuente de producción. En backend se introducen `jest-e2e.json` y la carpeta `test/e2e/`, mientras en frontend se incorporan configuraciones de Vitest modulares y la carpeta `tests/e2e/`.

## Complexity Tracking

> No violations of Constitution principles detected. No justified exceptions required.
