# Tasks: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)

**Branch**: `feat/scraping-whoscored`  
**Input Documents**: `plan.md`, `spec.md`, `data-model.md`, `research.md`, `quickstart.md`, `contracts/` en `specs/011-whoscored-stats-ingestion/`  
**Constitution Reference**: `.specify/memory/constitution.md` (5 Capas, DDD Rich Domain Model, Testcontainers, Inmutabilidad de tests preexistentes, Cobertura >= 80%)

---

## Estrategia de Commits Locales Separados

Cada bloque técnico del plan se implementa, prueba y valida como una unidad de trabajo atómica y auditable antes de avanzar al siguiente. La estrategia de commits locales garantiza trazabilidad completa y no regresión:

1. **Commit 1**: `feat(domain): implementar identidad externa y procedencia contextual (Feature 01)` (Bloque 1)
2. **Commit 2**: `feat(scraping): implementar descubrimiento dinamico de competicion y equipos` (Bloque 2)
3. **Commit 3**: `feat(scraping): implementar bootstrap de sesion y adaptador de feed whoscored` (Bloque 3)
4. **Commit 4**: `feat(scraping): implementar extraccion resiliente por equipo y fallback dom observable` (Bloque 4)
5. **Commit 5**: `feat(scraping): implementar agregacion, deduplicacion y validacion de cobertura` (Bloque 5)
6. **Commit 6**: `feat(scraping): implementar asociacion local con fallback deterministico` (Bloque 6)
7. **Commit 7**: `feat(scraping): implementar publicacion transaccional aislada por liga` (Bloque 7)
8. **Commit 8**: `feat(scraping): implementar auditoria de ejecucion y cache l1 redis para descubrimiento` (Bloque 8)
9. **Commit 9**: `chore(scraping): validacion global de niveles de prueba, documentacion y dod` (Cierre y Polish)

---

## Phase 1: Setup & Prerrequisitos Base

**Propósito**: Preparación de dependencias base y verificación de entorno de ejecución sin tocar lógica de negocio.

- [X] T001 [P] Incorporar dependencias de Redis `ioredis` y `@types/ioredis` en `backend/package.json` para dar soporte a la caché L1 constitucional de descubrimiento.

---

## Phase 2: Bloque 1 - Identidad Externa y Procedencia (Feature 01) [US2] (Priority: P1)

**Objetivo**: Implementar la Feature 01 de forma autónoma antes de tocar el extractor: extender el modelo de dominio (`Jugador`, `Equipo`, `EstadisticaJugador`) y la persistencia para admitir identificadores de múltiples proveedores (`footballDataId`, `whoScoredPlayerId`, `whoScoredTeamId`), registrar metadatos de procedencia completos (`fuente`, `competencia`, `liga`, `temporada`, `etapa`) admitiendo `NULL` para registros legacy, y establecer unicidad contextual en PostgreSQL mediante índice funcional con `COALESCE`, garantizando 100% de compatibilidad con datos preexistentes y con el tipo `number` de `externalId`. La persistencia se ejecuta mediante QueryBuilder explícito con `ON CONFLICT` en el repositorio, y la migración aborta de forma explícita ante conflictos.

**Archivos Concretos**:
- `backend/src/domain/jugador.entity.ts`
- `backend/src/domain/equipo.entity.ts`
- `backend/src/scraping/domain/estadistica-jugador.entity.ts`
- `backend/src/data-access/jugador.orm-entity.ts`
- `backend/src/data-access/jugador.mapper.ts`
- `backend/src/data-access/equipo.orm-entity.ts`
- `backend/src/data-access/equipo.mapper.ts`
- `backend/src/scraping/data-access/estadistica-jugador.orm-entity.ts`
- `backend/src/scraping/data-access/estadistica-jugador.mapper.ts`
- `backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`
- `backend/src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness.ts` (Nuevo)
- `backend/test/unit/domain/jugador.identidad-externa.spec.ts` (Nuevo)
- `backend/test/unit/domain/equipo.identidad-externa.spec.ts` (Nuevo)
- `backend/test/unit/scraping/estadistica-jugador.procedencia.spec.ts` (Nuevo)
- `backend/test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts` (Nuevo)

**Dependencias**: T001 completada. Bloquea todos los bloques subsiguientes de scraping (Bloques 2 a 8).

**Tests Nuevos**:
- `backend/test/unit/domain/jugador.identidad-externa.spec.ts`
- `backend/test/unit/domain/equipo.identidad-externa.spec.ts`
- `backend/test/unit/scraping/estadistica-jugador.procedencia.spec.ts`
- `backend/test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts`

