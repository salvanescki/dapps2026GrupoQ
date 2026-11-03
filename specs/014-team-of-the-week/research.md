# Research & Architecture Decisions: Equipo de la Semana (Team of the Week)

**Feature**: `014-team-of-the-week`  
**Date**: 2026-11-02  
**Status**: Completed  

Este documento consolida la investigación técnica, decisiones de diseño, patrones arquitectónicos y resolución de dependencias para la implementación del **Equipo de la Semana** en el ecosistema de Grupo Q, cumpliendo de manera estricta con los principios de la Constitución del proyecto.

---

## 1. Rich Domain Model y Algoritmo de Selección Táctica

### Contexto y Problema
El sistema debe conformar el once ideal de las 5 grandes ligas europeas bajo una formación táctica fija 4-3-3 (1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros), ordenando por cotización vigente, aplicando criterios estrictos de desempate (mayor score y orden alfabético por nombre) y excluyendo futbolistas inactivos o sin estadísticas acumuladas.

### Decisión
Modelar `EquipoSemanal` como un **Agregado Raíz Rico** (`Rich Domain Model`) en `backend/src/domain/equipo-semanal.entity.ts`, conteniendo la entidad/value object hija `MiembroEquipoSemanal`.

1. **Método de Fábrica de Dominio Puro**:
   `EquipoSemanal.seleccionarOnceIdeal(...)` recibe:
   - Colección de entidades `Jugador` activos.
   - `Map` de minutos jugados acumulados por `jugadorId` (temporada más reciente).
   - Fecha de generación (`ahora`), de la que se deriva el año y la semana ISO.
   - Diccionario/Map de últimas entidades `Cotizacion` indexadas por `jugadorId`.
   - Año calendario y número de semana ISO.
   - Identificador y versión de la estrategia activa (`estrategiaId`, `estrategiaVersion`).
2. **Filtrado e Invariantes de Elegibilidad**:
   - Excluye jugadores donde `jugador.activo === false`.
   - Excluye jugadores donde `cotizacion.sinEstadisticas === true` o que carezcan de cotización calculada.
   - Excluye jugadores con menos de 270 minutos jugados acumulados (constante `MINUTOS_MINIMOS_ELEGIBILIDAD`).
3. **Agrupación y Verificación de Cupos Tácticos**:
   - Agrupa los candidatos elegibles por posición canónica:
     - `Portero`: cupo exigido = 1
     - `Defensa`: cupo exigido = 4
     - `Mediocampista`: cupo exigido = 3
     - `Delantero`: cupo exigido = 3
   - Si en cualquiera de las posiciones el número de candidatos elegibles es inferior al cupo exigido, el método arroja una `ReglaDeNegocioException` detallada en español (ejemplo: *"No se puede generar el Equipo de la Semana: se requieren al menos 4 defensas elegibles con estadísticas activas, pero solo se encontraron 2."*).
4. **Ordenamiento y Desempate Determinista**:
   En cada demarcación posicional, los candidatos se ordenan de acuerdo a:
   $$\text{cotizacion.valor} \downarrow \implies \text{cotizacion.score} \downarrow \implies \text{jugador.nombre} \uparrow$$
5. **Generación de Snapshot Inmutable**:
   Para cada uno de los 11 seleccionados se crea una instancia inmutable de `MiembroEquipoSemanal` congelando: `jugadorId`, `nombre`, `equipoNombre`, `posicion`, `cotizacion` y `score`.

### Rationale
- Cumple el Principio II de la Constitución: Prohibición de modelos anémicos. Toda la lógica de negocio, validaciones y ordenamiento reside en el dominio.
- El Service actúa estrictamente como orquestador pasándole datos al dominio y persistiendo el resultado.

### Alternativas Descartadas
- *Cálculo directo en SQL con queries complejas (ej. `ROW_NUMBER() OVER (PARTITION BY posicion ...)`)*: Descartada porque fuga lógica de negocio a la base de datos, violando los principios de DDD y la Constitución.
- *Permitir equipos incompletos con huecos*: Descartada conforme a FR-006 de la spec (rechazar la generación si no se cubren los 11 puestos).

---

## 2. Integración de Datos de Entrada sin Duplicación

### Contexto y Problema
El cálculo requiere conocer qué jugadores están activos y sus cotizaciones más recientes, evitando duplicar las consultas que ya utiliza el ranking del marketplace en `QuotesService`.

