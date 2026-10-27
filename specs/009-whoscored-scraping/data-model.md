# Data Model: Modulo de Scraping WhoScored (009)

**Generado por**: `/speckit-plan`
**Feature branch**: `009-whoscored-scraping`
**Fecha**: 2026-10-20
**Prerequisito**: `research.md` completo

---

## Entidades de dominio

### 1. `EstadisticaJugador`

Representa el conjunto de estadisticas de rendimiento de un jugador para la temporada activa.

#### Campos (todos confirmados en WhoScored — ver `research.md` seccion 1)

| Campo (dominio) | Tipo TypeScript | Descripcion | Nullable |
|---|---|---|---|
| `id` | `string` (UUID) | Identificador unico del registro | No |
| `jugadorId` | `string` (UUID) | FK a la entidad `Jugador` existente | No |
| `temporada` | `string` | Temporada activa (ej: `"2025/2026"`) | No |
| `liga` | `string` | Codigo de liga (ej: `"PL"`, `"PD"`, `"SA"`, `"BL1"`, `"FL1"`) | No |
| `fuente` | `string` | Origen de los datos (siempre `"whoscored"`) | No |
| `fechaActualizacion` | `Date` | Fecha de la ultima actualizacion del registro | No |
| `partidosJugados` | `number` | Total de apariciones (titulares + suplentes) | No |
| `minutosJugados` | `number` | Total de minutos en cancha | No |
| `goles` | `number` | Goles marcados (total) | No |
| `asistencias` | `number` | Asistencias de gol (total) | No |
| `tirosPorPartido` | `number \| null` | Shots per Game (promedio) | Si |
| `precisionPase` | `number \| null` | Pass Success % | Si |
| `duelosAereosGanadosPorPartido` | `number \| null` | Aerial Duels Won per Game | Si |
| `rating` | `number \| null` | Rating WhoScored (0–10) | Si |
| `tarjetasAmarillas` | `number` | Total de tarjetas amarillas | No |
| `tarjetasRojas` | `number` | Total de tarjetas rojas | No |
| `regatesCompletadosPorPartido` | `number \| null` | Dribbles Won per Game | Si |
| `pasesClavePorPartido` | `number \| null` | Key Passes per Game | Si |
| `xgPorPartido` | `number \| null` | Expected Goals per Game | Si |
| `xaPorPartido` | `number \| null` | Expected Assists per Game | Si |
| `grandesOcasionesPorPartido` | `number \| null` | Big Chances per Game | Si |
| `entradasPorPartido` | `number \| null` | Tackles per Game | Si |
| `intercepccionesPorPartido` | `number \| null` | Interceptions per Game | Si |
| `despejesPorPartido` | `number \| null` | Clearances per Game | Si |
| `pasesPorPartido` | `number \| null` | Passes per Game | Si |
| `centrosPorPartido` | `number \| null` | Crosses per Game | Si |
| `atajadas` | `number \| null` | Saves per Game (porteros) | Si |
| `golesRecibidos` | `number \| null` | Goals Conceded total (porteros) | Si |
| `porcentajeAtajadas` | `number \| null` | Save % (porteros) | Si |
| `erroresQueGeneraronGol` | `number \| null` | Errors Leading to Goal | Si |
| `autogoles` | `number \| null` | Own Goals | Si |

> Los campos de portero (`atajadas`, `golesRecibidos`, `porcentajeAtajadas`) son `null` para jugadores de campo. Los campos de campo son `null` para porteros cuando WhoScored no los muestra. La logica de validacion NO rechaza nulls en campos opcionales; los acepta como datos ausentes de la plataforma.

#### Invariantes de dominio
- `jugadorId` + `temporada` son unicos (constraint compuesto).
- `goles >= 0`, `asistencias >= 0`, `minutosJugados >= 0`, `partidosJugados >= 0`.
- `rating` en rango `[0, 10]` si no es null.
- `porcentajeAtajadas` en rango `[0, 100]` si no es null.
- `precisionPase` en rango `[0, 100]` si no es null.

#### State transitions
No aplica; `EstadisticaJugador` no tiene transiciones de estado. Es un agregado de datos; su lifecycle es: creacion por scraping → actualizacion por upsert.

---

### 2. `EjecucionScraping`

Registro de auditoria de cada corrida del proceso de scraping.

| Campo (dominio) | Tipo TypeScript | Descripcion | Nullable |
|---|---|---|---|
| `id` | `string` (UUID) | Identificador unico de la ejecucion | No |
| `inicio` | `Date` | Fecha y hora de inicio de la ejecucion | No |
| `fin` | `Date \| null` | Fecha y hora de fin (null mientras en progreso) | Si |
| `jugadoresProcesados` | `number` | Cantidad de jugadores procesados exitosamente | No |
| `errores` | `number` | Cantidad de errores individuales durante la ejecucion | No |
| `estado` | `EstadoEjecucion` | Estado global: `'en_progreso'`, `'exitoso'`, `'fallido'` | No |
| `detalle` | `ErrorScrapingDetalle[]` | Array de errores individuales (jugador, liga, mensaje) | No |

#### Tipo auxiliar `ErrorScrapingDetalle`

```typescript
interface ErrorScrapingDetalle {
  liga: string;
  jugadorNombre?: string;
  mensaje: string;
  timestamp: Date;
}
```

#### Tipo `EstadoEjecucion`

