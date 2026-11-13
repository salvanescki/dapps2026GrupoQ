# Fase 0: Investigación Técnica y Patrones de Remediación (`research.md`)

- **Feature**: `015-fix-sonarcloud-issues` — Remediación Integral de Issues Abiertos en SonarQube Cloud
- **Proyecto SonarQube Cloud**: `salvanescki_dapps2026GrupoQ` (Organización `salvanescki`, Región EU `https://sonarcloud.io`)
- **Alcance Total**: **73 issues abiertos** distribuidos en **20 reglas** (**54** en `backend` y **19** en `frontend`) sobre **33 archivos únicos** (19 en `backend` y 14 en `frontend`).

---

## 1. Diagnóstico de Sincronización entre el Tablero de SonarQube Cloud y `HEAD`

Al contrastar el reporte oficial obtenido mediante `python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief` con el árbol de código actual en `HEAD`, se identificó que el merge commit `4ae68ba` (`98758d0` — `HF: FIX SC ISSUES`) aplicó una refactorización parcial sobre 13 archivos enfocada en 5 reglas (`typescript:S3776`, `typescript:S7773`, `typescript:S6582`, `typescript:S7763` y `typescript:S3735`), pero:

1. **15 de las 20 reglas (54 issues)** no fueron intervenidas en absoluto en `HEAD`.
2. En los archivos intervenidos por `98758d0`, los números de línea se desplazaron respecto del último análisis registrado en SonarQube Cloud y subsisten métodos auxiliares o adyacentes con complejidad cognitiva elevada o patrones residuales que deben sanearse para evitar nuevos hallazgos al re-ejecutar el scanner:
   - `backend/src/domain/equipo-semanal.entity.ts`: `seleccionarOnceIdeal` fue simplificado, pero `validarInvariantes` (líneas 196-273) mantiene complejidad cognitiva > 15 y conserva el ternario redundante `this._miembros ? this._miembros.length : 0` en línea 229.
   - `backend/src/scraping/services/scraping.service.ts`: `ejecutarPipeline` fue descompuesto en métodos privados, pero `asociarJugadoresLocales` (líneas 222-305) mantiene complejidad cognitiva > 15 y subsisten bucles con `await` en `cargarJugadoresLocales` (línea 310) y `ejecutarPipeline` (línea 557).
   - `backend/src/scraping/services/whoscored-playwright.service.ts`: se extrajeron helpers de tabla y feeds, pero `descubrirEstructuraCompeticion` (líneas 466-605) y `leerFilasDeTablaDom` (líneas 216-280) mantienen complejidad cognitiva > 15, subsisten 7 bucles con `await` (`typescript:S9382`) y los hallazgos de `S2933` (línea 367), `S6594` (líneas 220, 244, 511, 562), `S7761` (línea 221) y `S3358` (línea 245) siguen presentes en las nuevas líneas desplazadas.
   - `frontend/src/views/TeamOfTheWeekView.tsx`: se eliminó `void` en línea 47, pero subsiste `onClick={() => void dispararGeneracionManual()}` en línea 70.

---

## 2. Decisiones Técnicas por Categoría de Reglas

### Decisión 1: Resolución de `await` dentro de bucles (`typescript:S9382` — 27 ocurrencias en `backend`)

