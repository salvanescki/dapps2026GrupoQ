# Contract: WhoScored External Feed & Fallback Adaptor

**Feature**: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)  
**Contract Type**: External Data Provider Adaptor Contract  
**Provider**: WhoScored.com (Servicio Externo No Versionado)  

---

> [!WARNING]
> Los endpoints, parámetros, cabeceras y estructura interna del feed JSON de WhoScored son dependencias externas no garantizadas y están sujetos a variaciones sin previo aviso. El sistema debe tratar este contrato a través de una capa adaptadora aislada (`WhoScoredFeedAdapter`), verificando la validez del esquema en tiempo de ejecución.

---

## 1. Descubrimiento Dinámico y Sesión de Navegación

### 1.1. Entrada de Bootstrap
- **URL Base**: `https://www.whoscored.com/Regions/{regionId}/Tournaments/{tournamentId}/Seasons/{seasonId}/Stages/{stageId}`
- **Entorno de Ejecución**: Playwright Chromium con plugin Stealth.
- **Salida de Sesión**:
  - Contexto de navegación autenticado con cookies de sesión y tokens de seguridad (Cloudflare / Incapsula superados).
  - Estructura competitiva confirmada: `tournamentId`, `seasonId`, `stageId`, `competencia` (nombre oficial ej: "Premier League"), `etapa` (nombre o ID de etapa).
  - Catálogo canónico de equipos participantes: `Array<{ whoScoredTeamId: string; nombre: string; url: string }>`.

---

## 2. Adaptador del Feed de Estadísticas por Equipo

### 2.1. Petición del Feed (Sujeta a Verificación)
- **Método**: HTTPS GET (utilizando las cookies y cabeceras de la sesión Playwright activa: `Referer`, `User-Agent`, `Model-last-Mode`).
- **Endpoint Habitual**: `/StatisticsFeed/1/GetPlayerStatistics` (o endpoint interno de plantilla equivalente).
- **Parámetros Habituales**:
  - `category`: `summary` | `defensive` | `offensive` | `passing`
  - `statsAccumulationType`: `0` (acumulado de temporada)
  - `isCurrent`: `true`
  - `stageId`: `{stageId}`
  - `teamIds`: `{whoScoredTeamId}`
  - `numberOfPlayersToPick`: `50` (o tamaño de plantilla)

### 2.2. Validación Mínima Requerida del Payload JSON
Para aceptar el payload como válido, el adaptador debe verificar la presencia de los siguientes campos esenciales en cada registro de jugador:

```typescript
export interface RawWhoScoredFeedItem {
  playerId: number | string; // Identificador del jugador (obligatorio)
  name: string;              // Nombre del jugador (obligatorio, no vacío)
  teamId?: number | string;  // ID del equipo
  teamName?: string;         // Nombre del equipo
  apps?: number;             // Partidos jugados
  minsPlayed?: number;       // Minutos jugados
  goals?: number;            // Goles
  assists?: number;          // Asistencias
  rating?: number;           // Calificación promedio
}
```

Si el payload no contiene un array de jugadores o carece de `playerId` y `name`, el adaptador rechaza la respuesta lanzando `WhoScoredFeedIncompatibleException`.

---

## 3. Fallback DOM Excepcional, Explícito y Observable

### 3.1. Condiciones de Activación del Fallback DOM
El fallback a extracción directa desde el DOM de la página del equipo se activa **únicamente** ante:
1. Respuestas HTTP 403, 404 o 400 por alteración de parámetros en el feed.
2. Respuestas vacías o con JSON que no supere la validación mínima de esquema.
3. Respuestas de desafío interactivo (Cloudflare Turnstile / Captcha) no sorteables por la petición HTTP.

### 3.2. Observabilidad y Restricción de Cobertura
- **Observabilidad**: La activación del fallback DOM emite obligatoriamente una advertencia `WARN` en el logger y se anota como incidencia observable en el campo `detalle` de la auditoría.
- **Restricción de Publicación Incompleta**: La extracción vía DOM por equipo no garantiza la nómina completa si la tabla web está truncada. **Si la liga no alcanza el umbral de cobertura mínima (>= 350 jugadores con minutos), la publicación es RECHAZADA**. La activación del fallback DOM no otorga ninguna excepción a la regla de cobertura.

---

## 4. Matriz de Contingencias de Red y Sesión

| Evento | Detección | Acción del Adaptador |
| :--- | :--- | :--- |
| **HTTP 403 / Desafío Anti-bot** | Código 403 o texto `Just a moment...` | Recrear contexto browser, pausa exponencial, reintento. |
| **HTTP 429 Too Many Requests** | Código 429 | Pausa fija de 10s, reintento con jitter. |
| **Timeout / Falla de Conexión** | Timeout > 30s | Hasta 3 reintentos por equipo; si persiste, aislar el fallo y continuar con el siguiente equipo. |
| **Sesión Expirada** | Redirección a login o ausencia de cookies | Re-ejecutar bootstrap de navegación en la URL del torneo. |
| **Cambio de Parámetros de Feed** | Error 400 o JSON no mapeable | Conmutar a Fallback DOM observable para ese equipo. |
