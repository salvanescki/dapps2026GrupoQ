# Tasks: Modal de Detalle de Jugador con Estadísticas

**Feature**: `010-player-detail-modal` | **Branch**: `010-player-detail-modal`

**Generated**: 2026-10-24 | **Source**: spec.md · plan.md · data-model.md · contracts/ · research.md · quickstart.md · constitution.md

---

> ⚠️ **IMPORTANT**: DO NOT keep sample tasks. All tasks below are real, feature-specific, and immediately executable.
>
> **Constitution Constraints (all tasks MUST respect)**:
> - Architecture: 5-layer strict separation (Controller → Service → Domain → Repository)
> - Rich Domain Model: no anemic objects; business logic only in domain layer
> - Tests: unit (domain isolation) + integration (Testcontainers + PostgreSQL real)
> - Test Immutability: existing tests MUST NOT be modified or deleted
> - Language: domain identifiers in Spanish (no accents, no ñ); technical terms in English
> - Coverage: ≥ 80% lines + branches per stack (backend and frontend independently)
> - DoD: unit tests + integration tests + no compile errors + Postman collection updated

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure, register module dependencies, and prepare the NestJS module graph for the new feature.

- [ ] T001 Verificar que `ScrapingModule` exporte `EstadisticaJugadorTypeOrmRepository` con el token `I_ESTADISTICA_JUGADOR_REPOSITORY` en `backend/src/scraping/scraping.module.ts`; si no lo exporta, agregarlo
- [ ] T002 Importar `ScrapingModule` en `PlayersModule` para que `IEstadisticaJugadorRepository` quede disponible como provider en `backend/src/players/players.module.ts`; verificar que `AppModule` no cause doble registro

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Crear `EstadisticasJugadorDto` en `backend/src/controllers/dto/filtro-jugadores.dto.ts` con campos obligatorios: `temporada: string`, `liga: string`, `partidosJugados: number`, `minutosJugados: number`, `goles: number`, `asistencias: number`, `tarjetasAmarillas: number`, `tarjetasRojas: number`; y opcionales: `rating?: number` rango [0,10], `tirosPorPartido?: number`, `precisionPase?: number` rango [0,100], `duelosAereosGanadosPorPartido?: number`, `regatesCompletadosPorPartido?: number`, `pasesClavePorPartido?: number`, `xgPorPartido?: number`, `xaPorPartido?: number`, `grandesOcasionesPorPartido?: number`, `entradasPorPartido?: number`, `intercepccionesPorPartido?: number`, `despejesPorPartido?: number`, `pasesPorPartido?: number`, `centrosPorPartido?: number`, `atajadas?: number`, `golesRecibidos?: number`, `porcentajeAtajadas?: number` rango [0,100], `erroresQueGeneraronGol?: number`, `autogoles?: number`; con decoradores `@ApiProperty` / `@ApiPropertyOptional`
- [ ] T004 [P] Agregar campo `estadisticas?: EstadisticasJugadorDto | null` a `JugadorItemDto` en `backend/src/controllers/dto/filtro-jugadores.dto.ts` marcado con `@ApiPropertyOptional({ type: () => EstadisticasJugadorDto, nullable: true })` — retrocompatible (campo opcional)
- [ ] T005 [P] Agregar interfaces `EstadisticasJugador` y `JugadorDetalle extends Jugador` en `frontend/src/types/player.types.ts` según contrato en `specs/010-player-detail-modal/contracts/frontend-component-api.md`

**Checkpoint**: Tipos e interfaces definidos en ambos stacks — implementación de user stories puede comenzar.

---

## Phase 3: User Story 2 — Unificación de datos en el endpoint `/players/:id` (Priority: P1) 🎯 MVP Backend

> **US2** se implementa primero porque es el habilitador técnico directo de US1.

**Goal**: Enriquecer `GET /players/:id` para retornar estadísticas de WhoScored de la temporada más reciente junto con los datos de football-data.org, en una sola respuesta retrocompatible.

**Independent Test**: `GET /players/:id` con jugador que tiene estadísticas retorna HTTP 200 con campo `estadisticas` poblado. Con jugador sin estadísticas retorna HTTP 200 con `estadisticas: null` sin error.

### Implementación para User Story 2