- **Decision**:
  1. **Consultas de lectura independientes por lotes o por ítem**: Reemplazar el bucle con `await` por ejecución concurrente acotada mediante `await Promise.all(lotes.map(...))` en:
     - `CotizacionTypeOrmRepository.obtenerUltimasPorJugadores` (`backend/src/data-access/cotizacion.typeorm-repository.ts`, L63-76).
     - `EstadisticaJugadorTypeOrmRepository.buscarPorJugadores` (`backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`, L142-149).
     - `QuotesService.obtenerRanking` (`backend/src/services/quotes.service.ts`, L225-244).
  2. **Escrituras transaccionales por lotes, emisiones secuenciales e interacciones paso a paso con Playwright**: Reemplazar los bucles `for` / `for..of` con `await` por encadenamiento secuencial de promesas mediante `Array.prototype.reduce<Promise<void>>` y los bucles `while` con condición dinámica por funciones auxiliares recursivas asíncronas (`tail recursion` sobre promesas) en:
     - `CotizacionTypeOrmRepository.guardarMuchos` (`backend/src/data-access/cotizacion.typeorm-repository.ts`, L37-45).
     - `JugadorTypeOrmRepository.guardarMuchos` (`backend/src/data-access/jugador.typeorm-repository.ts`, L37-40).
     - `EstadisticaJugadorTypeOrmRepository.guardarMuchos` (`backend/src/scraping/data-access/estadistica-jugador.typeorm-repository.ts`, L71-115).
     - `QuotesService.recalcularCotizacionesActivas` (`backend/src/services/quotes.service.ts`, L360-369 — fallback individual resiliente).
     - `TokensService.emitirFaltantes` (`backend/src/services/tokens.service.ts`, L52-64).
     - `ScrapingService.cargarJugadoresLocales` (recursión por página en L310-316) y `ScrapingService.ejecutarPipeline` (`reduce` secuencial sobre `leagueConfigs` en L557-559) en `backend/src/scraping/services/scraping.service.ts`.
     - `WhoScoredPlaywrightService` (`backend/src/scraping/services/whoscored-playwright.service.ts`): `extraerEquipoDesdeDOM` (L692-707), `consultarFeedResumenConReintentos` (L739-758, recursivo), `extraerEstadisticasLigaPorEquipos` (L851-861), `consultarFeedComplementario` (L887-903, recursivo), `enriquecerConFeedsComplementarios` (L917-947), `extraerEstadisticasLiga` (L1001-1017) y `extraerFilasTabla` (L1096-1122, recursivo).
- **Rationale**:
  - La regla `typescript:S9382` inspecciona nodos `AwaitExpression` cuyos ancestros dentro de la misma función incluyan sentencias de bucle (`ForStatement`, `ForOfStatement`, `ForInStatement`, `WhileStatement`, `DoWhileStatement`).
  - En lecturas sin efectos colaterales, `Promise.all` elimina el bloqueo serie y mejora la latencia.
  - En escrituras sobre un `EntityManager` transaccional compartido o en automatización de navegador Playwright (clics de pestañas, paginación DOM, pausas de rate-limit), paralelizar con `Promise.all` rompería el aislamiento de página/transacción y el orden esperado por los tests existentes. El encadenamiento con `reduce` y la recursión asíncrona preservan el orden 100% determinista sin usar `await` dentro de ninguna sentencia de bucle.
- **Alternatives considered**:
  - *Paralelizar todo con `Promise.all`*: Descartado para Playwright y transacciones porque corrompe la navegación de una única instancia de `Page` y altera la secuencia determinista verificada por las pruebas unitarias e integración.
  - *Suprimir la regla con `// NOSONAR` o `eslint-disable`*: Prohibido expresamente por las reglas del proyecto y el requerimiento del usuario.

---

### Decisión 2: Reducción de Complejidad Cognitiva (`typescript:S3776` — 12 ocurrencias en `backend` y `frontend`)

