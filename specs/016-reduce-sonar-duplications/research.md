# Research & Technical Decisions: Reducción Integral de Duplicación de Código en SonarQube Cloud

**Feature**: `016-reduce-sonar-duplications`  
**Date**: 2026-11-13  
**Source Data**: `python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --duplications-brief --exclude-migrations`

---

## 1. Diagnóstico Técnico de Bloques Duplicados (`/api/duplications/show`)

El análisis actual de SonarQube Cloud (`salvanescki_dapps2026GrupoQ`, Región EU) registra **562 líneas duplicadas (2.0% en `Overall Code`, 1.47% en `New Code`)** distribuidas en **23 bloques y 10 archivos**:
- **Código productivo (7 archivos, 11 bloques, 199 líneas duplicadas)**:
  1. `backend/src/domain/jugador.entity.ts`: **43 líneas duplicadas** (2 bloques, densidad 13.7%) — auto-duplicación entre líneas `124-154` (31 líneas) y `132-166` (35 líneas).
  2. `backend/src/data-access/transaccion.typeorm-repository.ts`: **34 líneas duplicadas** (2 bloques, densidad 28.8%) — auto-duplicación entre líneas `58-74` (17 líneas) y `100-116` (17 líneas).
  3. `backend/src/services/marketplace-cache.service.ts`: **27 líneas duplicadas** (1 bloque, densidad 18.6%) — líneas `10-36` duplicadas con `backend/src/scraping/services/scraping-cache.service.ts` (líneas `14-40`).
  4. `backend/src/scraping/services/scraping-cache.service.ts`: **27 líneas duplicadas** (1 bloque, densidad 21.6%) — líneas `14-40` duplicadas con `backend/src/services/marketplace-cache.service.ts` (líneas `10-36`).
  5. `backend/src/scraping/domain/estadistica-jugador.entity.ts`: **26 líneas duplicadas** (2 bloques, densidad 10.3%) — Bloque 1: líneas `13-38` (26 líneas) ↔ `whoscored-playwright.service.ts` (`62-87`); Bloque 2: líneas `23-38` (16 líneas) ↔ `frontend/src/types/player.types.ts` (`66-81`) ↔ `whoscored-playwright.service.ts` (`72-87`).
  6. `backend/src/scraping/services/whoscored-playwright.service.ts`: **26 líneas duplicadas** (2 bloques, densidad 2.2%) — Bloque 1: líneas `62-87` (26 líneas) ↔ `estadistica-jugador.entity.ts` (`13-38`); Bloque 2: líneas `72-87` (16 líneas) ↔ `estadistica-jugador.entity.ts` (`23-38`) ↔ `frontend/src/types/player.types.ts` (`66-81`).
  7. `frontend/src/types/player.types.ts`: **16 líneas duplicadas** (1 bloque, densidad 14.5%) — líneas `66-81` (16 líneas) ↔ `estadistica-jugador.entity.ts` (`23-38`) ↔ `whoscored-playwright.service.ts` (`72-87`).
- **Migraciones históricas TypeORM (3 archivos, 12 bloques, 363 líneas duplicadas)**:
  - `backend/src/migrations/1710000000000-InitialCatalogSchema.ts` (98 líneas, 4 bloques)
  - `backend/src/migrations/1711000000000-ScrapingStatsSchema.ts` (77 líneas, 3 bloques)
  - `backend/src/migrations/1712000000000-MarketplaceTradingSchema.ts` (188 líneas, 5 bloques)

---

## 2. Decisiones de Diseño por Bloque y Configuración

### Decisión 1: Consolidación de `Jugador.normalizarPosicion` en `backend/src/domain/jugador.entity.ts` (Líneas 124-166)

- **Decision**: Reemplazar la cadena repetitiva de condicionales `if (pos.includes(...) || pos.includes(...) ...)` en `Jugador.normalizarPosicion` (líneas 118-169 de `backend/src/domain/jugador.entity.ts`) por una tabla declarativa inmutable `REGLAS_NORMALIZACION_POSICION: ReadonlyArray< readonly [PosicionJugador, readonly string[]] >` definida en el propio archivo de dominio y evaluada mediante `REGLAS_NORMALIZACION_POSICION.find(([, terminos]) => terminos.some((termino) => pos.includes(termino)))`.
- **Rationale**: El motor CPD de SonarQube normaliza literales de cadena e identificadores en TypeScript, por lo que los bloques `if (pos.includes(...) || ...)` de 7 condiciones para `'Defensa'`, `'Mediocampista'` y `'Delantero'` producen secuencias de tokens idénticas entre las líneas `124-154` y `132-166`. Al expresar las reglas como una estructura declarativa de tuplas `[PosicionJugador, readonly string[]]` e iterar con `.find()` / `.some()`, se elimina por completo la repetición estructural de condicionales, se reduce la complejidad ciclomática y cognitiva del método y se mantiene el 100% de la regla de negocio dentro de la entidad `Jugador` (Rich Domain Model, Capa `Model`).
- **Alternatives considered**:
  - *Extraer un helper fuera de la capa de dominio*: Descartado porque violaría el principio II de la Constitución (Rich Domain Model), según el cual toda regla de dominio de jugadores debe residir en `Model`.
  - *Usar expresiones regulares concatenadas*: Descartado por menor legibilidad frente a una lista declarativa de términos por posición.