**Criterio de Aceptación**:
- Coexistencia de `externalId: number` y `whoScoredPlayerId: string | null` en `Jugador` y `Equipo`.
- Validación de que `asociarWhoScored` rechaza strings vacíos/espacios y actualiza `actualizadoEn`.
- Invariantes de `EstadisticaJugador` operativas admitiendo tupla de procedencia con `competencia` y `etapa` nullable.
- La migración agrega las columnas nullable y el índice funcional `uq_estadistica_jugador_contexto`, abortando con `RAISE EXCEPTION` sin borrar datos silenciosamente si detecta conflictos legacy.
- La condición de rollback que impide restaurar `uq_estadistica_jugador_temporada` ante múltiples contextos queda formalmente documentada en el método `down` de la migración.
- El repositorio persiste estadísticas mediante QueryBuilder con `ON CONFLICT` con expresiones `COALESCE` en PostgreSQL real.

### Tests para Bloque 1 (Feature 01)
- [X] T002 [P] [US2] Crear test unitario en `backend/test/unit/domain/jugador.identidad-externa.spec.ts` para validar invariantes de `Jugador`: `externalId: number` obligatorio positivo, getter `footballDataId: number`, propiedad `whoScoredPlayerId?: string | null`, método `asociarWhoScored(whoScoredId: string)` que rechaza cadenas vacías o solo espacios y actualiza `actualizadoEn`, y preservación de compatibilidad con `crear` existente.
- [X] T003 [P] [US2] Crear test unitario en `backend/test/unit/domain/equipo.identidad-externa.spec.ts` para validar invariantes de `Equipo`: `externalId: number` obligatorio positivo, getter `footballDataId: number`, propiedad `whoScoredTeamId?: string | null`, método `asociarWhoScored(whoScoredId: string)` que rechaza cadenas vacías y actualiza `actualizadoEn`.
- [X] T004 [P] [US2] Crear test unitario en `backend/test/unit/scraping/estadistica-jugador.procedencia.spec.ts` para validar invariantes de `EstadisticaJugador`: campos de procedencia `competencia?: string | null` (max 100 caracteres) y `etapa?: string | null` (max 50 caracteres), getters `competencia` y `etapa`, y método `actualizarEstadisticas` preservando retrocompatibilidad con llamadas legacy.
- [X] T005 [US2] Crear test de integración con Testcontainers en `backend/test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts` para validar ejecución de migración en PostgreSQL real: verificación del índice funcional `uq_estadistica_jugador_contexto`, prueba de aborto explícito (`RAISE EXCEPTION`) ante duplicados contextuales preexistentes, y verificación del `ON CONFLICT` funcional con `guardarMuchos`.

### Implementación para Bloque 1 (Feature 01)
- [X] T006 [P] [US2] Extender entidad de dominio `Jugador` en `backend/src/domain/jugador.entity.ts`: incorporar campo privado `_whoScoredPlayerId: string | null`, getter `whoScoredPlayerId`, getter `footballDataId: number` (alias de `_externalId`), método de dominio `asociarWhoScored(whoScoredId: string): void` que valida `whoScoredId.trim().length > 0` y asigna `_actualizadoEn = new Date()`, y actualizar `JugadorProps` manteniendo `externalId: number` obligatorio.
- [X] T007 [P] [US2] Extender entidad de dominio `Equipo` en `backend/src/domain/equipo.entity.ts`: incorporar campo privado `_whoScoredTeamId: string | null`, getter `whoScoredTeamId`, getter `footballDataId: number` (alias de `_externalId`), método de dominio `asociarWhoScored(whoScoredId: string): void` que valida `whoScoredId.trim().length > 0` y asigna `_actualizadoEn = new Date()`, y actualizar `EquipoProps` manteniendo `externalId: number` obligatorio.
- [X] T008 [P] [US2] Extender entidad de dominio `EstadisticaJugador` en `backend/src/scraping/domain/estadistica-jugador.entity.ts`: incorporar campos privados `_competencia: string | null` y `_etapa: string | null`, getters `competencia` y `etapa`, actualizar `EstadisticaJugadorProps` admitiendo campos nullable, y extender método `actualizarEstadisticas` para admitir `competencia` y `etapa` de forma retrocompatible.
- [X] T009 [P] [US2] Actualizar entidad ORM `JugadorOrmEntity` y mapeador `JugadorMapper` en `backend/src/data-access/jugador.orm-entity.ts` y `backend/src/data-access/jugador.mapper.ts` añadiendo columna `who_scored_player_id` (`varchar(50)`, nullable) y mapeo bidireccional.
- [X] T010 [P] [US2] Actualizar entidad ORM `EquipoOrmEntity` y mapeador `EquipoMapper` en `backend/src/data-access/equipo.orm-entity.ts` y `backend/src/data-access/equipo.mapper.ts` añadiendo columna `who_scored_team_id` (`varchar(50)`, nullable) y mapeo bidireccional.
- [X] T011 [P] [US2] Actualizar entidad ORM `EstadisticaJugadorOrmEntity` y mapeador `EstadisticaJugadorMapper` en `backend/src/scraping/data-access/estadistica-jugador.orm-entity.ts` y `backend/src/scraping/data-access/estadistica-jugador.mapper.ts` añadiendo columnas `competencia` (`varchar(100)`, nullable) y `etapa` (`varchar(50)`, nullable) y mapeo bidireccional.
- [X] T012 [US2] Crear migración incremental segura en `backend/src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness.ts`: agregar columnas nullable en `jugadores`, `equipos` y `estadisticas_jugadores`; bloque PL/pgSQL para abortar con `RAISE EXCEPTION` si existen duplicados bajo `(jugador_id, COALESCE(fuente, ''), COALESCE(competencia, ''), COALESCE(liga, ''), COALESCE(temporada, ''), COALESCE(etapa, ''))` sin borrado silencioso; eliminar restricción `uq_estadistica_jugador_temporada`; crear índice funcional `uq_estadistica_jugador_contexto`; en `down`, documentar condición de que restaurar `uq_estadistica_jugador_temporada` fallará si existen múltiples contextos para el mismo `(jugador_id, temporada)`.
- [X] T013 [US2] Implementar método de upsert contextual en `EstadisticaJugadorTypeOrmRepository` en `backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts` utilizando TypeORM QueryBuilder explícito con `onConflict` sobre la tupla funcional `(jugador_id, COALESCE(fuente, ''), COALESCE(competencia, ''), COALESCE(liga, ''), COALESCE(temporada, ''), COALESCE(etapa, ''))` y admitiendo parámetro opcional `transactionalEntityManager?: EntityManager`.
- [X] T014 [US2] Ejecutar y validar tests del Bloque 1: comprobar que `npm run test:unit -- test/unit/domain/jugador.identidad-externa.spec.ts test/unit/domain/equipo.identidad-externa.spec.ts test/unit/scraping/estadistica-jugador.procedencia.spec.ts` finalicen en PASS y los tests unitarios existentes permanezcan intactos.

