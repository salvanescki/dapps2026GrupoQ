# Research: Ingesta Integral de Estadísticas WhoScored e Identidad Externa

**Feature**: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)  
**Feature Branch**: `feat/scraping-whoscored`  
**Date**: 2026-10-25 (Ajustes Obligatorios de Arquitectura)  
**Status**: Completed  

---

## 1. Decisiones Técnicas y Justificación de Arquitectura

### Decisión 1: Procedencia Completa y Unicidad Contextual Segura con `COALESCE`
- **Decisión**: Extender la entidad y tabla `estadisticas_jugadores` con `competencia` y `etapa`, preservando `NULL` para procedencia ausente en registros legacy (sin forzar `NOT NULL DEFAULT ''`).
  - **Campos de procedencia**: `fuente` (nullable), `competencia` (nullable), `liga` (nullable), `temporada` (nullable), `etapa` (nullable).
  - **Clave contextual de unicidad**:
    `(jugadorId, fuente, competencia, liga, temporada, etapa)`
  - **Estrategia PostgreSQL**: Crear un índice único funcional en PostgreSQL:
    ```sql
    CREATE UNIQUE INDEX uq_estadistica_jugador_contexto ON estadisticas_jugadores (
      jugador_id,
      COALESCE(fuente, ''),
      COALESCE(competencia, ''),
      COALESCE(liga, ''),
      COALESCE(temporada, ''),
      COALESCE(etapa, '')
    );
    ```
- **Razón**: Respeta el valor semántico de la procedencia legacy sin inventar valores ficticios y garantiza unicidad estricta en PostgreSQL aún con columnas `NULL`.

---

### Decisión 2: Estrategia de Upsert Compatible: SQL Explícito con `ON CONFLICT` en Repositorio
- **Decisión**: Descartar el uso de `conflictPaths` de TypeORM para expresiones compuestas con `COALESCE`, ya que TypeORM `upsert()` no admite expresiones SQL en `conflictPaths`.
  - **Estrategia elegida**: En `EstadisticaJugadorTypeOrmRepository`, ejecutar un `INSERT ... ON CONFLICT (...) DO UPDATE` explícito mediante QueryBuilder de TypeORM o consulta parametrizada:
    ```typescript
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(EstadisticaJugadorOrmEntity)
      .values(batch)
      .onConflict(`
        (
          jugador_id,
          COALESCE(fuente, ''),
          COALESCE(competencia, ''),
          COALESCE(liga, ''),
          COALESCE(temporada, ''),
          COALESCE(etapa, '')
        ) DO UPDATE SET
          partidos_jugados = EXCLUDED.partidos_jugados,
          minutos_jugados = EXCLUDED.minutos_jugados,
          goles = EXCLUDED.goles,
          asistencias = EXCLUDED.asistencias,
          rating = EXCLUDED.rating,
          tarjetas_amarillas = EXCLUDED.tarjetas_amarillas,
          tarjetas_rojas = EXCLUDED.tarjetas_rojas,
          precision_pase = EXCLUDED.precision_pase,
          tiros_por_partido = EXCLUDED.tiros_por_partido,
          fecha_actualizacion = EXCLUDED.fecha_actualizacion
      `)
      .execute();
    ```
  - **Integración transaccional**: El método del repositorio acepta un `transactionalEntityManager?: EntityManager` opcional. Si se provee, la operación se ejecuta dentro de la transacción de la liga gobernada por `ScrapingService` en Capa 3 (`DataSource.transaction`), sin romper las 5 capas de la arquitectura.
- **Razón**: Es la única alternativa 100% compatible con TypeORM y el índice funcional `COALESCE` de PostgreSQL, evitando hacks frágiles y garantizando atomicidad e idempotencia.

---

### Decisión 3: Migración Incremental Segura sin Borrado Silencioso de Datos
- **Decisión**: La migración `1729860000000-add-whoscored-external-identities-and-contextual-uniqueness.ts`:
  1. Agrega las columnas nullable `who_scored_player_id` en `jugadores`, `who_scored_team_id` en `equipos`, `competencia` y `etapa` en `estadisticas_jugadores`.
  2. **Detección explícita de conflictos**: En lugar de borrar filas silenciosamente, la migración ejecuta un bloque PL/pgSQL que cuenta si existen duplicados bajo la nueva clave contextual. Si detecta conflictos, **aborta la migración lanzando una excepción clara (`RAISE EXCEPTION`)** para que se audite y resuelva el conflicto de datos previo a la creación del índice.
  3. Si no hay conflictos, elimina la restricción legacy `uq_estadistica_jugador_temporada` y crea `uq_estadistica_jugador_contexto`.
  4. En `down`, revierte eliminando el índice funcional, restaurando la restricción legacy y eliminando las columnas agregadas.