- [ ] T006 [US2] Inyectar `IEstadisticaJugadorRepository` en `JugadorService` via `@Inject(I_ESTADISTICA_JUGADOR_REPOSITORY)` en el constructor en `backend/src/services/jugador.service.ts`
- [ ] T007 [US2] Extender método `buscarPorId(id: string)` de `JugadorService` en `backend/src/services/jugador.service.ts` para llamar a `estadisticaRepo.buscarPorJugador(jugador.id)` y tomar el primer resultado `[0]` como estadística de temporada activa (repositorio ya ordena por `fechaActualizacion DESC`); si no hay estadísticas, retornar `null` en el campo
- [ ] T008 [US2] Implementar mapeo `EstadisticaJugador` → `EstadisticasJugadorDto` en `backend/src/services/jugador.service.ts`: omitir campos cuyo valor sea `null` (todos los opcionales: `rating`, `tirosPorPartido`, `precisionPase`, `duelosAereosGanadosPorPartido`, `regatesCompletadosPorPartido`, `pasesClavePorPartido`, `xgPorPartido`, `xaPorPartido`, `grandesOcasionesPorPartido`, `entradasPorPartido`, `intercepccionesPorPartido`, `despejesPorPartido`, `pasesPorPartido`, `centrosPorPartido`, `atajadas`, `golesRecibidos`, `porcentajeAtajadas`, `erroresQueGeneraronGol`, `autogoles`); campos obligatorios siempre presentes
- [ ] T009 [US2] Ajustar `@ApiResponse` del método `buscarPorId` en `backend/src/controllers/players.controller.ts` para referenciar `JugadorItemDto` ya extendido con `estadisticas`; no agregar lógica de negocio al controller
- [ ] T010 [P] [US2] Crear test unitario `backend/test/unit/jugador.service.buscarPorId.spec.ts` que cubra: (a) jugador con estadísticas retorna DTO con `estadisticas` poblado, (b) jugador sin estadísticas retorna `estadisticas: null`, (c) campos `null` en entidad omitidos del DTO — coverage ≥ 80% líneas y branches
- [ ] T011 [US2] Crear test de integración `backend/test/integration/players-detail.integration.spec.ts` con Testcontainers + PostgreSQL real que cubra: (a) happy path con estadísticas, (b) jugador sin estadísticas, (c) UUID inválido retorna 400, (d) jugador inexistente retorna 404
- [ ] T012 [US2] Actualizar colección Postman del repositorio: agregar ejemplo `GET /players/:id` con `estadisticas` pobladas y segundo ejemplo con `"estadisticas": null` (DoD constitucional)

**Checkpoint**: `GET /players/:id` enriquecido, testeado y documentado — US1 (frontend) puede implementarse.

---

## Phase 4: User Story 1 — Abrir modal de detalle al hacer click en una card (Priority: P1) 🎯 MVP Frontend

**Goal**: Click en cualquier `PlayerCard` abre `PlayerDetailModal` superpuesto con datos básicos del jugador y estadísticas de WhoScored diferenciadas por rol (portero vs. jugador de campo).

**Independent Test**: Click en card abre modal con ficha del jugador; si tiene estadísticas se muestran; si es portero se muestran métricas de portero; cierre via X, overlay y Escape funciona. Sin estadísticas muestra mensaje "Las estadísticas de WhoScored no están disponibles aún para este jugador."

### Implementación para User Story 1

