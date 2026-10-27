# Contract: Frontend — Componentes y Hook

**Feature**: `010-player-detail-modal` | **Tipo**: Contratos de componentes y hooks React

---

## Hook: `usePlayerDetail`

**Archivo**: `frontend/src/hooks/usePlayerDetail.ts`

### Interfaz

```typescript
interface UsePlayerDetailState {
  jugador: JugadorDetalle | null;
  loading: boolean;
  error: string | null;
}

interface UsePlayerDetailReturn extends UsePlayerDetailState {
  retry: () => void;
}

function usePlayerDetail(playerId: string | null): UsePlayerDetailReturn
```

### Comportamiento

| Condición | Estado resultante |
|-----------|-------------------|
| `playerId === null` | `{ jugador: null, loading: false, error: null }` |
| `playerId` recién asignado | `{ jugador: null, loading: true, error: null }` → fetch iniciado |
| Fetch exitoso | `{ jugador: <datos>, loading: false, error: null }` |
| Error de red / servidor | `{ jugador: null, loading: false, error: <mensaje> }` |
| `playerId` cambia mientras fetch en curso | fetch anterior abortado via `AbortController`; nuevo fetch iniciado |
| `retry()` llamada | resetea error, inicia nuevo fetch con el mismo `playerId` |

### Contrato de cancelación

- Usa `AbortController` internamente; el fetch previo se aborta en el `useEffect` cleanup al cambiar `playerId` o al desmontar.
- Los errores de tipo `AbortError` se ignoran (no se setean como error de UI).

---

## Componente: `PlayerDetailModal`

**Archivo**: `frontend/src/components/player-detail/PlayerDetailModal.tsx`

### Props

```typescript
interface PlayerDetailModalProps {
  playerId: string | null;   // null → modal cerrado
  onClose: () => void;       // callback para cerrar
}
```

### Responsabilidades

- Si `playerId === null`: no renderiza nada (o `null`).
- Si `playerId !== null`: muestra el overlay + panel del modal.
- Internamente usa `usePlayerDetail(playerId)`.
- Escucha `keydown` en `document` para capturar `Escape`.
- Al montar con `playerId !== null`, hace focus en el botón de cierre (o primer elemento interactivo).
- Al llamar `onClose`, restaura el foco al elemento que desencadenó el modal (pasado internamente vía `ref`).
- Renderiza: encabezado (nombre, posición, equipo, liga), ficha básica (dorsal, fecha nacimiento, nacionalidad), `StatsGrid` (si hay estadísticas), mensaje "sin estadísticas" (si `estadisticas` es null), spinner durante carga, alerta de error con botón "Reintentar".

### Estados visuales

| Estado | UI |
|--------|-----|
| Cargando | Spinner centrado dentro del panel del modal |
| Error | `Alert` de tipo error + botón "Reintentar" |
| Sin estadísticas | Ficha básica + texto "Las estadísticas de WhoScored no están disponibles aún para este jugador." |
| Con estadísticas (campo) | Ficha básica + `StatsGrid` con métricas de jugador de campo |
| Con estadísticas (portero) | Ficha básica + `StatsGrid` con métricas de portero |

### Atributos de accesibilidad

```html
<div role="dialog" aria-modal="true" aria-labelledby="player-detail-title">
  <button id="player-detail-close" aria-label="Cerrar detalle del jugador">×</button>
  <h2 id="player-detail-title">{jugador.nombre}</h2>
  ...
</div>
```

---

## Componente: `StatsGrid`

**Archivo**: `frontend/src/components/player-detail/StatsGrid.tsx`

### Props

```typescript
interface StatsGridProps {
  estadisticas: EstadisticasJugador;
  posicion: PosicionJugador;
}
```

### Comportamiento

- Renderiza una grilla de `StatCard` para las métricas no-null.
- **Métricas comunes** (siempre mostradas si el valor no es null): `partidosJugados`, `minutosJugados`, `goles`, `asistencias`, `tarjetasAmarillas`, `tarjetasRojas`, `rating`.
- **Métricas de campo** (solo si `posicion !== 'Portero'`): `tirosPorPartido`, `precisionPase`, `xgPorPartido`, `xaPorPartido`, `regatesCompletadosPorPartido`, `pasesClavePorPartido`, `entradasPorPartido`, `intercepccionesPorPartido`.
- **Métricas de portero** (solo si `posicion === 'Portero'`): `atajadas`, `golesRecibidos`, `porcentajeAtajadas`, `erroresQueGeneraronGol`.
- Filtra cualquier métrica cuyo valor sea `null` o `undefined` antes de renderizar.

---

## Componente: `StatCard`

**Archivo**: `frontend/src/components/player-detail/StatCard.tsx`

### Props

```typescript
interface StatCardProps {
  label: string;    // Etiqueta legible (ej: "Goles", "xG/partido")
  value: number;    // Valor numérico ya filtrado (no null)
  unit?: string;    // Unidad opcional (ej: "%", "/p")
}
```

---

## Modificaciones a componentes existentes

### `PlayerCard` — añadir prop `onSelect`

```typescript
// Antes
interface PlayerCardProps {
  player: Jugador;
}

// Después (retrocompat: onSelect es opcional)
interface PlayerCardProps {
  player: Jugador;
  onSelect?: (id: string) => void;
}
```

El `<article>` raíz recibe `onClick={() => onSelect?.(player.id)}` y `style={{ cursor: 'pointer' }}` si `onSelect` está definido.

### `PlayerGrid` — propagar `onPlayerSelect`

```typescript
// Antes
interface PlayerGridProps {
  players: Jugador[];
}

// Después (retrocompat: onPlayerSelect es opcional)
interface PlayerGridProps {
  players: Jugador[];
  onPlayerSelect?: (id: string) => void;
}
```

Cada `PlayerCard` recibe `onSelect={onPlayerSelect}`.

### `PlayersCatalogView` — orquestar modal

```typescript
const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

// En JSX:
<PlayerGrid
  players={players}
  onPlayerSelect={(id) => setSelectedPlayerId(id)}
/>
<PlayerDetailModal
  playerId={selectedPlayerId}
  onClose={() => setSelectedPlayerId(null)}
/>
```