### Decisión
Reutilizar las abstracciones existentes en la capa de persistencia:
- `IJugadorRepository.listarActivos()`: Retorna todas las entidades `Jugador` activas con su relación de equipo ya cargada.
- `ICotizacionRepository.obtenerUltimasPorJugadores(jugadorIds)`: Retorna un `Map<string, Cotizacion>` con el último registro de cotización persistido para cada jugador.
- `IConfiguracionMercadoRepository.obtenerConfiguracion()`: Retorna la estrategia y versión activas (`GLOBAL_v1` o `POSICIONAL_v1`).
- `IEstadisticaJugadorRepository.buscarPorJugadores(jugadorIds)` (método opcional de la interfaz, ya usado por `QuotesService`): provee `minutosJugados`; el service suma los minutos de las filas de la temporada más reciente de cada jugador.

### Rationale
- No inventa nuevas consultas duplicadas ni bypasses.
- Aprovecha los índices ya existentes sobre `cotizaciones(jugador_id, fecha_cotizacion DESC)`.

---

## 3. Modelo de Persistencia, Unicidad y Migración Idempotente

### Contexto y Problema
El sistema usa TypeORM con `synchronize: false` y `migrationsRun: true`, requiriendo que toda nueva tabla se defina mediante migraciones explícitas registradas en `database.config.ts`. Cada semana debe registrarse de forma inmutable e idempotente.