---

### Decisión 2: Extracción de Helper Privado de Consulta en `backend/src/data-access/transaccion.typeorm-repository.ts` (Líneas 58-74 y 100-116)

- **Decision**: Extraer un método privado `aplicarFiltrosYEjecutar(qb: SelectQueryBuilder<TransaccionOrmEntity>, filtros?: FiltroRangoTransacciones): Promise<Transaccion[]>` dentro de `TransaccionTypeOrmRepository` que centralice la aplicación de los filtros comunes (`jugadorId`, `desde`, `hasta`), el ordenamiento `qb.orderBy('tx.creado_en', 'DESC')`, el límite `qb.take(filtros.limite)` y el mapeo final `orms.map((o) => TransaccionMapper.toDomain(o))`. En `listarPorUsuario` y `listarAuditoriaGlobal` se aplicarán únicamente los predicados específicos de cada método (`tipo` de operación por usuario o `usuarioId` + `tipoMercado` global) antes de delegar en `this.aplicarFiltrosYEjecutar(qb, filtros)`.
- **Rationale**: Las líneas `58-74` de `listarPorUsuario` y `100-116` de `listarAuditoriaGlobal` son idénticas línea por línea. La extracción a un método privado dentro del mismo repositorio elimina los 2 bloques (34 líneas) manteniendo el aislamiento estricto de la capa `Data Access` sin alterar las consultas SQL generadas por TypeORM (`AND` es conmutativo en SQL y `ORDER BY` / `TAKE` se ejecutan al cierre).
- **Alternatives considered**:
  - *Unificar `listarPorUsuario` y `listarAuditoriaGlobal` en un único método público*: Descartado porque rompería el contrato de la interfaz de dominio `ITransaccionRepository` y obligaría a modificar llamadas en servicios y tests existentes.
  - *Mover la lógica de filtrado a una clase externa*: Innecesario dado que la duplicación ocurre exclusivamente entre dos métodos de la misma clase `TransaccionTypeOrmRepository`.

---

### Decisión 3: Abstracción Base `BaseRedisCacheService` para `MarketplaceCacheService` y `ScrapingCacheService` (Líneas 10-36 y 14-40)

- **Decision**: Crear la clase abstracta `BaseRedisCacheService` en `backend/src/services/base-redis-cache.service.ts` (Capa `Service`) que encapsule:
  1. La inicialización tolerante a fallos del cliente `Redis` (inyección opcional `@Optional() injectedRedis?: Redis`, resolución de `process.env.REDIS_URL` o `REDIS_HOST`/`REDIS_PORT`, manejador `.on('error')` y captura de excepciones en el constructor).
  2. El ciclo de vida `onModuleDestroy()` con cierre limpio (`quit()`).
  3. Operaciones protegidas reutilizables con degradación elegante y logging `WARN`: `guardarJson(key, valor, ttlSegundos, contexto)`, `obtenerJson<T>(key, contexto)` y `eliminarPorPatron(patron, contexto)`.
  `MarketplaceCacheService` y `ScrapingCacheService` extenderán `BaseRedisCacheService`, manteniendo intactos sus constructores (`constructor(@Optional() injectedRedis?: Redis)`), sus métodos públicos y sus claves/TTL de caché.
- **Rationale**: Ambos servicios pertenecen a la capa `Service`, utilizan `ioredis` como caché L1 y duplican exactamente las 27 líneas de construcción de cliente Redis y manejo de ciclo de vida, además de repetir los patrones `try/catch` de lectura/escritura JSON. La herencia mediante `BaseRedisCacheService` dentro de la capa `Service` elimina los 2 bloques (54 líneas) sin introducir acoplamiento de negocio entre `marketplace` y `scraping`, y preserva el 100% de compatibilidad con las pruebas unitarias e integrales existentes que instancian `new MarketplaceCacheService(mockRedis)` y `new ScrapingCacheService(mockRedis)`.
- **Alternatives considered**:
  - *Inyectar un servicio `RedisClientService` adicional por composición en los constructores*: Descartado porque cambiaría la firma de los constructores de `MarketplaceCacheService` y `ScrapingCacheService`, los cuales son instanciados directamente con `new MarketplaceCacheService(mockRedisClient)` en múltiples tests unitarios y de integración existentes (cuya modificación está prohibida por el Principio IV de la Constitución).
  - *Extraer únicamente una función factory para crear el cliente Redis*: Resolvería el constructor pero dejaría latente la repetición de `onModuleDestroy` y de los bloques `get`/`setex`/`keys+del` con degradación controlada.

---

### Decisión 4: Unificación de Tipos Estadísticos en `estadistica-jugador.entity.ts`, `whoscored-playwright.service.ts` y `frontend/src/types/player.types.ts`