- [ ] T013 [P] [US1] Implementar `getPlayerById(id: string): Promise<JugadorDetalle>` en `frontend/src/api/playersApi.ts` usando el módulo HTTP existente (`httpRequest`); retornar `JugadorDetalle` con campo `estadisticas` opcional
- [ ] T014 [P] [US1] Crear hook `usePlayerDetail(playerId: string | null)` en `frontend/src/hooks/usePlayerDetail.ts` retornando `{ jugador, loading, error, retry }`: gestión de loading/error/jugador, `AbortController` para cancelar fetch previo al cambiar `playerId`, función `retry()` que resetea error e inicia nuevo fetch, ignorar errores `AbortError` — según contrato en `specs/010-player-detail-modal/contracts/frontend-component-api.md`
- [ ] T015 [P] [US1] Crear componente `StatCard` en `frontend/src/components/player-detail/StatCard.tsx` con props `{ label: string; value: number; unit?: string }` — tarjeta de estadística individual
- [ ] T016 [US1] Crear componente `StatsGrid` en `frontend/src/components/player-detail/StatsGrid.tsx` con props `{ estadisticas: EstadisticasJugador; posicion: PosicionJugador }`; filtrar campos `null`/`undefined`; métricas comunes (si no son null): `partidosJugados`, `minutosJugados`, `goles`, `asistencias`, `tarjetasAmarillas`, `tarjetasRojas`, `rating`; métricas de campo (posicion !== 'Portero'): `tirosPorPartido`, `precisionPase`, `xgPorPartido`, `xaPorPartido`, `regatesCompletadosPorPartido`, `pasesClavePorPartido`, `entradasPorPartido`, `intercepccionesPorPartido`; métricas de portero (posicion === 'Portero'): `atajadas`, `golesRecibidos`, `porcentajeAtajadas`, `erroresQueGeneraronGol`; usar `StatCard` para cada métrica (depende de T015)
- [ ] T017 [US1] Crear componente `PlayerDetailModal` en `frontend/src/components/player-detail/PlayerDetailModal.tsx` con props `{ playerId: string | null; onClose: () => void }`; si `playerId === null` no renderiza; usa `usePlayerDetail(playerId)` internamente; renderizar: overlay semitransparente, panel con `role="dialog" aria-modal="true" aria-labelledby="player-detail-title"`, botón cierre `id="player-detail-close" aria-label="Cerrar detalle del jugador"`, `h2 id="player-detail-title"` con nombre, ficha básica (posición normalizada, posición original si difiere, nacionalidad, dorsal, equipo con escudo, liga con emblema), `StatsGrid` si hay estadísticas, mensaje "Las estadísticas de WhoScored no están disponibles aún para este jugador." si `estadisticas` es null, spinner durante `loading`, alerta de error con botón "Reintentar" que llama a `retry()` (depende de T014, T016)
- [ ] T018 [US1] Crear estilos en `frontend/src/components/player-detail/PlayerDetailModal.css`: overlay `position: fixed; inset: 0` semitransparente, panel con `max-height: 90vh; overflow-y: auto`, `max-width: 680px` en escritorio (>=1024px), `width: 95vw` en movil (<768px), responsive entre 320px y >=1024px
- [ ] T019 [US1] Agregar listener `keydown` en `document` para `Escape` en `PlayerDetailModal` en `frontend/src/components/player-detail/PlayerDetailModal.tsx`; hacer focus automático en botón de cierre al abrir; restaurar foco al elemento que disparó el modal al cerrar
- [ ] T020 [US1] Añadir prop `onSelect?: (id: string) => void` a `PlayerCard` en `frontend/src/components/catalog/PlayerCard.tsx`; `<article>` raíz recibe `onClick={() => onSelect?.(player.id)}` y `cursor: pointer` si `onSelect` definido; agregar `aria-label` descriptivo; retrocompatible (prop opcional)
- [ ] T021 [US1] Añadir prop `onPlayerSelect?: (id: string) => void` a `PlayerGrid` en `frontend/src/components/catalog/PlayerGrid.tsx`; propagar `onSelect={onPlayerSelect}` a cada `PlayerCard`; retrocompatible (prop opcional)
- [ ] T022 [US1] Orquestar modal en `frontend/src/views/PlayersCatalogView.tsx`: agregar `useState<string | null>(null)` para `selectedPlayerId`, pasar `onPlayerSelect={(id) => setSelectedPlayerId(id)}` a `PlayerGrid`, renderizar `<PlayerDetailModal playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />`
- [ ] T023 [P] [US1] Crear test unitario `frontend/tests/unit/hooks/usePlayerDetail.test.ts` con Vitest + RTL/jsdom cubriendo: (a) `playerId=null` → estado limpio, (b) fetch exitoso → jugador cargado, (c) error de red → mensaje de error, (d) cambio de `playerId` → AbortController cancela fetch anterior, (e) `retry()` → nuevo fetch — coverage >= 80% líneas y branches
- [ ] T024 [P] [US1] Crear test unitario `frontend/tests/unit/components/PlayerDetailModal.test.tsx` con Vitest + RTL cubriendo: (a) `playerId=null` → no renderiza, (b) loading → spinner visible, (c) con estadísticas → ficha + StatsGrid, (d) sin estadísticas → mensaje informativo, (e) error → alerta + botón Reintentar, (f) cierre via botón X, overlay y Escape
- [ ] T025 [P] [US1] Crear test unitario `frontend/tests/unit/components/StatsGrid.test.tsx` con Vitest + RTL cubriendo: (a) campos null omitidos, (b) posicion Portero → métricas de portero visibles / métricas de campo ausentes, (c) posicion de campo → métricas ofensivas/defensivas visibles / métricas de portero ausentes
- [ ] T026 [US1] Crear test de integración `frontend/tests/integration/catalog-modal-flow.test.tsx` con Vitest + RTL + jsdom cubriendo flujo completo: click en `PlayerCard` → modal abierto con datos del jugador correcto → cierre del modal → catálogo visible en mismo estado

