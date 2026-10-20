# Research: Módulo de Scraping WhoScored (009)

**Generado por**: `/speckit-plan`
**Feature branch**: `009-whoscored-scraping`
**Fecha**: 2026-10-20

---

## 1. Auditoría de campos estadísticos disponibles en WhoScored

### Metodología
Los campos estadísticos se distribuyen en varias pestañas dentro de la página de estadísticas por liga de WhoScored. Cada pestaña (Summary, Defensive, Offensive, Passing, xG, Detailed) expone una vista distinta del mismo conjunto de datos del jugador.

### Campos CONFIRMADOS (disponibles en WhoScored)

| Campo candidato | Campo real en WhoScored | Pestaña | Nombre columna DOM |
|---|---|---|---|
| Partidos jugados | Apps (appearances, incl. starts + subs) | Summary | `apps` |
| Minutos jugados | Mins | Summary | `minsPlayed` |
| Goles | Goals | Summary | `goal` |
| Asistencias | Assists | Summary | `assistTotal` |
| Tiros totales (por partido) | SpG (Shots per Game) | Summary | `shotsPerGame` |
| Precisión de pase (%) | PS% (Pass Success %) | Summary | `passSuccess` |
| Duelos aéreos ganados (por partido) | AerialsWon | Summary | `aerialWonPerGame` |
| Rating WhoScored | Rating | Summary | `rating` |
| Tarjetas amarillas | Yellow Cards | Summary | `yellowCard` |
| Tarjetas rojas | Red Cards | Summary | `redCard` |
| Regates completados (por partido) | DriBls (Dribbles Won per Game) | Offensive | `dribbleWonPerGame` |
| Pases clave (por partido) | KeyP (Key Passes per Game) | Offensive | `keyPassPerGame` |
| xG esperados (por partido) | xG | xG | `xgPerGame` |
| xA esperados (por partido) | xA | xG | `xaPerGame` |
| Grandes ocasiones (por partido) | BigChance | Offensive | `bigChancePerGame` |
| Entradas (por partido) | Tackles per Game | Defensive | `tacklePerGame` |
| Intercepciones (por partido) | Interceptions per Game | Defensive | `interceptionPerGame` |
| Despejes (por partido) | Clearances per Game | Defensive | `clearancePerGame` |
| Pases (por partido) | Passes per Game | Passing | `passesPerGame` |
| Centros completados (por partido) | Crosses per Game | Passing | `crossesPerGame` |
| Atajadas (portero, por partido) | Saves per Game | Defensive | `savePerGame` |
| Goles recibidos | Goals Conceded total (porteros) | Defensive | `goalsConceded` |
| Porcentaje de atajadas (%) | Save% (goalkeeper) | Detailed | `savePercentage` |
| Errores que generaron gol | Errors Leading to Goal | Detailed | `errorLeadToGoal` |
| Autogoles | Own Goals | Summary/Detailed | `ownGoal` |

### Campos DESCARTADOS (no disponibles o no desagregados en WhoScored)

| Campo candidato | Motivo del descarte |
|---|---|
| Tiros al arco (absolutos) | Solo disponible como Shots per Game (promedio), sin desglose de tiros al arco vs. totales |
| Regates intentados (absolutos) | Solo promedio por partido; sin total absoluto consistente |
| Regates completados (absolutos) | Idem, solo promedio por partido |
| Pases intentados (absolutos) | WhoScored expone Pass Success% y promedio, no total de intentos como campo separado aislado |
| Porcentaje de duelos ganados | Presente solo como campo agregado; no desagregado con denominador claro |
| Duelos aéreos ganados (absolutos) | Solo disponible como promedio por partido |
| Grandes ocasiones generadas vs. falladas | WhoScored muestra "BigChance" como una sola metrica combinada sin distincion |
| Penales atajados | No es un campo expuesto directamente en las tablas de estadisticas por liga |
| Goles evitados | No expuesto en tablas de liga; solo disponible en perfil individual de portero |
| Faltas cometidas totales | Presente como promedio por partido en Detailed; total absoluto no en tablas de liga |
| Faltas cometidas por partido | Presente en Detailed tab, descartado por inconsistencia entre ligas en estructura del DOM |
| Tarjetas amarillas por partido | No expuesto como columna separada; se deriva del total y apps |
| Tarjetas rojas por partido | Idem |
| Bloqueos de tiro | No es columna disponible en las tablas de liga; solo aparece a nivel de partido |
| Minutos jugados por partido | No expuesto como columna separada; se deriva de Mins / Apps |

**Regla de descarte (FR-003):** Todos los campos descartados NO se incluyen en el modelo de datos ni como columnas nullable. Se excluyen completamente.

---

## 2. Estructura de URL y navegacion en WhoScored

### URL Pattern