```typescript
type EstadoEjecucion = 'en_progreso' | 'exitoso' | 'fallido';
```

#### Invariantes de dominio
- `jugadoresProcesados >= 0`, `errores >= 0`.
- Si `estado === 'exitoso'` o `'fallido'`, entonces `fin` no debe ser null.
- `fin >= inicio` si no es null.

---

## Relaciones entre entidades

```
Jugador (existente)          EstadisticaJugador (nueva)
  id (PK, UUID)   <────────────  jugadorId (FK)
  nombre                         temporada
  equipoId                       liga
  ligaId                         [25 campos estadisticos]
                                 fechaActualizacion
                                 fuente

EjecucionScraping (nueva, sin FK directa)
  id
  inicio / fin
  estado
  jugadoresProcesados
  errores
  detalle (JSON)
```

> `EjecucionScraping` NO tiene FK a `EstadisticaJugador`; es un registro de auditoria independiente.

---

## Esquema de tablas PostgreSQL

### `estadisticas_jugadores`

```sql
CREATE TABLE estadisticas_jugadores (
  id                              UUID PRIMARY KEY,
  jugador_id                      UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  temporada                       VARCHAR(20) NOT NULL,
  liga                            VARCHAR(10) NOT NULL,
  fuente                          VARCHAR(50) NOT NULL DEFAULT 'whoscored',
  fecha_actualizacion             TIMESTAMPTZ NOT NULL,
  partidos_jugados                INTEGER NOT NULL DEFAULT 0,
  minutos_jugados                 INTEGER NOT NULL DEFAULT 0,
  goles                           INTEGER NOT NULL DEFAULT 0,
  asistencias                     INTEGER NOT NULL DEFAULT 0,
  tiros_por_partido               NUMERIC(5,2),
  precision_pase                  NUMERIC(5,2),
  duelos_aereos_ganados_por_partido NUMERIC(5,2),
  rating                          NUMERIC(4,2),
  tarjetas_amarillas              INTEGER NOT NULL DEFAULT 0,
  tarjetas_rojas                  INTEGER NOT NULL DEFAULT 0,
  regates_completados_por_partido NUMERIC(5,2),
  pases_clave_por_partido         NUMERIC(5,2),
  xg_por_partido                  NUMERIC(5,3),
  xa_por_partido                  NUMERIC(5,3),
  grandes_ocasiones_por_partido   NUMERIC(5,2),
  entradas_por_partido            NUMERIC(5,2),
  intercepcciones_por_partido     NUMERIC(5,2),
  despejes_por_partido            NUMERIC(5,2),
  pases_por_partido               NUMERIC(5,2),
  centros_por_partido             NUMERIC(5,2),
  atajadas                        NUMERIC(5,2),
  goles_recibidos                 INTEGER,
  porcentaje_atajadas             NUMERIC(5,2),
  errores_que_generaron_gol       INTEGER,
  autogoles                       INTEGER,
  CONSTRAINT uq_estadistica_jugador_temporada UNIQUE (jugador_id, temporada)
);

CREATE INDEX idx_estadisticas_jugador_id ON estadisticas_jugadores (jugador_id);
CREATE INDEX idx_estadisticas_temporada ON estadisticas_jugadores (temporada);
CREATE INDEX idx_estadisticas_liga ON estadisticas_jugadores (liga);
```

### `ejecuciones_scraping`

```sql
CREATE TABLE ejecuciones_scraping (
  id                    UUID PRIMARY KEY,
  inicio                TIMESTAMPTZ NOT NULL,
  fin                   TIMESTAMPTZ,
  jugadores_procesados  INTEGER NOT NULL DEFAULT 0,
  errores               INTEGER NOT NULL DEFAULT 0,
  estado                VARCHAR(20) NOT NULL DEFAULT 'en_progreso',
  detalle               JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_ejecuciones_estado ON ejecuciones_scraping (estado);
CREATE INDEX idx_ejecuciones_inicio ON ejecuciones_scraping (inicio DESC);
```

---

## Variables de configuracion nuevas (environment)

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `WHOSCORED_LEAGUE_CONFIGS` | JSON con IDs de liga/temporada/stage por liga | ver abajo |
| `WHOSCORED_DELAY_MIN_MS` | Delay minimo entre paginas (ms) | `2000` |
| `WHOSCORED_DELAY_MAX_MS` | Delay maximo entre paginas (ms) | `5000` |
| `WHOSCORED_SEASON_LABEL` | Etiqueta de temporada activa | `"2025/2026"` |

```json
// Ejemplo de WHOSCORED_LEAGUE_CONFIGS
[
  { "liga": "PL", "regionId": 252, "tournamentId": 2, "seasonId": 12345, "stageId": 22345 },
  { "liga": "PD", "regionId": 206, "tournamentId": 4, "seasonId": 12346, "stageId": 22346 },
  { "liga": "SA", "regionId": 108, "tournamentId": 5, "seasonId": 12347, "stageId": 22347 },
  { "liga": "BL1", "regionId": 81,  "tournamentId": 3, "seasonId": 12348, "stageId": 22348 },
  { "liga": "FL1", "regionId": 74,  "tournamentId": 22,"seasonId": 12349, "stageId": 22349 }
]
```

> Los `seasonId` y `stageId` deben actualizarse cada temporada en los secrets de GitHub Actions.