**Checkpoint Bloque 1**: Feature 01 100% implementada y probada. Listo para Commit 1.

---

## Phase 3: Bloque 2 - Descubrimiento de Competición y Equipos [US1] [US3] (Priority: P2)

**Objetivo**: Resolver dinámicamente y validar para cada una de las 5 grandes ligas (PL, LL, SA, BL, L1) la estructura competitiva en WhoScored (`tournamentId`, `seasonId`, `stageId`, `competencia`, `etapa`) y el catálogo canónico de equipos participantes con sus respectivos `whoScoredTeamId` y nombres, separando esta fase de la extracción de métricas.

**Archivos Concretos**:
- `backend/src/config/scraping.config.ts`
- `backend/src/scraping/services/whoscored-playwright.service.ts`
- `backend/test/unit/scraping/whoscored-descubrimiento.spec.ts` (Nuevo)

**Dependencias**: Bloque 1 completado.

**Tests Nuevos**:
- `backend/test/unit/scraping/whoscored-descubrimiento.spec.ts`

**Criterio de Aceptación**:
- Resolución de `tournamentId`, `seasonId`, `stageId`, `competencia` y `etapa` a partir de la configuración o DOM.
- Descubrimiento de la nómina canónica de equipos participantes de la liga con sus respectivos `whoScoredTeamId`.
- Manejo de discrepancias de temporada con registro de advertencia sin abortar el proceso.

### Tests para Bloque 2
- [X] T015 [P] [US1] Crear test unitario en `backend/test/unit/scraping/whoscored-descubrimiento.spec.ts` con fixtures de DOM para validar extracción de `tournamentId`, `seasonId`, `stageId`, `competencia`, `etapa` y lista de equipos (`whoScoredTeamId`, `nombre`, `url`) para Premier League, La Liga, Serie A, Bundesliga y Ligue 1.

### Implementación para Bloque 2
- [X] T016 [P] [US1] Configurar parámetros base de las 5 ligas en `backend/src/config/scraping.config.ts`: definir hints de torneos, temporada deportiva objetivo (`2025/2026`), pausas humanas configurables (1.5s - 3.5s) y umbrales operativos por liga (mínimo 350 jugadores por liga, mínimo 2000 jugadores global).
- [X] T017 [US1] Implementar métodos de descubrimiento dinámico en `backend/src/scraping/services/whoscored-playwright.service.ts`: navegación a URL de torneo, extracción de metadatos de torneo/etapa y resolución de la nómina de equipos participantes retornando interfaz tipada `EstructuraCompeticionWhoScored`.
- [X] T018 [US1] Ejecutar y validar tests del Bloque 2: verificar que `npm run test:unit -- test/unit/scraping/whoscored-descubrimiento.spec.ts` pase al 100%.

**Checkpoint Bloque 2**: Descubrimiento dinámico de competición y equipos operativo. Listo para Commit 2.

---

## Phase 4: Bloque 3 - Sesión de Navegación y Adaptador del Feed WhoScored [US3] (Priority: P2)

**Objetivo**: Gobernar el ciclo de vida del navegador Chromium con plugin Stealth en Playwright, warmup de la sesión navegando a la competición para resolver desafíos Cloudflare, capturar cookies de sesión y construir un adaptador aislado (`WhoScoredFeedAdapter`) que valide la estructura del feed JSON de estadísticas antes de consumirlo.

