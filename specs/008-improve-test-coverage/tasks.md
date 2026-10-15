# Tasks: Mejora de Cobertura de Tests (Frontend y Backend >= 80%)

**Feature Branch**: `test/improve-coverage` | **Date**: 2026-10-15  
**Spec Reference**: [spec.md](spec.md) | **Plan Reference**: [plan.md](plan.md)  
**Contracts**: [coverage-thresholds.contract.json](contracts/coverage-thresholds.contract.json), [testing-scripts.contract.md](contracts/testing-scripts.contract.md)  
**Validation Guide**: [quickstart.md](quickstart.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificación de línea base de suites existentes y disponibilidad de herramientas de medición de cobertura

- [X] T001 Verify baseline test suites pass 100% in backend without modifications in backend/test
- [X] T002 [P] Verify baseline test suites pass 100% in frontend without modifications in frontend/tests
- [X] T003 [P] Verify Docker daemon and Testcontainers connectivity for backend tests in backend/test/integration/test-database.helper.ts
- [X] T004 [P] Verify test coverage reporting toolchain dependencies (@vitest/coverage-v8 in frontend/package.json and ts-jest in backend/package.json)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Utilidades comunes de fixtures, mocks y verificación previa antes de incorporar nuevas suites

**⚠️ CRITICAL**: Ninguna tarea de User Story puede comenzar hasta que esta fase esté completada

- [X] T005 Create shared database fixture helpers and data seeders for Testcontainers in backend/test/helpers/test-fixture.helper.ts
- [X] T006 [P] Create shared test mock factories and render helper utilities in frontend/tests/helpers/test-mock-factories.ts
- [X] T007 Execute baseline non-regression checkpoint verifying 100% pass rate for all pre-existing tests across backend/test and frontend/tests

**Checkpoint**: Base lista - la implementación de las historias de usuario puede comenzar en orden de prioridad

---

## Phase 3: User Story 1 - Garantía y Cobertura Integral del Backend (Priority: P1) 🎯 MVP

**Goal**: Alcanzar al menos 80% de líneas y 80% de branches en backend con tests unitarios para Model (aislamiento) y tests de integración para Services y Repositories (Testcontainers con PostgreSQL real). Cumplir la regla de validación de `data-model.md`: "lines.pct >= 80.0 y branches.pct >= 80.0 de forma independiente por stack".

**Independent Test**: Ejecutar `npm run test:cov` en `backend/` y verificar que las métricas globales reporten `lines.pct >= 80.0` y `branches.pct >= 80.0` con el 100% de los tests pasando.

### Implementation Tasks for User Story 1

- [X] T008 [P] [US1] Create unit tests for Liga domain entity covering validations and invariants in backend/test/unit/domain/liga.entity.spec.ts
- [X] T009 [P] [US1] Create unit tests for domain exceptions (JugadorNoEncontradoException, ReglaNegocioException) in backend/test/unit/domain/dominio-excepciones.spec.ts
- [X] T010 [P] [US1] Add domain unit tests for edge cases and price calculations in backend/test/unit/domain/jugador.entity.spec.ts
- [X] T011 [P] [US1] Add domain unit tests for user authentication and role validation branches in backend/test/unit/domain/usuario.entity.spec.ts
- [X] T012 [US1] Implement integration tests for jugadores.service branches (cache hit/miss, external sync, edge errors) with Testcontainers in backend/test/integration/jugadores-service-edge-cases.spec.ts
- [X] T013 [P] [US1] Implement integration and error handling tests for external football data client (retry logic, 404, 500) in backend/test/integration/football-data-client.spec.ts
- [X] T014 [US1] Implement integration tests for TypeORM repositories (equipo, liga, jugador) covering unfound entities and null relationships in backend/test/integration/repositorios-edge-cases.spec.ts
- [X] T015 [P] [US1] Implement unit tests for domain exception HTTP filter covering status codes 400, 404, 409, 500 in backend/test/unit/filters/domain-exception-filter.spec.ts
- [X] T016 [US1] Implement integration tests for AuthController covering validation error handling and HTTP status codes in backend/test/integration/auth-controller.spec.ts
- [X] T017 [US1] Run backend coverage suite and verify lines.pct >= 80.0 and branches.pct >= 80.0 in backend/coverage/lcov.info

**Checkpoint**: En este punto, User Story 1 (Backend >= 80% lines y branches) está completa y verificable independientemente como MVP.

---

## Phase 4: User Story 2 - Confiabilidad y Cobertura de la Interfaz y Flujos de Usuario en Frontend (Priority: P2)

**Goal**: Alcanzar al menos 80% de líneas y 80% de branches en frontend cubriendo primitivas UI, catálogo, hooks personalizados, layouts y clientes API. Cumplir la regla de validación de `data-model.md`: "lines.pct >= 80.0 y branches.pct >= 80.0 de forma independiente por stack".

**Independent Test**: Ejecutar `npm run test:coverage` en `frontend/` y verificar que las métricas globales reporten `lines.pct >= 80.0` y `branches.pct >= 80.0` con el 100% de los tests pasando.

### Implementation Tasks for User Story 2

- [X] T018 [P] [US2] Implement unit tests for Button component (variants, sizes, disabled, loading spinner) in frontend/tests/unit/components/ui/Button.test.tsx
- [X] T019 [P] [US2] Implement unit tests for Card component (children, classNames, slots) in frontend/tests/unit/components/ui/Card.test.tsx
- [X] T020 [P] [US2] Implement unit tests for PasswordInput component (visibility toggle, aria-labels, error state) in frontend/tests/unit/components/ui/PasswordInput.test.tsx
- [X] T021 [P] [US2] Implement unit tests for Spinner component (sizes, colors, accessibility) in frontend/tests/unit/components/ui/Spinner.test.tsx
- [X] T022 [P] [US2] Implement unit tests for Alert component (types info, warning, success, error, dismiss button) in frontend/tests/unit/components/ui/Alert.test.tsx
- [X] T023 [P] [US2] Implement unit tests for usePlayerFilters hook (league, team, price range min/max, reset filters) in frontend/tests/unit/hooks/usePlayerFilters.test.ts
- [X] T024 [P] [US2] Implement unit tests for useInfinitePlayers hook (initial load, pagination, hasMore false, error handling) in frontend/tests/unit/hooks/useInfinitePlayers.test.ts
- [X] T025 [P] [US2] Implement unit tests for http-client and error responses (400, 401, 500, network error) in frontend/tests/unit/api/http-client.test.ts
- [X] T026 [P] [US2] Implement unit tests for auth and players API clients (payload mapping, query params) in frontend/tests/unit/api/api-clients.test.ts
- [X] T027 [US2] Implement integration tests for AuthProvider (login, logout, session persistence, token error handling) in frontend/tests/unit/context/AuthProvider.test.tsx
- [X] T028 [US2] Implement integration tests for FiltersBar and FilterModal catalog components (toggle filters, modal cancel/apply) in frontend/tests/unit/components/catalog/FiltersComponents.test.tsx
- [X] T029 [US2] Implement integration tests for AppLayout and HomeView (navigation, authenticated vs guest header, hero CTA) in frontend/tests/integration/LayoutAndViews.test.tsx
- [X] T030 [US2] Run frontend coverage suite and verify lines.pct >= 80.0 and branches.pct >= 80.0 in frontend/coverage/lcov.info

**Checkpoint**: En este punto, User Stories 1 y 2 están completas y ambas superan el 80% de cobertura de forma independiente.

---

## Phase 5: User Story 3 - Establecimiento y Cumplimiento Automático de Umbrales Independientes (Priority: P3)

**Goal**: Configurar umbrales estrictos de cobertura obligatorios e independientes en backend y frontend con enforcement automático (código de salida != 0 si cae por debajo del 80%) y efecto trinquete. Cumplir la regla de validación de `data-model.md`: "minLines: 80, minBranches: 80, minFunctions: 80, minStatements: 80" e "Inmutable a la baja: ningún threshold puede ser configurado por debajo de 80 (regla trinquete / ratchet)".

**Independent Test**: Ejecutar los scripts de prueba en ambos entornos y comprobar que finalicen con código 0 si lines >= 80 y branches >= 80, y que fallen con código != 0 si cualquier métrica no alcanza el umbral de 80%.

### Implementation Tasks for User Story 3

- [X] T031 [US3] Configure Jest coverageThreshold (minLines: 80, minBranches: 80, minFunctions: 80, minStatements: 80) and exclusion rules for bootstrap files in backend/jest.config.js
- [X] T032 [P] [US3] Configure Vitest coverage thresholds (minLines: 80, minBranches: 80, minFunctions: 80, minStatements: 80) and exclusion rules in frontend/vite.config.ts
- [X] T033 [P] [US3] Align Vitest thresholds across unit and integration configurations in frontend/vitest.unit.config.ts and frontend/vitest.integration.config.ts
- [X] T034 [US3] Validate backend gate enforcement and non-regression ratchet per specs/008-improve-test-coverage/contracts/coverage-thresholds.contract.json in backend/jest.config.js
- [X] T035 [US3] Validate frontend gate enforcement and non-regression ratchet per specs/008-improve-test-coverage/contracts/coverage-thresholds.contract.json in frontend/vite.config.ts

**Checkpoint**: Todas las historias de usuario están implementadas y el enforcement de umbrales está activo.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones finales de integración, SonarQube, tiempos de ejecución y auditoría de inmutabilidad

- [X] T036 Execute combined monorepo coverage validation command per specs/008-improve-test-coverage/quickstart.md
- [X] T037 [P] Verify SonarQube coverage report generation in backend/coverage/lcov.info and frontend/coverage/lcov.info matching sonar-project.properties
- [X] T038 [P] Validate execution speed performance constraints (backend < 30s, frontend < 10s) in specs/008-improve-test-coverage/plan.md
- [X] T039 Audit test files against Constitution Principle IV to guarantee no pre-existing test files in backend/test or frontend/tests were modified or deleted

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias - se puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Phase 1 (Setup) - BLOQUEA la implementación de las historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Phase 2 (Foundational) - No depende de otras historias (MVP).
- **User Story 2 (Phase 4)**: Depende de Phase 2 (Foundational) - Independiente de US1 a nivel de código de tests, pero recomendada tras US1.
- **User Story 3 (Phase 5)**: Depende de US1 y US2 para que los thresholds al 80% pasen exitosamente con código 0.
- **Polish (Phase 6)**: Depende de la finalización de US1, US2 y US3.

### User Story Dependencies

- **User Story 1 (P1)**: Pruebas unitarias de dominio (T008-T011) en aislamiento pueden ejecutarse antes o en paralelo a los tests de integración con Testcontainers (T012-T014).
- **User Story 2 (P2)**: Tests unitarios de primitivas UI (T018-T022) y hooks (T023-T024) son completamente independientes y paralelizables. Integraciones de layout y vistas (T028-T029) se integran una vez probados los componentes base.
- **User Story 3 (P3)**: Requiere que US1 y US2 hayan alcanzado el 80% para que el gate enforcement no detenga el build por déficit de cobertura.

---

## Parallel Opportunities

- **Phase 1 (Setup)**: T002, T003 y T004 pueden ejecutarse en paralelo.
- **Phase 2 (Foundational)**: T006 puede crearse en paralelo con T005.
- **Phase 3 (User Story 1)**:
  - T008, T009, T010, T011 (tests unitarios de dominio) pueden ejecutarse en paralelo en archivos independientes.
  - T013 (football data client) y T015 (filtro de excepciones) pueden ejecutarse en paralelo con los tests de servicios.
- **Phase 4 (User Story 2)**:
  - T018, T019, T020, T021, T022 (primitivas UI) pueden desarrollarse simultáneamente.
  - T023, T024 (hooks) y T025, T026 (API) pueden desarrollarse simultáneamente.
- **Phase 5 (User Story 3)**: T032 y T033 pueden configurarse en paralelo.
- **Phase 6 (Polish)**: T037 y T038 pueden validarse en paralelo.

---

## Parallel Execution Examples

### User Story 1 (Backend Domain & Services)

```bash
# Ejecutar tests unitarios de dominio en paralelo:
Task: "T008 [P] [US1] Create unit tests for Liga domain entity in backend/test/unit/domain/liga.entity.spec.ts"
Task: "T009 [P] [US1] Create unit tests for domain exceptions in backend/test/unit/domain/dominio-excepciones.spec.ts"
Task: "T010 [P] [US1] Add domain unit tests for edge cases in backend/test/unit/domain/jugador.entity.spec.ts"
Task: "T011 [P] [US1] Add domain unit tests for user authentication in backend/test/unit/domain/usuario.entity.spec.ts"
```

### User Story 2 (Frontend UI & Hooks)

```bash
# Ejecutar tests de primitivas UI y hooks en paralelo:
Task: "T018 [P] [US2] Implement unit tests for Button component in frontend/tests/unit/components/ui/Button.test.tsx"
Task: "T019 [P] [US2] Implement unit tests for Card component in frontend/tests/unit/components/ui/Card.test.tsx"
Task: "T020 [P] [US2] Implement unit tests for PasswordInput in frontend/tests/unit/components/ui/PasswordInput.test.tsx"
Task: "T023 [P] [US2] Implement unit tests for usePlayerFilters in frontend/tests/unit/hooks/usePlayerFilters.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Fase 1 (Setup) y Fase 2 (Foundational).
2. Implementar Fase 3 (User Story 1: Backend >= 80%).
3. **STOP y VALIDAR**: Ejecutar `npm run test:cov` en `backend/` y verificar que supere 80% lines y 80% branches de forma aislada.
4. Entregar / commitear incremento MVP.

### Incremental Delivery

1. Setup + Foundational → Infraestructura y helpers listos.
2. User Story 1 (Backend) → Test independiente → MVP completado.
3. User Story 2 (Frontend) → Test independiente → Frontend alcanza >= 80%.
4. User Story 3 (Thresholds & Gate) → Configurar enforcement al 80% en ambos stacks con efecto ratchet.
5. Polish → Validación SonarQube, quickstart global y auditoría de inmutabilidad (Principio IV).

---

## Notes

- `[P]` indica tareas que tocan archivos diferentes y no tienen dependencias pendientes.
- `[US1]`, `[US2]`, `[US3]` proporcionan trazabilidad estricta hacia las historias de usuario de `spec.md`.
- En cumplimiento estricto del Principio IV de la Constitución, ningún test preexistente en `backend/test` ni `frontend/tests` debe ser modificado o eliminado.
- En cumplimiento del Principio I y III, los tests de dominio backend son unitarios puros sin base de datos, y los tests de persistencia y servicios usan Testcontainers con PostgreSQL real.
