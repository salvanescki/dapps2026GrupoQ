---
description: "Task list for Remediación Integral de Issues Abiertos en SonarQube Cloud"
---

# Tasks: Remediación Integral de Issues Abiertos en SonarQube Cloud

**Input**: Design documents from `/specs/015-fix-sonarcloud-issues/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `quickstart.md`

**Tests**: No se solicitan nuevas suites obligatorias por adelantado (TDD); la especificación exige preservar el 100% de inmutabilidad de las pruebas existentes (Principio IV) y validar cobertura independiente $\ge 80\%$ en `lines` y `branches` en `backend` y `frontend` (Principio VI).

**Organization**: Las tareas están organizadas por historia de usuario (prioridades P1, P2 y P3) y ordenadas internamente por dependencias, módulo (`backend` → `frontend`), capa arquitectónica (`domain` → `data-access` → `services` / `types` → `utils` → `hooks` → `components` → `styles` → `views`) y archivo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Ejecutable en paralelo (archivos distintos, sin dependencias bloqueantes sobre tareas incompletas de la misma fase)
- **[Story]**: Historia de usuario a la que pertenece la tarea (`[US1]`, `[US2]`, `[US3]`)
- Todas las tareas incluyen rutas de archivo exactas y reglas de SonarQube Cloud asociadas

## Path Conventions

- **Backend**: `backend/src/` (código de producción en 5 capas), `backend/test/` (suites de prueba inmutables)
- **Frontend**: `frontend/src/` (código de producción React/TypeScript/CSS), `frontend/tests/` (suites de prueba inmutables)

---

## Phase 1: Setup (Diagnóstico y Verificación de Entorno)

**Purpose**: Confirmar el estado inicial de compilación y la limpieza del árbol de pruebas antes de iniciar las refactorizaciones.

- [X] T001 Verificar compilación inicial de TypeScript ejecutando `npm run build` sobre `backend/package.json` y `frontend/package.json` conforme a `specs/015-fix-sonarcloud-issues/quickstart.md`
- [X] T002 Verificar el estado limpio e inmutable de los archivos de prueba preexistentes en `backend/test/` y `frontend/tests/` según `specs/015-fix-sonarcloud-issues/quickstart.md`

---

## Phase 2: Foundational (Línea Base de No Regresión y Cobertura)

**Purpose**: Validar la ejecución y cobertura base de las suites de `backend` y `frontend` antes de intervenir los 33 archivos en alcance.

**⚠️ CRITICAL**: Ninguna historia de usuario debe comenzar sin confirmar que la línea base de pruebas compila y pasa sin errores.

- [X] T003 [P] Ejecutar la línea base de pruebas unitarias y cobertura (`npm run test:unit:cov`) definida en `backend/package.json`
- [X] T004 [P] Ejecutar la línea base de pruebas y cobertura (`npm run test:coverage`) definida en `frontend/package.json`

**Checkpoint**: Línea base verificada — la implementación de las historias de usuario puede comenzar.

---

## Phase 3: User Story 1 - Resolución de Hallazgos Críticos de Mantenibilidad y Complejidad Cognitiva (Priority: P1) 🎯 MVP

**Goal**: Eliminar la totalidad de los **13 hallazgos de severidad `CRITICAL`** (`typescript:S3776` con 12 ocurrencias — 9 en `backend` y 3 en `frontend` — y `typescript:S3735` con 1 ocurrencia en `frontend`), reduciendo la complejidad cognitiva de cada método o función (y de sus subtareas extraídas) a $\le 15$ puntos dentro de su respectiva capa arquitectónica y suprimiendo usos redundantes del operador `void`.

**Independent Test**: Comprobar que las reglas `typescript:S3776` y `typescript:S3735` registran 0 ocurrencias abiertas y que todas las suites unitarias y de integración de `backend` y `frontend` pasan sin regresiones.

### Implementation for User Story 1 — Módulo `backend` (`domain` → `services`)

- [X] T005 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `seleccionarOnceIdeal` y descomponer `validarInvariantes` en `validarParametrosTemporalesYEstrategia`, `validarUnicidadDeMiembros` y `validarDistribucionTactica433` en `backend/src/domain/equipo-semanal.entity.ts`
- [X] T006 [P] [US1] Consolidar la simplificación declarativa de `validarInvariantes` y `actualizarEstadisticas` (`typescript:S3776`, 2 ocurrencias) mediante la tabla `reglas` y la lista `CAMPOS_ACTUALIZABLES` con complejidad $\le 6$ en `backend/src/scraping/domain/estadistica-jugador.entity.ts`
- [X] T007 [P] [US1] Consolidar la descomposición de `buscarCoincidencia` (`typescript:S3776`) en `buscarCoincidenciaExacta`, `buscarCoincidenciaSinSufijos`, `buscarCoincidenciaPorApellidoYClub` y `buscarCoincidenciaAbreviada` en `backend/src/scraping/services/normalizador-jugador.service.ts`
- [X] T008 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `ejecutarPipeline` (mediante `procesarLiga` y subtareas privadas) y de `asociarJugadoresLocales` (extrayendo `coincideClubEnAsociacion` y `asociarJugadorIndividual`) en `backend/src/scraping/services/scraping.service.ts`
- [X] T009 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`, 3 ocurrencias) en `extraerEquipoDesdeDOM`, `enriquecerConFeedsComplementarios`, `extraerFilasTabla`, `leerFilasDeTablaDom` y `descubrirEstructuraCompeticion` (extrayendo `construirUrlDescubrimiento`, `extraerMetadatosTemporadaYEtapa`, `extraerTituloCompetencia`, `extraerNombreEtapa` y `extraerEquiposDesdeStandings`) en `backend/src/scraping/services/whoscored-playwright.service.ts`
- [X] T010 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `mapearAEstadisticasDto` (con `CAMPOS_OPCIONALES_ESTADISTICAS`) y extraer `mapearEquipoResumenDto` y `mapearLigaResumenDto` desde `mapearAJugadorItemDto` en `backend/src/services/jugador.service.ts`