**Archivos Concretos**:
- `backend/src/scraping/services/whoscored-feed-adapter.interface.ts` (Nuevo)
- `backend/src/scraping/services/whoscored-playwright.service.ts`
- `backend/test/unit/scraping/whoscored-feed-adapter.spec.ts` (Nuevo)

**Dependencias**: Bloque 2 completado.

**Tests Nuevos**:
- `backend/test/unit/scraping/whoscored-feed-adapter.spec.ts`

**Criterio de Aceptación**:
- Lanzamiento de Playwright con Chromium y plugin Stealth operativo.
- Retención y propagación de cookies y cabeceras de sesión de navegación.
- Validación estricta del esquema mínimo de `RawWhoScoredFeedItem` (`playerId`, `name`, `minsPlayed`, `goals`, `assists`, `rating`), lanzando `WhoScoredFeedIncompatibleException` si el JSON no cumple el contrato.

### Tests para Bloque 3
- [X] T019 [P] [US3] Crear test unitario en `backend/test/unit/scraping/whoscored-feed-adapter.spec.ts` para validar warmup de sesión stealth, captura de cookies, cabeceras requeridas (`User-Agent`, `Referer`), validación de esquema de payload JSON con fixtures válidos e inválidos, y lanzamiento de `WhoScoredFeedIncompatibleException` ante respuestas corruptas.

### Implementación para Bloque 3
- [X] T020 [P] [US3] Definir interfaces de contrato y excepciones en `backend/src/scraping/services/whoscored-feed-adapter.interface.ts` alineadas con `contracts/whoscored-feed.contract.md`: interfaz `RawWhoScoredFeedItem` (`playerId`, `name`, `teamId`, `teamName`, `apps`, `minsPlayed`, `goals`, `assists`, `rating`), interfaz `WhoScoredFeedResponse`, y clase `WhoScoredFeedIncompatibleException`.
- [X] T021 [US3] Implementar bootstrap de sesión y cliente del adaptador de feed en `backend/src/scraping/services/whoscored-playwright.service.ts`: inicialización stealth, resolución de retos anti-bot, inyección de cookies en peticiones HTTP al feed de WhoScored y validación rigurosa del payload retornado antes de entregarlo a capas superiores.
- [X] T022 [US3] Ejecutar y validar tests del Bloque 3: verificar que `npm run test:unit -- test/unit/scraping/whoscored-feed-adapter.spec.ts` pase al 100%.

**Checkpoint Bloque 3**: Adaptador de feed validado y gobernanza de sesión operativa. Listo para Commit 3.

---

## Phase 5: Bloque 4 - Extracción por Equipo y Resiliencia [US3] [US7] (Priority: P2)

**Objetivo**: Extraer secuencialmente la nómina completa de jugadores y métricas equipo por equipo para la etapa activa, aplicando pausas humanas reguladas (1.5s - 3.5s), backoff exponencial hasta 3 reintentos ante fallas transitorias, fallback DOM explícito y observable si el feed falla, y aislamiento estricto de errores por equipo.

**Archivos Concretos**:
- `backend/src/scraping/services/whoscored-playwright.service.ts`
- `backend/test/unit/scraping/scraping-extraccion-equipo.spec.ts` (Nuevo)

**Dependencias**: Bloques 2 y 3 completados.

**Tests Nuevos**:
- `backend/test/unit/scraping/scraping-extraccion-equipo.spec.ts`

**Criterio de Aceptación**:
- Extracción equipo por equipo con pausas aleatorias reguladas (1.5s - 3.5s).
- Política de resiliencia: hasta 3 reintentos ante timeouts/5xx, pausa de 10s ante HTTP 429.
- Aislamiento por equipo: si un equipo falla tras agotar reintentos, se anota el incidente y se continúa con los siguientes equipos de la liga sin abortar.
- Fallback DOM explícito y observable ante falla del feed, emitiendo log `WARN` y registrando incidencia en auditoría sin eludir las reglas de cobertura.

### Tests para Bloque 4
- [X] T023 [P] [US3] Crear test unitario en `backend/test/unit/scraping/scraping-extraccion-equipo.spec.ts` para validar simulación de extracción por equipo: aplicación de retardos entre consultas, política de 3 reintentos con backoff, pausa de 10s ante HTTP 429, aislamiento de falla en 1 equipo continuando con los restantes, y activación observable del fallback DOM con log de advertencia.

### Implementación para Bloque 4
- [X] T024 [US3] Implementar ciclo de extracción por equipo en `backend/src/scraping/services/whoscored-playwright.service.ts`: iteración sobre el catálogo de equipos descubiertos, aplicación de pausas reguladas con jitter (1.5s a 3.5s), reintentos exponenciales ante fallas transitorias y aislamiento estricto de errores por equipo.
- [X] T025 [US3] Implementar fallback DOM explícito y observable en `backend/src/scraping/services/whoscored-playwright.service.ts` como alternativa de extracción ante incompatibilidad o falla del feed HTTP, emitiendo advertencia `WARN` en el logger y anotando el evento como incidente auditable.
- [X] T026 [US3] Ejecutar y validar tests del Bloque 4: verificar que `npm run test:unit -- test/unit/scraping/scraping-extraccion-equipo.spec.ts` pase al 100%.

