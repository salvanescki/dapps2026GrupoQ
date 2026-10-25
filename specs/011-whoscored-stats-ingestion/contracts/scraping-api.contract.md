# Contract: Scraping & Player Stats REST API

**Feature**: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)  
**Contract Type**: REST API HTTP Contract (NestJS OpenAPI / Swagger)  
**Base Path**: `/scraping`  
**Alineación**: Refleja estrictamente el código existente en `backend/src/scraping/controllers/scraping.controller.ts` y `EstadisticasJugadorResponse` en `backend/src/scraping/services/scraping.service.ts`.  

---

## 1. Disparar Pipeline de Scraping

### Endpoint
`POST /scraping/ejecutar`

### Autenticación
- **Bearer Token (JWT)** requerido (Guard: `JwtAuthGuard`).

### Comportamiento Operativo
Invoca `scrapingService.ejecutarPipeline('manual')` directamente en el proceso de la aplicación NestJS (sin colas externas tipo Bull/Celery). Si ya existe una ejecución con estado `en_progreso`, retorna 409 Conflict. Si no, retorna código HTTP 202 (Accepted) con los metadatos de inicio.

### Respuestas

#### 202 Accepted (Ejecución iniciada)
```json
{
  "ejecucionId": "a5832f26-f3f9-499a-ab79-f15200a35044",
  "mensaje": "Proceso de scraping iniciado correctamente.",
  "inicio": "2026-10-25T13:20:44.000Z"
}
```

#### 409 Conflict (Ejecución concurrente rechazada)
```json
{
  "statusCode": 409,
  "message": "Ya existe una ejecución de scraping en progreso.",
  "error": "Conflict"
}
```

---

## 2. Listar Historial de Ejecuciones

### Endpoint
`GET /scraping/ejecuciones?limite=10&pagina=1`

### Autenticación
- **Bearer Token (JWT)** requerido.

### Respuestas

#### 200 OK
```json
{
  "datos": [
    {
      "id": "a5832f26-f3f9-499a-ab79-f15200a35044",
      "inicio": "2026-10-25T13:20:44.000Z",
      "fin": "2026-10-25T13:26:10.000Z",
      "estado": "exitoso",
      "jugadoresProcesados": 2150,
      "errores": 0
    }
  ],
  "total": 1,
  "pagina": 1,
  "limite": 10
}
```

---

## 3. Consultar Detalle y Auditoría de una Ejecución

### Endpoint
`GET /scraping/ejecuciones/:id`

### Autenticación
- **Bearer Token (JWT)** requerido.

### Respuestas

#### 200 OK
```json
{
  "id": "a5832f26-f3f9-499a-ab79-f15200a35044",
  "inicio": "2026-10-25T13:20:44.000Z",
  "fin": "2026-10-25T13:26:10.000Z",
  "estado": "exitoso",
  "jugadoresProcesados": 2150,
  "errores": 0,
  "detalle": [
    {
      "liga": "PL",
      "jugadorNombre": "...",
      "mensaje": "...",
      "timestamp": "2026-10-25T13:21:00.000Z"
    }
  ]
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Ejecución no encontrada.",
  "error": "Not Found"
}
```

---

## 4. Consultar Estadísticas Vigentes de un Jugador

### Endpoint
`GET /scraping/jugadores/:id/estadisticas?temporada=2025/2026`

### Autenticación
- Pública.

### Parámetros de Ruta y Query
- `id`: UUID del jugador.
- `temporada`: Cadena de temporada opcional (default: temporada configurada en sistema).

### Respuestas

#### 200 OK (Jugador de Campo)
```json
{
  "jugador": {
    "id": "b3e02598-11a5-48ff-9844-3c87e596bb01",
    "nombre": "Mohamed Salah",
    "posicion": "Delantero",
    "dorsal": 11
  },
  "temporada": "2025/2026",
  "liga": "PL",
  "rol": "jugador_campo",
  "estadisticas": {
    "partidosJugados": 24,
    "minutosJugados": 2045,
    "rating": 7.84,
    "tarjetasAmarillas": 1,
    "tarjetasRojas": 0,
    "precisionPase": 82.4,
    "pasesPorPartido": 34.2,
    "duelosAereosGanadosPorPartido": 0.4,
    "goles": 18,
    "asistencias": 9,
    "tirosPorPartido": 3.2,
    "xgPorPartido": 0.72,
    "xaPorPartido": 0.35,
    "grandesOcasionesPorPartido": 1.2,
    "regatesCompletadosPorPartido": 1.7,
    "pasesClavePorPartido": 2.1,
    "entradasPorPartido": 0.6,
    "intercepccionesPorPartido": 0.3,
    "despejesPorPartido": 0.2,
    "centrosPorPartido": 0.5
  },
  "fechaActualizacion": "2026-10-25T13:26:10.000Z"
}
```

#### 200 OK (Portero)
```json
{
  "jugador": {
    "id": "c4f13609-22b6-49aa-0955-4d98f607cc02",
    "nombre": "Alisson Becker",
    "posicion": "Portero",
    "dorsal": 1
  },
  "temporada": "2025/2026",
  "liga": "PL",
  "rol": "portero",
  "estadisticas": {
    "partidosJugados": 22,
    "minutosJugados": 1980,
    "rating": 7.15,
    "tarjetasAmarillas": 0,
    "tarjetasRojas": 0,
    "precisionPase": 79.2,
    "pasesPorPartido": 28.5,
    "duelosAereosGanadosPorPartido": 0.2,
    "atajadas": 68,
    "golesRecibidos": 19,
    "porcentajeAtajadas": 78.16,
    "despejesPorPartido": 1.1,
    "erroresQueGeneraronGol": 0
  },
  "fechaActualizacion": "2026-10-25T13:26:10.000Z"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Jugador con ID '...' no encontrado.",
  "error": "Not Found"
}
```