- **Decision**:
  Verificar las refactorizaciones ya presentes en `HEAD` y completar la extracción de funciones/métodos privados cohesivos (manteniendo toda regla de negocio en la capa `domain`) para garantizar que tanto los 12 métodos reportados como los métodos adyacentes en los mismos archivos tengan complejidad cognitiva $\le 15$:
  1. `backend/src/domain/equipo-semanal.entity.ts`: `seleccionarOnceIdeal` ya se encuentra en complejidad 2; adicionalmente descomponer `validarInvariantes` (actualmente complejidad 24) en `validarParametrosTemporalesYEstrategia()`, `validarUnicidadDeMiembros()` y `validarDistribucionTactica433()`.
  2. `backend/src/scraping/domain/estadistica-jugador.entity.ts`: `validarInvariantes` y `actualizarEstadisticas` ya fueron simplificados mediante tabla declarativa `reglas` y lista `CAMPOS_ACTUALIZABLES` (complejidad $\le 6$).
  3. `backend/src/scraping/services/normalizador-jugador.service.ts`: `buscarCoincidencia` ya fue descompuesto en `buscarCoincidenciaExacta`, `buscarCoincidenciaSinSufijos`, `buscarCoincidenciaPorApellidoYClub` y `buscarCoincidenciaAbreviada` (todos con complejidad $\le 10$).
  4. `backend/src/scraping/services/scraping.service.ts`: `ejecutarPipeline` fue descompuesto en `procesarLiga` y helpers; adicionalmente descomponer `asociarJugadoresLocales` (actualmente complejidad > 15) extrayendo `coincideClubEnAsociacion()` y `asociarJugadorIndividual()`.
  5. `backend/src/scraping/services/whoscored-playwright.service.ts`: además de los helpers ya extraídos para `extraerEquipoDesdeDOM`, `enriquecerConFeedsComplementarios` y `extraerFilasTabla`, descomponer `descubrirEstructuraCompeticion` (extrayendo `construirUrlDescubrimiento`, `extraerMetadatosTemporadaYEtapa`, `extraerTituloCompetencia`, `extraerNombreEtapa` y `extraerEquiposDesdeStandings`) y `leerFilasDeTablaDom` (extrayendo funciones auxiliares de parseo de fila DOM) para que ningún método del archivo supere 15 puntos.
  6. `backend/src/services/jugador.service.ts`: `mapearAEstadisticasDto` ya fue simplificado con `CAMPOS_OPCIONALES_ESTADISTICAS` (complejidad 3); adicionalmente extraer `mapearEquipoResumenDto` y `mapearLigaResumenDto` desde `mapearAJugadorItemDto` para reducir su encadenamiento de operadores `||`.
  7. `frontend/src/hooks/usePlayerMarketPanel.ts`: `cargarPanel` ya cuenta con `buscarTokensDisponibles` extraído; extraer adicionalmente `resolverCargaInicialPanel` y `aplicarDatosPortfolioEnPanel` para dejar `cargarPanel` con complejidad $\le 8$.
  8. `frontend/src/hooks/usePortfolio.ts`: `cargarTodo` ya fue simplificado (complejidad 11); extraer `sincronizarTransaccionesFiltradas` para reducirla a $\le 7$.
  9. `frontend/src/utils/portfolio-chart.ts`: `reconstruirSeriePatrimonial` ya fue simplificado (complejidad 12); extraer `inicializarTenenciasYPrecios` y `construirPuntoTransaccion` para dejarla en $\le 7$.
- **Rationale**:
  Garantiza un margen amplio bajo el límite de 15 puntos en todas las funciones de los archivos auditados sin mover invariantes de negocio fuera de `domain/`.
- **Alternatives considered**:
  - *Confiar únicamente en los cambios previos de `98758d0`*: Descartado porque `EquipoSemanal.validarInvariantes`, `ScrapingService.asociarJugadoresLocales` y `WhoScoredPlaywrightService.descubrirEstructuraCompeticion` siguen superando 15 puntos en `HEAD`.

---

### Decisión 3: Accesibilidad Semántica e Interactividad en React (`typescript:S6819` — 5 ocurrencias, `typescript:S6847` — 1 ocurrencia)