### Implementation for User Story 1 — Módulo `frontend` (`utils` → `hooks` → `views`)

- [X] T011 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `reconstruirSeriePatrimonial` extrayendo `inicializarTenenciasYPrecios` y `construirPuntoTransaccion` en `frontend/src/utils/portfolio-chart.ts`
- [X] T012 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `cargarPanel` extrayendo `buscarTokensDisponibles`, `resolverCargaInicialPanel` y `aplicarDatosPortfolioEnPanel` en `frontend/src/hooks/usePlayerMarketPanel.ts`
- [X] T013 [P] [US1] Reducir la complejidad cognitiva (`typescript:S3776`) de `cargarTodo` extrayendo `sincronizarTransaccionesFiltradas` en `frontend/src/hooks/usePortfolio.ts`
- [X] T014 [P] [US1] Eliminar el uso innecesario del operador `void` (`typescript:S3735`) en la prop `onSeleccionar={seleccionarSemana}` y en el manejador `onClick` de generación manual en `frontend/src/views/TeamOfTheWeekView.tsx`

**Checkpoint**: Los 13 hallazgos `CRITICAL` (US1) quedan resueltos y son verificables de forma independiente en `backend` y `frontend`.

---

## Phase 4: User Story 2 - Accesibilidad Inclusiva, Rendimiento y Calidad Mayor en Interfaz y Servicios (Priority: P2)

**Goal**: Resolver la totalidad de los **18 hallazgos de severidad `MAJOR`** (`typescript:S3358` x2, `typescript:S2933` x2 y `typescript:S7761` x1 en `backend`; `typescript:S6819` x5, `typescript:S6847` x1, `css:S9440` x3, `css:S7924` x1, `typescript:S8786` x1, `typescript:S6481` x1 y `typescript:S6564` x1 en `frontend`), garantizando controles semánticos HTML5 nativos, soporte de `prefers-reduced-motion`, contraste WCAG AA/AAA, formateo lineal $O(n)$ y memoización de contexto.

**Independent Test**: Verificar que las 10 reglas `MAJOR` queden con 0 hallazgos abiertos y que las suites de componentes e integración de `frontend` (`PlayerCard`, `PlayerDetailModal`, `PitchPlayerCard`, `RankingFiltersBar`, `chart`, `formato-mercado`) y de `scraping` en `backend` pasen al 100% sin modificar ningún test.

### Implementation for User Story 2 — Módulo `backend` (`domain` → `services`)

