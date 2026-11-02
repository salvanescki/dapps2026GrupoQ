# Contract: Componentes UI, Rutas, Hooks y Gráficas `shadcn/ui` ("Line Chart - Linear")

**Feature**: `013-marketplace-frontend` | **Phase**: 1 — Design & Contracts | **Date**: 2026-11-02

---

## 1. Contrato de Enrutamiento (`frontend/src/routes/`)

### 1.1 Mapa de Rutas (`AppRoutes.tsx`)

| Ruta | Guard | Vista | Visibilidad en `Navbar` |
|------|-------|-------|-------------------------|
| `/login` | `PublicRoute` | `LoginView` | No aplica (pública) |
| `/register` | `PublicRoute` | `RegisterView` | No aplica (pública) |
| `/` | `ProtectedRoute` | `HomeView` (Dashboard ejecutivo) | Permanente (`id="nav-dashboard"`) |
| `/marketplace` | `ProtectedRoute` | `MarketplaceView` (Ranking y Estrategia) | Permanente (`id="nav-marketplace"`) |
| `/players` | `ProtectedRoute` | `PlayersCatalogView` (Catálogo completo) | Permanente (`id="nav-players-catalog"`) |
| `/portfolio` | `ProtectedRoute` | `PortfolioView` (Patrimonio, Órdenes e Historial) | Permanente (`id="nav-portfolio"`) |
| `/admin` | `ProtectedRoute` + `AdminRoute` | `AdminGovernanceView` (Estrategias, Recálculo y Auditoría) | Exclusivo `usuario?.rol === 'ADMIN'` (`id="nav-admin"`) |
| `*` | — | `<Navigate to="/" replace />` | — |

### 1.2 Guard de Rol Administrativo (`AdminRoute.tsx`)

- Si `cargando === true` → renderiza `<RouteLoading />`.
- Si `!estaAutenticado || !usuario` → `<Navigate to="/login" replace />`.
- Si `usuario.rol !== 'ADMIN'` → `<Navigate to="/" replace state={{ avisoSeguridad: 'Acceso restringido: el Panel de Gobernanza es exclusivo para cuentas Administradoras.' }} />` sin montar `AdminGovernanceView` ni disparar peticiones a `/admin/*` (`FR-027`, `SC-006`).

---

## 2. Contrato de Primitivas de Gráficas `shadcn/ui` (`frontend/src/components/ui/chart.tsx`)

### 2.1 Exports Requeridos

```typescript
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

export const ChartContainer: React.FC<
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ReactElement;
    altura?: number; // Default 250px
  }
>;

export const ChartStyle: React.FC<{ id: string; config: ChartConfig }>;
export const ChartTooltip: typeof RechartsPrimitive.Tooltip;
export const ChartTooltipContent: React.FC<ChartTooltipContentProps>;
```

### 2.2 Integración con Design Tokens (`tokens.css` + `chart.css`)

- **Cero Tailwind Preflight**: `chart.css` consume exclusivamente variables de `tokens.css` (`--bg-card`, `--glass-blur`, `--border-default`, `--text-primary`, `--text-secondary`, `--color-emerald-500`, `--color-amber-500`, `--radius-lg`, `--shadow-md`).
- `<ChartStyle />` inyecta `[data-chart="${chartId}"] { --color-<key>: <valor>; }` permitiendo usar `stroke="var(--color-valor)"`, `stroke="var(--color-patrimonio)"` y `stroke="var(--color-saldo)"`.
- **Compatibilidad JSDOM / Vitest**: Si `typeof globalThis.ResizeObserver === 'undefined'`, `ChartContainer` renderiza `React.cloneElement(children, { width: 640, height: altura })` en lugar de depender de mediciones DOM nulas, garantizando renderizado real de `<svg>` y `<Line>` en los tests sin modificar `frontend/tests/setup.ts`.

### 2.3 Variante Exacta "Line Chart - Linear"

Ambos componentes de gráfica (`PlayerQuoteLinearChart` y `PortfolioBalanceLinearChart`) **MUST** implementar la estructura exacta de `shadcn/ui` *Line Chart - Linear*:

```tsx
<ChartContainer config={chartConfig} className="marketplace-chart-container">
  <LineChart accessibilityLayer data={datos} margin={{ left: 12, right: 12, top: 8, bottom: 4 }}>
    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
    <XAxis
      dataKey="etiquetaEjeX"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
    />
    <YAxis hide domain={dominioY} />
    <ChartTooltip cursor={false} content={<ChartTooltipContent ... />} />
    <Line
      dataKey="..."
      type="linear"
      stroke="var(--color-...)"
      strokeWidth={2}
      dot={false}
      activeDot={{ r: 5 }}
    />
  </LineChart>
</ChartContainer>
```

---

## 3. Contratos de los Dos Componentes de Gráfica Lineal

### 3.1 `PlayerQuoteLinearChart` (`src/components/player-detail/PlayerQuoteLinearChart.tsx`)

- **Props**: `{ cotizaciones: CotizacionJugador[]; cargando: boolean; error: string | null; onReintentar: () => void }`
- **`chartConfig`**: `{ valor: { label: 'Cotización (cr.)', color: 'var(--color-emerald-500)' } }`
- **Comportamiento**:
  - Usa `prepararSerieCotizaciones(cotizaciones)` (`fechaCotizacion ASC` en eje X, `valor` en eje Y).
  - Si `puntos.length === 0`: estado vacío en español (`data-testid="quote-chart-empty"`).
  - Si `puntos.length === 1`: renderiza la gráfica con `dominioY` estabilizado + `<ReferenceDot>` sobre el punto inicial + aviso explicativo en español (`data-testid="quote-chart-single-notice"`).
  - `ChartTooltipContent` enriquecido: muestra `fechaFormateada`, `valor` en créditos, `score` deportivo (4 dec), `estrategiaVersion` y etiqueta explícita `"Sin estadísticas deportivas (valor base)"` cuando `sinEstadisticas === true` (`FR-011`).