**Checkpoint**: Modal funcional end-to-end — US1 completamente implementada y testeada.

---

## Phase 5: User Story 3 — Estado de carga y manejo de errores en el modal (Priority: P2)

**Goal**: El modal muestra indicadores visuales durante la carga y mensajes de error amigables con opción de reintentar.

**Independent Test**: Delay de red (Slow 3G) muestra spinner antes de la respuesta. Error de red muestra mensaje amigable y botón "Reintentar". Jugador sin estadísticas muestra ficha básica + mensaje informativo sin bloque vacío.

> **Nota**: loading y error ya están parcialmente en `usePlayerDetail` (T014) y `PlayerDetailModal` (T017). Esta fase verifica y pule los edge cases de spec.md §Edge Cases.

### Implementación para User Story 3

- [ ] T027 [US3] Verificar y pulir estado de carga en `frontend/src/components/player-detail/PlayerDetailModal.tsx`: spinner/skeleton visible durante `loading: true`; cancelación de fetch via `AbortController` al cambiar `selectedPlayerId` rapidamente (edge case: clicks consecutivos rapidos)
- [ ] T028 [US3] Verificar y pulir estado de error en `frontend/src/components/player-detail/PlayerDetailModal.tsx`: mensaje amigable cuando `error !== null`, botón "Reintentar" llama a `retry()`, comportamiento correcto cuando se pierde conexión durante carga
- [ ] T029 [US3] Verificar que `StatsGrid` en `frontend/src/components/player-detail/StatsGrid.tsx` omite métricas con valor `null` (sin "N/A", sin "-", sin campos vacíos) per FR-009; verificar edge case: jugador con todos los opcionales en null muestra solo los obligatorios disponibles

**Checkpoint**: US1 + US2 + US3 completas — funcionalidad base + feedback visual + manejo de errores.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y cierre del DoD constitucional.

- [ ] T030 [P] Ejecutar tests backend: `cd backend && npm run test:unit && npm run test:integration`; verificar que todos los tests existentes y nuevos (T010, T011) pasan; verificar coverage >= 80% líneas y branches
- [ ] T031 [P] Ejecutar tests frontend: `cd frontend && npm run test:unit && npm run test:integration`; verificar que todos los tests existentes y nuevos (T023, T024, T025, T026) pasan; verificar coverage >= 80% líneas y branches
- [ ] T032 [P] Validar responsividad del modal siguiendo `specs/010-player-detail-modal/quickstart.md` escenario 3: escritorio (>=1024px) `max-width: 680px`, movil (320px) `width: 95vw` con scroll vertical
- [ ] T033 Ejecutar validación completa del quickstart `specs/010-player-detail-modal/quickstart.md`: Escenario 1 (endpoint con stats), 2 (sin stats), 3 (abrir modal), 4 (estado carga), 5 (cierre modal), 6 (clicks rapidos), 7 (error de red)
- [ ] T034 Verificar no hay regresión: `cd backend && npm run test` + `cd frontend && npm run test` — todos los tests previos a la feature siguen pasando

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Foundational: DTOs + tipos)
            ├── Phase 3 (US2 — backend endpoint)
            └── Phase 4 (US1 — frontend modal)  ← idealmente tras Phase 3
                    └── Phase 5 (US3 — polish estados)
                            └── Phase 6 (Polish & Cross-Cutting)