- [X] T015 [P] [US2] Declarar como inmutable (`private readonly _detalle: ErrorScrapingDetalle[]`) la propiedad interna (`typescript:S2933`) en `backend/src/scraping/domain/ejecucion-scraping.entity.ts`
- [X] T016 [P] [US2] Desanidar la expresión ternaria de extracción de `items` (`typescript:S3358`) en una estructura condicional `if / else if` explícita en `backend/src/scraping/services/whoscored-feed-adapter.interface.ts`
- [X] T017 [P] [US2] Resolver los hallazgos mayores de inmutabilidad (`typescript:S2933` en `private readonly scrapingConfig`), lectura de atributo de datos (`typescript:S7761` usando `(tr as HTMLElement).dataset.playerId`) y ternario anidado (`typescript:S3358` en cálculo de `appsVal`) en `backend/src/scraping/services/whoscored-playwright.service.ts` (ejecutar tras T009 si se trabaja secuencialmente sobre el mismo archivo)

### Implementation for User Story 2 — Módulo `frontend` (`types` → `utils` → `components` → `styles`)

- [X] T018 [P] [US2] Eliminar el alias redundante `export type EstrategiaVersion = string;` (`typescript:S6564`) y reemplazar sus 5 referencias internas por `string` en `frontend/src/types/marketplace.types.ts`
- [X] T019 [P] [US2] Reemplazar la expresión regular con backtracking super-lineal (`typescript:S8786`) por la función auxiliar de tiempo lineal $O(n)$ `formatearMilesConPunto` en `frontend/src/utils/formato-mercado.ts`
- [X] T020 [P] [US2] Memoizar con `useMemo` el objeto `{ config }` provisto a `ChartContext.Provider` (`typescript:S6481`) en `frontend/src/components/ui/chart.tsx`
- [X] T021 [P] [US2] Reemplazar el elemento `<article>` con `role="button"` y eventos de teclado/puntero (`typescript:S6819`, `typescript:S6847`) por `<button type="button" className="player-card">` cuando `onSelect` está definido y `<article className="player-card">` estático cuando no es interactivo en `frontend/src/components/catalog/PlayerCard.tsx`
- [X] T022 [P] [US2] Reemplazar el contenedor `<div className="ranking-position-tabs" role="group">` (`typescript:S6819`) por un elemento semántico nativo `<fieldset className="ranking-position-tabs">` en `frontend/src/components/marketplace/RankingFiltersBar.tsx`
- [X] T023 [US2] Encapsular las animaciones de `.filter-modal-content` con `@media (prefers-reduced-motion: no-preference)` y `@media (prefers-reduced-motion: reduce)` (`css:S9440`) y ajustar los estilos de `button.player-card` y `fieldset.ranking-position-tabs` en `frontend/src/styles/catalog.css` (depende de T021 y T022)
- [X] T024 [P] [US2] Reemplazar `<div role="presentation">` y `<div role="dialog">` (`typescript:S6819`, 2 ocurrencias) por `<button type="button" className="player-detail-backdrop" data-testid="player-detail-overlay" onClick={onClose} tabIndex={-1} aria-hidden="true" />` y `<dialog open className="player-detail-panel" aria-modal="true" aria-labelledby="player-detail-title">` en `frontend/src/components/player-detail/PlayerDetailModal.tsx`
- [X] T025 [US2] Agregar soporte `@media (prefers-reduced-motion: no-preference)` y `@media (prefers-reduced-motion: reduce)` en `.player-detail-panel` y `.stat-card` (`css:S9440`, 2 ocurrencias), estilizar `.player-detail-backdrop` y fijar color de fondo sólido `#262d3d` en `.player-detail-close-btn:hover, .player-detail-close-btn:focus-visible` (`css:S7924`) en `frontend/src/components/player-detail/PlayerDetailModal.css` (depende de T024)
- [X] T026 [P] [US2] Reemplazar `<div role="button" tabIndex={0}>` (`typescript:S6819`) por el control nativo `<button type="button" className="pitch-player-card">` preservando `onClick`, `onKeyDown` y `data-testid` en `frontend/src/components/team-of-the-week/PitchPlayerCard.tsx`

**Checkpoint**: Los 18 hallazgos `MAJOR` (US2) y los 13 `CRITICAL` (US1) quedan resueltos y validados de forma independiente.

---

## Phase 5: User Story 3 - Estandarización de Procesamiento Asíncrono e Higiene de Código Menor (Priority: P3)

