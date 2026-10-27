# Data Model: Modal de Detalle de Jugador con Estadísticas

**Feature**: `010-player-detail-modal` | **Phase**: 1 — Design

---

## Entidades de Dominio Involucradas

### Jugador *(existente — sin cambios)*

Entidad de dominio en `backend/src/domain/jugador.entity.ts`. Contiene los datos básicos del jugador provenientes de football-data.org.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` (UUID v4) | Identificador interno |
| `externalId` | `number` | ID externo de football-data.org |
| `nombre` | `string` | Nombre completo del jugador |
| `posicion` | `PosicionJugador` | `'Portero' \| 'Defensa' \| 'Mediocampista' \| 'Delantero' \| 'No Clasificado'` |
| `posicionOriginal` | `string \| null` | Posición tal como la devuelve football-data.org |
| `fechaNacimiento` | `string \| null` | Formato `YYYY-MM-DD` |
| `nacionalidad` | `string` | Nombre del país |
| `dorsal` | `number \| null` | Número de dorsal (1–99) |
| `equipoId` | `string` (UUID) | FK a `Equipo` |
| `ligaId` | `string` (UUID) | FK a `Liga` |
| `equipo` | `Equipo \| null` | Relación cargada por el repositorio |
| `liga` | `Liga \| null` | Relación cargada por el repositorio |

**Invariantes**: nombre 2–150 chars, externalId entero positivo, posicion dentro de POSICIONES_VALIDAS, dorsal 1–99 si presente.

---

### EstadisticaJugador *(existente — sin cambios)*

Entidad de dominio en `backend/src/scraping/domain/estadistica-jugador.entity.ts`. Scrapeada desde WhoScored.com.

**Clave de unicidad**: `(jugadorId, temporada)` — constraint UNIQUE en base de datos.

| Campo | Tipo | Descripción | Rol |
|-------|------|-------------|-----|
| `id` | `string` (UUID) | Identificador interno | — |
| `jugadorId` | `string` (UUID) | FK al `Jugador` | — |
| `temporada` | `string` | Ej: `"2024/2025"` | — |
| `liga` | `string` | Nombre de la liga | — |
| `fuente` | `string` | Por defecto `"whoscored"` | — |
| `fechaActualizacion` | `Date` | Última actualización del scraping | — |
| `partidosJugados` | `number` | — | Común |
| `minutosJugados` | `number` | — | Común |
| `goles` | `number` | — | Campo |
| `asistencias` | `number` | — | Campo |
| `tarjetasAmarillas` | `number` | — | Común |
| `tarjetasRojas` | `number` | — | Común |
| `rating` | `number \| null` | Rango [0, 10] | Común |
| `tirosPorPartido` | `number \| null` | — | Campo |
| `precisionPase` | `number \| null` | Rango [0, 100] | Campo |
| `duelosAereosGanadosPorPartido` | `number \| null` | — | Campo |
| `regatesCompletadosPorPartido` | `number \| null` | — | Campo |
| `pasesClavePorPartido` | `number \| null` | — | Campo |
| `xgPorPartido` | `number \| null` | Expected goals/partido | Campo |
| `xaPorPartido` | `number \| null` | Expected assists/partido | Campo |
| `grandesOcasionesPorPartido` | `number \| null` | — | Campo |
| `entradasPorPartido` | `number \| null` | — | Campo |
| `intercepccionesPorPartido` | `number \| null` | — | Campo |
| `despejesPorPartido` | `number \| null` | — | Portero / Campo |
| `pasesPorPartido` | `number \| null` | — | Campo |
| `centrosPorPartido` | `number \| null` | — | Campo |
| `atajadas` | `number \| null` | — | Portero |
| `golesRecibidos` | `number \| null` | — | Portero |
| `porcentajeAtajadas` | `number \| null` | Rango [0, 100] | Portero |
| `erroresQueGeneraronGol` | `number \| null` | — | Portero |
| `autogoles` | `number \| null` | — | Portero / Campo |

**Invariantes**: jugadorId y temporada obligatorios, goles/asistencias/partidos/minutos/tarjetas ≥ 0, rating ∈ [0,10], precisionPase y porcentajeAtajadas ∈ [0,100].

---

## DTOs de Respuesta (Backend)

### EstadisticasJugadorDto *(nuevo)*

Representa las estadísticas de un jugador de campo. Todos los campos opcionales se omiten si son `null`.

```typescript
class EstadisticasJugadorDto {
  temporada: string;
  liga: string;
  partidosJugados: number;
  minutosJugados: number;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  rating?: number;                            // null → omitido
  tirosPorPartido?: number;
  precisionPase?: number;
  duelosAereosGanadosPorPartido?: number;
  regatesCompletadosPorPartido?: number;
  pasesClavePorPartido?: number;
  xgPorPartido?: number;
  xaPorPartido?: number;
  grandesOcasionesPorPartido?: number;
  entradasPorPartido?: number;
  intercepccionesPorPartido?: number;
  despejesPorPartido?: number;
  pasesPorPartido?: number;
  centrosPorPartido?: number;
  atajadas?: number;                          // Portero
  golesRecibidos?: number;                    // Portero
  porcentajeAtajadas?: number;                // Portero
  erroresQueGeneraronGol?: number;            // Portero
  autogoles?: number;
}
```

### JugadorItemDto *(extendido — retrocompat)*

El campo `estadisticas` es **opcional** (`@ApiPropertyOptional`). Los consumidores existentes no se ven afectados.

```typescript
class JugadorItemDto {
  // ... campos existentes sin cambios ...
  estadisticas?: EstadisticasJugadorDto | null;  // NUEVO campo opcional
}
```

---

## Tipos Frontend

### EstadisticasJugador *(nuevo en `player.types.ts`)*

```typescript
export interface EstadisticasJugador {
  temporada: string;
  liga: string;
  partidosJugados: number;
  minutosJugados: number;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  rating?: number | null;
  tirosPorPartido?: number | null;
  precisionPase?: number | null;
  duelosAereosGanadosPorPartido?: number | null;
  regatesCompletadosPorPartido?: number | null;
  pasesClavePorPartido?: number | null;
  xgPorPartido?: number | null;
  xaPorPartido?: number | null;
  grandesOcasionesPorPartido?: number | null;
  entradasPorPartido?: number | null;
  intercepccionesPorPartido?: number | null;
  despejesPorPartido?: number | null;
  pasesPorPartido?: number | null;
  centrosPorPartido?: number | null;
  atajadas?: number | null;
  golesRecibidos?: number | null;
  porcentajeAtajadas?: number | null;
  erroresQueGeneraronGol?: number | null;
  autogoles?: number | null;
}
```

### JugadorDetalle *(nuevo en `player.types.ts` — extiende `Jugador`)*

```typescript
export interface JugadorDetalle extends Jugador {
  estadisticas?: EstadisticasJugador | null;
}
```

---

## Relaciones

```
Jugador (1) ─── (0..1) EstadisticaJugador
                        └─ FK: jugadorId → Jugador.id
                        └─ UNIQUE: (jugadorId, temporada)
```

La feature **no introduce nuevas relaciones de dominio** ni nuevas tablas. Solo expone vía API una relación ya existente en la base de datos.

---

## Validaciones y Reglas de Presentación (Frontend)

| Regla | Comportamiento |
|-------|----------------|
| Campo de estadísticas `null` o ausente | Mostrar ficha básica + mensaje "Estadísticas no disponibles" (FR-005, FR-009) |
| Campo individual `null` | Omitir del `StatsGrid`; no mostrar "N/A" ni "-" (FR-009) |
| Posición `'Portero'` | Mostrar `atajadas`, `golesRecibidos`, `porcentajeAtajadas`, `erroresQueGeneraronGol` en lugar de métricas ofensivas |
| Cualquier otra posición | Mostrar métricas ofensivas/defensivas de campo |
| Carga en progreso | Spinner/skeleton visible (FR-007) |
| Error de red | Mensaje amigable + botón de reintentar (FR-008) |
| Click fuera del modal, Escape, botón X | Cierre del modal (FR-006) |