```
https://www.whoscored.com/Regions/{RegionID}/Tournaments/{TournamentID}/Seasons/{SeasonID}/Stages/{StageID}/PlayerStatistics/{SlugName}
```

### IDs de las 5 grandes ligas (valores de referencia, sujetos a cambio por temporada)

| Liga | RegionID | TournamentID | Nombre slug (orientativo) |
|---|---|---|---|
| Premier League (England) | 252 | 2 | England-Premier-League |
| La Liga (Spain) | 206 | 4 | Spain-Primera-Division |
| Serie A (Italy) | 108 | 5 | Italy-Serie-A |
| Bundesliga (Germany) | 81 | 3 | Germany-Bundesliga |
| Ligue 1 (France) | 74 | 22 | France-Ligue-1 |

> **Decision**: Los IDs de `SeasonID` y `StageID` se parametrizan en configuracion (`WHOSCORED_LEAGUE_CONFIGS`) ya que cambian anualmente. El scraper soporta inyeccion de IDs por variable de entorno o tabla de configuracion.

### Paginacion
Las tablas pagina los resultados en grupos de ~20 jugadores. El scraper itera paginas hasta que no existan mas resultados (deteccion por ausencia de elementos `tr` en `#player-table-statistics-body` o paginador vacio/disabled).

---

## 3. Estrategia de anti-bot para WhoScored

### Problema
WhoScored renderiza estadisticas con JavaScript y aplica Cloudflare como WAF. Las peticiones HTTP simples devuelven HTML vacio. Los navegadores headless estandar son detectados por:
- `navigator.webdriver = true`
- Ausencia de `window.chrome`
- Headers HTTP/fingerprint de Playwright estandar

### Decision: `playwright-extra` + `puppeteer-extra-plugin-stealth`

- **Decision**: Usar `playwright-extra` con el plugin `puppeteer-extra-plugin-stealth`.
- **Rationale**: Es la solucion mas madura disponible para Node.js/TypeScript que parchea las propiedades del DOM que delatan un browser automatizado. Compatible con Playwright sin binarios externos.
- **Alternatives considered**:
  - `rebrowser-playwright` (binario parcheado): mas robusto contra Cloudflare avanzado, pero introduce binarios no auditables y rompe el flujo de instalacion estandar de CI.
  - `Camoufox` (Firefox anti-detect): no tiene bindings TypeScript nativos maduros.
  - Playwright estandar sin stealth: rechazado; WhoScored detecta el fingerprint y sirve challenge/captcha.

### Configuracion de lanzamiento

```typescript
chromium.use(stealthPlugin());
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  userAgent: '<rotating-realistic-UA>',
  viewport: { width: 1920, height: 1080 },
  locale: 'en-GB',
});
```

### Optimizacion de red
Bloquear recursos innecesarios (imagenes, fuentes, CSS, media) para reducir tiempo de carga:

```typescript
await context.route('**/*', (route) => {
  const type = route.request().resourceType();
  if (['image', 'stylesheet', 'font', 'media'].includes(type)) route.abort();
  else route.continue();
});
```

### Delays y comportamiento humano
- Delay aleatorio entre 2000ms y 5000ms entre paginas y entre ligas.
- Delay de 1000ms a 3000ms entre pestanas de estadisticas.
- Esperar `networkidle` o `load` antes de extraer datos.

---

## 4. Estrategia de extraccion de datos

### Decision: Parseo del DOM renderizado + `#player-table-statistics-body`

- **Decision**: Extraer datos directamente de la tabla HTML renderizada usando el selector `#player-table-statistics-body tr`.
- **Rationale**: WhoScored renderiza la tabla estadistica como HTML real despues del JS; los selectores DOM estan documentados y son estables entre ligas. La extraccion de JSON desde `<script>` es mas fragil porque el nombre de la variable y la estructura cambian entre versiones del sitio.
- **Alternatives considered**:
  - Interceptar `initialData` o `require.config` desde `<script>`: mas rapido pero extremadamente fragil; requiere reverse-engineering de ofuscacion JS.
  - API de terceros (soccerdata Python lib): descartado por incompatibilidad de runtime (backend TypeScript/Node.js).

### Rotacion de pestanas
El scraper visitara cada pestana (Summary, Defensive, Offensive, Passing, xG) para obtener el conjunto completo de campos confirmados. El cruce de jugadores entre pestanas se hace por el ID WhoScored presente en el `href` del `a.player-link`.

---

## 5. Arquitectura del modulo NestJS

### Decision: Modulo NestJS independiente `ScrapingModule`

- **Decision**: Crear `backend/src/scraping/` como modulo NestJS autonomo con Controller, Service, Model, Repository.
- **Rationale**: FR-010 exige arquitectura de 5 capas. Separar en modulo propio evita acoplar la logica de scraping al modulo `players`.
- **Alternatives considered**:
  - Anadir al `PlayersModule`: rechazado porque mezcla responsabilidades de dominio (jugadores) con infraestructura de ingesta externa.
  - Servicio standalone sin NestJS: rechazado por incompatibilidad con la constitucion.