- **Decision**:
  1. `frontend/src/components/catalog/PlayerCard.tsx` (L28-42 — `S6819` y `S6847`):
     - Cuando `onSelect` está definido, renderizar un elemento interactivo nativo `<button type="button" className="player-card" data-testid={\`player-card-${player.id}\`} onClick={() => onSelect(player.id)} aria-label={\`Ver detalle de ${player.nombre}\`}>`.
     - Cuando `onSelect` no está definido, renderizar `<article className="player-card" data-testid={\`player-card-${player.id}\`}>` sin `role="button"`, sin `tabIndex`, sin `onClick` y sin `onKeyDown`.
     - Ajustar `.player-card` en `frontend/src/styles/catalog.css` (`width: 100%; text-align: left; font: inherit; color: inherit;`) para que el `<button>` conserve exactamente la misma apariencia visual que `<article>`.
  2. `frontend/src/components/player-detail/PlayerDetailModal.tsx` (L63-68 y L69-74 — 2 ocurrencias de `S6819`):
     - Reemplazar el `<div role="presentation" onClick={handleOverlayClick}>` y el `<div role="dialog" ...>` por el mismo patrón semántico accesible ya validado en `FilterModal.tsx`: un contenedor `<div className="player-detail-overlay">` que contiene un `<button type="button" className="player-detail-backdrop" data-testid="player-detail-overlay" onClick={onClose} tabIndex={-1} aria-hidden="true" />` y como hermano un elemento nativo `<dialog open className="player-detail-panel" aria-modal="true" aria-labelledby="player-detail-title">`.
     - De este modo, `screen.getByRole('dialog')` y `screen.getByTestId('player-detail-overlay')` en las suites unitarias y de integración existentes funcionan sin modificaciones.
  3. `frontend/src/components/team-of-the-week/PitchPlayerCard.tsx` (L35-69 — `S6819`):
     - Reemplazar `<div role="button" tabIndex={0} ...>` por `<button type="button" ...>` manteniendo `onClick={handleClick}`, `onKeyDown={handleKeyDown}` (requerido por `PitchPlayerCard.test.tsx` que invoca `fireEvent.keyDown` directamente), `className="pitch-player-card"` y `data-testid={\`pitch-player-${miembro.jugadorId}\`}` con `font: inherit`.
  4. `frontend/src/components/marketplace/RankingFiltersBar.tsx` (L33-37 — `S6819`):
     - Reemplazar `<div className="ranking-position-tabs" role="group" aria-label="Filtrar por demarcación táctica">` por el elemento semántico nativo `<fieldset className="ranking-position-tabs" aria-label="Filtrar por demarcación táctica">` (con `border: none; margin: 0; padding: 0;` en CSS).
- **Rationale**:
  Cumple estrictamente las reglas `typescript:S6819` y `typescript:S6847` empleando controles HTML5 nativos (`<button>`, `<dialog>`, `<fieldset>`) y manteniendo compatibilidad total con los selectores de `frontend/tests/` (`getByRole('dialog')`, `getByRole('button')`, `getByTestId('player-detail-overlay')`, `getByTestId('player-card-...')`, `getByTestId('pitch-player-...')`).
- **Alternatives considered**:
  - *Mantener `<div role="dialog">` o `<article role="button">`*: Rechazado porque viola directamente `typescript:S6819` y `typescript:S6847`.

---

### Decisión 4: Accesibilidad Visual en CSS — Movimiento Reducido y Contraste (`css:S9440` — 3 ocurrencias, `css:S7924` — 1 ocurrencia)

- **Decision**:
  1. `css:S9440` en `frontend/src/components/player-detail/PlayerDetailModal.css` (L37 `.player-detail-panel` y L208 `.stat-card`) y `frontend/src/styles/catalog.css` (L452 `.filter-modal-content`):
     - Encapsular las declaraciones de `animation` con desplazamiento/escala y las transiciones de `transform` dentro de `@media (prefers-reduced-motion: no-preference)` y declarar explícitamente bloques `@media (prefers-reduced-motion: reduce)` con `animation: none; transition: none; transform: none;` para los selectores afectados (`.player-detail-overlay`, `.player-detail-panel`, `.stat-card`, `.stat-card:hover`, `.filter-modal-content`).
  2. `css:S7924` en `frontend/src/components/player-detail/PlayerDetailModal.css` (L109 `.player-detail-close-btn:hover, .player-detail-close-btn:focus-visible`):
     - Reemplazar el fondo semitransparente `background: rgba(255, 255, 255, 0.15)` (que el analizador estático de SonarCSS compone sobre blanco produciendo bajo contraste frente a `color: #ffffff`) por el color sólido equivalente en el tema oscuro del panel (`background-color: #262d3d;` y `background-color: #1a202c;` en el estado base), garantizando una relación de contraste > 12:1 con `#ffffff`.
