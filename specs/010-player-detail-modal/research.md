# Research: Modal de Detalle de Jugador con Estadísticas

**Feature**: `010-player-detail-modal` | **Phase**: 0 — Research

---

## 1. Enriquecimiento del endpoint `GET /players/:id` — Estrategia de inyección de dependencia

**Decision**: Inyectar `IEstadisticaJugadorRepository` directamente en `JugadorService` vía `@Inject(I_ESTADISTICA_JUGADOR_REPOSITORY)`.

**Rationale**: El repositorio ya existe y está registrado en `ScrapingModule`. Se debe exportar desde `ScrapingModule` e importar en `PlayersModule` (o en `AppModule`) para que NestJS pueda resolverlo en `JugadorService`. Esto mantiene la separación de módulos sin crear dependencias circulares.

**Alternatives considered**:
- Crear un `JugadorDetalleService` separado → innecesaria complejidad; el método `buscarPorId` ya existe en `JugadorService` y es su extensión natural.
- Inyectar el repositorio en el Controller → viola el principio constitucional I (sin lógica de negocio/orquestación en Controller).

---

## 2. Identificación de la temporada activa

**Decision**: Usar la estrategia de "temporada más reciente del jugador" — al llamar `buscarPorJugador(jugadorId)`, el repositorio ya devuelve las estadísticas ordenadas por `fechaActualizacion DESC`. Se toma el primer elemento (`[0]`).

**Rationale**: El repositorio `EstadisticaJugadorTypeOrmRepository.buscarPorJugador()` ya ordena por `fechaActualizacion DESC`, por lo que el primer resultado es la estadística más reciente. No se necesita un nuevo método de repositorio. Esto es consistente con el assumption de la spec: "las estadísticas se muestran únicamente para la temporada activa".

**Alternatives considered**:
- Pasar la temporada como query param al endpoint → añade complejidad de API innecesaria para esta feature; el historial por temporadas está explícitamente fuera del alcance (spec §Assumptions).
- Agregar un método `buscarTemporadaActiva(jugadorId)` al repositorio → sobreengineering; con una sola estadística por jugador en temporada activa (constraint UNIQUE jugadorId+temporada), `buscarPorJugador()[0]` es equivalente y no requiere cambios al repositorio.

---

## 3. Retrocompatibilidad del DTO `JugadorItemDto`

**Decision**: Extender `JugadorItemDto` con un campo `estadisticas?: EstadisticasJugadorDto | null` marcado como `@ApiPropertyOptional`. Los consumidores del endpoint que no usen `estadisticas` no se ven afectados.

**Rationale**: El campo es opcional a nivel TypeScript (`?`) y a nivel OpenAPI (`@ApiPropertyOptional`). Los clientes que ya consumen `GET /players/:id` (como el listado de catálogo que usa `JugadorItemDto`) reciben el campo como `null` o no presente, sin ruptura. El frontend actualiza el tipo `Jugador` para incluir `estadisticas?: EstadisticasJugador | null`.

**Alternatives considered**:
- Crear un endpoint separado `GET /players/:id/stats` → dos requests desde el frontend para abrir el modal; peor UX y mayor latencia.
- Crear un `JugadorDetalleDto` completamente separado y cambiar el tipo de retorno del controller → requiere actualizar los tests e2e existentes del controller; viola la constitución §IV (inmutabilidad de tests sin permiso explícito).

---

## 4. Patrón de modal en React — Manejo de petición en vuelo

**Decision**: Usar `AbortController` dentro del hook `usePlayerDetail` para cancelar peticiones anteriores cuando se selecciona un nuevo jugador (edge case: clicks rápidos consecutivos).

**Rationale**: El hook recibirá `playerId: string | null`. Cada vez que `playerId` cambia, se aborta el fetch anterior via `AbortController.abort()` y se inicia uno nuevo. La `fetch` API nativa soporta `signal` de `AbortController`. El estado de loading/error se resetea en cada cambio de `playerId`.