**Goal**: Resolver la totalidad de los **42 hallazgos de severidad `MINOR`** (`typescript:S9382` x27, `typescript:S7503` x5, `typescript:S7773` x4, `typescript:S4323` x2, `typescript:S6582` x1, `typescript:S7763` x1, `typescript:S6606` x1 y `typescript:S6594` x1), eliminando bloqueos secuenciales innecesarios con `Promise.all`, preservando secuencias deterministas con `reduce` / recursión asíncrona, alineando firmas `Promise<T>` sin `async` ocioso y estandarizando tipos y expresiones.

**Independent Test**: Verificar que las 8 reglas `MINOR` alcancen 0 ocurrencias abiertas y que todos los flujos de repositorios, órdenes de mercado, cotizaciones, tokens, scraping y selector semanal pasen sus pruebas unitarias y de integración.

### Implementation for User Story 3 — Módulo `backend` Capa `domain`

- [X] T027 [P] [US3] Simplificar las verificaciones de nulidad de `_miembros` utilizando optional chaining (`this._miembros?.length !== 11` y `this._miembros?.length ?? 0`, `typescript:S6582`) en `backend/src/domain/equipo-semanal.entity.ts` (ejecutar tras T005)
- [X] T028 [P] [US3] Consolidar la validación numérica mediante `Number.isNaN` (`typescript:S7773`, 2 ocurrencias) en `backend/src/domain/miembro-equipo-semanal.entity.ts`
- [X] T029 [P] [US3] Simplificar la asignación por defecto de `cantidadRestante` con el operador nullish coalescing `props.cantidadRestante ?? props.cantidad` (`typescript:S6606`) en `backend/src/domain/orden.entity.ts`
- [X] T030 [P] [US3] Definir el alias de tipo `export type MontoSaldo = number | string | Dinero;` (`typescript:S4323`) y utilizarlo en `UsuarioProps` en `backend/src/domain/usuario.entity.ts`

### Implementation for User Story 3 — Módulo `backend` Capa `data-access`

- [X] T031 [P] [US3] Resolver las 2 ocurrencias de `await` dentro de bucles (`typescript:S9382`) empleando encadenamiento secuencial `reduce` en `guardarMuchos` y ejecución concurrente `Promise.all` en `obtenerUltimasPorJugadores` en `backend/src/data-access/cotizacion.typeorm-repository.ts`
- [X] T032 [P] [US3] Resolver la ocurrencia de `await` dentro del bucle de `guardarMuchos` (`typescript:S9382`) mediante encadenamiento secuencial `reduce` en `backend/src/data-access/jugador.typeorm-repository.ts`
- [X] T033 [P] [US3] Definir el alias de tipo `export type ValorDecimalNullableOrm = string | number | null;` (`typescript:S4323`) y aplicarlo en `tirosPorPartido` y columnas decimales anulables en `backend/src/scraping/data-access/estadistica-jugador.orm-entity.ts`
- [X] T034 [P] [US3] Resolver las 2 ocurrencias de `await` dentro de bucles (`typescript:S9382`) empleando encadenamiento secuencial `reduce` en `guardarMuchos` y ejecución concurrente `Promise.all` en `buscarPorJugadores` en `backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`

### Implementation for User Story 3 — Módulo `backend` Capa `services`

- [X] T035 [P] [US3] Resolver las 5 ocurrencias de `await` en bucles (`typescript:S9382`) mediante recursión asíncrona por página en `cargarJugadoresLocales` y encadenamiento secuencial `reduce` sobre `leagueConfigs` en `ejecutarPipeline` en `backend/src/scraping/services/scraping.service.ts` (ejecutar tras T008)
- [X] T036 [P] [US3] Resolver las 14 ocurrencias de `await` en bucles (`typescript:S9382`) mediante encadenamiento `reduce` y funciones recursivas asíncronas en `extraerEquipoDesdeDOM`, `consultarFeedResumenConReintentos`, `extraerEstadisticasLigaPorEquipos`, `consultarFeedComplementario`, `enriquecerConFeedsComplementarios`, `extraerEstadisticasLiga` y `extraerFilasTabla`, y estandarizar búsquedas regex con `RegExp.prototype.exec` (`typescript:S6594`) en `backend/src/scraping/services/whoscored-playwright.service.ts` (ejecutar tras T009 y T017)
- [X] T037 [P] [US3] Unificar la reexportación `export { obtenerAnoYSemanaIso as calcularAnoYSemanaIso } from '../domain/equipo-semanal.entity';` (`typescript:S7763`) en `backend/src/services/equipo-semanal.service.ts`
- [X] T038 [P] [US3] Remover el modificador `async` ocioso (`typescript:S7503`, 4 ocurrencias) en `ejecutarCompraPrimaria`, `ejecutarCompraSecundaria`, `crearOrdenVenta` y `cancelarOrdenVenta` trasladando la desestructuración inicial al callback de `this.dataSource.transaction` en `backend/src/services/oms.service.ts`
- [X] T039 [P] [US3] Resolver las 2 ocurrencias de `await` en bucles (`typescript:S9382`) utilizando `Promise.all` en `obtenerRanking` y encadenamiento secuencial `reduce` en el fallback individual de `recalcularCotizacionesActivas` en `backend/src/services/quotes.service.ts`
- [X] T040 [P] [US3] Resolver el `await` en bucle de `emitirFaltantes` (`typescript:S9382`) mediante encadenamiento secuencial `reduce` y remover el modificador `async` ocioso (`typescript:S7503`) en `ejecutarEmisionIdempotente` en `backend/src/services/tokens.service.ts`