- **Decision**:
  1. En `backend/src/scraping/domain/estadistica-jugador.entity.ts` (Capa `Model`), estructurar la lista existente de campos estadísticos en dos tuplas constantes exportadas como única fuente de verdad del dominio:
     - `CAMPOS_CONTADORES_ESTADISTICOS` (`'partidosJugados'`, `'minutosJugados'`, `'goles'`, `'asistencias'`, `'tarjetasAmarillas'`, `'tarjetasRojas'`)
     - `CAMPOS_METRICAS_OPCIONALES` (las 19 métricas numéricas anulables por partido/arquero)
     - `CAMPOS_ACTUALIZABLES = [...CAMPOS_CONTADORES_ESTADISTICOS, ...CAMPOS_METRICAS_OPCIONALES] as const`
     Derivar a partir de dichas tuplas el tipo exportado `MetricasEstadisticasJugador` (`Partial<Record<CampoContadorEstadistico, number> & Record<CampoMetricaOpcional, number | null>>`) y hacer que `EstadisticaJugadorProps extends MetricasEstadisticasJugador`.
  2. En `backend/src/scraping/services/whoscored-playwright.service.ts` (Capa `Service`), importar `MetricasEstadisticasJugador` desde `../domain/estadistica-jugador.entity` (dependencia unidireccional válida `Service -> Model`) y definir `export interface RawWhoScoredPlayerStats extends MetricasEstadisticasJugador { whoScoredId: string; nombre: string; equipoNombre?: string; }`.
  3. En `frontend/src/types/player.types.ts` (Capa `Frontend`), definir el tipo `CampoMetricaOpcionalJugador` como unión de literales de las métricas opcionales y declarar `export interface EstadisticasJugador extends Partial<Record<CampoMetricaOpcionalJugador, number | null>>` junto con las propiedades obligatorias de cabecera (`temporada`, `liga`, `partidosJugados`, `minutosJugados`, `goles`, `asistencias`, `tarjetasAmarillas`, `tarjetasRojas`).
- **Rationale**: SonarQube CPD reporta dos solapamientos: 26 líneas entre `EstadisticaJugadorProps` y `RawWhoScoredPlayerStats` en `backend`, y 16 líneas entre ambos archivos de `backend` y `EstadisticasJugador` en `frontend/src/types/player.types.ts` debido a las 15+ declaraciones consecutivas `prop?: number | null;` (>100 tokens idénticos). Al derivar `MetricasEstadisticasJugador` en la capa `Model` a partir de las tuplas de dominio, reutilizarlo en `RawWhoScoredPlayerStats` (`Service -> Model`) y expresar las métricas opcionales en `frontend` mediante `Partial<Record<CampoMetricaOpcionalJugador, number | null>>`, se eliminan los 5 bloques (68 líneas en los 3 archivos) preservando exactamente el mismo contrato de tipos TypeScript (`keyof EstadisticasJugador`, autocompletado y nulabilidad) y manteniendo la independencia de compilación entre `backend` y `frontend`.
- **Alternatives considered**:
  - *Solo hacer que `RawWhoScoredPlayerStats` extienda `EstadisticaJugadorProps` manteniendo la lista literal de propiedades en `estadistica-jugador.entity.ts` y `player.types.ts`*: Descartado porque el Bloque 2 de 16 líneas (`estadistica-jugador.entity.ts` líneas 23-38 ↔ `frontend/src/types/player.types.ts` líneas 66-81) seguiría activo en SonarQube CPD.
  - *Importar archivos de `backend/src` desde `frontend/src`*: Descartado porque acoplaría los contextos de compilación (`tsconfig.json`) y contenedores Docker independientes de `frontend` y `backend`, violando la separación de las 5 capas.

---

### Decisión 5: Exclusión de Migraciones Históricas en `sonar-project.properties` (`sonar.cpd.exclusions`)

- **Decision**: Agregar `sonar.cpd.exclusions=backend/src/migrations/**` en `sonar-project.properties` sin modificar ninguno de los 3 archivos en `backend/src/migrations/`.
- **Rationale**: Las migraciones TypeORM (`1710000000000-InitialCatalogSchema.ts`, `1711000000000-ScrapingStatsSchema.ts`, `1712000000000-MarketplaceTradingSchema.ts`) contienen definiciones declarativas de `new Table({ columns: [...] })` que representan estados históricos inmutables del esquema PostgreSQL. Usar `sonar.cpd.exclusions` excluye estas rutas únicamente del detector de duplicación (CPD), eliminando los 12 bloques / 363 líneas de ruido declarativo mientras conserva el análisis de bugs y seguridad sobre el resto del proyecto.
- **Alternatives considered**:
  - *Agregar `backend/src/migrations/**` a `sonar.exclusions`*: Descartado porque excluiría las migraciones de todo el análisis estático (incluyendo detección de credenciales o vulnerabilidades SQL), cuando solo se requiere excluirlas del cálculo de duplicación (CPD).
  - *Refactorizar las migraciones históricas extrayendo helpers de columnas*: Descartado por riesgo de alterar migraciones ya ejecutadas y acoplar migraciones históricas a código compartido mutable.
