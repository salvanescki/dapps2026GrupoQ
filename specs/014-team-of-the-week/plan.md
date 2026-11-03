# Implementation Plan: Equipo de la Semana (Team of the Week)

**Branch**: `014-team-of-the-week` | **Date**: 2026-11-02 | **Spec**: [specs/014-team-of-the-week/spec.md](spec.md)

**Input**: Feature specification from `specs/014-team-of-the-week/spec.md`, decisiones de investigación técnica en `research.md`, modelo de datos en `data-model.md` y contratos OpenAPI en `contracts/openapi-team-of-the-week.yaml`.

---

## Summary

Implementar la funcionalidad integral del **Equipo de la Semana** (el once ideal de los futbolistas mejor cotizados del mercado según su posición táctica) a través del stack fullstack del proyecto, respetando estrictamente la arquitectura en 5 capas, Rich Domain Model, inmutabilidad de tests preexistentes y cobertura mínima del 80%:

1. **Dominio Puro (Model)**: Agregado raíz `EquipoSemanal` con método rico de fábrica `seleccionarOnceIdeal(...)` que filtra futbolistas inactivos, sin estadísticas o con menos de 270 minutos acumulados en la temporada, agrupa por posiciones canónicas (`Portero`, `Defensa`, `Mediocampista`, `Delantero`), valida invariantes de cupo para la formación 4-3-3 (1-4-3-3 = 11 titulares exactos), desempata determinísticamente por `cotizacion.valor DESC`, `cotizacion.score DESC` y `jugador.nombre ASC`, congelando un snapshot con `MiembroEquipoSemanal`. Incluye `estaCerrada(ahora)`: una semana se cierra al llegar el lunes 00:00 UTC siguiente y desde ahí no puede regenerarse.
2. **Reutilización de Capas de Datos**: El servicio orquestador `EquipoSemanalService` consume `IJugadorRepository.listarActivos()`, `ICotizacionRepository.obtenerUltimasPorJugadores(...)`, `IConfiguracionMercadoRepository.obtenerConfiguracion()` e `IEstadisticaJugadorRepository.buscarPorJugadores(...)` (para sumar `minutosJugados` de la temporada más reciente de cada jugador), sin duplicar consultas ni lógica de negocio.
3. **Persistencia y Migración Idempotente**: Nuevas tablas `equipos_semanales` y `miembros_equipos_semanales` con unicidad `(ano, semana_iso)` (`ano` es el año ISO de la semana: el lunes 29/12/2025 pertenece a la semana 1 de 2026), mediante migración `1730500000000-create-team-of-the-week-tables.ts` con `IF NOT EXISTS` registrada en `database.config.ts`.
4. **Ejecución Semanal y Distributed Lock**: `TeamOfTheWeekSchedulerService` corre los lunes 01:00 UTC bajo `@Cron` con `pg_try_advisory_lock` exclusivo (`ADVISORY_LOCK_ID = 20261102`). Dentro del job, primero invoca `QuotesService.recalcularCotizacionesActivas()` (con los datos del scraper del domingo 02:00 UTC ya ingestados) y luego genera el equipo, de modo que el orden queda garantizado por el código y no depende de variables de entorno. `QuotesSchedulerService` no se modifica. La generación automática es idempotente: si ya existe equipo para la semana ISO, se omite sin modificarlo. Si falta cupo en alguna posición, se registra la advertencia en el log y no se publica nada.
5. **Endpoints REST (OpenAPI / Swagger)**: `TeamOfTheWeekController` exponiendo:
   - `GET /team-of-the-week`: Equipo de la semana vigente (200, 401, 404).
   - `GET /team-of-the-week/weeks`: Listado de semanas históricas disponibles (200, 401).
   - `GET /team-of-the-week/weeks/:year/:week`: Detalle histórico de una semana (200, 400, 401, 404).
   - `POST /team-of-the-week/generate`: Disparo manual administrativo restringido a `ADMIN` con `JwtAuthGuard` y `@Roles('ADMIN')` (200, 400, 401, 403). Sobrescribe la semana en curso; rechaza con 400 (`ReglaDeNegocioException`) si la semana ya está cerrada o si falta cupo en alguna posición.
6. **Caché L1 en Redis**: Integración con `MarketplaceCacheService` con degradación controlada e invalidación inmediata ante recálculos o generaciones manuales.
7. **Frontend (React + Vite + TypeScript)**:
   - Vista protegida `TeamOfTheWeekView` en `routes/AppRoutes.tsx` con las rutas `/team-of-the-week` y `/team-of-the-week/:year/:week` (la semana seleccionada vive en la URL; si no existe se muestra un mensaje con acción para volver a la más reciente).
   - Elemento de navegación agregado a `construirItemsNavegacion` en `Navbar`.
   - Cliente `teamOfTheWeekApi.ts` y hook `useTeamOfTheWeek.ts` con cancelación mediante `AbortSignal`.
   - Componente táctico `SoccerPitch.tsx` estilizado con CSS/SVG y tokens corporativos de `tokens.css` (4-3-3 vertical responsivo, sin imágenes).
   - Tarjetas de jugador interactivas que abren el modal preexistente `PlayerDetailModal`.
   - Selector de semanas históricas y estados de carga, error con reintento y vacío en español.