### Implementation for User Story 3 — Módulo `frontend` Capa `components`

- [X] T041 [P] [US3] Consolidar la validación numérica con `Number.isNaN` (`typescript:S7773`, 2 ocurrencias) al formatear el selector de semana en `frontend/src/components/team-of-the-week/WeekSelector.tsx`

**Checkpoint**: La totalidad de los 73 hallazgos abiertos (13 `CRITICAL`, 18 `MAJOR`, 42 `MINOR`) en las 20 reglas queda resuelta.

---

## Phase 6: Polish & Cross-Cutting Concerns (Validación Final e Inmutabilidad)

**Purpose**: Verificación integral de compilación, cobertura independiente $\ge 80\%$, inmutabilidad de tests e invariancia de contratos según `quickstart.md`.

- [X] T042 [P] Validar compilación limpia de producción (`npm run build`) sin errores de tipos en `backend/tsconfig.json` y `frontend/tsconfig.json`
- [X] T043 [P] Ejecutar las suites unitarias con cobertura (`npm run test:unit:cov`) y de integración con PostgreSQL/Testcontainers (`npm run test:integration`) verificando $\ge 80\%$ en `lines` y `branches` en `backend/package.json`
- [X] T044 [P] Ejecutar la suite completa de pruebas con cobertura (`npm run test:coverage`) verificando $\ge 80\%$ en `lines` y `branches` en `frontend/package.json`
- [X] T045 Auditar el cumplimiento de inmutabilidad de tests (`git status -s backend/test backend/src/**/*.spec.ts frontend/tests`), ausencia de supresiones (`NOSONAR`, `eslint-disable`) e invariancia de contratos REST/OpenAPI conforme a `specs/015-fix-sonarcloud-issues/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — comienza de inmediato.
- **Foundational (Phase 2)**: Depende de Phase 1 — confirma que la línea base compila y pasa todas las pruebas antes de refactorizar.
- **User Story 1 (Phase 3 - P1 🎯 MVP)**: Depende de Phase 2. Resuelve los 13 issues `CRITICAL` en 10 archivos.
- **User Story 2 (Phase 4 - P2)**: Depende de Phase 2. Comparte únicamente `backend/src/scraping/services/whoscored-playwright.service.ts` con US1 (`T009` → `T017`); los otros 11 archivos de US2 son disjuntos de US1.
- **User Story 3 (Phase 5 - P3)**: Depende de Phase 2. Comparte 3 archivos con US1/US2 que deben ejecutarse en orden sobre el mismo archivo:
  - `backend/src/domain/equipo-semanal.entity.ts`: `T005` (US1) → `T027` (US3)
  - `backend/src/scraping/services/scraping.service.ts`: `T008` (US1) → `T035` (US3)
  - `backend/src/scraping/services/whoscored-playwright.service.ts`: `T009` (US1) → `T017` (US2) → `T036` (US3)
  - Los otros 12 archivos de US3 son completamente independientes y paralelizables.
- **Polish (Phase 6)**: Depende de la finalización de Phase 3, Phase 4 y Phase 5.

### Intra-Story Dependencies

- **Dentro de US1 (Phase 3)**: Las 10 tareas (`T005` a `T014`) operan sobre archivos distintos y pueden ejecutarse en paralelo (`[P]`).
- **Dentro de US2 (Phase 4)**:
  - `T023` (`frontend/src/styles/catalog.css`) depende de `T021` (`PlayerCard.tsx`) y `T022` (`RankingFiltersBar.tsx`).
  - `T025` (`frontend/src/components/player-detail/PlayerDetailModal.css`) depende de `T024` (`PlayerDetailModal.tsx`).
  - Todas las demás tareas de US2 (`T015`–`T022`, `T024`, `T026`) operan sobre archivos distintos y son paralelizables (`[P]`).
- **Dentro de US3 (Phase 5)**: Las 15 tareas (`T027` a `T041`) operan sobre archivos distintos entre sí dentro de la fase y son paralelizables (`[P]`).

---

## Parallel Examples

### Parallel Example: User Story 1 (P1 - Hallazgos `CRITICAL`)

```bash
# Ejecutar en paralelo la descomposición de complejidad cognitiva en backend (6 archivos independientes):
Task T005: "backend/src/domain/equipo-semanal.entity.ts (typescript:S3776)"
Task T006: "backend/src/scraping/domain/estadistica-jugador.entity.ts (typescript:S3776 x2)"
Task T007: "backend/src/scraping/services/normalizador-jugador.service.ts (typescript:S3776)"
Task T008: "backend/src/scraping/services/scraping.service.ts (typescript:S3776)"
Task T009: "backend/src/scraping/services/whoscored-playwright.service.ts (typescript:S3776 x3)"
Task T010: "backend/src/services/jugador.service.ts (typescript:S3776)"