- **Razón**: Protege la integridad histórica de los datos y previene pérdidas accidentales o no auditables en producción.

---

### Decisión 4: Integración Mínima de Redis L1 con Dependencia Concreta (`ioredis`)
- **Decisión**: Al constatar que el repositorio no tiene cliente Redis configurado en `backend/package.json`, se define la integración mínima necesaria incorporando una única dependencia concreta: `ioredis`:
  - **Servicio Aislado**: `ScrapingCacheService` en `backend/src/scraping/services/scraping-cache.service.ts`.
  - **Datos Cacheables**: Únicamente metadatos de descubrimiento (`tournamentId`, `seasonId`, `stageId` y lista de equipos por competición/temporada).
  - **TTL**: 24 horas (`86400s`) con invalidación manual o por cambio de temporada deportiva.
  - **Datos NO Cacheables**: Estadísticas finales de rendimiento de jugadores ni estados de auditoría.
  - **Degradación Controlada**: Si Redis está desconectado o arroja error de conexión/timeout, `ScrapingCacheService` captura el error, emite un log `WARN` y retorna `null`, permitiendo que el scraper continúe consultando directamente en vivo al navegador sin interrumpir el proceso.
- **Razón**: Satisface el requisito constitucional de Redis como L1 Cache sin introducir módulos paralelos ni acoplar la ejecución del scraper a la disponibilidad estricta de Redis.

---

### Decisión 5: Alineación Estricta con el Código Real de Controladores y DTOs
- **Decisión**:
  - `ScrapingController`: Reflejar fielmente los endpoints reales existentes:
    - `POST /scraping/ejecutar`: Código 202 con `{ ejecucionId: string, mensaje: string, inicio: Date }` invocando `scrapingService.ejecutarPipeline('manual')` directamente en el proceso. No se inventan sistemas asíncronos de colas externas ni endpoints paralelos.
    - `GET /scraping/ejecuciones`: Retorna historial paginado con `{ id, inicio, fin, estado, jugadoresProcesados, errores }`.
    - `GET /scraping/ejecuciones/:id`: Retorna detalle con array `detalle: ErrorScrapingDetalle[]`.
    - `GET /scraping/jugadores/:id/estadisticas`: Retorna `EstadisticasJugadorResponse` tal como está implementado en `scraping.service.ts` (`jugador: { id, nombre, posicion, dorsal }`, `temporada`, `liga`, `rol`, `estadisticas`, `fechaActualizacion`).
- **Razón**: Elimina inconsistencias entre la documentación OpenAPI y el código TypeScript compilado.

---

### Decisión 6: Transferencias y Deduplicación Rigurosa
- **Decisión**:
  - Si la fuente entrega acumulados oficiales de temporada, se preservan sin sumar.
  - Si existen múltiples registros para el mismo `whoScoredPlayerId`:
    1. Se buscan marcas cronológicas o fechas en el feed.
    2. En ausencia de contexto cronológico: como **último fallback explícito**, se evalúa el club donde registra mayor cantidad de minutos en la etapa.
    3. Si la ambigüedad persiste (minutos idénticos o métricas incompatibles): **NO se inventa asociación ni consolidación**. Se registra la incidencia en auditoría y el registro se excluye de la publicación.
- **Razón**: Previene la corrupción de métricas deportivas y asignaciones erróneas de jugadores a clubes en los que no disputaron minutos activos.

---

### Decisión 7: Inmutabilidad Constitucional de Tests y Nuevos Archivos de Prueba
- **Decisión**: En cumplimiento no negociable del Principio IV de la Constitution, los tests preexistentes no se modifican ni eliminan. Toda nueva funcionalidad de esta feature se probará mediante **archivos de test nuevos**:
  - `backend/test/unit/domain/jugador.identidad-externa.spec.ts` (Nuevo)
  - `backend/test/unit/domain/equipo.identidad-externa.spec.ts` (Nuevo)
  - `backend/test/unit/scraping/estadistica-jugador.procedencia.spec.ts` (Nuevo)
  - `backend/test/unit/scraping/whoscored-feed-adapter.spec.ts` (Nuevo)
  - `backend/test/unit/scraping/scraping-cache.service.spec.ts` (Nuevo)
  - `backend/test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts` (Nuevo)
- **Razón**: Cumple estrictamente la Constitution (DoD, inmutabilidad y cobertura >= 80%).