8. **Colección Postman**: Actualización de `postman/collection.json` con la carpeta `7. Equipo de la Semana` y tests de aserción para todos los códigos de respuesta.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (Backend), React 18.x + Vite (Frontend)  
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.x, `@nestjs/swagger`, `@nestjs/schedule`, `@nestjs/passport`, `passport-jwt`, `ioredis`, React Router 6.x  
**Storage**: PostgreSQL 16 (A.C.I.D., inmutabilidad y advisory locks), Redis 7.x (`ioredis` como caché L1 con degradación controlada)  
**Testing**: Jest (Unit testing para dominio backend sin base de datos), Testcontainers con PostgreSQL 16 (Integration testing para Services, Repositories y Controllers), Vitest + React Testing Library (Unit, Component e Integration tests de frontend con dobles de red)  
**Target Platform**: Web application (Desktop y Mobile responsivo $\ge 360$px)  
**Project Type**: Web Application (Monorepo backend NestJS + frontend React)  
**Performance Goals**: Generación semanal $<3$ segundos; carga de vista y cancha táctica $<1.5$ segundos en el 95% de las solicitudes; consultas cacheadas $<50$ ms  
**Constraints**: Inmutabilidad estricta de semanas pasadas; formación fija 4-3-3 con 11 jugadores exactos; rechazo de generación ante cupo incompleto; cobertura mínima del 80% en líneas y branches por stack; inmutabilidad total de tests existentes  
**Scale/Scope**: ~2.500 jugadores activos de las 5 grandes ligas europeas, 52 semanas históricas por año  

---

## Constitution Check

*GATE: Evaluado antes de Phase 0 research y revalidado post-diseño Phase 1.*

| Principio Constitucional | Estado | Evidencia y Justificación Técnica |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas y Backend Stateless** | **PASA** | **Frontend**: React (`TeamOfTheWeekView`, `SoccerPitch`).<br>**Controller**: `TeamOfTheWeekController` actúa estrictamente como pasamanos HTTP, delega al Service y mapea errores sin lógica de negocio.<br>**Service**: `EquipoSemanalService` orquesta la carga de jugadores/cotizaciones y delega toda la lógica de selección al Model.<br>**Model**: `EquipoSemanal` y `MiembroEquipoSemanal` encapsulan la totalidad de las reglas de negocio, cupos 4-3-3, ordenamiento e invariantes.<br>**Data Access**: `EquipoSemanalTypeOrmRepository` solo interactúa con la persistencia relacional. Backend 100% Stateless transaccional con PostgreSQL y caché Redis L1. |
| **II. Rich Domain Model y DDD** | **PASA** | Prohibidos los modelos anémicos. `EquipoSemanal` contiene el método de fábrica `seleccionarOnceIdeal(...)` con las reglas de selección táctica, validaciones de cupos e invariantes de cantidad por posición. No existen entidades anémicas ni lógica en controllers o services. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | **PASA** | **Backend Unit**: `test/unit/domain/equipo-semanal.entity.spec.ts` corre en aislamiento total sin BD ni servicios externos.<br>**Backend Integration**: `test/integration/marketplace/equipo-semanal.service.spec.ts` y `test/integration/marketplace/team-of-the-week.controller.spec.ts` corren sobre PostgreSQL real dinámico mediante Testcontainers.<br>**Frontend Unit & Integration**: Tests en `frontend/tests/unit/{api,hooks,components}` y `frontend/tests/integration/` (vista) usando Vitest y dobles de red controlados sin base de datos real. |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASA** | Ni un solo test existente se modifica o elimina. `QuotesSchedulerService` y sus tests no se tocan: el nuevo scheduler invoca `QuotesService.recalcularCotizacionesActivas()` sin alterar ningún contrato existente. |
| **V. Convenciones de Idioma y Terminología Técnica** | **PASA** | Identificadores de dominio en español sin acentos ni ñ: `EquipoSemanal`, `MiembroEquipoSemanal`, `ano`, `semanaIso`, `formacion`, `cotizacion`, `posicion`, `equipoNombre`, `fechaGeneracion`. Documentación y mensajes de error orientados al usuario en español. Términos técnicos de arquitectura en inglés (`Controller`, `Service`, `Repository`, `Stateless`, `Testcontainers`, `L1 Cache`, `Scheduler`). Nombres de rutas HTTP en inglés (`/team-of-the-week`). |
| **VI. Calidad de Testing: Cobertura Mínima y Ratchet** | **PASA** | Las nuevas suites garantizan una cobertura $\ge 80\%$ en líneas y branches para el nuevo código, sin degradar el coverage global del backend ni del frontend, verificable en CI con `npm run test:cov`. |
| **Definition of Done (DoD) & Postman** | **PASA** | Se actualiza `postman/collection.json` con la carpeta `7. Equipo de la Semana`, documentando todas las operaciones, parámetros, respuestas y scripts de test de validación sincronizados con los contratos OpenAPI de Swagger. |

