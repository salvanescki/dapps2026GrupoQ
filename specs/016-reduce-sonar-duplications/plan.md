# Implementation Plan: Reducción Integral de Duplicación de Código en SonarQube Cloud

**Branch**: `016-reduce-sonar-duplications` | **Date**: 2026-11-13 | **Spec**: [spec.md](file:///home/nikkoros/dev/dapps2026GrupoQ/specs/016-reduce-sonar-duplications/spec.md)

**Input**: Feature specification from `/specs/016-reduce-sonar-duplications/spec.md`

## Summary

Eliminar el 100% de la duplicación de código detectada por SonarQube Cloud en el proyecto `salvanescki_dapps2026GrupoQ` (actualmente **562 líneas duplicadas / 2.0% en `Overall Code` y 1.47% en `New Code`**, distribuidas en **23 bloques y 10 archivos**), llevándola a **0 líneas duplicadas (0.0%)** mediante:
1. **Refactorización de los 7 archivos de código productivo (11 bloques, 199 líneas duplicadas)** respetando estrictamente la arquitectura en 5 capas:
   - **Capa `Model (Dominio)`**: Consolidar las reglas de `Jugador.normalizarPosicion` en `backend/src/domain/jugador.entity.ts` (43 líneas, 2 bloques) mediante una estructura declarativa de términos por posición, y unificar la definición de métricas estadísticas en `backend/src/scraping/domain/estadistica-jugador.entity.ts` (26 líneas, 2 bloques) derivando el tipo `MetricasEstadisticasJugador` desde las tuplas constantes del dominio.
   - **Capa `Data Access (Repository)`**: Extraer el helper privado `aplicarFiltrosYEjecutar` en `backend/src/data-access/transaccion.typeorm-repository.ts` (34 líneas, 2 bloques) para centralizar el filtrado común (`jugadorId`, `desde`, `hasta`), ordenamiento, paginación y mapeo a dominio entre `listarPorUsuario` y `listarAuditoriaGlobal`.
   - **Capa `Service`**: Extraer la clase abstracta `BaseRedisCacheService` en `backend/src/services/base-redis-cache.service.ts` para eliminar los 2 bloques (54 líneas: 27 + 27) entre `backend/src/services/marketplace-cache.service.ts` y `backend/src/scraping/services/scraping-cache.service.ts` preservando las firmas de constructor e interfaz pública; y reutilizar `MetricasEstadisticasJugador` del dominio en `RawWhoScoredPlayerStats` dentro de `backend/src/scraping/services/whoscored-playwright.service.ts` (26 líneas, 2 bloques).
   - **Capa `Frontend`**: Estructurar `EstadisticasJugador` en `frontend/src/types/player.types.ts` (16 líneas, 1 bloque) mediante `Partial<Record<CampoMetricaOpcionalJugador, number | null>>` manteniendo idéntico el contrato de tipado consumido por los componentes de vista (`StatsGrid.tsx`).
2. **Exclusión de migraciones históricas en CPD (12 bloques, 363 líneas duplicadas)**: Configurar `sonar.cpd.exclusions=backend/src/migrations/**` en `sonar-project.properties` sin alterar el contenido de las 3 migraciones históricas de esquemas TypeORM.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (`backend` y `frontend`)

**Primary Dependencies**: NestJS 10, TypeORM 0.3, `ioredis` (Backend); React 18, Vite (Frontend)

**Storage**: PostgreSQL (persistencia relacional A.C.I.D. vía TypeORM) y Redis (caché L1) — sin cambios de esquema ni de claves de almacenamiento

**Testing**: Jest + Testcontainers (PostgreSQL real en `backend`), Vitest / Testing Library (`frontend`)

**Target Platform**: Contenedores Docker sobre Linux y entorno de análisis continuo SonarQube Cloud (Región EU)

**Project Type**: Aplicación web full-stack (`backend` API REST en NestJS + `frontend` SPA en React)

**Performance Goals**: Impacto nulo en latencia HTTP y tiempos de consulta; preservación íntegra de TTLs y políticas de degradación controlada en caché L1 Redis

**Constraints**:
- Separación estricta y unidireccional en 5 capas (`Frontend` -> `Controller` -> `Service` -> `Model` <- `Data Access`).
- Prohibición absoluta de modificar o eliminar pruebas preexistentes (Principio IV de la Constitución).
- Cobertura mínima de pruebas ≥ 80% en líneas (`lines`) y ≥ 80% en bifurcaciones (`branches`) medida de forma independiente en `backend` y `frontend`.
- Inmutabilidad de los 3 archivos históricos de migraciones TypeORM (`backend/src/migrations/**`).

**Scale/Scope**: 7 archivos de código productivo a refactorizar (6 en `backend`, 1 en `frontend`), 1 clase base nueva en `backend/src/services/base-redis-cache.service.ts` con sus pruebas unitarias correspondientes, y 1 archivo de configuración (`sonar-project.properties`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluación Pre-Phase 0 y Re-evaluación Post-Phase 1

| Principio Constitucional | Estado Pre-Phase 0 | Estado Post-Phase 1 | Justificación Técnica |
| --- | --- | --- | --- |
| **I. Arquitectura en 5 Capas y Backend Stateless** | PASS | PASS | Cada consolidación ocurre dentro de su propia capa (`Jugador` y `EstadisticaJugador` en `Model`; `TransaccionTypeOrmRepository` en `Data Access`; `BaseRedisCacheService`, `MarketplaceCacheService`, `ScrapingCacheService` y `WhoScoredPlaywrightService` en `Service`; `player.types.ts` en `Frontend`). La única referencia entre capas (`WhoScoredPlaywrightService` -> `EstadisticaJugador`) respeta la dirección permitida `Service -> Model`. El backend permanece 100% Stateless. |
| **II. Rich Domain Model y DDD** | PASS | PASS | `Jugador.normalizarPosicion` conserva toda la lógica de normalización de posiciones dentro de la entidad `Jugador`, y `EstadisticaJugador` mantiene sus invariantes y definiciones de métricas dentro de la capa `Model`. No se introducen modelos anémicos ni se traslada lógica de negocio a servicios o repositorios. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | PASS | PASS | Se mantienen todas las pruebas unitarias de dominio y de integración con Testcontainers existentes, y se agregan pruebas unitarias específicas para cubrir todos los caminos felices y de degradación controlada de `BaseRedisCacheService`. |
| **IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)** | PASS | PASS | Las firmas públicas, constructores (`new MarketplaceCacheService(mockRedis)`, `new ScrapingCacheService(mockRedis)`), métodos de repositorio y tipos exportados se preservan intactos al 100%. **0 tests preexistentes serán modificados o eliminados.** |
| **V. Convenciones de Idioma y Terminología Técnica** | PASS | PASS | Toda la documentación (`spec.md`, `plan.md`, `research.md`, `quickstart.md`) está redactada en español; los identificadores de dominio utilizan español sin acentos ni letra `ñ` (`aplicarFiltrosYEjecutar`, `MetricasEstadisticasJugador`, `CampoMetricaOpcionalJugador`) y los términos técnicos mantienen el estándar en inglés (`BaseRedisCacheService`, `Repository`, `TTL`). |
| **VI. Calidad de Testing: Test Coverage Mínimo (≥ 80% Lines & Branches)** | PASS | PASS | Al reducir líneas duplicadas y cubrir la nueva clase `BaseRedisCacheService` con pruebas unitarias exhaustivas (incluyendo ramas de error y desconexión Redis), tanto `backend` como `frontend` mantienen una cobertura ≥ 80% en líneas y ≥ 80% en ramas por separado. |
| **Definición de Terminado (DoD) — Compilación, Tests y Postman/Swagger** | PASS | PASS | No se modifican endpoints HTTP, DTOs ni códigos de estado REST; la especificación OpenAPI (Swagger) y la colección Postman permanecen 100% sincronizadas y su verificación explícita queda registrada en `quickstart.md`. |

**Resultado Global del Gate**: **PASS** (0 violaciones).

## Project Structure

### Documentation (this feature)

```text
specs/016-reduce-sonar-duplications/
├── spec.md              # Especificación funcional y matriz de trazabilidad
├── plan.md              # Este archivo (Plan de implementación técnica)
├── research.md          # Phase 0: Decisiones técnicas por bloque duplicado y CPD
├── quickstart.md        # Phase 1: Guía de validación de compilación, tests, cobertura y SonarQube
└── tasks.md             # Phase 2: Generado en la etapa /speckit-tasks
```

*(Nota: No se generan `data-model.md` ni `/contracts/` dado que esta característica no introduce cambios en tablas/esquemas de base de datos ni modifica contratos de endpoints REST públicos).*

### Source Code (repository root)

```text
sonar-project.properties                                         # Configuración de sonar.cpd.exclusions=backend/src/migrations/**

backend/
├── src/
│   ├── domain/
│   │   └── jugador.entity.ts                                    # Refactorización declarativa de Jugador.normalizarPosicion (43 líneas dup -> 0)
│   ├── data-access/
│   │   └── transaccion.typeorm-repository.ts                    # Extracción de helper privado aplicarFiltrosYEjecutar (34 líneas dup -> 0)
│   ├── services/
│   │   ├── base-redis-cache.service.ts                          # [NUEVO] Clase abstracta L1 Redis con degradación elegante
│   │   └── marketplace-cache.service.ts                         # Extiende BaseRedisCacheService (27 líneas dup -> 0)
│   └── scraping/
│       ├── domain/
│       │   └── estadistica-jugador.entity.ts                    # Define MetricasEstadisticasJugador desde tuplas de dominio (26 líneas dup -> 0)
│       └── services/
│           ├── scraping-cache.service.ts                        # Extiende BaseRedisCacheService (27 líneas dup -> 0)
│           └── whoscored-playwright.service.ts                  # RawWhoScoredPlayerStats extiende MetricasEstadisticasJugador (26 líneas dup -> 0)
└── test/
    └── unit/
        └── services/
            └── base-redis-cache.service.spec.ts                 # [NUEVO] Tests unitarios para BaseRedisCacheService (≥80% lines/branches)

frontend/
└── src/
    └── types/
        └── player.types.ts                                      # EstadisticasJugador usa Partial<Record<CampoMetricaOpcionalJugador, number | null>> (16 líneas dup -> 0)
```

**Structure Decision**: Se conserva la estructura multiproyecto web (`backend/` y `frontend/`) y la organización interna en 5 capas. El único archivo nuevo de producción es `backend/src/services/base-redis-cache.service.ts` dentro de la capa `Service`, acompañado de su suite de pruebas unitarias `backend/test/unit/services/base-redis-cache.service.spec.ts`.

## Detalle de Diseño Técnico por Área de Intervención

### Área 1: `backend/src/domain/jugador.entity.ts` (Capa `Model`)
- **Problema**: Líneas `124-154` y `132-166` (43 líneas duplicadas, 2 bloques) en `Jugador.normalizarPosicion` debido a 4 bloques consecutivos `if (pos.includes(...) || ...)` con idéntica estructura sintáctica.
- **Diseño**:
  - Definir la constante interna `REGLAS_NORMALIZACION_POSICION: ReadonlyArray<readonly [PosicionJugador, readonly string[]]>` con los términos asociados a `'Portero'`, `'Defensa'`, `'Mediocampista'` y `'Delantero'`.
  - En `Jugador.normalizarPosicion(posicionOriginal?: string | null): PosicionJugador`, recorrer `REGLAS_NORMALIZACION_POSICION` con `.find(([, terminos]) => terminos.some((t) => pos.includes(t)))` y retornar la posición coincidente o `'No Clasificado'`.
  - Comportamiento 100% idéntico ante todos los casos de `backend/test/unit/domain/jugador.entity.spec.ts`.

### Área 2: `backend/src/data-access/transaccion.typeorm-repository.ts` (Capa `Data Access`)
- **Problema**: Líneas `58-74` en `listarPorUsuario` y `100-116` en `listarAuditoriaGlobal` (34 líneas duplicadas, 2 bloques) repiten la aplicación de filtros `jugadorId`, `desde`, `hasta`, `orderBy('tx.creado_en', 'DESC')`, `take(filtros.limite)`, `getMany()` y mapeo `TransaccionMapper.toDomain`.
- **Diseño**:
  - Definir un tipo interno `FiltroComunTransacciones = { jugadorId?: string; desde?: Date; hasta?: Date; limite?: number }`.
  - Extraer el método privado `private async aplicarFiltrosYEjecutar(qb: SelectQueryBuilder<TransaccionOrmEntity>, filtros?: FiltroComunTransacciones): Promise<Transaccion[]>`.
  - En `listarPorUsuario`, configurar la cláusula `where` según `filtros?.tipo` y delegar en `return this.aplicarFiltrosYEjecutar(qb, filtros)`.
  - En `listarAuditoriaGlobal`, aplicar las cláusulas `andWhere` para `usuarioId` y `tipoMercado` y delegar en `return this.aplicarFiltrosYEjecutar(qb, filtros)`.

### Área 3: `backend/src/services/base-redis-cache.service.ts`, `marketplace-cache.service.ts` y `scraping-cache.service.ts` (Capa `Service`)
- **Problema**: `MarketplaceCacheService` (líneas `10-36`, 27 líneas) y `ScrapingCacheService` (líneas `14-40`, 27 líneas) duplican la inicialización del cliente `Redis`, el hook `onModuleDestroy()` y los bloques de lectura/escritura/invalidación con degradación controlada.
- **Diseño**:
  - Crear `BaseRedisCacheService` implementando `OnModuleDestroy` en `backend/src/services/base-redis-cache.service.ts`:
    - Propiedades `protected readonly logger: Logger` y `protected readonly redisClient: Redis | null = null`.
    - Constructor `protected constructor(loggerContext: string, injectedRedis?: Redis)` con inicialización desde `injectedRedis`, `process.env.REDIS_URL` o `REDIS_HOST`/`REDIS_PORT`, listener `.on('error')` y `catch` con log `WARN`.
    - Método `async onModuleDestroy(): Promise<void>` que invoca `await this.redisClient.quit()` de forma segura.
    - Métodos protegidos `guardarJson(key: string, datos: unknown, ttlSegundos: number, etiquetaError: string): Promise<void>`, `obtenerJson<T>(key: string, etiquetaError: string): Promise<T | null>` y `eliminarPorPatron(patron: string, etiquetaError: string): Promise<void>`.
  - Hacer que `MarketplaceCacheService` y `ScrapingCacheService` extiendan `BaseRedisCacheService`, conservando `constructor(@Optional() injectedRedis?: Redis) { super(NombreClase.name, injectedRedis); }` y delegando sus operaciones públicas en los métodos protegidos de la clase base.
  - Agregar `backend/test/unit/services/base-redis-cache.service.spec.ts` para validar directamente todas las ramas de `BaseRedisCacheService` (sin modificar ningún test existente).

### Área 4: `estadistica-jugador.entity.ts` (`Model`), `whoscored-playwright.service.ts` (`Service`) y `player.types.ts` (`Frontend`)
- **Problema**: 68 líneas duplicadas en 5 bloques entre `backend/src/scraping/domain/estadistica-jugador.entity.ts` (líneas `13-38`), `backend/src/scraping/services/whoscored-playwright.service.ts` (líneas `62-87`) y `frontend/src/types/player.types.ts` (líneas `66-81`) por la repetición literal de 25 propiedades de métricas estadísticas.
- **Diseño**:
  - En `backend/src/scraping/domain/estadistica-jugador.entity.ts` (Capa `Model`):
    - Dividir la tupla `CAMPOS_ACTUALIZABLES` en `CAMPOS_CONTADORES_ESTADISTICOS` (6 contadores enteros) y `CAMPOS_METRICAS_OPCIONALES` (19 métricas opcionales anulables), recomponiendo `CAMPOS_ACTUALIZABLES = [...CAMPOS_CONTADORES_ESTADISTICOS, ...CAMPOS_METRICAS_OPCIONALES] as const`.
    - Exportar los tipos `CampoContadorEstadistico`, `CampoMetricaOpcional` y `MetricasEstadisticasJugador = Partial<Record<CampoContadorEstadistico, number> & Record<CampoMetricaOpcional, number | null>>`.
    - Declarar `export interface EstadisticaJugadorProps extends MetricasEstadisticasJugador` con los 8 campos de identidad y contexto (`id`, `jugadorId`, `temporada`, `liga`, `competencia`, `etapa`, `fuente`, `fechaActualizacion`).
  - En `backend/src/scraping/services/whoscored-playwright.service.ts` (Capa `Service`):
    - Importar `MetricasEstadisticasJugador` desde `../domain/estadistica-jugador.entity` (`Service -> Model`).
    - Declarar `export interface RawWhoScoredPlayerStats extends MetricasEstadisticasJugador { whoScoredId: string; nombre: string; equipoNombre?: string; }`.
  - En `frontend/src/types/player.types.ts` (Capa `Frontend`):
    - Definir el tipo `export type CampoMetricaOpcionalJugador` como unión de los 19 identificadores de métricas opcionales.
    - Declarar `export interface EstadisticasJugador extends Partial<Record<CampoMetricaOpcionalJugador, number | null>>` conservando explícitamente las propiedades obligatorias (`temporada`, `liga`, `partidosJugados`, `minutosJugados`, `goles`, `asistencias`, `tarjetasAmarillas`, `tarjetasRojas`).

### Área 5: `sonar-project.properties` (Exclusión de Migraciones Históricas en CPD)
- **Problema**: 363 líneas duplicadas en 12 bloques dentro de `backend/src/migrations/` (`1710000000000-InitialCatalogSchema.ts`, `1711000000000-ScrapingStatsSchema.ts`, `1712000000000-MarketplaceTradingSchema.ts`).
- **Diseño**:
  - Añadir la directiva `sonar.cpd.exclusions=backend/src/migrations/**` en `sonar-project.properties` para excluir del detector de código duplicado (CPD) únicamente las migraciones históricas de esquemas sin tocar los archivos de migración.

## Complexity Tracking

> **Sin violaciones al Constitution Check.** No se requieren excepciones ni justificaciones adicionales de complejidad.
