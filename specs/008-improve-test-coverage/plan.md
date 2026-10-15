# Implementation Plan: Mejora de Cobertura de Tests (Frontend y Backend >= 80%)

**Branch**: `008-improve-test-coverage` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-improve-test-coverage/spec.md`

## Summary

Incrementar la cobertura de tests de líneas y de bifurcaciones (branches) en backend y frontend hasta superar de forma independiente el umbral mínimo del 80% estipulado en el Principio VI de la Constitución. La estrategia se basa en:
1. Configuración de umbrales automáticos (`coverageThreshold` en Jest y `coverage.thresholds` en Vitest v8) con efecto trinquete (*ratchet*).
2. Enriquecimiento de pruebas unitarias en aislamiento para el dominio (Model) y pruebas de integración con Testcontainers (PostgreSQL real) para Services y Repositories en Backend.
3. Incorporación de pruebas con Testing Library y Vitest para componentes UI, hooks personalizados, servicios de API y flujos de usuario en Frontend.
4. Respeto estricto del Principio IV (inmutabilidad de tests existentes) y Principio I (5 capas).

## Technical Context

**Language/Version**: TypeScript 5.3+ (Backend: TS 5.3.3, Frontend: TS 5.6.0), Node.js >= 20.x  
**Primary Dependencies**: 
- Backend: NestJS 11, TypeORM 0.3.20, PostgreSQL driver (`pg`), Passport/JWT, Testcontainers 10.7.1  
- Frontend: React 18.3.1, React Router 7, Zod 4.6.5, Testing Library (React 16.1.0, user-event 14.5.2, jest-dom 6.6.3)  
**Storage**: PostgreSQL 16 (persistencia primaria validada mediante Testcontainers en tests de integración)  
**Testing**: 
- Backend: Jest 30.5.2, `ts-jest`, Supertest, Testcontainers (`@testcontainers/postgresql`)  
- Frontend: Vitest 4.1.11, `@vitest/coverage-v8`, jsdom 25.0.1  
**Target Platform**: Linux / Cross-platform CI/CD  
**Project Type**: Monorepo Web Application (Backend NestJS + Frontend React)  
**Performance Goals**: Ejecución de suites de prueba de backend en < 30s e interfaz frontend en < 10s  
**Constraints**: 
- Inmutabilidad absoluta de tests existentes (Principio IV de la Constitución)  
- Mínimo 80% de líneas y 80% de branches por stack de forma independiente (Principio VI)  
- Prohibido modificar código de producción sin autorización previa explícita  
**Scale/Scope**: ~15 archivos con brechas de cobertura en backend y frontend  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación / Mecanismo de Cumplimiento |
|---|---|---|
| **I. Arquitectura en 5 Capas y Backend Stateless** | **PASSED** | Los nuevos tests backend respetan la separación estricta: tests de dominio en aislamiento sin DB; tests de Services y Repositories de integración; Controllers testeados sin lógica de negocio. |
| **II. Rich Domain Model y DDD** | **PASSED** | Los tests unitarios de dominio se concentran en las invariantes, cálculos y comportamiento de las entidades (`Jugador`, `Liga`, `Usuario`, `Equipo`). |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | **PASSED** | Toda prueba de integración para Services y Repositories utiliza instancias reales de PostgreSQL provisionadas con Testcontainers. No se usan mocks de base de datos ni SQLite. |
| **IV. Política Estricta de Inmutabilidad de Tests** | **PASSED** | El 100% de los tests preexistentes en `backend/test` y `frontend/tests` permanecen sin cambios. Ningún test existente es modificado ni eliminado. |
| **V. Convenciones de Idioma y Terminología Técnica** | **PASSED** | Documentación, nombres de variables de dominio y mensajes en español sin tildes ni 'ñ'; términos técnicos y arquitectónicos en inglés. |
| **VI. Calidad de Testing: Test Coverage Mínimo** | **PASSED** | Se configuran umbrales de 80% en líneas y 80% en branches para backend y frontend de manera independiente, con enforcement en la ejecución de los runners. |

## Project Structure

### Documentation (this feature)

```text
specs/008-improve-test-coverage/
├── plan.md              # Plan de implementación estructurado
├── research.md          # Análisis de baseline y decisiones técnicas (Fase 0)
├── data-model.md        # Entidades, métricas y mapeo de pruebas (Fase 1)
├── quickstart.md        # Guía ejecutable de validación de cobertura (Fase 1)
├── contracts/           # Contratos de umbrales y scripts CLI (Fase 1)
│   ├── coverage-thresholds.contract.json
│   └── testing-scripts.contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Tareas ejecutables (Fase 2 - speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── jest.config.js                                      # Configuración global de Jest y umbrales (80% lines, 80% branches)
├── src/
│   ├── domain/                                         # Entidades de dominio ricas
│   ├── services/                                       # Servicios de orquestación
│   ├── data-access/                                    # Repositorios TypeORM
│   ├── controllers/                                    # Adaptadores HTTP NestJS
│   └── common/filters/                                 # Filtros de excepción de dominio
└── test/
    ├── unit/domain/                                    # Tests unitarios en aislamiento
    │   ├── jugador.entity.spec.ts
    │   ├── usuario.entity.spec.ts
    │   ├── liga.entity.spec.ts
    │   └── dominio-excepciones.spec.ts                # Nuevos tests unitarios de dominio
    └── integration/                                    # Tests de integración con Testcontainers
        ├── jugador.service.spec.ts
        ├── auth.service.spec.ts
        ├── jugadores-service-edge-cases.spec.ts        # Nuevas ramas para jugadores.service
        ├── football-data-client.spec.ts                # Nuevos tests para football-data.client
        └── repositorios-edge-cases.spec.ts             # Nuevas ramas para repositorios TypeORM

frontend/
├── vite.config.ts                                      # Configuración de Vitest v8 con umbrales (80% lines, 80% branches)
├── src/
│   ├── components/
│   │   ├── ui/                                         # Primitivas visuales (Button, Card, Alert, etc.)
│   │   ├── catalog/                                    # Componentes de catálogo y filtros
│   │   └── layout/                                     # Layouts de aplicación (AppLayout)
│   ├── hooks/                                          # Hooks personalizados (usePlayerFilters, useInfinitePlayers)
│   ├── api/                                            # Clientes HTTP y endpoints
│   ├── context/                                        # Proveedores de estado (AuthProvider)
│   └── views/                                          # Vistas (HomeView, CatalogView, etc.)
└── tests/
    ├── unit/                                           # Tests unitarios de componentes y hooks
    │   ├── components/ui/                              # Tests para Button, Card, PasswordInput, Spinner, Alert
    │   ├── hooks/                                      # Tests para usePlayerFilters, useInfinitePlayers
    │   └── api/                                        # Tests para http-client, auth.api.client, playersApi
    └── integration/                                    # Tests de vistas y layouts
        ├── AppLayout.test.tsx
        └── HomeView.test.tsx
```

**Structure Decision**: Monorepo con estructura dual independiente (`backend/` y `frontend/`), cada uno con sus propias herramientas de ejecución y reporte de cobertura (Jest y Vitest), asegurando aislamiento y cumplimiento estricto de umbrales separados sin mezclar dependencias.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No existen violaciones constitucionales. Todas las compuertas de la Constitución están en estado PASSED.*