**Checkpoint Bloque 4**: Extracción equipo por equipo resiliente con fallback DOM observable operativa. Listo para Commit 4.

---

## Phase 6: Bloque 5 - Agregación, Deduplicación y Validación de Cobertura por Liga [US1] [US4] (Priority: P1) 🎯 MVP Core

**Objetivo**: Consolidar los registros de todos los equipos de la liga, deduplicar jugadores por `whoScoredPlayerId` resolviendo transferencias internas sin duplicar métricas acumuladas (sin inferir club por minutos salvo último fallback y registrando incidencias ante ambigüedad), y verificar los umbrales de salvaguarda de cobertura mínima (>= **350 jugadores** con minutos en la liga, y >= **2.000 jugadores** en corrida global).

**Archivos Concretos**:
- `backend/src/scraping/services/scraping.service.ts`
- `backend/test/unit/scraping/scraping-agregacion-deduplicacion.spec.ts` (Nuevo)

**Dependencias**: Bloques 1 a 4 completados.

**Tests Nuevos**:
- `backend/test/unit/scraping/scraping-agregacion-deduplicacion.spec.ts`

**Criterio de Aceptación**:
- Deduplicación unívoca por `whoScoredPlayerId`.
- Preservación de métricas acumuladas oficiales de temporada ante transferencias internas.
- Evaluación de minutos como último fallback explícito en ausencia de contexto cronológico; descarte preventivo y registro de incidencia ante ambigüedad persistente.
- Rechazo automático de ligas con cobertura < 350 jugadores con minutos (`rechazada_cobertura_insuficiente`), bloqueando su publicación sin alterar datos vigentes.
- Verificación de umbral global >= 2.000 jugadores en corrida de 5 ligas.

### Tests para Bloque 5
- [X] T027 [P] [US4] Crear test unitario en `backend/test/unit/scraping/scraping-agregacion-deduplicacion.spec.ts` con fixtures determinísticos: prueba de jugador transferido con métricas acumuladas oficiales (sin sumar de nuevo), prueba de jugador transferido ambiguo sin contexto cronológico ni diferencia de minutos (exclusión preventiva e incidencia), rechazo de liga con 349 jugadores por cobertura insuficiente, y aprobación de liga con >= 350 jugadores.

### Implementación para Bloque 5
- [X] T028 [US4] Implementar agregación y deduplicación por `whoScoredPlayerId` en `backend/src/scraping/services/scraping.service.ts`: consolidación de registros por liga, resolución de transferencias conservando acumulados oficiales, evaluación de club con mayor cantidad de minutos como último fallback explícito, y exclusión preventiva con anotación de incidencia ante ambigüedad sin inventar datos.
- [X] T029 [US4] Implementar validación de salvaguarda de cobertura mínima en `backend/src/scraping/services/scraping.service.ts`: verificar que la nómina consolidada cuente con al menos 350 jugadores con minutos para la liga (y 2000 jugadores en corrida global), marcando la liga como `rechazada_cobertura_insuficiente` y bloqueando el avance a publicación ante extracciones truncadas.
- [X] T030 [US4] Ejecutar y validar tests del Bloque 5: verificar que `npm run test:unit -- test/unit/scraping/scraping-agregacion-deduplicacion.spec.ts` pase al 100%.

**Checkpoint Bloque 5**: Agregación, deduplicación rigurosa y salvaguardas de cobertura por liga operativas. Listo para Commit 5.

---

## Phase 7: Bloque 6 - Asociación Local y Fallback Determinístico [US5] (Priority: P2)

**Objetivo**: Vincular cada registro extraído con el jugador local correspondiente en la base de datos priorizando coincidencia unívoca por `whoScoredPlayerId` (Nivel 1), aplicando fallback determinístico por normalización estricta de nombre + equipo local reutilizando `NormalizadorJugadorService` (Nivel 2), enriqueciendo la ficha local con el `whoScoredPlayerId` descubierto mediante el nuevo método `asociarWhoScored`, y validando que la tasa de asociación sea de al menos el **85%**.

**Archivos Concretos**:
- `backend/src/scraping/services/normalizador-jugador.service.ts`
- `backend/src/scraping/services/scraping.service.ts`
- `backend/test/unit/scraping/scraping-asociacion-local.spec.ts` (Nuevo)

**Dependencias**: Bloques 1 y 5 completados.

**Tests Nuevos**:
- `backend/test/unit/scraping/scraping-asociacion-local.spec.ts`

