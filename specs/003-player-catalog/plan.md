# Implementation Plan: Catálogo y Filtros de Jugadores de las 5 Grandes Ligas

**Branch**: `003-player-catalog` | **Date**: 2026-09-21 | **Spec**: [specs/003-player-catalog/spec.md](file:///home/nikkoros/dev/dapps2026GrupoQ/specs/003-player-catalog/spec.md)

**Input**: Feature specification from `/specs/003-player-catalog/spec.md`

## Summary

Implementar la consulta, exploración y filtrado reactivo de futbolistas pertenecientes a las 5 grandes ligas europeas (Premier League, La Liga, Serie A, Bundesliga, Ligue 1). Los datos de ligas, equipos y planteles se obtienen de la API de football-data.org en una única sincronización inicial y se persisten de forma permanente e idempotente en la base de datos local de PostgreSQL. En el backend se exponen los endpoints `GET /players` (catálogo paginado con filtros), `GET /players/:id` (detalle individual del jugador) y `GET /players/filters` (metadatos de selección). En el frontend React, se construye una vista dedicada con estética dark-mode premium respetando `tokens.css`, carga perezosa (*infinite scroll*) al desplazarse, barra de búsqueda en tiempo real y un menú desplegable de filtros con dependencia jerárquica estricta (Liga → Equipos pertenecientes) para imposibilitar combinaciones inconsistentes.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+ (Backend NestJS 11), TypeScript 5.6+ (Frontend React 18 / Vite 6).

**Primary Dependencies**:
- Backend: NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `@nestjs/typeorm`), TypeORM 0.3.20, PostgreSQL driver `pg`, `class-validator`, `class-transformer`.
- Frontend: React 18, React Router DOM 7, Lucide / CSS Tokens, IntersectionObserver API nativo.

**Storage**: PostgreSQL 16 (relacional, A.C.I.D.) con tablas `ligas`, `equipos` y `jugadores`. Índices sobre claves foráneas y columnas de filtro.

**Testing**:
- Backend: Jest 29 con `ts-jest`, `@nestjs/testing`, y Testcontainers para PostgreSQL en integración.
- Frontend: Vitest con `@testing-library/react` y `@testing-library/user-event`.

**Target Platform**: Linux / Docker Compose, navegadores modernos (Chrome, Firefox, Safari, Edge).

**Project Type**: Aplicación Web desacoplada (Backend REST API Stateless + Frontend SPA en React).

**Performance Goals**:
- Tiempo de respuesta de consulta de catálogo en backend: < 150 ms (p95) sobre PostgreSQL local.
- Renderizado inicial en frontend: < 2 s.
- Aplicación de filtros en frontend: < 300 ms.

**Constraints**:
- Máximo 10 peticiones por minuto a football-data.org (resuelto realizando únicamente 5 peticiones durante la sincronización inicial).
- Cero llamadas a la API externa durante la navegación habitual de los usuarios (100% de consultas resueltas contra PostgreSQL local).
- Inmutabilidad estricta de la suite de pruebas preexistente (Constitución Principio IV).
- Nombres de dominio en español sin acentos ni 'ñ' (Constitución Principio V).

