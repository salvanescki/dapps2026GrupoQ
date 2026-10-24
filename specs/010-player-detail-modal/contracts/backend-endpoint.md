# Contract: Backend — GET /players/:id (enriquecido)

**Feature**: `010-player-detail-modal` | **Tipo**: REST API Endpoint

---

## Endpoint

```
GET /players/:id
```

**Autenticación**: Pública (sin cambios respecto al contrato actual).

**Parámetro de ruta**:

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `id` | UUID v4 string | Sí | Identificador único del jugador |

---

## Respuesta exitosa `200 OK`

El campo `estadisticas` es **nuevo y opcional**. Todos los demás campos conservan su semántica y estructura actuales (retrocompatibilidad garantizada).

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "externalId": 3189,
  "nombre": "Bukayo Saka",
  "posicion": "Delantero",
  "posicionOriginal": "Right Winger",
  "fechaNacimiento": "2001-09-05",
  "nacionalidad": "England",
  "dorsal": 7,
  "equipo": {
    "id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    "nombre": "Arsenal FC",
    "nombreCorto": "Arsenal",
    "tla": "ARS",
    "escudoUrl": "https://crests.football-data.org/57.png"
  },
  "liga": {
    "id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    "codigo": "PL",
    "nombre": "Premier League",
    "pais": "England",
    "emblemaUrl": "https://crests.football-data.org/PL.png"
  },
  "estadisticas": {
    "temporada": "2024/2025",
    "liga": "Premier League",
    "partidosJugados": 35,
    "minutosJugados": 2980,
    "goles": 14,
    "asistencias": 10,
    "tarjetasAmarillas": 3,
    "tarjetasRojas": 0,
    "rating": 7.45,
    "tirosPorPartido": 2.3,
    "precisionPase": 82.1,
    "regatesCompletadosPorPartido": 1.8,
    "pasesClavePorPartido": 1.2,
    "xgPorPartido": 0.41,
    "xaPorPartido": 0.29
  }
}
```

### Ejemplo: jugador sin estadísticas de WhoScored

```json
{
  "id": "a0eebc99-...",
  "nombre": "Nuevo Jugador",
  "posicion": "Defensa",
  ...
  "estadisticas": null
}
```

---

## Respuestas de error

| Código | Condición | Cuerpo |
|--------|-----------|--------|
| `400 Bad Request` | UUID con formato inválido | `{ "statusCode": 400, "mensaje": "Identificador UUID con formato inválido." }` |
| `404 Not Found` | Jugador no encontrado | `{ "statusCode": 404, "mensaje": "Jugador no encontrado." }` |

---

## Schema OpenAPI — Nuevas clases DTO

### `EstadisticasJugadorDto`

| Campo | Tipo OpenAPI | Requerido | Descripción |
|-------|-------------|-----------|-------------|
| `temporada` | `string` | Sí | Ej: `"2024/2025"` |
| `liga` | `string` | Sí | Nombre de liga |
| `partidosJugados` | `integer` | Sí | — |
| `minutosJugados` | `integer` | Sí | — |
| `goles` | `integer` | Sí | — |
| `asistencias` | `integer` | Sí | — |
| `tarjetasAmarillas` | `integer` | Sí | — |
| `tarjetasRojas` | `integer` | Sí | — |
| `rating` | `number` | No | Rango [0, 10] |
| `tirosPorPartido` | `number` | No | — |
| `precisionPase` | `number` | No | Rango [0, 100] |
| `duelosAereosGanadosPorPartido` | `number` | No | — |
| `regatesCompletadosPorPartido` | `number` | No | — |
| `pasesClavePorPartido` | `number` | No | — |
| `xgPorPartido` | `number` | No | — |
| `xaPorPartido` | `number` | No | — |
| `grandesOcasionesPorPartido` | `number` | No | — |
| `entradasPorPartido` | `number` | No | — |
| `intercepccionesPorPartido` | `number` | No | — |
| `despejesPorPartido` | `number` | No | — |
| `pasesPorPartido` | `number` | No | — |
| `centrosPorPartido` | `number` | No | — |
| `atajadas` | `integer` | No | Específico portero |
| `golesRecibidos` | `integer` | No | Específico portero |
| `porcentajeAtajadas` | `number` | No | Rango [0, 100], portero |
| `erroresQueGeneraronGol` | `integer` | No | Específico portero |
| `autogoles` | `integer` | No | — |

### Modificación en `JugadorItemDto`

```typescript
// Campo añadido (opcional, compatible con implementación actual)
@ApiPropertyOptional({ type: () => EstadisticasJugadorDto, nullable: true })
estadisticas?: EstadisticasJugadorDto | null;
```

---

## Colección Postman — Actualización requerida (DoD)

- Actualizar el ejemplo de respuesta del request `GET /players/:id` para incluir el campo `estadisticas`.
- Agregar un segundo ejemplo "sin estadísticas" con `"estadisticas": null`.
