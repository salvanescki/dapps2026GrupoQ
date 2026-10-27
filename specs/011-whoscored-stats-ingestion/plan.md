# Implementation Plan: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)

**Branch**: `feat/scraping-whoscored` | **Date**: 2026-10-25 (Ajustes Obligatorios de Arquitectura) | **Spec**: [spec.md](file:///home/nikkoros/dev/dapps2026GrupoQ/specs/011-whoscored-stats-ingestion/spec.md)  
**Input**: Especificación de feature en `/specs/011-whoscored-stats-ingestion/spec.md`, código existente en `backend/` y directivas de revisión técnica del usuario.

---

## Summary

Esta feature paraguas resuelve definitivamente la ingesta de estadísticas de WhoScored en las 5 grandes ligas europeas (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) superando la restricción de lectura sobre las ~10 filas visibles de la tabla web para capturar el universo real de aproximadamente 2.500 jugadores activos (>350 jugadores con minutos por liga).

Dado que la rama `feat/scraping-whoscored` carece de la Feature 01 de identidad externa y procedencia, esta feature la implementa desde cero como primer bloque estructural previo a tocar el extractor:
1. **Identidad Externa y Procedencia Completa (Feature 01)**: Coexistencia de `externalId` (identificador originario de football-data, conservado como `number` para retrocompatibilidad total), `whoScoredPlayerId` (`string | null`), `whoScoredTeamId` (`string | null`), metadatos de procedencia completos (`fuente`, `competencia`, `liga`, `temporada`, `etapa`) admitiendo valores `NULL` para registros legacy, y unicidad contextual en PostgreSQL mediante índice funcional con `COALESCE`:
   `(jugadorId, fuente, competencia, liga, temporada, etapa)`.
   La persistencia de estadísticas se realiza mediante SQL explícito / QueryBuilder con `ON CONFLICT` en el repositorio, eliminando cualquier dependencia de `conflictPaths` con expresiones SQL. La migración incremental detecta duplicados legacy y aborta con error claro si existen conflictos, sin borrado silencioso de datos.
2. **Estrategia Híbrida WhoScored**:
   - *Navegador (Playwright con Stealth)* para bootstrap de sesión, resolución de retos anti-bot y descubrimiento dinámico de la estructura de torneo y equipos.
   - *Adaptador de Feed HTTP* (`WhoScoredFeedAdapter`) tratado como dependencia externa no garantizada, que valida el esquema mínimo del JSON de estadísticas antes de procesarlo.
   - *Fallback DOM explícito y observable* únicamente si el feed resulta incompatible, sin permitir publicaciones con cobertura incompleta (< 350 jugadores por liga).
3. **Caché L1 con Redis**: Integración obligatoria según la Constitution (dependencia concreta `ioredis`) acotada exclusivamente a metadatos de descubrimiento (torneo, etapa y catálogo de equipos) con TTL de 24 horas y degradación controlada ante indisponibilidad, sin cachear estadísticas finales para preservar la frescura e idempotencia.
4. **Publicación Atómica en 5 Capas con `DataSource.transaction`**: Persistencia gobernada por transacción por liga donde el servicio coordina el ámbito transaccional y delega en los repositorios pasando un `EntityManager` transaccional. Una liga rechazada por cobertura (< 350 jugadores) o baja asociación (< 85%) no altera sus datos ni contamina a las demás ligas.

---

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+  
**Primary Dependencies**: NestJS 11, TypeORM 0.3.20, Playwright 1.44+, Playwright-Extra, Puppeteer-Extra-Plugin-Stealth, PostgreSQL Driver (`pg`), Redis client (`ioredis`)  
**Storage**: PostgreSQL 16 (Almacenamiento primario A.C.I.D. con índice funcional de unicidad contextual y auditoría en JSONB); Redis como L1 Cache para metadatos de descubrimiento  
**Testing**: Jest 30 (unitarios mockeados en aislamiento total y Testcontainers PostgreSQL para integración de persistencia y migraciones)  
**Target Platform**: Linux / Contenedor Docker  
**Project Type**: Web-service REST API modular en NestJS  
**Performance Goals**: Extracción completa de las 5 ligas en < 10 minutos con pausas de cortesía, tasa de asociación determinística >= 85%, publicación transaccional en < 5 segundos por liga  
**Constraints**: Pausas reguladas (1.5s - 3.5s) entre equipos; 0 modificaciones destructivas en tests existentes; arquitectura en 5 capas; sin cambios de frontend ni microservicios  
**Scale/Scope**: 5 ligas europeas fijas (PL, PD, SA, BL1, FL1), ~98 equipos, ~2.500 jugadores activos y sus correspondientes 25 métricas de rendimiento  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principio I: Arquitectura en 5 Capas y Backend Stateless**:
  - `Controller`: Adaptador REST (`ScrapingController`). Sin lógica de negocio.
  - `Service`: Coordinación y orquestación del pipeline (`ScrapingService`, `WhoScoredPlaywrightService`, `NormalizadorJugadorService`, `ScrapingCacheService`). Coordina el ámbito transaccional sin manipular SQL.
  - `Model (Dominio)`: Invariantes y reglas de negocio (`Jugador`, `Equipo`, `EstadisticaJugador`, `EjecucionScraping`).
  - `Repository`: Persistencia desacoplada (`JugadorTypeOrmRepository`, `EquipoTypeOrmRepository`, `EstadisticaJugadorTypeOrmRepository`, `EjecucionScrapingTypeOrmRepository`) con soporte para `EntityManager` transaccional.
  - `Persistencia`: PostgreSQL (A.C.I.D.) y Redis como L1 Cache para metadatos de descubrimiento.
- [x] **Principio II: Rich Domain Model y DDD**:
  - Prohibidos objetos anémicos. Mutaciones encapsuladas en métodos de dominio con validación de invariantes.
- [x] **Principio III: Estrategia de Testing Rigurosa y Testcontainers**:
  - Unitarios con aislamiento total y fixtures determinísticos (sin requerir BD, Redis ni WhoScored real).
  - Integración de repositorios y migraciones contra PostgreSQL real vía Testcontainers.
- [x] **Principio IV: Política Estricta de Inmutabilidad de Tests**:
  - 0 modificaciones o eliminaciones de tests existentes. Todos los nuevos casos se implementan en archivos de test nuevos.
- [x] **Principio V: Convenciones de Idioma y Terminología Técnica**:
  - Dominio y variables en español sin acentos; terminología técnica en inglés.
- [x] **Principio VI: Calidad de Testing: Test Coverage Mínimo**:
  - Cobertura >= 80% de líneas y branches en código nuevo sin reducir métricas existentes.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-whoscored-stats-ingestion/
├── plan.md              # Este archivo (Plan técnico detallado por bloques)
├── research.md          # Decisiones técnicas justificadas, Redis L1 y alternativas
├── data-model.md        # Entidades, esquema SQL, restricción contextual y migración
├── quickstart.md        # Guía de validación paso a paso por niveles (unitario, integración, scraper)
└── contracts/
    ├── whoscored-feed.contract.md  # Contrato del adaptador de feed y fallback DOM
    └── scraping-api.contract.md    # Contrato REST API alineado con ScrapingController
```

### Source Code Layout

```text
backend/src/
├── config/
│   ├── database.config.ts                       # Configuración PostgreSQL
│   └── scraping.config.ts                       # Hints de ligas, delays y umbrales
├── domain/                                      # Capa de Modelo (Dominio DDD)
│   ├── jugador.entity.ts                        # Jugador (externalId: number, whoScoredPlayerId)
│   ├── jugador.repository.interface.ts          # Contrato de repositorio de Jugador
│   ├── equipo.entity.ts                         # Equipo (externalId: number, whoScoredTeamId)
│   └── equipo.repository.interface.ts           # Contrato de repositorio de Equipo
├── data-access/                                 # Capa de Repositorios (Persistencia)
│   ├── jugador.orm-entity.ts                    # ORM con who_scored_player_id
│   ├── jugador.mapper.ts                        # Mapeador bidireccional
│   ├── jugador.typeorm-repository.ts            # Implementación TypeORM con soporte transaccional
│   ├── equipo.orm-entity.ts                     # ORM con who_scored_team_id
│   ├── equipo.mapper.ts                         # Mapeador bidireccional
│   └── equipo.typeorm-repository.ts             # Implementación TypeORM
├── migrations/
│   ├── 1715000000000-create-scraping-tables.ts
│   └── 1729860000000-add-whoscored-external-identities-and-contextual-uniqueness.ts
└── scraping/
    ├── controllers/
    │   └── scraping.controller.ts               # REST API (/scraping/*)
    ├── domain/                                  # Dominio específico de scraping
    │   ├── estadistica-jugador.entity.ts        # EstadisticaJugador (competencia, etapa, procedencia)
    │   ├── estadistica-jugador.repository.interface.ts
    │   ├── ejecucion-scraping.entity.ts         # Auditoría con detalle de corrida
    │   └── ejecucion-scraping.repository.interface.ts
    ├── data-access/
    │   ├── estadistica-jugador.orm-entity.ts    # ORM con uq_estadistica_jugador_contexto
    │   ├── estadistica-jugador.mapper.ts
    │   ├── estadistica-jugador.typeorm-repository.ts # Persistencia transaccional con QueryBuilder
    │   ├── ejecucion-scraping.orm-entity.ts
    │   ├── ejecucion-scraping.mapper.ts
    │   └── ejecucion-scraping.typeorm-repository.ts
    ├── services/
    │   ├── whoscored-playwright.service.ts      # Browser session, adaptadores y feed client
    │   ├── normalizador-jugador.service.ts      # Normalización estricta determinística
    │   ├── scraping-cache.service.ts            # Subbloque Redis L1 para descubrimiento (TTL 24h)
    │   └── scraping.service.ts                  # Orquestador del pipeline y transacciones en 5 capas
    └── scraping.module.ts
```

---

## Bloques Técnicos de Implementación

---

### Bloque 1: Identidad Externa y Procedencia (Feature 01)

#### Objetivo
Implementar la Feature 01 como bloque y commit independiente previo a tocar el extractor: extender el modelo de dominio y la persistencia para admitir identificadores de múltiples proveedores (`footballDataId`, `whoScoredPlayerId`, `whoScoredTeamId`), registrar metadatos de procedencia completos (`fuente`, `competencia`, `liga`, `temporada`, `etapa`) admitiendo valores `NULL` para registros legacy, y establecer unicidad contextual en base de datos mediante índice funcional con `COALESCE`, garantizando 100% de compatibilidad con datos preexistentes y con el tipo `number` de `externalId`. La persistencia se ejecuta mediante QueryBuilder explícito con `ON CONFLICT` en el repositorio, y la migración aborta de forma segura ante conflictos.

#### Archivos Existentes Candidatos
- `backend/src/domain/jugador.entity.ts`
- `backend/src/domain/equipo.entity.ts`
- `backend/src/data-access/jugador.orm-entity.ts`
- `backend/src/data-access/jugador.mapper.ts`
- `backend/src/data-access/equipo.orm-entity.ts`
- `backend/src/data-access/equipo.mapper.ts`
- `backend/src/scraping/domain/estadistica-jugador.entity.ts`
- `backend/src/scraping/data-access/estadistica-jugador.orm-entity.ts`
- `backend/src/scraping/data-access/estadistica-jugador.mapper.ts`
- `backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`
- `backend/src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness.ts` (Nuevo)

#### Capas Involucradas
- Modelo (Dominio DDD).
- Data Access (Mappers, ORM Entities y TypeORM Repositories con QueryBuilder).
- Base de Datos (Migración PostgreSQL segura con detección de conflictos).

#### Dependencias
- TypeORM, PostgreSQL Driver (`pg`).

#### Contratos de Entrada/Salida
- **Entrada**: Instanciación o carga de entidades con `externalId: number`, opcionalmente `whoScoredPlayerId?: string | null`, `whoScoredTeamId?: string | null`, y tupla de procedencia con campos nullable (`competencia?: string | null`, `etapa?: string | null`, `fuente?: string | null`).
- **Salida**: Entidades con getters explícitos `externalId`, `footballDataId`, `whoScoredPlayerId`, `whoScoredTeamId`, `competencia`, `etapa`, `liga`, `temporada`.

#### Errores Esperables
- Error en migración si existen duplicados contextuales en `estadisticas_jugadores`: la migración detecta los conflictos y aborta lanzando `RAISE EXCEPTION` sin borrar datos silenciosamente.
- `ReglaDeNegocioException` si se ingresa un `whoScoredPlayerId` inválido o con solo espacios.

#### Tests Requeridos
- Unitarios Nuevos (aislamiento total):
  - `backend/test/unit/domain/jugador.identidad-externa.spec.ts`: Coexistencia de `externalId` y `whoScoredPlayerId`, nuevo método de dominio `asociarWhoScored`.
  - `backend/test/unit/domain/equipo.identidad-externa.spec.ts`: Coexistencia de `externalId` y `whoScoredTeamId`, nuevo método de dominio `asociarWhoScored`.
  - `backend/test/unit/scraping/estadistica-jugador.procedencia.spec.ts`: Procedencia completa con `competencia` y `etapa` nullable.
- Integración Nuevos (Testcontainers PostgreSQL):
  - `backend/test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts`: Guardado con restricción contextual funcional `uq_estadistica_jugador_contexto` mediante QueryBuilder explícito.

#### Criterio de Finalización
Migración aplicada exitosamente; entidades y mapeadores operativos; suite unitaria existente pasando al 100% sin regresiones de tipos.

#### Archivos Fuera de Alcance
Servicios de scraping, controladores REST, caché Redis, frontend.

#### Tamaño Esperado del Cambio
Mediano (~300 líneas modificadas/añadidas, 1 archivo de migración, 4 archivos de test nuevos).

---

### Bloque 2: Descubrimiento de Competición y Equipos

#### Objetivo
Resolver dinámicamente y validar para cada una de las 5 grandes ligas (PL, PD, SA, BL1, FL1) la estructura competitiva en WhoScored (`tournamentId`, `seasonId`, `stageId`, `competencia`, `etapa`) y el catálogo canónico de equipos participantes con sus respectivos `whoScoredTeamId` y nombres, separando esta fase de la extracción de métricas.

#### Archivos Existentes Candidatos
- `backend/src/config/scraping.config.ts`
- `backend/src/scraping/services/whoscored-playwright.service.ts`

#### Capas Involucradas
- Configuración.
- Servicios de Scraping (Integración).

#### Dependencias
- Playwright Chromium con Stealth.

#### Contratos de Entrada/Salida
- **Entrada**: `LigaScrapingConfig` (`liga`, `regionId`, `tournamentId`, temporada objetivo ej: `2025/2026`).
- **Salida**: `EstructuraCompeticionWhoScored` conteniendo `tournamentId`, `seasonId`, `stageId`, `competencia`, `etapa` y lista de `equipos: Array<{ whoScoredTeamId: string; nombre: string; url: string }>`.

#### Errores Esperables
- Discrepancia entre la temporada descubierta y la temporada configurada: emitir advertencia y registrar en auditoría.
- Error 404 o cambio de URL de torneo: reintentar y, si no resuelve, aislar la liga afectada sin interrumpir las otras ligas.

#### Tests Requeridos
- Unitarios (con fixtures de DOM):
  - `backend/test/unit/scraping/whoscored-playwright.service.spec.ts`: Mockear DOM de página de torneo y verificar extracción de los equipos participantes con sus `whoScoredTeamId`.

#### Criterio de Finalización
El servicio resuelve exitosamente los equipos y parámetros de torneo activos para cada liga configurada.

#### Archivos Fuera de Alcance
Extracción de estadísticas individuales de jugadores, persistencia en BD.

#### Tamaño Esperado del Cambio
Pequeño (~150 líneas).

---

### Bloque 3: Sesión y Adaptador del Feed

#### Objetivo
Gobernar el ciclo de vida del navegador Chromium con plugin Stealth en Playwright, warmup de la sesión navegando a la competición para resolver desafíos Cloudflare, capturar cookies de sesión y construir un adaptador aislado (`WhoScoredFeedAdapter`) que valide la estructura del feed JSON de estadísticas antes de consumirlo.

#### Archivos Existentes Candidatos
- `backend/src/scraping/services/whoscored-playwright.service.ts`

#### Capas Involucradas
- Servicios de Scraping (Integración y Adaptadores Externos).

#### Dependencias
- `playwright`, `playwright-extra`, `puppeteer-extra-plugin-stealth`.

#### Contratos de Entrada/Salida
- **Entrada**: Parámetros del feed (`stageId`, `teamIds`, `category`, `statsAccumulationType`).
- **Salida**: Payload verificado tipado conteniendo `playerTableStats: Array<RawWhoScoredFeedItem>`.

#### Errores Esperables
- **HTTP 403 / Cloudflare Turnstile**: Reto interactivo. Mitigación: recrear contexto browser, pausa progresiva.
- **Sesión expirada**: Ausencia de cookies en la respuesta. Mitigación: re-ejecutar bootstrap de navegación en la URL del torneo.
- **Feed incompatible o parámetros cambiados**: JSON no cumple el esquema mínimo. Mitigación: lanzar `WhoScoredFeedIncompatibleException` para activar fallback DOM en el Bloque 4.

#### Tests Requeridos
- Unitarios Nuevos:
  - `backend/test/unit/scraping/whoscored-feed-adapter.spec.ts`: Validar inicialización stealth, manejo de cookies y validación de esquema del feed JSON con fixtures válidos e inválidos.

#### Criterio de Finalización
El adaptador es capaz de realizar peticiones autenticadas y validar respuestas JSON en pruebas unitarias controladas.

#### Archivos Fuera de Alcance
Recorrido de la liga completa, asociación con BD local.

#### Tamaño Esperado del Cambio
Mediano (~200 líneas).

---

### Bloque 4: Extracción por Equipo y Resiliencia

#### Objetivo
Extraer secuencialmente la nómina completa de jugadores y métricas equipo por equipo para la etapa activa, aplicando pausas humanas reguladas (1.5s - 3.5s), backoff exponencial hasta 3 reintentos ante fallas transitorias, fallback DOM explícito y observable si el feed falla, y aislamiento estricto de errores por equipo.

#### Archivos Existentes Candidatos
- `backend/src/scraping/services/whoscored-playwright.service.ts`

#### Capas Involucradas
- Servicios de Scraping.

#### Dependencias
- Bloque 2 (equipos descubiertos) y Bloque 3 (adaptador de sesión y feed).

#### Contratos de Entrada/Salida
- **Entrada**: Catálogo de equipos descubiertos y configuración de liga.
- **Salida**: `Map<string, RawWhoScoredPlayerStats>` acumulando los jugadores de todos los equipos exitosos de la liga, y lista de incidentes aislados.

#### Errores Esperables
- **HTTP 429 Rate Limiting**: Pausa obligatoria de 10s y reintento.
- **Falla persistente en 1 equipo tras 3 intentos**: Registrar incidente en la auditoría y continuar con el siguiente equipo.
- **Fallback DOM con datos truncados**: Extrae lo visible, pero queda sujeto a la validación de cobertura del Bloque 5.

#### Tests Requeridos
- Unitarios:
  - `backend/test/unit/scraping/scraping-resilience.spec.ts`: Simular falla en 1 equipo con 3 reintentos; verificar que los restantes equipos se extraen sin abortar la liga.
  - Verificar que el fallback DOM se activa y se registra como observable.

#### Criterio de Finalización
El servicio recorre la totalidad de equipos de una liga tolerando fallos aislados sin caer en bloqueos de red.

#### Archivos Fuera de Alcance
Asociación con jugadores de base de datos, transacciones SQL.

#### Tamaño Esperado del Cambio
Mediano (~250 líneas).

---

### Bloque 5: Agregación, Deduplicación y Validación

#### Objetivo
Consolidar los registros de todos los equipos de la liga, deduplicar jugadores por `whoScoredPlayerId` resolviendo transferencias internas sin duplicar métricas acumuladas (sin inferir club por minutos salvo último fallback y registrando incidencias ante ambigüedad), y verificar los umbrales de salvaguarda de cobertura mínima (>= **350 jugadores** con minutos en la liga, y >= **2.000 jugadores** en corrida global).

#### Archivos Existentes Candidatos
- `backend/src/scraping/services/scraping.service.ts`

#### Capas Involucradas
- Servicios de Aplicación / Orquestación.

#### Dependencias
- Bloque 4 (datos extraídos por equipo).

#### Contratos de Entrada/Salida
- **Entrada**: Lista de `RawWhoScoredPlayerStats` de la liga.
- **Salida**: Nómina consolidada deduplicada por `whoScoredPlayerId`, y resultado de validación `{ valida: boolean; total: number; motivo?: string }`.

#### Errores Esperables
- Jugador transferido en la misma liga:
  - Si el feed provee acumulados oficiales de temporada, se preservan sin sumar.
  - Si no existe contexto cronológico confiable: como **último fallback explícito**, se evalúa el club donde registra mayor cantidad de minutos.
  - Si la ambigüedad persiste (minutos iguales o métricas contradictorias): **NO** se inventa asociación ni consolidación; se anota la incidencia en auditoría y se excluye el registro de la publicación.
- Cobertura inferior a 350 jugadores: la liga se marca como `rechazada_cobertura_insuficiente` y se bloquea su publicación.

#### Tests Requeridos
- Unitarios (con fixtures):
  - `backend/test/unit/scraping/scraping.service.spec.ts`:
    - Fixture de jugador transferido con métricas acumuladas: deduplicación exacta por ID externo.
    - Fixture de jugador transferido ambiguo sin contexto: registro de incidencia y exclusión preventiva.
    - Fixture de liga con 349 jugadores: rechazo por salvaguarda de cobertura.
    - Fixture de liga con 380 jugadores: aprobación de salvaguarda.

#### Criterio de Finalización
La nómina queda deduplicada con 0 métricas infladas y se bloquea la publicación de cualquier extracción truncada.

#### Archivos Fuera de Alcance
Asociación local con catálogo de BD, persistencia SQL.

#### Tamaño Esperado del Cambio
Pequeño (~150 líneas).

---

### Bloque 6: Asociación Local

#### Objetivo
Vincular cada registro extraído con el jugador local correspondiente en la base de datos priorizando coincidencia unívoca por `whoScoredPlayerId` (Nivel 1), aplicando fallback determinístico por normalización estricta de nombre + equipo local reutilizando `NormalizadorJugadorService` (Nivel 2), enriqueciendo la ficha local con el `whoScoredPlayerId` descubierto mediante el nuevo método `asociarWhoScored`, y validando que la tasa de asociación sea de al menos el **85%**.

#### Archivos Existentes Candidatos
- `backend/src/scraping/services/normalizador-jugador.service.ts`
- `backend/src/scraping/services/scraping.service.ts`

#### Capas Involucradas
- Servicios de Scraping / Dominio.

#### Dependencias
- Bloque 1 (entidades `Jugador` preparadas) y Bloque 5 (datos deduplicados).

#### Contratos de Entrada/Salida
- **Entrada**: Jugadores extraídos deduplicados y catálogo de jugadores locales de la liga.
- **Salida**: Asociaciones válidas `{ jugadorLocal: Jugador; stats: EstadisticaJugador }`, jugadores actualizados con su ID WhoScored, y lista de descartados.

#### Errores Esperables
- Ambigüedad (dos jugadores locales con el mismo nombre normalizado en el mismo club): descarte preventivo sin forzar coincidencia probabilística.
- Tasa de asociación < 85%: la liga se marca como `rechazada_baja_asociacion` y se bloquea su publicación.

#### Tests Requeridos
- Unitarios:
  - `backend/test/unit/scraping/scraping.service.spec.ts`:
    - Match Nivel 1 por `whoScoredPlayerId`.
    - Match Nivel 2 por normalización estricta + club local y enriquecimiento de `whoScoredPlayerId`.
    - Descarte de casos ambiguos.
    - Rechazo de liga con tasa de asociación < 85%.

#### Criterio de Finalización
La asociación opera de forma certera sin falsos positivos y enriquece los IDs para corridas posteriores.

#### Archivos Fuera de Alcance
Publicación transaccional SQL, controladores REST.

#### Tamaño Esperado del Cambio
Mediano (~180 líneas).

---

### Bloque 7: Publicación Segura por Liga

#### Objetivo
Persistir de forma atómica, aislada e idempotente las estadísticas aprobadas y las asociaciones de jugadores de cada liga que superó tanto la cobertura (>= 350) como la asociación (>= 85%), utilizando `DataSource.transaction` por liga en Capa 3 e integrando repositorios de Capa 5 con `EntityManager` transaccional y QueryBuilder con `ON CONFLICT` explícito, garantizando que si una liga falla o se rechaza, sus datos vigentes y los de las demás ligas permanezcan intactos.

#### Archivos Existentes Candidatos
- `backend/src/scraping/services/scraping.service.ts`
- `backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`
- `backend/src/data-access/jugador.typeorm-repository.ts`

#### Capas Involucradas
- Servicios de Aplicación (Capa 3 - Coordinación transaccional).
- Data Access (Capa 5 - Repositorios TypeORM con QueryBuilder y `EntityManager` transaccional).

#### Dependencias
- Bloque 1 (restricción contextual funcional con `COALESCE` en BD) y Bloques 5-6 (validaciones de cobertura y asociación).

#### Contratos de Entrada/Salida
- **Entrada**: Lote de `EstadisticaJugador` y lote de `Jugador` enriquecidos para una liga aprobada.
- **Salida**: Confirmación de commit transaccional sin duplicación de filas.

#### Errores Esperables
- Error de BD durante el guardado de una liga: rollback atómico de esa liga vía `DataSource.transaction`; las demás ligas completan su publicación normalmente.
- Re-ejecución con mismos datos: 0 registros duplicados, valores inalterados (idempotencia estricta).

#### Tests Requeridos
- Integración (con Testcontainers PostgreSQL):
  - `backend/test/integration/scraping/scraping-upsert.spec.ts`:
    - Idempotencia: dos ejecuciones consecutivas producen exactamente la misma cantidad de filas en PostgreSQL.
    - Aislamiento: forzar fallo en 1 liga y verificar que las demás ligas se publican y la fallida conserva sus datos intactos.

#### Criterio de Finalización
Idempotencia y aislamiento por liga comprobados en base de datos relacional real.

#### Archivos Fuera de Alcance
Endpoints HTTP, Frontend, Redis.

#### Tamaño Esperado del Cambio
Mediano (~180 líneas).

---

### Bloque 8: Operación, Auditoría y Tests (con Subbloque Redis L1)

#### Objetivo
Instrumentar el registro de auditoría (`ejecuciones_scraping`) con métricas estructuradas por liga en base de datos, implementar el subbloque separable de caché L1 con Redis para metadatos de descubrimiento con TTL de 24h y degradación controlada usando `ioredis`, verificar que la API REST refleje estrictamente el controlador existente, y validar la suite de pruebas garantizando cobertura >= 80%.

#### Archivos Existentes Candidatos
- `backend/src/scraping/domain/ejecucion-scraping.entity.ts`
- `backend/src/scraping/services/scraping-cache.service.ts` (Nuevo, subbloque Redis L1 con `ioredis`)
- `backend/src/scraping/controllers/scraping.controller.ts`
- `backend/src/scraping/scraping.module.ts`
- `backend/test/unit/scraping/ejecucion-scraping.entity.spec.ts`
- `backend/test/unit/scraping/scraping-cache.service.spec.ts` (Nuevo)
- `backend/test/unit/scraping/scraping.controller.spec.ts`

#### Capas Involucradas
- Dominio, Servicios, Controladores y Testing.

#### Subbloque Separable: Integración Redis L1
- **Dependencia Concreta**: `ioredis`.
- **Responsabilidad**: Gestionar `whoscored:discovery:{competencia}:{temporada}` y `whoscored:teams:{competencia}:{stageId}` con TTL de 24 horas e invalidación por temporada.
- **Degradación Controlada**: Si Redis no responde, el servicio emite log `WARN` y consulta en vivo al navegador sin interrumpir el pipeline.
- **Aislamiento**: Desacoplado conceptualmente de la persistencia de auditoría (que reside en PostgreSQL).

#### Contratos de Entrada/Salida
- **Entrada**: Llamada HTTP `POST /scraping/ejecutar` o runner standalone.
- **Salida**: Respuesta 202 con `{ ejecucionId, mensaje, inicio }` y ejecución en proceso; registro de auditoría persistido con desglose por liga.

#### Errores Esperables
- Redis no disponible: log `WARN` y bypass automático (degradación controlada, 0 caídas).
- Conectividad global interrumpida: ejecución finaliza en estado `fallido` con registro en BD.

#### Tests Requeridos
- Unitarios (en aislamiento total):
  - `backend/test/unit/scraping/scraping-cache.service.spec.ts`: Validar TTL de 24h, cache hit, cache miss y degradación controlada con mock de `ioredis`.
  - `backend/test/unit/scraping/ejecucion-scraping.entity.spec.ts`: Validar métricas de auditoría por liga.
  - `backend/test/unit/scraping/scraping.controller.spec.ts`: Validar endpoints REST existentes.
- Cobertura global:
  - `npm run test:unit` pasando al 100% con >= 80% de líneas y branches.

#### Criterio de Finalización
Pipeline completo operativo, auditoría pormenorizada por liga, endpoints alineados y DoD satisfecho.

#### Archivos Fuera de Alcance
Frontend React, microservicios, pipelines externos de CI/CD.

#### Tamaño Esperado del Cambio
Mediano (~220 líneas).

---

## Matriz de Cobertura de Riesgos Técnicos

| Riesgo Técnico / Operativo | Bloque Responsable | Mecanismo de Mitigación |
| :--- | :--- | :--- |
| **HTTP 403 / Cloudflare Challenge** | Bloques 3 y 4 | Navegación con Playwright Stealth para resolver cookies de sesión; recreación de contexto browser y pausas con backoff. |
| **Rate Limiting (HTTP 429)** | Bloque 4 | Intervalos humanos aleatorios (1.5s - 3.5s) entre equipos; pausa fija de 10s ante respuesta 429. |
| **Sesiones Expiradas** | Bloques 3 y 4 | Detección de ausencia de cookies o redirección; re-ejecución automática de bootstrap de navegación. |
| **Parámetros Cambiados en Feed** | Bloque 3 | Validación estricta de esquema JSON en `WhoScoredFeedAdapter`; fallback automático a extracción DOM. |
| **Respuestas Incompletas por Equipo** | Bloque 4 | Aislamiento estricto por equipo: hasta 3 reintentos; si persiste, se aísla el club y se continúa con los demás. |
| **Extracción Truncada (< 350 jugadores)** | Bloque 5 | Umbral de cobertura mínima obligatoria. Si no se alcanza, la liga se rechaza y sus datos vigentes quedan intactos. |
| **Falsos Positivos en Asociación** | Bloque 6 | Coincidencia determinística estricta (ID directo o normalización de nombre + club local); descarte de casos ambiguos. |
| **Baja Asociación (< 85%)** | Bloque 6 | Umbral de asociación obligatorio. Si es menor a 85%, la liga se rechaza. |
| **Contaminación entre Ligas** | Bloque 7 | Transacciones independientes con `DataSource.transaction` por liga y `EntityManager` en repositorios. Aislamiento total de fallos. |
| **Regresiones en Código Legacy** | Bloque 1 | `externalId` conservado como `number` obligatorio; inmutabilidad estricta de tests preexistentes probando en archivos de test nuevos. |
| **Indisponibilidad de Redis** | Bloque 8 | Degradación controlada en `ScrapingCacheService`: bypass de caché a consulta en vivo sin interrumpir el proceso. |

---

## Definición de Terminado (DoD)

1. **Tests Completos y Exitosos**:
   - Tests unitarios pasando al 100% en aislamiento con fixtures representativos en archivos de test nuevos.
   - Tests de integración pasando contra PostgreSQL real (vía Testcontainers).
   - Cobertura de líneas y branches >= 80% en todo el código nuevo.
2. **Compilación y Despliegue**:
   - `npm run build` sin errores de tipado o empaquetado.
   - Aplicación levanta correctamente en entorno local y Docker.
3. **Contratos y Documentación Actualizados**:
   - Documentación OpenAPI y colección Postman al día reflejando los contratos existentes.