### Decisión
1. **Esquema Relacional**:
   - Tabla `equipos_semanales`:
     - `id UUID PRIMARY KEY`
     - `ano INTEGER NOT NULL` (año ISO de la semana)
     - `semana_iso INTEGER NOT NULL`
     - `formacion VARCHAR(20) NOT NULL DEFAULT '4-3-3'`
     - `estrategia_id VARCHAR(50) NOT NULL`
     - `estrategia_version VARCHAR(50) NOT NULL`
     - `fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `CONSTRAINT uq_equipos_semanales_ano_semana UNIQUE (ano, semana_iso)`
   - Tabla `miembros_equipos_semanales`:
     - `id UUID PRIMARY KEY`
     - `equipo_semanal_id UUID NOT NULL REFERENCES equipos_semanales(id) ON DELETE CASCADE`
     - `jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT`
     - `nombre VARCHAR(150) NOT NULL`
     - `equipo_nombre VARCHAR(150) NOT NULL`
     - `posicion VARCHAR(30) NOT NULL`
     - `cotizacion NUMERIC(12,2) NOT NULL` (mismo tipo que `cotizaciones.valor`)
     - `score NUMERIC(6,4) NOT NULL`
     - `orden INTEGER NOT NULL`
     - `CONSTRAINT uq_miembro_equipo_jugador UNIQUE (equipo_semanal_id, jugador_id)`
2. **Semana abierta, semana cerrada e idempotencia**:
   - La semana se identifica por el año y la semana ISO del día de generación (lunes). El año es el ISO: el lunes 29/12/2025 es la semana 1 de 2026.
   - Una semana está abierta hasta el lunes siguiente a las 00:00 UTC; después queda cerrada e inmutable. La regla vive en el dominio (`EquipoSemanal.estaCerrada(ahora)`).
   - Generación manual (`ADMIN`): si existe registro para la semana en curso, el repositorio, en una transacción, elimina los miembros previos y persiste la nueva alineación bajo el mismo `(ano, semana_iso)` con nueva marca de tiempo. Sobre una semana cerrada se rechaza con `ReglaDeNegocioException`.
   - Generación automática: si ya existe registro para la semana ISO, se omite sin modificarlo (FR-007b). La restricción única protege ante concurrencia.
3. **Migración Idempotente**:
   Crear `backend/src/migrations/1730500000000-create-team-of-the-week-tables.ts` con sentencias SQL protegidas con `CREATE TABLE IF NOT EXISTS`, e incorporarla explícitamente en la lista `migrations: [...]` de `backend/src/config/database.config.ts`.

---

## 4. Ejecución Semanal Automatizada y Distributed Lock

### Contexto y Problema
El cálculo semanal debe correr automáticamente una vez por semana sin colisionar en despliegues con múltiples instancias o pods del backend.

### Decisión
Crear `TeamOfTheWeekSchedulerService` en `backend/src/services/scheduler/team-of-the-week-scheduler.service.ts` siguiendo el patrón de `QuotesSchedulerService`:
1. Utiliza `@Cron('0 1 * * 1')` de `@nestjs/schedule` (lunes 01:00 UTC).
2. Adquiere un bloqueo distribuido en PostgreSQL mediante `pg_try_advisory_lock($1)` con ID propio:
   - `QuotesSchedulerService.ADVISORY_LOCK_ID = 20261101`
   - `TeamOfTheWeekSchedulerService.ADVISORY_LOCK_ID = 20261102`
3. Si el lock es denegado, omite la ejecución registrando un aviso en el log (`logger.warn`).
4. Con el lock concedido: ejecuta `QuotesService.recalcularCotizacionesActivas()`, luego `EquipoSemanalService.generarAutomatico()` y libera el lock en `finally` con `pg_advisory_unlock(20261102)`.
5. Si el cupo es insuficiente, registra la advertencia con `logger.warn` y no publica nada (la pantalla sigue mostrando la última semana completa).

---

## 5. Análisis de Dependencia de Orden: Scraper vs Recálculo vs Equipo de la Semana

### Contexto y Problema
Existe una cadena de dependencias temporales crítica:
1. **Scraper WhoScored**: Configurado en `.github/workflows/whoscored-scraper.yml` para correr cada **domingo a las 02:00 UTC** (`cron: '0 2 * * 0'`). Tarda entre 30 y 45 minutos.
2. **Recálculo de Cotizaciones actual**: Configurado en `QuotesSchedulerService` para correr cada **domingo a las 00:00 UTC** (`@Cron('0 0 * * 0')`).
   *Observación*: Actualmente el recálculo corre 2 horas **antes** de que el scraper descargue las estadísticas de los partidos del fin de semana.
3. **Equipo de la Semana**: El spec establece que debe calcularse los **lunes**, usando las cotizaciones ya actualizadas con las estadísticas de la semana.

### Propuesta Arquitectónica y Análisis de Impacto
1. **Flujo resultante**:
   - Domingo 02:00 UTC: scraper de WhoScored ingesta las estadísticas de la jornada (~30-45 min).
   - Domingo 00:00 UTC: `QuotesSchedulerService` sigue corriendo sin cambios (anterior al scraper, no se toca).
   - Lunes 01:00 UTC: el job del Equipo de la Semana recalcula las cotizaciones con las estadísticas ya ingestadas y genera el equipo en el mismo job bajo su lock.
2. **Por qué encadenar en el código**: depender de una variable de entorno para mover el recálculo dejaría, en un despliegue sin esa variable, un equipo calculado con cotizaciones anteriores al scraper. Encadenar garantiza el orden sin tocar `QuotesSchedulerService` ni sus tests (Principio IV).
3. **Fallback**: si el scraper del domingo se retrasa o falla, un administrador puede regenerar la semana en curso desde la pantalla hasta el lunes siguiente 00:00 UTC.
4. **Cron configurable**: `TEAM_OF_THE_WEEK_CRON` (opcional, por defecto `0 1 * * 1`).

---

## 6. Endpoints REST y Documentación OpenAPI/Swagger

### Endpoints Expuestos en `TeamOfTheWeekController` (`/team-of-the-week`):

| Método | Ruta | Rol / Guard | Códigos HTTP | Propósito |
|---|---|---|---|---|
| `GET` | `/team-of-the-week` | `JwtAuthGuard` | `200`, `401`, `404` | Obtener el Equipo de la Semana vigente (más reciente). 404 si no hay ningún equipo generado aún. |
| `GET` | `/team-of-the-week/weeks` | `JwtAuthGuard` | `200`, `401` | Listar metadatos de las semanas históricas disponibles (`ano`, `semanaIso`, `fechaGeneracion`). |
| `GET` | `/team-of-the-week/weeks/:year/:week` | `JwtAuthGuard` | `200`, `400`, `401`, `404` | Obtener el equipo congelado de una semana específica. 400 si parámetros no son enteros válidos, 404 si la semana no existe. |
| `POST` | `/team-of-the-week/generate` | `JwtAuthGuard`, `RolesGuard` (`ADMIN`) | `200`, `400`, `401`, `403` | Disparo manual de generación de la semana en curso. 403 para usuarios comunes, 400 (`ReglaDeNegocioException` vía el filtro global) si falta cupo en una posición o la semana ya está cerrada. |

---

## 7. Caché L1 en Redis con Degradación Controlada

### Decisión
Extender `MarketplaceCacheService` (`backend/src/services/marketplace-cache.service.ts`) con métodos específicos:
- `guardarEquipoSemanal(clave: string, datos: any, ttlSegundos?: number): Promise<void>`
- `obtenerEquipoSemanal<T>(clave: string): Promise<T | null>`
- `invalidarEquipoSemanal(): Promise<void>`

**Políticas de expiración (TTL)**:
- Semana vigente: TTL = 1800 segundos (30 minutos).
- Semanas históricas cerradas: TTL = 86400 segundos (24 horas), ya que su contenido es inmutable.
- Listado de semanas: TTL = 1800 segundos.
- Invalidación: tras una generación exitosa se eliminan todas las claves con prefijo `marketplace:team-of-the-week:` (`vigente`, `semanas` y `{ano}:{semanaIso}`).
- Resiliencia: Si Redis no está disponible o falla la conexión, la operación atrapa la excepción, emite un `logger.warn` y delega transparentemente a PostgreSQL sin interrumpir al usuario.

---

## 8. Arquitectura del Frontend (React + Vite + TypeScript)

### Estructura de Componentes y Vistas
1. **Ruta y Navegación**:
   - Rutas `/team-of-the-week` y `/team-of-the-week/:year/:week` en `frontend/src/routes/AppRoutes.tsx`, envueltas en `<ProtectedRoute>`. La semana seleccionada se lee de la URL; el selector navega a la ruta correspondiente. Si la semana de la URL no existe, la vista muestra un mensaje en español con un botón para volver a la más reciente. `esRutaActiva` ya resuelve el resaltado del ítem en subrutas.
   - Incorporación en `frontend/src/utils/navegacion.ts`:
     ```typescript
     {
       label: 'Equipo de la Semana',
       to: '/team-of-the-week',
       id: 'nav-team-of-the-week',
     }
     ```
2. **Cliente HTTP y Hook**:
   - `frontend/src/api/teamOfTheWeekApi.ts`: Funciones `obtenerEquipoVigente`, `obtenerSemanasDisponibles`, `obtenerEquipoPorSemana` y `generarEquipoManual` usando `http-client.ts` con soporte para `AbortSignal`.
   - `frontend/src/hooks/useTeamOfTheWeek.ts`: Hook con manejo de estados de carga (`cargando`), error (`error`, `reintentar`), estado vacío, selección de semana histórica y apertura del modal de detalle de jugador.
3. **Componente de Cancha Táctica (`SoccerPitch.tsx`)**:
   - Cancha vertical (orientación portero abajo, delanteros arriba) estilizada con CSS y SVG utilizando los tokens corporativos de `frontend/src/styles/tokens.css` (`--color-emerald-*`, `--border-subtle`, `--bg-card`, etc.).
   - Disposición en 4 filas tácticas horizontales:
     - Fila Delantera (arriba): 3 delanteros equidistantes.
     - Fila Mediocampo (centro): 3 mediocampistas equidistantes.
     - Fila Defensiva (abajo-medio): 4 defensas equidistantes.
     - Fila Portería (base): 1 portero centrado.
   - Cada nodo (`PitchPlayerCard.tsx`) exhibe: Nombre, Equipo, Posición y Cotización en créditos. Al hacer clic, dispara la apertura del modal preexistente `PlayerDetailModal`.
   - 100% responsivo para resoluciones móviles ($\ge$ 360px) y escritorio.
4. **Estados en Español**:
   - Carga: Esqueleto o spinner de carga.
   - Error: Alerta con botón explícito de "Reintentar".
   - Vacío: Mensaje *"Aún no hay ningún Equipo de la Semana disponible"*.

---

## 9. Actualización de Postman y OpenAPI

- La especificación OpenAPI 3.0 se documenta en `specs/014-team-of-the-week/contracts/openapi-team-of-the-week.yaml` y mediante decoradores Swagger en NestJS.
- `postman/collection.json` se actualiza agregando la carpeta `7. Equipo de la Semana` con requests completas, variables dinámicas y scripts de prueba con tests de aserción para códigos 200, 400, 401, 403 y 404. El cuerpo de error real del backend es `{ codigoEstado, mensaje, marcaDeTiempo }`.

---

## 10. Estrategia de Pruebas y Cobertura (Ratchet $\ge 80\%$)

- **Unitarios Dominio (Backend)**: `equipo-semanal.entity.spec.ts` validando el 100% de los branches del algoritmo de selección, formación 4-3-3, ordenamiento, desempates, exclusión de inactivos/sin estadísticas y excepciones por cupo incompleto en aislamiento absoluto sin base de datos.
- **Integración Backend**: `equipo-semanal.service.spec.ts` y `team-of-the-week.controller.spec.ts` sobre PostgreSQL real instanciado mediante Testcontainers.
- **Unitarios e Integración Frontend**: `teamOfTheWeekApi.test.ts`, `useTeamOfTheWeek.test.ts`, `SoccerPitch.test.tsx` y `TeamOfTheWeekView.test.tsx` con mocks de red controlados en Vitest.
- **Inmutabilidad de Tests**: Cero modificaciones a tests existentes. Cobertura $\ge 80\%$ en líneas y branches garantizada en ambos stacks.