**Criterio de Aceptación**:
- Match Nivel 1 inmediato y exacto por `whoScoredPlayerId`.
- Match Nivel 2 determinístico por normalización estricta (minúsculas, sin tildes) + club local.
- Invocación de `jugador.asociarWhoScored` para enriquecer la entidad local ante match Nivel 2 exitoso.
- Descarte y registro en incidencias ante ambigüedad (múltiples candidatos locales con el mismo nombre normalizado en el club) sin matching difuso.
- Rechazo de liga cuya tasa de asociación resulte < 85% (`rechazada_baja_asociacion`).

### Tests para Bloque 6
- [X] T031 [P] [US5] Crear test unitario en `backend/test/unit/scraping/scraping-asociacion-local.spec.ts` para validar asociación local: coincidencia directa Nivel 1 por `whoScoredPlayerId`, coincidencia Nivel 2 por normalización estricta y equipo local con enriquecimiento de ID WhoScored, descarte preventivo ante múltiples jugadores con el mismo nombre normalizado, y rechazo de liga con tasa de asociación inferior al 85%.

### Implementación para Bloque 6
- [X] T032 [US5] Implementar lógica de asociación en dos niveles en `backend/src/scraping/services/scraping.service.ts`: Nivel 1 por `whoScoredPlayerId` directo; Nivel 2 mediante `NormalizadorJugadorService.normalizarNombre()` comparado contra la plantilla del equipo local en base de datos, descartando candidatos ambiguos sin inventar coincidencias difusas.
- [X] T033 [US5] Implementar enriquecimiento de jugadores locales con `asociarWhoScored` y validación de umbral de asociación (>= 85%) en `backend/src/scraping/services/scraping.service.ts`, marcando la liga como `rechazada_baja_asociacion` y bloqueando la publicación si no se alcanza el porcentaje requerido.
- [X] T034 [US5] Ejecutar y validar tests del Bloque 6: verificar que `npm run test:unit -- test/unit/scraping/scraping-asociacion-local.spec.ts` pase al 100%.

**Checkpoint Bloque 6**: Asociación certera en dos niveles y umbral de 85% operativos. Listo para Commit 6.

---

## Phase 8: Bloque 7 - Publicación Segura e Idempotente por Liga [US6] (Priority: P2)

**Objetivo**: Persistir de forma atómica, aislada e idempotente las estadísticas aprobadas y las asociaciones de jugadores de cada liga que superó tanto la cobertura (>= 350) como la asociación (>= 85%), utilizando `DataSource.transaction` por liga en Capa 3 e integrando repositorios de Capa 5 con `EntityManager` transaccional y QueryBuilder con `ON CONFLICT` explícito, garantizando que si una liga falla o se rechaza, sus datos vigentes y los de las demás ligas permanezcan intactos.

**Archivos Concretos**:
- `backend/src/data-access/jugador.typeorm-repository.ts`
- `backend/src/scraping/services/scraping.service.ts`
- `backend/test/integration/scraping/scraping-publicacion-liga.integration.spec.ts` (Nuevo)

**Dependencias**: Bloques 1, 5 y 6 completados.

**Tests Nuevos**:
- `backend/test/integration/scraping/scraping-publicacion-liga.integration.spec.ts`

**Criterio de Aceptación**:
- Publicación atómica por liga gobernada por `DataSource.transaction` en `ScrapingService` (Capa 3) delegando `EntityManager` transaccional a repositorios (Capa 5).
- Aislamiento estricto: falla en una liga no afecta a las ligas aprobadas ni destruye datos históricos de la liga fallida.
- Idempotencia estricta comprobada en PostgreSQL real: re-ejecución idéntica produce 0 registros duplicados.

### Tests para Bloque 7
- [X] T035 [P] [US6] Crear test de integración con Testcontainers en `backend/test/integration/scraping/scraping-publicacion-liga.integration.spec.ts` para verificar publicación atómica en PostgreSQL real: commit transaccional por liga, aislamiento de fallos (forzar error en 1 liga y verificar que las restantes se publican y la fallida queda inalterada), e idempotencia estricta (re-ejecutar corrida idéntica comprobando 0 inserciones duplicadas).

### Implementación para Bloque 7
- [X] T036 [US6] Extender `backend/src/data-access/jugador.typeorm-repository.ts` para soportar parámetro opcional `transactionalEntityManager?: EntityManager` en los métodos de persistencia y actualización de ficha de jugador.
- [X] T037 [US6] Implementar orquestación transaccional por liga con `DataSource.transaction` en `backend/src/scraping/services/scraping.service.ts`: coordinar la persistencia de estadísticas asociadas y jugadores enriquecidos delegando en `EstadisticaJugadorTypeOrmRepository.guardarMuchos` y `JugadorTypeOrmRepository` bajo el ámbito del `EntityManager` transaccional únicamente para ligas con validaciones aprobadas.
- [X] T038 [US6] Ejecutar y validar tests del Bloque 7: verificar que `npm run test:integration -- test/integration/scraping/scraping-publicacion-liga.integration.spec.ts` pase al 100%.