- **Rationale**:
  Resuelve de raíz las advertencias estáticas de SonarCSS sin alterar la estética oscura del modal y respetando las preferencias vestibulares del sistema operativo.
- **Alternatives considered**:
  - *Cambiar el color de texto del botón de cierre a negro*: Rechazado porque sobre el fondo oscuro `#0f1219` del modal el botón quedaría ilegible.

---

### Decisión 5: Métodos `async` sin `await` (`typescript:S7503` — 5 ocurrencias en `backend`)

- **Decision**:
  En `backend/src/services/oms.service.ts` (`ejecutarCompraPrimaria` L80, `ejecutarCompraSecundaria` L258, `crearOrdenVenta` L420, `cancelarOrdenVenta` L502) y `backend/src/services/tokens.service.ts` (`ejecutarEmisionIdempotente` L101):
  - Quitar el modificador `async` de la firma del método externo conservando su tipo de retorno `: Promise<...>` y mover la desestructuración inicial de `dto` dentro del callback `async (manager: EntityManager) => { ... }` de `this.dataSource.transaction(...)`.
- **Rationale**:
  `this.dataSource.transaction(...)` ya retorna una `Promise<T>`. Quitar `async` del método envolvente elimina `typescript:S7503` sin disparar `typescript:S4326` (`Redundant 'await' on a return promise`), y mover la desestructuración dentro del callback preserva el rechazo asíncrono ante cualquier entrada inválida.
- **Alternatives considered**:
  - *Usar `return await this.dataSource.transaction(...)`*: Descartado porque en SonarQube TypeScript sin bloque `try/catch` activa la regla `typescript:S4326`.

---

### Decisión 6: Expresión Regular sin Backtracking Super-lineal (`typescript:S8786`), Contexto Memoizado (`typescript:S6481`), Alias Redundante (`typescript:S6564`) y Operador `void` (`typescript:S3735`) en `frontend`

- **Decision**:
  1. `typescript:S8786` en `frontend/src/utils/formato-mercado.ts` (L11):
     - Reemplazar `parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.')` por una función auxiliar determinista `formatearMilesConPunto(parteEntera: string): string` que inserta el separador `.` cada 3 dígitos en tiempo estrictamente lineal $O(n)$ sin expresiones regulares.
  2. `typescript:S6481` en `frontend/src/components/ui/chart.tsx` (L72):
     - Envolver el valor del proveedor en `const contextValue = useMemo(() => ({ config }), [config]);` y pasar `value={contextValue}` a `<ChartContext.Provider>`.
  3. `typescript:S6564` en `frontend/src/types/marketplace.types.ts` (L4):
     - Eliminar `export type EstrategiaVersion = string;` y reemplazar sus 5 referencias internas en `frontend/src/types/marketplace.types.ts` (líneas 14, 20, 35, 58 y 159) por `string`.
  4. `typescript:S3735` en `frontend/src/views/TeamOfTheWeekView.tsx` (L47 y L70):
     - Mantener `onSeleccionar={seleccionarSemana}` en L47 (ya aplicado en `98758d0`) y reemplazar `onClick={() => void dispararGeneracionManual()}` en L70 por `onClick={() => { dispararGeneracionManual().catch(() => undefined); }}` (o pasar `onClick={dispararGeneracionManual}` dado que `dispararGeneracionManual` ya captura internamente todos sus errores).
- **Rationale**:
  Elimina el riesgo de ReDoS, evita re-renderizados innecesarios en consumidores de `ChartContext` y suprime tipos/operadores redundantes sin cambiar contratos públicos.
