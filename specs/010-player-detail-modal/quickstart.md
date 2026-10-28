# Quickstart: Validación de la Feature — Modal de Detalle de Jugador

**Feature**: `010-player-detail-modal` | **Phase**: 1 — Design

---

## Prerrequisitos

1. **Docker Compose activo**: base de datos PostgreSQL y Redis corriendo.
   ```bash
   docker-compose up -d
   ```

2. **Backend compilado y corriendo**:
   ```bash
   cd backend && npm run start:dev
   # API disponible en http://localhost:3000
   ```

3. **Frontend corriendo**:
   ```bash
   cd frontend && npm run dev
   # SPA disponible en http://localhost:5173
   ```

4. **Datos de jugadores sincronizados** (si la BD está vacía):
   ```bash
   curl -X POST http://localhost:3000/players/sync
   ```

5. **Estadísticas scrapeadas disponibles** (al menos para algunos jugadores):
   - El scraping de WhoScored ya debe haberse ejecutado en este branch.
   - Verificar: `GET http://localhost:3000/players?limit=5` y anotar un `id` de jugador.

---

## Escenario 1 — Endpoint enriquecido: jugador con estadísticas

**Objetivo**: Verificar que `GET /players/:id` retorna el campo `estadisticas` con datos de WhoScored.

```bash
# 1. Obtener un ID de jugador con estadísticas (buscar uno conocido)
curl -s http://localhost:3000/players?limit=5 | python3 -m json.tool | grep '"id"' | head -5

# 2. Consultar el detalle del jugador con ese ID
curl -s http://localhost:3000/players/<UUID_DEL_JUGADOR> | python3 -m json.tool
```

**Resultado esperado**:
- Código HTTP `200`
- Respuesta contiene los campos existentes (`id`, `nombre`, `posicion`, `equipo`, `liga`, etc.)
- Respuesta contiene `"estadisticas": { "temporada": "...", "partidosJugados": N, ... }` con valores no-null

Ver schema completo en: [contracts/backend-endpoint.md](./contracts/backend-endpoint.md)

---

## Escenario 2 — Endpoint enriquecido: jugador sin estadísticas

**Objetivo**: Verificar que el endpoint no falla si el jugador no tiene estadísticas de WhoScored.

```bash
# Buscar un jugador cuyo ID no haya sido matcheado en el scraping
# (o usar el endpoint de Swagger: http://localhost:3000/api#/Jugadores/PlayersController_buscarPorId)
curl -s http://localhost:3000/players/<UUID_SIN_STATS> | python3 -m json.tool
```

**Resultado esperado**:
- Código HTTP `200`
- Campo `estadisticas` es `null` o ausente
- Sin error en consola del servidor

---

## Escenario 3 — Frontend: abrir modal desde card

**Objetivo**: Verificar flujo completo en el navegador.

1. Abrir `http://localhost:5173/catalog` en el navegador.
2. Esperar a que cargue el catálogo de jugadores.
3. Hacer click en cualquier `PlayerCard`.
4. **Verificar**:
   - Se abre un overlay semitransparente sobre el catálogo.
   - El panel del modal muestra el nombre del jugador y su posición.
   - Si tiene estadísticas: se muestra la sección de estadísticas con métricas no-null.
   - Si es portero: se muestran métricas específicas de portero (atajadas, goles recibidos, etc.).
   - Si no tiene estadísticas: se muestra el mensaje "Estadísticas no disponibles".

---

## Escenario 4 — Frontend: estado de carga

**Objetivo**: Verificar que el spinner se muestra durante la petición.

1. Abrir DevTools → Network → throttle a "Slow 3G".
2. Hacer click en una card.
3. **Verificar**: se muestra el spinner/skeleton dentro del modal antes de recibir la respuesta.
4. Desactivar throttle.

---

## Escenario 5 — Frontend: cierre del modal

**Objetivo**: Verificar todas las vías de cierre.

1. Con el modal abierto, presionar la tecla **Escape** → el modal se cierra.
2. Abrir otro modal, hacer click en el **botón X** → el modal se cierra.
3. Abrir otro modal, hacer click en el **overlay** (fuera del panel) → el modal se cierra.
4. Verificar en todos los casos: el catálogo sigue visible en el mismo estado que antes de abrir el modal.

---

## Escenario 6 — Frontend: click rápido en múltiples cards

**Objetivo**: Verificar que solo se muestra el último jugador clickeado.

1. Abrir DevTools → Network → throttle a "Slow 3G".
2. Hacer click rápidamente en 3 cards diferentes.
3. **Verificar**: el modal muestra solo los datos del último jugador clickeado; no hay "flash" de datos de jugadores anteriores.

---

## Escenario 7 — Manejo de error de red

**Objetivo**: Verificar el mensaje de error y el botón de reintentar.

1. Abrir DevTools → Network → marcar "Offline".
2. Hacer click en una card.
3. **Verificar**: el modal muestra un mensaje de error amigable (ej: "No fue posible conectar con el servidor") y un botón "Reintentar".
4. Desactivar "Offline".
5. Hacer click en "Reintentar" → el modal carga correctamente.

---

## Referencias

- Schema del endpoint: [contracts/backend-endpoint.md](./contracts/backend-endpoint.md)
- API de componentes: [contracts/frontend-component-api.md](./contracts/frontend-component-api.md)
- Modelo de datos: [data-model.md](./data-model.md)
- Spec completa: [spec.md](./spec.md)