---

## Project Structure

### Documentation (this feature)

```text
specs/014-team-of-the-week/
├── spec.md              # Especificación funcional validada
├── plan.md              # Este plan de implementación arquitectónico
├── research.md          # Decisiones de diseño y patrones (Phase 0)
├── data-model.md        # Entidades, Value Objects, invariantes y tablas (Phase 1)
├── quickstart.md        # Guía de validación y escenarios E2E ejecutables (Phase 1)
├── contracts/           # Contratos OpenAPI y tipado TypeScript (Phase 1)
│   ├── openapi-team-of-the-week.yaml
│   └── frontend-team-of-the-week.contract.ts
├── checklists/
│   └── requirements.md  # Checklist de calidad funcional validado
└── tasks.md             # Desglose ordenado de tareas de implementación (Phase 2)
```

### Source Code Layout

```text
backend/
├── src/
│   ├── config/
│   │   └── database.config.ts                           # Registro de migración 1730500000000
│   ├── domain/
│   │   ├── equipo-semanal.entity.ts                     # Rich Domain Model del Once Ideal
│   │   ├── miembro-equipo-semanal.entity.ts             # Snapshot de cada jugador
│   │   └── equipo-semanal.repository.interface.ts       # Contrato + token EQUIPO_SEMANAL_REPOSITORY
│   ├── migrations/
│   │   └── 1730500000000-create-team-of-the-week-tables.ts
│   ├── data-access/
│   │   ├── equipo-semanal.orm-entity.ts                 # Tabla equipos_semanales
│   │   ├── miembro-equipo-semanal.orm-entity.ts         # Tabla miembros_equipos_semanales
│   │   ├── equipo-semanal.mapper.ts                     # ORM <-> dominio
│   │   └── equipo-semanal.typeorm-repository.ts         # Implementación del repositorio
│   ├── services/
│   │   ├── equipo-semanal.service.ts                    # Orquestador de aplicación
│   │   ├── marketplace-cache.service.ts                 # Extensión con métodos de caché Redis
│   │   └── scheduler/
│   │       └── team-of-the-week-scheduler.service.ts    # Job semanal con pg_try_advisory_lock
│   ├── controllers/
│   │   ├── team-of-the-week.controller.ts               # Endpoints REST (/team-of-the-week)
│   │   └── dto/
│   │       ├── equipo-semanal-respuesta.dto.ts
│   │       ├── semana-disponible.dto.ts
│   │       └── resumen-generacion-equipo.dto.ts
│   └── marketplace/
│       └── marketplace.module.ts                        # Registro de entidades, repositorio, service, scheduler y controller
└── test/
    ├── unit/
    │   └── domain/
    │       └── equipo-semanal.entity.spec.ts            # Tests unitarios puros de lógica de dominio
    └── integration/
        └── marketplace/
            ├── equipo-semanal.service.spec.ts           # Integración con Testcontainers
            └── team-of-the-week.controller.spec.ts      # Integración de endpoints REST

frontend/
├── src/
│   ├── api/
│   │   └── teamOfTheWeekApi.ts                          # Cliente HTTP con AbortSignal
│   ├── hooks/
│   │   └── useTeamOfTheWeek.ts                          # Carga, error, semana (desde la URL) y modal
│   ├── types/
│   │   └── team-of-the-week.types.ts                    # Tipos UI de la feature
│   ├── utils/
│   │   └── navegacion.ts                                # Ítem en construirItemsNavegacion
│   ├── routes/
│   │   └── AppRoutes.tsx                                # /team-of-the-week y /team-of-the-week/:year/:week
│   ├── components/
│   │   └── team-of-the-week/
│   │       ├── SoccerPitch.tsx                          # Cancha vertical SVG/CSS responsiva 4-3-3
│   │       ├── PitchPlayerCard.tsx                      # Nombre, club y cotización
│   │       └── WeekSelector.tsx                         # Selector de semanas (semana, año y fecha)
│   └── views/
│       └── TeamOfTheWeekView.tsx                        # Vista con estados (vacío, carga, error, semana inexistente)
└── tests/
    ├── unit/
    │   ├── api/teamOfTheWeekApi.test.ts
    │   ├── hooks/useTeamOfTheWeek.test.ts
    │   └── components/SoccerPitch.test.tsx
    └── integration/
        └── TeamOfTheWeekView.test.tsx

postman/
└── collection.json                                      # Nueva carpeta 7. Equipo de la Semana sincronizada
```

**Structure Decision**: Se mantiene la arquitectura en capas existente (NestJS en `backend` y React en `frontend`). Todas las nuevas piezas se integran modularmente en sus carpetas correspondientes respetando las convenciones de inyección de dependencias, diseño responsivo y testing sin generar acoplamientos anómalos.

---

## Complexity Tracking

> **No existen violaciones a la Constitución**. Todas las decisiones adoptan la alternativa canónica más simple y desacoplada del framework y del lenguaje.