**Scale/Scope**: ~100 clubes de fútbol, ~2.500 jugadores activos de las 5 grandes ligas, carga por lotes de 20 jugadores por página.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Requisito del Principio | Estado de Adherencia en este Plan |
|--------------------------|-------------------------|-----------------------------------|
| **I. Arquitectura en 5 Capas** | Desacoplamiento estricto: UI (React) → Controller (NestJS adaptador) → Service (orquestador sin reglas de negocio) → Model (Rich Domain) → Data Access (TypeORM Repository sin lógica). Backend Stateless sobre PostgreSQL. | **PASSED**: `PlayerController` delega a `JugadorService`. La lógica de filtrado e invariantes de datos residen en `Jugador` y `CriterioFiltroJugador`. Repositorios aislados con mappers. |
| **II. Rich Domain Model y DDD** | Prohibidos objetos anémicos. Entidades deben validar invariantes, normalizar posiciones y encapsular comportamiento. | **PASSED**: `Jugador`, `Equipo` y `Liga` implementan métodos de fábrica `crear()`, validaciones de invariantes y normalización de posiciones tácticas. |
| **III. Estrategia de Testing y Testcontainers** | Tests unitarios para el dominio en aislamiento total. Tests de integración para Services y Repositories con PostgreSQL real (Testcontainers). | **PASSED**: Se definen tests unitarios de la entidad de dominio `Jugador` y tests de integración con Testcontainers para `JugadorService` y `JugadorTypeOrmRepository`. |
| **IV. Inmutabilidad Estricta de Tests** | No modificar ni eliminar tests existentes bajo ninguna circunstancia sin autorización expresa. | **PASSED**: Todos los tests existentes en `backend/test/` y `frontend/tests/` se conservan intactos. |
| **V. Convenciones de Idioma** | Conceptos de dominio en español sin tildes ni 'ñ' (`jugador`, `equipo`, `liga`, `posicion`, `pais`). Términos técnicos en inglés (`Controller`, `Service`, `Repository`, `Stateless`). | **PASSED**: Código y base de datos utilizan `jugador`, `equipo`, `liga`, `posicion`. Clases de infraestructura usan sufijos estándar en inglés. |
| **DoD (Definition of Done)** | Tests exitosos, compilación/despliegue local validado, colección de Postman actualizada con nuevos contratos. | **PASSED**: Se incluye actualización de la colección Postman con endpoints `/players` y `/players/filters`. |

## Project Structure

### Documentation (this feature)

```text
specs/003-player-catalog/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── players-api.yaml # OpenAPI 3.0 specification
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── common/
│   ├── config/
│   ├── controllers/
│   │   ├── dto/
│   │   │   ├── filtro-jugadores.dto.ts
│   │   │   └── respuesta-catalogo-jugadores.dto.ts
│   │   └── players.controller.ts
│   ├── data-access/
│   │   ├── equipo.orm-entity.ts
│   │   ├── equipo.mapper.ts
│   │   ├── equipo.typeorm-repository.ts
│   │   ├── jugador.orm-entity.ts
│   │   ├── jugador.mapper.ts
│   │   ├── jugador.typeorm-repository.ts
│   │   ├── liga.orm-entity.ts
│   │   ├── liga.mapper.ts
│   │   └── liga.typeorm-repository.ts
│   ├── domain/
│   │   ├── equipo.entity.ts
│   │   ├── equipo.repository.interface.ts
│   │   ├── jugador.entity.ts
│   │   ├── jugador.repository.interface.ts
│   │   ├── liga.entity.ts
│   │   └── liga.repository.interface.ts
│   └── services/
│       ├── clients/
│       │   └── football-data.client.ts
│       ├── sincronizacion-jugadores.service.ts
│       └── jugador.service.ts
└── test/
    ├── integration/
    │   └── jugador.service.spec.ts
    └── unit/
        └── domain/
            └── jugador.entity.spec.ts

frontend/
├── src/
│   ├── api/
│   │   └── playersApi.ts
│   ├── components/
│   │   ├── catalog/
│   │   │   ├── ActiveFiltersBar.tsx
│   │   │   ├── FilterModal.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   └── PlayerGrid.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── Spinner.tsx
│   ├── hooks/
│   │   ├── useInfinitePlayers.ts
│   │   └── usePlayerFilters.ts
│   ├── styles/
│   │   ├── catalog.css
│   │   └── tokens.css
│   ├── types/
│   │   └── player.types.ts
│   └── views/
│       └── PlayersCatalogView.tsx
└── tests/
    └── views/
        └── PlayersCatalogView.spec.tsx

postman/
└── football_tokens_auth.postman_collection.json (actualizado con carpeta Catálogo de Jugadores)
```

**Structure Decision**: Aplicación Web desacoplada (Frontend en `frontend/` y Backend en `backend/`). Se expande la arquitectura existente en 5 capas del backend respetando la separación entre domain, data-access, services y controllers. En el frontend se crean componentes modulares organizados bajo `components/catalog/`, hooks reutilizables bajo `hooks/` y la vista principal `PlayersCatalogView.tsx` conectada a `AppRoutes.tsx`.

## Complexity Tracking

*No violations to justify. All designs strictly comply with Constitution Principles I–V.*