```

- **Phase 1**: Sin dependencias — empieza inmediatamente
- **Phase 2**: Depende de Phase 1 — bloquea todas las user stories
- **Phase 3 (US2)**: Depende de Phase 2 — backend independiente del frontend
- **Phase 4 (US1)**: Depende de Phase 2 y Phase 3 (endpoint necesario para tests de integración del modal)
- **Phase 5 (US3)**: Depende de Phase 4 — pule estados ya presentes en US1
- **Phase 6 (Polish)**: Depende de Phase 3 + Phase 4 + Phase 5

### User Story Dependencies

- **US2 (P1 Backend)**: Puede iniciar tras Phase 2 — independiente de US1
- **US1 (P1 Frontend)**: Depende de US2 para tests de integración; T013–T022 pueden avanzar en paralelo con US2
- **US3 (P2)**: Depende de US1 — refinamiento de estados ya implementados

### Within Each Phase

- Phase 2: T003, T004, T005 independientes → paralelo
- US2: T006 → T007 → T008 → T009; T010 y T011 en paralelo con implementación
- US1: T013, T014, T015 paralelos → T016 (espera T015) → T017 (espera T014 + T016) → T018, T019 paralelos; T020 → T021 → T022; T023–T025 paralelos con implementación; T026 tras T022

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Paralelo (archivos distintos, sin dependencias cruzadas):
Task T003: "Crear EstadisticasJugadorDto en backend/src/controllers/dto/filtro-jugadores.dto.ts"
Task T004: "Agregar campo estadisticas a JugadorItemDto en backend/src/controllers/dto/filtro-jugadores.dto.ts"
Task T005: "Agregar tipos EstadisticasJugador y JugadorDetalle en frontend/src/types/player.types.ts"
```

## Parallel Example: User Story 1 (Phase 4)

```bash
# Paralelo inicial (archivos distintos, sin dependencias):
Task T013: "Implementar getPlayerById en frontend/src/api/playersApi.ts"
Task T014: "Crear hook usePlayerDetail en frontend/src/hooks/usePlayerDetail.ts"
Task T015: "Crear StatCard en frontend/src/components/player-detail/StatCard.tsx"

# T016 una vez T015 completo:
Task T016: "Crear StatsGrid en frontend/src/components/player-detail/StatsGrid.tsx"

# T017 + T018 en paralelo una vez T014 + T016 completos:
Task T017: "Crear PlayerDetailModal en frontend/src/components/player-detail/PlayerDetailModal.tsx"
Task T018: "Crear PlayerDetailModal.css en frontend/src/components/player-detail/PlayerDetailModal.css"
```

---

## Implementation Strategy

### MVP First (US2 + US1 — solo P1)

1. Completar Phase 1: Setup (T001, T002)
2. Completar Phase 2: Foundational (T003, T004, T005)
3. Completar Phase 3: US2 — Backend enriquecido (T006–T012)
4. Completar Phase 4: US1 — Frontend modal (T013–T026)
5. **STOP & VALIDATE**: Ejecutar quickstart.md Escenarios 1–5
6. Deploy/demo si validación pasa

### Incremental Delivery

1. Setup + Foundational → base lista
2. US2 → endpoint enriquecido → testeable con curl/Postman
3. US1 → modal funcional → flujo completo end-to-end demostrable
4. US3 → UX pulida con estados de carga y error
5. Polish → todos los tests pasan, coverage >= 80% → listo para PR

### Parallel Team Strategy

Con dos desarrolladores:

1. Ambos completan Phase 1 + Phase 2 juntos
2. Una vez Phase 2 completa:
   - **Dev A** (backend): US2 (T006–T012)
   - **Dev B** (frontend): US1 — avanza T013, T014, T015, T018 en paralelo; espera US2 para tests de integración
3. US3 + Polish juntos una vez US1 + US2 completas

---

## Notes

- `[P]` = paralelo — archivos distintos, sin dependencias en tareas incompletas del mismo conjunto
- `[US1]` / `[US2]` / `[US3]` = trazabilidad a user story de spec.md
- Invariantes de datos (data-model.md) a validar en tests:
  - `goles, asistencias, partidosJugados, minutosJugados, tarjetasAmarillas, tarjetasRojas >= 0`
  - `rating` en [0, 10]
  - `precisionPase`, `porcentajeAtajadas` en [0, 100]
- Constitution §IV: Ningun test existente puede modificarse ni eliminarse sin permiso explícito del usuario
- Constitution §VI: Coverage >= 80% líneas y branches, por stack (backend y frontend de forma independiente)
- Constitution DoD: Tests completos + compilacion sin errores + Postman actualizada (T012)
- Convencion de idioma: identificadores de dominio en español sin tilde ni ñ; terminos tecnicos en ingles