# Ejecutar en paralelo la remediación crítica en frontend (4 archivos independientes):
Task T011: "frontend/src/utils/portfolio-chart.ts (typescript:S3776)"
Task T012: "frontend/src/hooks/usePlayerMarketPanel.ts (typescript:S3776)"
Task T013: "frontend/src/hooks/usePortfolio.ts (typescript:S3776)"
Task T014: "frontend/src/views/TeamOfTheWeekView.tsx (typescript:S3735)"
```

### Parallel Example: User Story 2 (P2 - Hallazgos `MAJOR`)

```bash
# Ejecutar en paralelo componentes TSX y utilidades antes de consolidar hojas de estilo CSS:
Task T018: "frontend/src/types/marketplace.types.ts (typescript:S6564)"
Task T019: "frontend/src/utils/formato-mercado.ts (typescript:S8786)"
Task T020: "frontend/src/components/ui/chart.tsx (typescript:S6481)"
Task T021: "frontend/src/components/catalog/PlayerCard.tsx (typescript:S6819, typescript:S6847)"
Task T022: "frontend/src/components/marketplace/RankingFiltersBar.tsx (typescript:S6819)"
Task T024: "frontend/src/components/player-detail/PlayerDetailModal.tsx (typescript:S6819 x2)"
Task T026: "frontend/src/components/team-of-the-week/PitchPlayerCard.tsx (typescript:S6819)"
```

### Parallel Example: User Story 3 (P3 - Hallazgos `MINOR`)

```bash
# Ejecutar en paralelo la estandarización asíncrona en repositorios y servicios de dominio:
Task T031: "backend/src/data-access/cotizacion.typeorm-repository.ts (typescript:S9382 x2)"
Task T032: "backend/src/data-access/jugador.typeorm-repository.ts (typescript:S9382)"
Task T034: "backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts (typescript:S9382 x2)"
Task T038: "backend/src/services/oms.service.ts (typescript:S7503 x4)"
Task T039: "backend/src/services/quotes.service.ts (typescript:S9382 x2)"
Task T040: "backend/src/services/tokens.service.ts (typescript:S9382, typescript:S7503)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar **Phase 1: Setup** (`T001`–`T002`) y **Phase 2: Foundational** (`T003`–`T004`).
2. Completar **Phase 3: User Story 1** (`T005`–`T014`).
3. **STOP and VALIDATE**: Ejecutar las pruebas unitarias de `backend` y `frontend` para confirmar que los 13 issues `CRITICAL` están resueltos con 0 regresiones.

### Incremental Delivery

1. **Setup + Foundational** → Línea base validada.
2. **User Story 1 (P1)** → 0 issues `CRITICAL` (13/73 resueltos).
3. **User Story 2 (P2)** → 0 issues `MAJOR` (31/73 resueltos acumulados; accesibilidad y rendimiento verificados).
4. **User Story 3 (P3)** → 0 issues `MINOR` (73/73 resueltos acumulados; deuda técnica en 0 min).
5. **Polish (Phase 6)** → Validación completa de `quickstart.md` (cobertura $\ge 80\%$ e inmutabilidad de tests).

