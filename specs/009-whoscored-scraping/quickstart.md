# Quickstart: Validacion del Modulo de Scraping WhoScored (009)

**Feature branch**: `009-whoscored-scraping`
**Generado por**: `/speckit-plan`

---

## Prerequisitos

1. Tener el backend corriendo localmente con Docker:
   ```bash
   docker compose up -d
   ```
2. Variables de entorno configuradas en `backend/.env` (incluir las nuevas de scraping):
   ```env
   WHOSCORED_LEAGUE_CONFIGS=[{"liga":"PL","regionId":252,"tournamentId":2,"seasonId":XXXXX,"stageId":XXXXX}, ...]
   WHOSCORED_DELAY_MIN_MS=2000
   WHOSCORED_DELAY_MAX_MS=5000
   WHOSCORED_SEASON_LABEL=2025/2026
   ```
3. Base de datos migrada con las nuevas tablas (`estadisticas_jugadores`, `ejecuciones_scraping`):
   ```bash
   cd backend && npm run migration:run
   ```
4. Datos de jugadores/ligas/equipos ya presentes en la DB (pueden provenir de la sincronizacion de football-data.org existente).

---

## Escenario 1: Ejecucion manual via API (FR-006)

### Setup
- Obtener JWT de administrador via `POST /api/auth/login` con credenciales admin.

### Pasos
```http
POST /api/scraping/ejecutar
Authorization: Bearer <JWT_ADMIN>
```

### Resultado esperado
- HTTP `202 Accepted` con cuerpo:
  ```json
  {
    "ejecucionId": "<uuid>",
    "mensaje": "Proceso de scraping iniciado correctamente.",
    "inicio": "<timestamp>"
  }
  ```
- La ejecucion se registra en `ejecuciones_scraping` con `estado = 'en_progreso'`.

Ver contrato completo: [contracts/scraping-api.openapi.yml](./contracts/scraping-api.openapi.yml)

---

## Escenario 2: Verificar persistencia de estadisticas (FR-001, FR-004, SC-001)

### Pasos
1. Esperar a que la ejecucion termine (consultar estado via GET):
   ```http
   GET /api/scraping/ejecuciones/<ejecucionId>
   Authorization: Bearer <JWT_ADMIN>
   ```
2. Confirmar `estado = 'exitoso'` y `jugadoresProcesados > 0`.
3. Verificar en la DB:
   ```sql
   SELECT COUNT(*) FROM estadisticas_jugadores WHERE temporada = '2025/2026';
   -- Esperado: > 0 registros
   SELECT * FROM estadisticas_jugadores LIMIT 5;
   -- Verificar que goles, rating, minutos_jugados esten poblados
   ```

### Resultado esperado
- Registros de `EstadisticaJugador` insertados, vinculados a jugadores existentes.
- Campos como `goles`, `asistencias`, `rating`, `minutos_jugados` con valores reales.
- Campos opcionales (`xg_por_partido`, `atajadas`) en null para jugadores de campo.

---

## Escenario 3: Idempotencia / upsert (SC-005, FR-004)

### Pasos
1. Anotar el `COUNT(*)` de `estadisticas_jugadores` antes.
2. Ejecutar el scraping por segunda vez (mismo endpoint `POST /api/scraping/ejecutar`).
3. Esperar finalizacion.
4. Verificar que el COUNT no aumento:
   ```sql
   SELECT COUNT(*) FROM estadisticas_jugadores WHERE temporada = '2025/2026';
   -- Debe ser igual al count anterior
   ```

### Resultado esperado
- El numero de filas NO crece entre ejecuciones.
- Los valores de `fecha_actualizacion` de los registros existentes se actualizan.

---

## Escenario 4: Manejo de errores individuales sin interrupcion (FR-008, SC-003)

### Pasos
1. Inducir un error simulado: renombrar un jugador en la DB para que no haya match con WhoScored.
   ```sql
   UPDATE jugadores SET nombre = 'JUGADOR_INEXISTENTE_TEST' WHERE id = '<uuid-de-algun-jugador>';
   ```
2. Ejecutar el scraping.
3. Verificar el detalle de la ejecucion:
   ```http
   GET /api/scraping/ejecuciones/<ejecucionId>
   ```
4. Verificar que `estado = 'exitoso'`, `errores >= 1` y el array `detalle` contiene el error del jugador no encontrado.
5. Verificar que los demas jugadores fueron procesados correctamente.
6. Revertir el cambio en la DB.

### Resultado esperado
- La ejecucion completa con exito global aunque un jugador falle.
- El error queda registrado en `detalle` con liga, nombre y mensaje.

---

## Escenario 5: Ejecucion via GitHub Actions (FR-007, SC-004)

### Setup
- Configurar secrets en el repositorio GitHub:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `WHOSCORED_LEAGUE_CONFIGS`, `WHOSCORED_SEASON_LABEL`

### Pasos
1. Ir a la seccion **Actions** del repositorio en GitHub.
2. Seleccionar el workflow **"WhoScored Scraper"**.
3. Hacer clic en **"Run workflow"** (disparo manual via `workflow_dispatch`).
4. Verificar que el job `run-scraper` pasa correctamente (icono verde).
5. Verificar en la DB que la tabla `ejecuciones_scraping` tiene un nuevo registro con `estado = 'exitoso'`.

### Cron automatico
- El workflow se ejecuta automaticamente todos los domingos a las 02:00 UTC.
- Verificar en el historial de Actions despues del primer domingo.

---

## Escenario 6: Historial de ejecuciones (FR-005)

### Pasos
```http
GET /api/scraping/ejecuciones?limite=5&pagina=1
Authorization: Bearer <JWT_ADMIN>
```

### Resultado esperado
- Lista de ejecuciones con `id`, `inicio`, `fin`, `estado`, `jugadoresProcesados`, `errores`.
- Ordenadas por `inicio` descendente.

---

## Verificacion de cobertura (Principio VI)

```bash
cd backend
npm run test:unit:cov
# Verificar: lines >= 80%, branches >= 80% en archivos de scraping

npm run test:integration:cov
# Verificar: cobertura del EstadisticaJugadorRepository
```