### 3.2 `PortfolioBalanceLinearChart` (`src/components/portfolio/PortfolioBalanceLinearChart.tsx`)

- **Props**: `{ serieTemporal: PuntoGraficoPatrimonio[]; sinOperaciones: boolean; saldoInicial: number }`
- **`chartConfig`**:
  - `patrimonioNeto`: `{ label: 'Patrimonio Neto', color: 'var(--color-emerald-500)' }` (`#10b981`)
  - `saldoBilletera`: `{ label: 'Saldo Líquido', color: 'var(--color-amber-500)' }` (`#f59e0b`)
- **Comportamiento**:
  - Traza dos `<Line type="linear" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />` (`patrimonioNeto` y `saldoBilletera`).
  - Cuando `sinOperaciones === true`, muestra el estado orientativo anclado en `saldoInicial` con acceso directo a `/marketplace` (`data-testid="portfolio-chart-empty-guide"`).
  - En cada punto inspeccionado el tooltip expone `fechaFormateada`, `hitoOperativo`, `patrimonioNeto`, `saldoBilletera` y `valoracionTokens` (`FR-017`).

---

## 4. Contratos de Hooks de Orquestación Reactiva

| Hook (`frontend/src/hooks/`) | Entradas | Salidas Principales | Garantías |
|------------------------------|----------|---------------------|-----------|
| `useDashboardSummary(usuarioId?, token?)` | `usuarioId`, `tokenDeAcceso` | `{ portfolio, estrategia, topRanking, cargando, error, recargar }` | `AbortController` en cleanup; degradación silenciosa si `fetch` falla en tests síncronos de `HomeView`. |
| `useMarketplaceRanking(posicionInicial?)` | `posicion?: PosicionFiltroRanking \| 'Todas'` | `{ ranking, estrategia, posicionFiltro, cambiarPosicion, cargando, error, recargar }` | Revalida al cambiar demarcación o pulsar "Actualizar". |
| `usePlayerMarketPanel(jugadorId, auth?)` | `jugadorId`, contexto opcional de sesión | `{ cotizaciones, ordenesActivas, posicionUsuario, saldoDisponible, stockPrimarioEstimado, cargando, comprando, vendiendo, cancelandoOrdenId, mensajeExito, errorOperacion, comprarPrimario, comprarSecundario, publicarVenta, cancelarOrden, recargar }` | Lee sesión vía `useContext(AuthContext)` seguro; revalida cotizaciones + órdenes + portfolio + saldo tras cada mutación. |
| `usePortfolio(usuarioId?, token?)` | `usuarioId`, `tokenDeAcceso` | `{ resumenPatrimonial, ordenesAbiertasUsuario, transacciones, filtrosHistorial, actualizarFiltrosHistorial, limpiarFiltrosHistorial, publicarVenta, cancelarOrden, cargando, mutando, mensajeExito, error, recargar }` | Combina `GET /users/:id/portfolio`, `GET /users/:id/transactions` y `GET /orders?vendedorId=:id&estado=ACTIVA`. |
| `useAdminGovernance(token?)` | `tokenDeAcceso` | `{ estrategia, transaccionesAuditoria, resumenRecalculo, filtrosAuditoria, actualizarFiltrosAuditoria, limpiarFiltrosAuditoria, cambiarEstrategia, dispararRecalculo, cambiandoEstrategia, recalculando, cargando, mensajeExito, error, recargar }` | Bloquea doble clic durante `recalculando` y `cambiandoEstrategia`; revalida tras concluir. |

---

## 5. Contratos de Preservación e Inmutabilidad de Tests Preexistentes (Principio IV)

Ningún archivo bajo `frontend/tests/**` ni `backend/test/**` puede ser editado ni eliminado. Los componentes extendidos **MUST** preservar estos contratos exactos:

| Componente Existente | Contratos / Selectores Inmutables a Preservar |
|----------------------|-----------------------------------------------|
| `Navbar.tsx` | `<nav className="app-navbar home-navbar" aria-label="Navegación principal">`, botón `id="logout-button"` con `aria-label="Cerrar sesión"` y texto `"Cerrar Sesión"`, soporte de `items` pasados por prop (como en `LayoutAndViews.test.tsx`). |
| `HomeView.tsx` | Retornar `null` si `!usuario`; renderizar síncronamente desde el primer frame: inicial del avatar, `¡Bienvenido de vuelta,`, `{usuario.nombre}`, texto `'Activo'`, `Sesión activa — {usuario.correo}` y enlace `id="nav-players-catalog"` hacia `/players`. |
| `PlayersCatalogView.tsx` | Preservar `h1` `Catálogo de Jugadores de las 5 Grandes Ligas`, `data-testid="catalog-count-badge"`, `btn-open-filters`, `catalog-error`, `catalog-initial-loading`, `loading-more-spinner`, `infinite-scroll-sentinel`, `player-grid` y `PlayerDetailModal`. |
| `PlayerDetailModal.tsx` | Preservar firma `{ playerId: string \| null; onClose: () => void; onMarketMutation?: () => void }` (nueva prop opcional), `data-testid="player-detail-overlay"`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="player-detail-title"`, `#player-detail-close` (`aria-label="Cerrar detalle del jugador"`), `data-testid="modal-loading-spinner"`, `data-testid="stats-grid"`, `data-testid="stats-empty-notice"`, y un único `role="alert"` cuando `usePlayerDetail` retorna `error`. |