### Gestion del ciclo de vida del Browser
El `WhoScoredPlaywrightService` implementa `OnModuleInit` / `OnModuleDestroy` para gestionar la instancia de browser como singleton dentro del modulo. No se instancia un browser por request.

### Punto de entrada standalone para CI
Se annade `backend/src/run-scraper.ts` como entry point que crea un `NestFactory.createApplicationContext()` sin servidor HTTP, ejecuta el servicio de scraping y cierra limpiamente con `process.exit(0/1)`.

---

## 6. Persistencia: upsert y entidades nuevas

### Decision: TypeORM `upsert` con `conflictPaths`

- **Decision**: Usar `repository.upsert(data, { conflictPaths: ['jugadorId', 'temporada'] })` en el `EstadisticaJugadorTypeOrmRepository`.
- **Rationale**: Garantiza idempotencia (SC-005) y evita duplicados (FR-004). TypeORM 0.3.x soporta nativamente el metodo `upsert` contra PostgreSQL via `ON CONFLICT DO UPDATE`.
- **Alternatives considered**:
  - `DELETE + INSERT`: Destructivo; puede corromper datos si el proceso se interrumpe.
  - `findOne + save`: Requiere dos round-trips por jugador; inaceptable para miles de registros.

### Constraint de unicidad
La tabla `estadisticas_jugadores` tendra un indice unico compuesto `(jugador_id, temporada)`.

### Vinculacion con `Jugador`
El cruce entre el jugador WhoScored y la entidad `Jugador` existente se realiza por `nombre` + `equipo.nombre` + `liga.codigo` (FR-009). El campo `nombre` se normaliza (trim, lowercase, sin acentos) para la busqueda. Si no hay match exacto, el jugador se registra en el log de errores de `EjecucionScraping` y se descarta (no se inserta una estadistica huerfana).

---

## 7. Automatizacion con GitHub Actions

### Decision: `schedule: cron` en `.github/workflows/whoscored-scraper.yml`

- **Decision**: Usar `workflow_dispatch` + `schedule: '0 2 * * 0'` (domingos a las 02:00 UTC, cada 7 dias).
- **Rationale**: FR-007 exige ejecucion automatica cada 7 dias. El `workflow_dispatch` satisface FR-006 (ejecucion manual administrativa).
- **Alternatives considered**:
  - Cron interno de NestJS (`@nestjs/schedule`): rechazado porque requiere que el servidor HTTP este corriendo 24/7 solo para el cron; CI es mas apropiado para tareas de larga duracion con mejor observabilidad.
  - Cron en servidor de produccion: viable pero introduce dependencia en uptime del servidor.

### Instalacion de Playwright en CI
```yaml
- run: npx playwright install chromium --with-deps
```

---

## 8. Testing del modulo de scraping

### Decision: Tests unitarios con mocks de Playwright + tests de integracion con DB real

- **Decision**:
  - Tests unitarios de entidades de dominio (`EstadisticaJugador`, `EjecucionScraping`) y del `ScrapingService` con Jest y mocks de las dependencias de Playwright.
  - Tests de integracion del `EstadisticaJugadorRepository` usando Testcontainers + PostgreSQL real.
  - NO se incluyen tests E2E contra WhoScored real (sujeto a rate-limit/cambios de DOM).
- **Rationale**: La constitucion (Principio VI) exige 80% de cobertura en lineas y branches. Los tests contra el sitio real son fragiles e imposibles de automatizar en CI de forma confiable.
- **Alternatives considered**:
  - Mock HTTP a nivel de red (nock/msw): no aplica porque Playwright usa browser real, no `fetch`.

---

## Resumen de decisiones

| Area | Decision |
|---|---|
| Tecnologia de scraping | `playwright-extra` + `puppeteer-extra-plugin-stealth` |
| Extraccion de datos | Parseo DOM de tabla `#player-table-statistics-body` por pestana |
| Anti-bot | Stealth plugin + delays aleatorios + bloqueo de recursos |
| Modulo NestJS | `ScrapingModule` independiente en `backend/src/scraping/` |
| Persistencia | TypeORM `upsert` con constraint unico `(jugador_id, temporada)` |
| Vinculacion Jugador | Cruce por nombre normalizado + equipo + liga |
| CI/CD | GitHub Actions cron semanal + `workflow_dispatch` |
| Entry point CI | `backend/src/run-scraper.ts` standalone |
| Campos del modelo | 25 campos confirmados; 15 candidatos descartados |
| Testing | Unitarios (domain + mocks) + integracion (Testcontainers) |
