# Tasks: Reducción de Duplicación de Código y Calidad SonarCloud

**Feature**: `006-reduce-duplication`  
**Plan**: [specs/006-reduce-duplication/plan.md](file:///c:/Users/Joaquín/Desktop/DOCS/UNQ/dapps2026GrupoQ/specs/006-reduce-duplication/plan.md)  
**Spec**: [specs/006-reduce-duplication/spec.md](file:///c:/Users/Joaquín/Desktop/DOCS/UNQ/dapps2026GrupoQ/specs/006-reduce-duplication/spec.md)  

**Reglas transversales**:
- Ningún helper contiene aserciones; no se cambia título, escenario ni aserción de ningún test (Principio IV).
- Los checkpoints ejecutan las suites completas y comparan contra la línea base de T001: mismos títulos y mismo total de `expect()` (tests + helpers).
- Los tests del backend requieren Docker en ejecución.
- `home.css` no se modifica.
- Si una tarea exige abstracciones forzadas o cambiar el valor de un test: detenerse y consultar al usuario.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capturar línea base de tests y mediciones antes de iniciar refactorizaciones

- [X] T001 Capturar la línea base exacta en specs/006-reduce-duplication/baseline/: títulos de tests de frontend (`npx vitest run --reporter=json`, ya existe `vitest-baseline.json` de una ejecución interrumpida y se regenera) y de backend (`npx jest --json`, requiere Docker), cantidad de `expect()` por archivo de test y total (esperado: frontend 187, backend 166) y reportes iniciales de jscpd (5 líneas/50 tokens y 10 líneas/100 tokens). Sin cambios de código

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear las abstracciones base compartidas para frontend y backend requeridas por las historias de usuario

**⚠️ CRITICAL**: Completar esta fase antes de iniciar la integración en componentes y suites de prueba

- [X] T002 [P] Implementar cliente HTTP compartido y clase HttpError en frontend/src/api/http-client.ts (errores del backend normalizados a string, mensaje por defecto `Error inesperado del servidor.`, fallo de red como `HttpError(0, ...)` con el mensaje en español actual)
- [X] T003 [P] Implementar componente RouteLoading en frontend/src/components/layout/RouteLoading.tsx y regla .route-loading en frontend/src/styles/components.css (reemplaza los estilos inline y conserva `aria-label="Cargando sesión"`)
- [X] T004 [P] Implementar TestDatabaseHelper unificado en backend/test/integration/test-database.helper.ts (registra las cuatro entidades ORM y limpia con `TRUNCATE TABLE jugadores, equipos, ligas, usuarios CASCADE`)
- [X] T005 [P] Implementar createPlayersTestContext en backend/test/integration/players-test.context.ts (repositorios, mock de FootballDataClient y módulo de testing; sin datos semilla y sin aserciones)

**Checkpoint**: Abstracciones base listas para consumo.

---

## Phase 3: User Story 1 - Refactorización de Duplicación en Frontend Productivo (Priority: P1) 🎯 MVP

**Goal**: Consolidar la lógica duplicada en formularios, rutas de navegación, clientes HTTP y estilos CSS sin alterar la interfaz visual ni el comportamiento observable.

**Independent Test**: Ejecutar `npm --prefix frontend test` (106 tests pasando) y verificar que las vistas de Login, Registro y Catálogo mantienen 100% su estética y funcionamiento.

### Implementation for User Story 1

- [X] T006 [P] [US1] Refactorizar frontend/src/api/auth-api.client.ts para consumir httpRequest y reexportar HttpError, manteniendo exportados HttpError, loginUsuario, obtenerPerfilAutenticado y registrarUsuario y el mapeo de 400/409/5xx del registro (los consumidores siguen importando HttpError desde auth-api.client porque los tests mockean ese módulo)
- [X] T007 [P] [US1] Refactorizar frontend/src/api/playersApi.ts para consumir httpRequest y usar HttpError, manteniendo exportados getPlayers, getPlayerById y getPlayerFilterOptions y eliminando PlayersApiError
- [X] T008 [P] [US1] Integrar RouteLoading en frontend/src/routes/ProtectedRoute.tsx y frontend/src/routes/PublicRoute.tsx
- [X] T009 [P] [US1] Limpiar solo las reglas CSS exactamente duplicadas en frontend/src/styles/login.css y frontend/src/styles/components.css (sin tocar home.css); tomar capturas de /login, /register y /players antes y después y verificar que son idénticas
- [X] T010 [US1] Checkpoint A: ejecutar `npm --prefix frontend test` y `npm --prefix frontend run build`, comparar con la línea base de T001 y verificar que AuthProvider, RegisterView y auth.service siguen importando HttpError desde auth-api.client
- [X] T011 [US1] Generalizar el tipado de useForm en frontend/src/hooks/useForm.ts sin cambiar su comportamiento (eliminar any, permitir que sanitize devuelva otro tipo y soportar la notificación de cambios de campo para onClearError)
- [X] T012 [P] [US1] Integrar useForm en frontend/src/components/auth/LoginForm.tsx preservando cargando recibido por props, vaciado de la contraseña tras enviar, llamadas a onClearError, validaciones, ids y labels
- [X] T013 [P] [US1] Integrar useForm en frontend/src/components/auth/RegisterForm.tsx preservando validaciones en blur, sanitización a SolicitudRegistroApi, ids y labels
- [X] T014 [US1] Checkpoint US1: suite completa de frontend, build, comparación con la línea base y capturas de /login, /register y /players. Si T011-T013 exigieron código forzado o cambiaron comportamiento observable, revertirlas, registrar LoginForm y RegisterForm como Duplicación Aceptada y consultar al usuario

**Checkpoint**: User Story 1 completa - suite de frontend pasando al 100% y cero regresiones visuales.

---

## Phase 4: User Story 2 - Consolidación Segura en Backend Productivo y Dominio (Priority: P2)

**Goal**: Formalizar y documentar la duplicación aceptada en entidades de dominio y entidades ORM para proteger el Rich Domain Model y la arquitectura en 5 capas.

**Independent Test**: Sin cambios de código; `npm --prefix backend test -- test/unit/` sigue pasando y no hay clases base indebidas.

### Implementation for User Story 2

- [X] T015 [US2] Verificar contra el código actual y registrar como Duplicación Aceptada las entidades ORM (backend/src/data-access/*.orm-entity.ts) y las entidades de dominio ricas (backend/src/domain/*.entity.ts) dentro de specs/006-reduce-duplication/research.md, confirmando que la capa Data Access no contiene reglas de negocio

**Checkpoint**: User Story 2 completa - modelo de dominio y arquitectura en 5 capas intactos y justificados.

---

## Phase 5: User Story 3 - Reestructuración de Setup y Helpers en Suites de Testing (Priority: P2)

**Goal**: Reutilizar código de inicialización y helpers de preparación en suites de prueba sin alterar ningún título, aserción ni valor esperado. Las specs de catálogo (EmptyStateFilterReset y PlayersCatalogView) no se modifican: solo repiten bloques `vi.mock`, registrados como duplicación aceptada.

**Independent Test**: Ejecutar las suites completas (`npm --prefix backend test` y `npm --prefix frontend test`) comprobando que los 48 tests de backend y 106 de frontend pasan y coinciden con la línea base de T001.

### Implementation for User Story 3

- [X] T016 [P] [US3] Migrar tests de integración de autenticación a TestDatabaseHelper en backend/test/integration/usuario.typeorm-repository.spec.ts, backend/test/integration/auth.service.spec.ts y backend/test/integration/auth-perfil.spec.ts
- [X] T017 [P] [US3] Migrar tests de integración de jugadores a TestDatabaseHelper y createPlayersTestContext en backend/test/integration/jugador.service.spec.ts, backend/test/integration/player-detail.spec.ts y backend/test/integration/players-filters.spec.ts, dejando los datos semilla de cada it, las aserciones y los timeouts de beforeAll sin cambios
- [X] T018 [US3] Eliminar helpers obsoletos backend/test/integration/setup-testcontainers.ts y backend/test/integration/setup-players-testcontainers.ts tras verificar con grep que ningún archivo los importa
- [X] T019 [P] [US3] Extraer helpers locales de render (AuthContext.Provider con el contexto mock existente + MemoryRouter + Routes, sin usar el AuthProvider real) en frontend/tests/integration/ProtectedRoute.test.tsx sin incluir aserciones
- [X] T020 [P] [US3] Extraer helpers locales de interacción de formulario (solo userEvent) en frontend/tests/integration/LoginView.test.tsx y frontend/tests/integration/RegisterView.test.tsx sin incluir aserciones
- [X] T021 [US3] Checkpoint US3: suites completas de backend (con Docker) y frontend, y comparación con la línea base de T001: mismos títulos, mismo total de expect() (tests + helpers) y cero expect() dentro de helpers

**Checkpoint**: User Story 3 completa - todas las suites de prueba ejecutándose con helpers optimizados y 0 aserciones modificadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final de métricas de duplicación, builds de compilación y consistencia

- [X] T022 Ejecutar medición final de jscpd según specs/006-reduce-duplication/quickstart.md, compararla con la línea base de T001 (objetivo local por debajo de 3,0%) y listar cada bloque restante con su justificación
- [X] T023 Validar paridad exacta de la suite de tests contra la línea base de T001 (106 tests en frontend, 48 en backend, mismo conteo de expect() y 0 en helpers)
- [X] T024 [P] Ejecutar builds de producción npm --prefix frontend run build y npm --prefix backend run build
- [X] T025 [P] Actualizar reporte final, métricas obtenidas y registro de Duplicación Aceptada en specs/006-reduce-duplication/research.md
- [ ] T026 Manual: hacer push y confirmar en SonarCloud que la duplicación en código nuevo es ≤ 3,0% (no verificable localmente)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas - T001 va primero, antes de cualquier cambio.
- **Foundational (Phase 2)**: Depende de Phase 1 (T001) - BLOQUEA el inicio de las historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Phase 2 (T002, T003); T009 solo depende de T001 (las capturas "antes" se toman antes de editar CSS).
- **User Story 2 (Phase 4)**: Depende de T001 - puede ejecutarse en paralelo con US1 o US3.
- **User Story 3 (Phase 5)**: Depende de Phase 2 (T004, T005).
- **Polish (Phase 6)**: Depende de la finalización de US1, US2 y US3.

### User Story Dependencies

- **User Story 1 (P1)**: Independiente de US2 y US3. Orden interno: T006-T009 en paralelo, T010 (Checkpoint A), T011, T012 y T013 en paralelo, T014.
- **User Story 2 (P2)**: Independiente de US1 y US3. Solo documentación en `research.md`.
- **User Story 3 (P2)**: Independiente de US1 y US2. Orden interno: T016 y T017 en paralelo, T018 tras ambas, T019 y T020 en paralelo con las anteriores, T021 al final.

### Parallel Opportunities

- **Phase 2**: T002, T003, T004 y T005 pueden ejecutarse en paralelo.
- **Phase 3 (US1)**: T006, T007, T008 y T009 en paralelo; T012 y T013 en paralelo tras T011.
- **Phase 5 (US3)**: T016, T017, T019 y T020 en paralelo; T018 requiere T016 y T017 completos.
- **Phase 6**: T024 y T025 pueden ejecutarse en paralelo tras T022 y T023.

---

## Parallel Example: User Story 1

```bash
# Tareas de integración de API, rutas y estilos que pueden ejecutarse en paralelo:
Task: "Refactorizar frontend/src/api/auth-api.client.ts para consumir httpRequest y reexportar HttpError"
Task: "Refactorizar frontend/src/api/playersApi.ts para consumir httpRequest y usar HttpError"
Task: "Integrar RouteLoading en frontend/src/routes/ProtectedRoute.tsx y frontend/src/routes/PublicRoute.tsx"
Task: "Limpiar reglas CSS duplicadas en frontend/src/styles/login.css y frontend/src/styles/components.css"
```

---

## Parallel Example: User Story 3

```bash
# Migración de suites de backend y extracción de helpers locales en frontend en paralelo:
Task: "Migrar tests de integración de autenticación a TestDatabaseHelper en backend/test/integration/..."
Task: "Migrar tests de integración de jugadores a TestDatabaseHelper y createPlayersTestContext en backend/test/integration/..."
Task: "Extraer helpers locales de render en frontend/tests/integration/ProtectedRoute.test.tsx"
Task: "Extraer helpers locales de interacción de formulario en frontend/tests/integration/LoginView.test.tsx y RegisterView.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (Línea base T001).
2. Completar Phase 2: Foundational (T002-T005).
3. Completar Phase 3: User Story 1 (Frontend productivo T006-T014), dejando useForm (T011-T013) para el final por ser el punto de mayor riesgo.
4. **VALIDAR**: Checkpoint US1 (T014): 106 tests pasando, comparación con la línea base y UI intacta.

### Incremental Delivery

1. Setup + Foundational → Abstracciones listas.
2. US1 → Frontend optimizado y validado.
3. US2 → Backend domain & data access formalizados.
4. US3 → Suites de test reestructuradas (~85% de la duplicación reducida).
5. Polish → Verificación final de paridad, `jscpd` y confirmación en SonarCloud.
