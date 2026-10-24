# Implementation Plan: Modal de Detalle de Jugador con Estadísticas

**Branch**: `010-player-detail-modal` | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-player-detail-modal/spec.md`

---

## Summary

Esta feature extiende el catálogo de jugadores con un modal de detalle que, al hacer click en cualquier `PlayerCard`, abre una superposición con los datos básicos del jugador (ya disponibles) más las estadísticas de WhoScored scrapeadas (almacenadas en `EstadisticaJugador`). El approach técnico consiste en: (1) enriquecer el endpoint `GET /players/:id` en el backend para que el `JugadorService` consulte al `IEstadisticaJugadorRepository` y adjunte las estadísticas de la temporada activa en el DTO de respuesta, y (2) implementar en el frontend un componente `PlayerDetailModal` que se invoca desde `PlayerCard`, consume `getPlayerById`, y presenta los datos agrupados por rol con manejo de carga/errores/nulos.

---

## Technical Context

**Language/Version**: TypeScript 5.3 (backend NestJS), TypeScript ~5.6 (frontend Vite/React)

**Primary Dependencies**:
- Backend: NestJS 11, TypeORM 0.3, class-validator, @nestjs/swagger, Jest 30, Testcontainers, @testcontainers/postgresql
- Frontend: React 18, Vite 6, React Router 7, Vitest 4, @testing-library/react 16

**Storage**: PostgreSQL (relacional, A.C.I.D.) — tabla `estadisticas_jugadores` ya existente con constraint `UNIQUE (jugadorId, temporada)`. Redis disponible como caché L1 (no se extiende a este flujo en esta feature).

**Testing**:
- Backend: Jest con `ts-jest`; unitarios sobre dominio en aislamiento; integración con Testcontainers + PostgreSQL real via `test:integration`
- Frontend: Vitest + @testing-library/react; unitarios (`test:unit`), integración (`test:integration`) con jsdom

**Target Platform**: Linux server (Docker Compose); navegadores modernos escritorio ≥1024px y móvil ≥320px

**Project Type**: Web application — backend NestJS REST API + frontend React SPA

**Performance Goals**: `GET /players/:id` enriquecido en < 200 ms p95 (una query adicional al repositorio de estadísticas). Modal renderizado < 100 ms tras recibir respuesta.

**Constraints**: Sin ruptura de retrocompatibilidad del DTO `JugadorItemDto` existente (campo `estadisticas` opcional). Coverage mínimo 80% líneas y branches por stack (constitución §VI). Sin regresión de tests existentes (constitución §IV).

**Scale/Scope**: ~2.500 jugadores, estadísticas de temporada activa para la mayoría. 1 endpoint enriquecido, 1 nuevo DTO, ~4 nuevos componentes frontend, 2 nuevos hooks.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Observación |
|-----------|--------|-------------|
| **I. Arquitectura 5 capas** | ✅ PASS | Enriquecimiento orquestado en `JugadorService` (Service layer). Controller solo delega. `IEstadisticaJugadorRepository` inyectado. Sin lógica de negocio en Controller ni en Data Access. |
| **II. Rich Domain Model / DDD** | ✅ PASS | `EstadisticaJugador` ya es Rich Model con invariantes. Sin objetos anémicos nuevos. Mapeo a DTO ocurre en Service. |
| **III. Estrategia de Testing rigurosa** | ✅ PASS | Tests unitarios de dominio + integración con Testcontainers para `JugadorService.buscarPorId`. Frontend: unitarios Vitest + RTL para hook y modal. |
| **IV. Inmutabilidad de Tests** | ✅ PASS | Ningún test existente se modifica ni elimina. Toda lógica nueva tiene sus propios tests. |
| **V. Convenciones de Idioma** | ✅ PASS | Nombres de dominio en español sin tilde ni ñ (`estadistica`, `jugador`, `jugadorDetalle`). Términos técnicos en inglés (`Service`, `Repository`, `DTO`, `Modal`, `Controller`). |
| **VI. Coverage ≥ 80%** | ✅ PASS | Tests planificados cubren happy path (con estadísticas), nulo (sin estadísticas), error de red, y cancelación de petición en vuelo. |

**Resultado: ninguna violación. Se procede a Phase 0 → research.md.**

---

## Project Structure

### Documentation (this feature)

```text
specs/010-player-detail-modal/
├── plan.md              # Este archivo (/speckit-plan output)
├── research.md          # Phase 0 output (/speckit-plan output)
├── data-model.md        # Phase 1 output (/speckit-plan output)
├── quickstart.md        # Phase 1 output (/speckit-plan output)
├── contracts/           # Phase 1 output (/speckit-plan output)
│   ├── backend-endpoint.md
│   └── frontend-component-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   ├── players.controller.ts          # sin cambios; @ApiResponse ajustado para JugadorDetalleDto
│   │   └── dto/
│   │       └── filtro-jugadores.dto.ts    # +EstadisticasJugadorDto, +EstadisticasPorteroDto, JugadorItemDto.estadisticas opcional
│   ├── services/
│   │   └── jugador.service.ts             # buscarPorId() enriquecido; inyecta IEstadisticaJugadorRepository
│   └── players/
│       └── players.module.ts              # registrar IEstadisticaJugadorRepository
└── test/
    ├── unit/
    │   └── jugador.service.buscarPorId.spec.ts  # unitario del método enriquecido
    └── integration/
        └── players-detail.integration.spec.ts   # integración con Testcontainers

frontend/
├── src/
│   ├── types/
│   │   └── player.types.ts                # +EstadisticasJugador, JugadorDetalle extiende Jugador
│   ├── api/
│   │   └── playersApi.ts                  # getPlayerById: retorna JugadorDetalle (retrocompat)
│   ├── hooks/
│   │   └── usePlayerDetail.ts             # nuevo: fetch + loading + error + retry + AbortController
│   ├── components/
│   │   ├── catalog/
│   │   │   ├── PlayerCard.tsx             # añadir prop onSelect(id) + aria-label; clic abre modal
│   │   │   └── PlayerGrid.tsx             # propagar onPlayerSelect
│   │   └── player-detail/
│   │       ├── PlayerDetailModal.tsx      # nuevo componente modal (overlay + cierre X/Overlay/Esc)
│   │       ├── PlayerDetailModal.css      # estilos responsive
│   │       ├── StatsGrid.tsx              # grilla de stats; filtra nulls; diferencia portero vs campo
│   │       └── StatCard.tsx              # tarjeta individual de estadística
│   └── views/
│       └── PlayersCatalogView.tsx         # gestionar selectedPlayerId + <PlayerDetailModal>
└── tests/
    ├── unit/
    │   ├── hooks/
    │   │   └── usePlayerDetail.test.ts
    │   └── components/
    │       ├── PlayerDetailModal.test.tsx
    │       └── StatsGrid.test.tsx
    └── integration/
        └── catalog-modal-flow.test.tsx    # click card → modal → datos → cierre
```

**Structure Decision**: Web application (Option 2). Backend NestJS en `backend/`, frontend React+Vite en `frontend/`. El módulo de detalle de jugador agrupa sus componentes en `components/player-detail/`, siguiendo el patrón de `components/catalog/` ya establecido en el proyecto.

---

## Complexity Tracking

> Sin violaciones constitucionales detectadas. Sección no aplica.