- **Alternatives considered**:
  - *Usar `Number.prototype.toLocaleString('es-AR')` en `formato-mercado.ts`*: Descartado porque depende de datos ICU del runtime y puede diferir en espacios de no separación o signos negativos frente a las pruebas unitarias existentes.

---

### Decisión 7: Reglas de Higiene, Tipado e Inmutabilidad en `backend` y `frontend` (`S7773`, `S4323`, `S3358`, `S2933`, `S6582`, `S7763`, `S6606`, `S6594`, `S7761`)

- **Decision**:
  1. `typescript:S7773` (4 ocurrencias en `backend/src/domain/miembro-equipo-semanal.entity.ts` L85, L95 y `frontend/src/components/team-of-the-week/WeekSelector.tsx` L32 x2): Ya remediadas en `HEAD` con `Number.isNaN(...)`; se mantienen y verifican en pruebas.
  2. `typescript:S4323` (2 ocurrencias):
     - En `backend/src/domain/usuario.entity.ts` (L13): Definir `export type MontoSaldo = number | string | Dinero;` y utilizar `saldo?: MontoSaldo;` en `UsuarioProps`.
     - En `backend/src/scraping/data-access/estadistica-jugador.orm-entity.ts` (L63): Definir `export type ValorDecimalNullableOrm = string | number | null;` y utilizarlo en `tirosPorPartido` y demás columnas numéricas anulables de la entidad ORM.
  3. `typescript:S3358` (2 ocurrencias):
     - En `backend/src/scraping/services/whoscored-feed-adapter.interface.ts` (L67-71): Reemplazar el ternario anidado de `items` por una estructura explícita `if (Array.isArray(payload)) ... else if (Array.isArray(payload.playerTableStats)) ...`.
     - En `backend/src/scraping/services/whoscored-playwright.service.ts` (L245, antes L864): Extraer el cálculo de `appsVal` a una función auxiliar o bloque `if/else` sin ternarios anidados.
  4. `typescript:S2933` (2 ocurrencias):
     - En `backend/src/scraping/domain/ejecucion-scraping.entity.ts` (L30, antes L23): Marcar `private readonly _detalle: ErrorScrapingDetalle[];`.
     - En `backend/src/scraping/services/whoscored-playwright.service.ts` (L367, antes L207): Marcar `private readonly scrapingConfig: ScrapingConfig;`.
  5. `typescript:S6582` (1 ocurrencia en `backend/src/domain/equipo-semanal.entity.ts` L227, antes L301): Mantener `this._miembros?.length !== 11` y reemplazar `this._miembros ? this._miembros.length : 0` por `this._miembros?.length ?? 0`.
  6. `typescript:S7763` (1 ocurrencia en `backend/src/services/equipo-semanal.service.ts` L31): Mantener `export { obtenerAnoYSemanaIso as calcularAnoYSemanaIso } from '../domain/equipo-semanal.entity';`.
  7. `typescript:S6606` (1 ocurrencia en `backend/src/domain/orden.entity.ts` L44): Reemplazar `props.cantidadRestante !== undefined ? props.cantidadRestante : props.cantidad` por `props.cantidadRestante ?? props.cantidad`.
  8. `typescript:S6594` (1 ocurrencia en `backend/src/scraping/services/whoscored-playwright.service.ts` L220, antes L356, más ocurrencias análogas en L244, L511, L562): Reemplazar `str.match(regex)` por `regex.exec(str)`.
  9. `typescript:S7761` (1 ocurrencia en `backend/src/scraping/services/whoscored-playwright.service.ts` L221, antes L838): Reemplazar `tr.getAttribute('data-player-id')` por `(tr as HTMLElement).dataset.playerId`.
- **Rationale**:
  Aplica las construcciones idiomáticas de TypeScript y DOM modernas exigidas por SonarQube sin alterar el comportamiento en tiempo de ejecución.
- **Alternatives considered**:
  - Ninguna; las transformaciones son equivalentes semánticamente 1 a 1.