**Checkpoint Bloque 7**: Publicación transaccional e idempotente por liga validada en PostgreSQL. Listo para Commit 7.

---

## Phase 9: Bloque 8 - Operación, Auditoría y Subbloque Redis L1 [US7] (Priority: P3)

**Objetivo**: Instrumentar el registro de auditoría (`ejecuciones_scraping`) con métricas estructuradas por liga en base de datos, implementar el subbloque separable de caché L1 con Redis para metadatos de descubrimiento con TTL de 24h y degradación controlada usando `ioredis`, verificar que la API REST refleje estrictamente el controlador existente, y validar la suite de pruebas garantizando cobertura >= 80%.

**Archivos Concretos**:
- `backend/src/scraping/domain/ejecucion-scraping.entity.ts`
- `backend/src/scraping/services/scraping-cache.service.ts` (Nuevo)
- `backend/src/scraping/scraping.module.ts`
- `backend/src/scraping/controllers/scraping.controller.ts`
- `backend/src/scraping/services/scraping.service.ts`
- `backend/test/unit/scraping/scraping-cache.service.spec.ts` (Nuevo)
- `backend/test/unit/scraping/scraping-auditoria-operacion.spec.ts` (Nuevo)

**Dependencias**: Bloques 1 a 7 completados.

**Tests Nuevos**:
- `backend/test/unit/scraping/scraping-cache.service.spec.ts`
- `backend/test/unit/scraping/scraping-auditoria-operacion.spec.ts`

**Criterio de Aceptación**:
- Subbloque Redis L1 (`ScrapingCacheService` con `ioredis`): almacena y consulta metadatos de descubrimiento con TTL de 24h (`86400s`); ante timeout o indisponibilidad de Redis emite log `WARN` y retorna `null` permitiendo consulta en vivo sin fallar.
- Auditoría integral persistida en `ejecuciones_scraping` con desglose estructurado por liga en campo `detalle` JSONB.
- Controlador `ScrapingController` alineado fielmente con `contracts/scraping-api.contract.md` (HTTP 202 con `{ ejecucionId, mensaje, inicio }` y HTTP 409 ante ejecución concurrente sin inventar colas asíncronas externas).

### Tests para Bloque 8
- [ ] T039 [P] [US7] Crear test unitario en `backend/test/unit/scraping/scraping-cache.service.spec.ts` mockeando el cliente `ioredis`: validar almacenamiento de metadatos de torneo y catálogo de equipos con TTL de 24h, cache hit, cache miss, y degradación controlada emitiendo log `WARN` y retornando `null` ante error de conexión o timeout sin abortar la ejecución.
- [ ] T040 [P] [US7] Crear test unitario en `backend/test/unit/scraping/scraping-auditoria-operacion.spec.ts` para verificar registro de auditoría en `EjecucionScraping` (inicio, fin, estado, desglose por liga en `detalle` JSONB: jugadores descubiertos, asociados, descartados e incidencias) y validación de endpoints en `ScrapingController` respetando código 202 en `POST /scraping/ejecutar` y 409 ante ejecución concurrente.

### Implementación para Bloque 8
- [ ] T041 [P] [US7] Implementar servicio de caché L1 `ScrapingCacheService` en `backend/src/scraping/services/scraping-cache.service.ts` utilizando dependencia `ioredis`: gestión de claves `whoscored:discovery:{competencia}:{temporada}` y `whoscored:teams:{competencia}:{stageId}` con TTL de 24 horas y degradación controlada con captura de excepciones y log `WARN`.
- [ ] T042 [P] [US7] Registrar `ScrapingCacheService` en `backend/src/scraping/scraping.module.ts` e inyectarlo en `WhoScoredPlaywrightService` para verificación previa de caché L1 en la etapa de descubrimiento de competiciones y equipos.
- [ ] T043 [US7] Actualizar registro de auditoría en `backend/src/scraping/services/scraping.service.ts`: estructurar las métricas de cada corrida por liga (estado de validación, cobertura, tasa de asociación, incidentes aislados) y persistir en la entidad `EjecucionScraping` y su repositorio TypeORM.
- [ ] T044 [US7] Verificar y asegurar que `backend/src/scraping/controllers/scraping.controller.ts` coincida estrictamente con `contracts/scraping-api.contract.md` en códigos de respuesta, DTOs y manejo de concurrencia sin inventar sistemas asíncronos externos.
- [ ] T045 [US7] Ejecutar y validar tests del Bloque 8: verificar que `npm run test:unit -- test/unit/scraping/scraping-cache.service.spec.ts test/unit/scraping/scraping-auditoria-operacion.spec.ts` pase al 100%.

**Checkpoint Bloque 8**: Auditoría exhaustiva, subbloque Redis L1 y contratos HTTP verificados. Listo para Commit 8.

---

## Phase 10: Validación Global y Separación de Entornos de Ejecución (Polish & DoD)