**Alternatives considered**:
- Debounce del click → no resuelve el problema si el usuario hace click lento pero en orden rápido; el AbortController es más preciso.
- `useRef` con flag `isMounted` → patrón legacy; AbortController es la solución moderna recomendada por React 18 y es la práctica estándar en el codebase (ver `useInfinitePlayers`).

---

## 5. Accesibilidad del modal — Cierre por Escape y focus trap

**Decision**: El modal implementará: (a) listener `keydown` para `Escape`, (b) `aria-modal="true"` + `role="dialog"` + `aria-labelledby`, (c) `focus` automático al primer elemento interactivo al abrir, y (d) restauración del foco al elemento que disparó el modal al cerrar.

**Rationale**: Son requisitos mínimos de accesibilidad para modales (WCAG 2.1, WAI-ARIA Modal Dialog Pattern). El `PlayerCard` almacena su propio ref para restaurar el foco al cerrar.

**Alternatives considered**:
- Usar una librería de modal (e.g., `@radix-ui/react-dialog`) → no está en las dependencias del proyecto; agregar una librería externa para un único componente es sobreengineering. La implementación manual es directa.

---

## 6. Renderizado responsivo del modal

**Decision**: El modal usará `position: fixed`, un overlay semitransparente, y el contenedor del modal con `max-height: 90vh; overflow-y: auto` para el scroll vertical en contenido largo. En móvil (< 768px) ocupará `width: 95vw`; en escritorio `max-width: 680px`.

**Rationale**: El spec exige responsividad entre 320px y ≥1024px. La implementación con CSS puro (sin dependencias) sigue la convención del proyecto. El scroll interno del modal permite mostrar todas las estadísticas sin cortar el contenido.

**Alternatives considered**:
- Modal de pantalla completa en móvil → peor UX en tablets; la solución con width relativo es más flexible.
- Usar `dialog` HTML nativo → soporte variable en navegadores más antiguos; la implementación manual con `div` es más controlable y consistente con el patrón existente en `FilterModal.tsx`.

---

## 7. Separación portero vs. jugador de campo en `StatsGrid`

**Decision**: `StatsGrid` recibe las `estadisticas` y la `posicion` del jugador. Internamente define dos listas de métricas: `METRICAS_CAMPO` (goles, asistencias, xG, regates, etc.) y `METRICAS_PORTERO` (atajadas, goles recibidos, % atajadas, errores). Se selecciona la lista según `posicion === 'Portero'`. Las métricas comunes (partidos, minutos, rating, tarjetas) se muestran siempre.

**Rationale**: Evita mostrar "0 atajadas" a un delantero o "0 goles" a un portero. Los campos opcionales (`null`) se filtran antes de renderizar (FR-009). El criterio de selección es la posición normalizada del jugador (ya disponible en `JugadorItemDto.posicion`).

**Alternatives considered**:
- Mostrar todas las métricas siempre → viola FR-009 (ocultar nulls) y genera información irrelevante por rol.
- Detectar el tipo en el backend y enviar sólo las métricas relevantes → acoplamiento innecesario de presentación en el backend; la lógica de visualización pertenece al frontend.

---

## 8. Registro del repositorio `IEstadisticaJugadorRepository` en `PlayersModule`

**Decision**: Exportar `EstadisticaJugadorTypeOrmRepository` desde `ScrapingModule` y luego importar `ScrapingModule` en `PlayersModule` (o en `AppModule` que ya importa ambos). Verificar `AppModule` para evitar doble registro.

**Rationale**: Revisando `players.module.ts`, actualmente importa sus propios providers. `ScrapingModule` ya tiene `EstadisticaJugadorTypeOrmRepository` registrado. La forma más limpia es exportarlo desde `ScrapingModule` e importar el módulo en `PlayersModule`.

**Alternatives considered**:
- Duplicar la declaración del repository en `PlayersModule` → viola DRY; dos instancias del mismo repositorio en el mismo proceso.
- Mover `JugadorService.buscarPorId` al `ScrapingModule` → desorganiza la arquitectura; la responsabilidad del detalle de jugador pertenece al módulo de jugadores.