**Propósito**: Ejecutar la validación completa en los tres niveles de ejecución claramente separados, documentar la suite y ratificar el cumplimiento irrestricto de la Constitution.

- [ ] T046 [P] Validar Nivel 1 (Tests Unitarios Mockeados en Aislamiento Absoluto): ejecutar `npm run test:unit` en `backend/` verificando 100% PASS sin requerir PostgreSQL, Redis ni conexión externa a WhoScored, garantizando 0 modificaciones en tests preexistentes.
- [ ] T047 [P] Validar Nivel 2 (Integración y Migración con Testcontainers): ejecutar `npm run test:integration` en `backend/` verificando que la migración incremental y la persistencia transaccional funcionen correctamente sobre PostgreSQL real sin duplicación de filas.
- [ ] T048 Validar Nivel 3 (Compilación y Verificación del Runner Scraper): ejecutar `npm run build` en `backend/` verificando compilación TypeScript estricta sin errores de tipos y comprobar que el runner `backend/src/run-scraper.ts` ejecute el pipeline completo de scraping bajo demanda conforme a `quickstart.md`.
- [ ] T049 [P] Sincronizar y actualizar documentación OpenAPI y colección Postman en `backend/` (o directorio de especificación) reflejando fielmente los esquemas de respuestas y contratos REST validados.
- [ ] T050 Validar cumplimiento de métricas constitucionales de testing (Principio VI): ejecutar reporte de cobertura en `backend/` verificando que todo el código nuevo alcance al menos 80% de líneas y 80% de bifurcaciones (branches) sin degradar las métricas previas.

---

## Dependencias & Orden de Ejecución

### Dependencias entre Bloques

```text
Phase 1: Setup (T001)
   │
   ▼
Phase 2: Bloque 1 - Identidad Externa y Procedencia (Feature 01: T002-T014) [BLOQUEANTE]
   │
   ├──────────────────────────────┐
   ▼                              ▼
Phase 3: Bloque 2 (T015-T018)     Phase 4: Bloque 3 (T019-T022)
(Descubrimiento Ligas/Equipos)    (Sesión & Feed Adapter)
   │                              │
   └──────────────┬───────────────┘
                  ▼
Phase 5: Bloque 4 (T023-T026)
(Extracción por Equipo & Resiliencia)
   │
   ▼
Phase 6: Bloque 5 (T027-T030)
(Agregación, Deduplicación & Cobertura >= 350)
   │
   ▼
Phase 7: Bloque 6 (T031-T034)
(Asociación Local & Umbral >= 85%)
   │
   ▼
Phase 8: Bloque 7 (T035-T038)
(Publicación Segura e Idempotente por Liga)
   │
   ▼
Phase 9: Bloque 8 (T039-T045)
(Auditoría, Subbloque Redis L1 & Contratos HTTP)
   │
   ▼
Phase 10: Validación Global (T046-T050)
(Nivel 1 Unitario, Nivel 2 Testcontainers, Nivel 3 Runner Scraper, DoD)
```

### Oportunidades de Ejecución Paralela
- **Dentro de Bloque 1**: Tests unitarios T002, T003 y T004 se pueden escribir en paralelo. Mapeadores y entidades T006, T007, T008, T009, T010, T011 se pueden desarrollar en paralelo (archivos independientes).
- **Entre Bloques 2 y 3**: Una vez completado el Bloque 1, el Bloque 2 (descubrimiento de torneos) y el Bloque 3 (sesión stealth y adaptador de feed) pueden implementarse en paralelo por desarrolladores distintos.
- **Dentro de Bloque 8**: El subbloque Redis L1 (T039, T041, T042) puede implementarse en paralelo con la verificación de auditoría y controladores (T040, T043, T044).
- **En Phase 10**: T046 (Unitarios) y T047 (Integración) pueden ejecutarse en paralelo en pipelines de CI separados.

---

## Estrategia de Entrega Incremental (MVP First)

1. **Incremento 1 (Cimiento Estructural - Bloque 1)**: Entregar la Feature 01 completa con migración segura sin borrado silencioso y entidades preparadas. La base de datos y el dominio quedan 100% listos para asociar IDs de WhoScored sin riesgo de regresión ni colisión.
2. **Incremento 2 (Descubrimiento y Extracción - Bloques 2 a 4)**: Desarrollar el adaptador de WhoScored resolviendo torneos, sesión stealth y extracción por equipo con reintentos y pausas humanas.
3. **Incremento 3 (Consolidación y Asociación - Bloques 5 y 6)**: Implementar deduplicación y filtros de cobertura (>= 350) y asociación (>= 85%). La extracción queda protegida contra entregas truncadas o datos inflados.
4. **Incremento 4 (Persistencia Idempotente y Operación - Bloques 7 y 8)**: Activar la publicación transaccional con `DataSource.transaction` por liga, auditoría estructurada y caché L1 Redis.
5. **Incremento 5 (DoD y Certificación)**: Validación integral de suites unitarias, Testcontainers y runner de scraping con verificación del 80% de cobertura.
