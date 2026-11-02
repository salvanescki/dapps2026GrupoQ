# Research: Experiencia Integral de Marketplace de Tokens, Trading, Portfolio Personal y Gobernanza

**Feature**: `013-marketplace-frontend` | **Phase**: 0 — Outline & Research | **Date**: 2026-11-02

---

## 1. Integración de `recharts` y Primitivas `shadcn/ui` ("Line Chart - Linear") con `tokens.css` sin Tailwind Preflight

**Decision**: Incorporar `recharts` (`^2.15.1`) en `frontend/package.json` e implementar las primitivas oficiales de gráficas de `shadcn/ui` (`ChartConfig`, `ChartContainer`, `ChartStyle`, `ChartTooltip`, `ChartTooltipContent`) en `frontend/src/components/ui/chart.tsx` respaldadas por una hoja Vanilla CSS dedicada (`frontend/src/styles/chart.css`) conectada directamente a las variables de `frontend/src/styles/tokens.css` (`--color-emerald-500: #10b981`, `--color-amber-500: #f59e0b`, `--bg-card`, `--border-default`, `--text-primary`, `--text-secondary`, `--glass-blur`), sin instalar ni activar el preflight global de Tailwind CSS. Adicionalmente, en `ChartContainer` se incorpora soporte determinista para entornos sin `ResizeObserver` o con ancho inicial `0` (como `jsdom` en Vitest) inyectando dimensiones base (`width={640}`, `height={240}`) al `<LineChart>` hijo sin modificar `frontend/tests/setup.ts`.

**Rationale**:
1. El frontend actual utiliza 100% Vanilla CSS modular sobre `tokens.css` (`index.css`, `components.css`, `catalog.css`, `home.css`, `login.css`, `PlayerDetailModal.css`). Activar `@tailwind base` (Preflight) alteraría márgenes, bordes, tipografías de botones e inputs y pondría en riesgo los selectores y estilos verificados por las 22 suites de tests preexistentes.
2. El mecanismo central de `shadcn/ui` `chart.tsx` (`<ChartStyle />` inyectando variables CSS `[data-chart="..."] { --color-<clave>: ... }` consumidas como `stroke="var(--color-<clave>)"`) es puro CSS estándar y funciona de forma nativa con `tokens.css`.
3. La variante exacta **"Line Chart - Linear"** de `shadcn/ui` (`<LineChart accessibilityLayer>`, `<CartesianGrid vertical={false} />`, `<XAxis tickLine={false} axisLine={false} tickMargin={8} />`, `<Line type="linear" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />`) cumple íntegramente `FR-010`, `FR-011`, `FR-017` y `SC-003` (trazo recto punto a punto sin interpolación curva, sin grilla vertical y con tooltip accesible).
4. En `jsdom`, `ResponsiveContainer` de `recharts` requiere `ResizeObserver` y dimensiones no nulas; resolver el fallback directamente en `ChartContainer` evita tocar `frontend/tests/setup.ts` (protegido por el Principio IV de Inmutabilidad de Tests) y permite que los tests de integración rendericen e inspeccionen los nodos SVG reales de `recharts`.

**Alternatives considered**:
- Instalar Tailwind CSS completo con preflight global → Descartado: sobrescribe estilos base de formularios, tablas, botones y modales existentes, rompiendo la consistencia visual glassmorphism y exponiendo a regresiones.
- Dibujar `<svg>` manual sin `recharts` ni primitivas `shadcn/ui` → Descartado: incumple el requerimiento técnico explícito de implementar `chart.tsx` de `shadcn/ui` con `recharts` en su variante `Line Chart - Linear`.
- Agregar polyfill global de `ResizeObserver` editando `frontend/tests/setup.ts` → Descartado: `frontend/tests/setup.ts` forma parte de `frontend/tests/**` y su modificación violaría la regla innegociable del Principio IV.

---

## 2. Reconstrucción Pura y Determinista de Evolución Patrimonial (`src/utils/portfolio-chart.ts`)

**Decision**: Implementar en `frontend/src/utils/portfolio-chart.ts` una función pura y determinista `reconstruirSeriePatrimonial(portfolio, transacciones)` que opera internamente en **centavos enteros** (`Math.round(monto * 100)`), ordena las transacciones ascendentemente por `fecha` (desempate por `transaccionId`), reconstruye hacia atrás desde `portfolio.saldoBilletera` y las cantidades actuales de `portfolio.posiciones` el saldo inicial y las tenencias en cada hito $k \in \{0, \dots, n\}$, proyecta los puntos históricos (`Saldo inicial` y cada operación `COMPRA`/`VENTA`) y culmina con el punto vigente (`Valoración actual`) anclado exactamente en `portfolio.saldoBilletera` y `portfolio.patrimonioNetoTotal`. Junto a ella, calcular las métricas de rendimiento latente individual y consolidado evitando cualquier división por cero cuando el costo de adquisición es `0`.

**Rationale**:
1. El backend persiste las operaciones monetarias mediante el Value Object `Dinero` en centavos enteros; replicar la aritmética en centavos enteros en `portfolio-chart.ts` elimina errores de coma flotante IEEE-754 (`0.1 + 0.2 !== 0.3`).
2. Trabajar hacia atrás desde `saldoBilletera` actual ($S_{k-1} = S_k - \Delta S_k$, donde $\Delta S_k = -m_k$ en compras y $+m_k$ en ventas) garantiza que tanto usuarios recién registrados (`1000.00` créditos iniciales), como el superusuario `ADMIN`, como inversores con más de `100` transacciones históricas (ventana máxima de `GET /users/:id/transactions?limite=100`) converjan sin desvíos en `saldoBilletera` real.
3. Incorporar el hito final de mercado (`Valoración actual` con `portfolio.valoracionTotalTokens` y `portfolio.patrimonioNetoTotal`) asegura que: (a) tras un recálculo de cotizaciones posterior a la última compra, la gráfica refleje fielmente la apreciación o depreciación latente de los tokens en cartera, y (b) incluso con una sola operación ejecutada existan al menos 2 segmentos rectos visibles sin fallos de renderizado.
4. Al residir en `src/utils/portfolio-chart.ts`, queda cubierto directamente por el perfil unitario `vitest.unit.config.ts`.

**Alternatives considered**:
- Asumir un saldo inicial fijo hardcodeado de `1000.00` sumando hacia adelante → Descartado: fallaría para cuentas con más de 100 transacciones (ventana paginada) o para la cuenta `ADMIN` (cuyo saldo inicial de bootstrap es `100000.00`), desalineando el último punto respecto de `saldoBilletera` vigente.
- Crear un nuevo endpoint de snapshots patrimoniales en el backend → Descartado: excede el alcance restringido a `frontend/` (salvo el DTO de perfil) cuando los endpoints `GET /users/:id/portfolio` y `GET /users/:id/transactions` ya proveen toda la información necesaria.

---

## 3. Serie Cronológica y Metadatos en `PlayerQuoteLinearChart` (`src/utils/quotes-chart.ts`)

**Decision**: Crear la utilidad pura `prepararSerieCotizaciones(cotizaciones)` en `frontend/src/utils/quotes-chart.ts` para clonar e invertir el orden `fechaCotizacion DESC` retornado por `GET /players/:id/quotes` hacia orden cronológico ascendente (`fechaCotizacion ASC`), calcular un dominio numérico de eje Y seguro (`calcularDominioCotizacion`) cuando todos los puntos tienen idéntico `valor` (ej. `[0.9, 1.1]` alrededor de `1.00`), y renderizar en `PlayerQuoteLinearChart` el `<Line dataKey="valor" type="linear" stroke="var(--color-valor)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />` acompañado de un `<ReferenceDot>` cuando solo existe 1 cotización inicial y un banner orientativo en español para `0` o `1` registros, exponiendo en `ChartTooltipContent` la fecha formateada, `valor`, `score`, `estrategiaVersion` y el indicador explícito de `sinEstadisticas`.

**Rationale**:
1. `PlayersController.obtenerHistorialCotizaciones` devuelve las cotizaciones ordenadas `DESC` (la más reciente en `[0]`); ordenar ascendentemente en una copia inmutable garantiza lectura cronológica izquierda-a-derecha en el eje X sin mutar el arreglo original (cuyo índice `[0]` o último ascendente sirve como cotización oficial vigente).
2. Cuando un jugador solo tiene la cotización inicial de emisión (`valor = 1.00`) o varias corridas `sinEstadisticas: true` con `valor = 1.00`, un eje Y automático sin margen colapsa en `recharts`; un margen explícito $\pm 0.10$ mantiene el trazo centrado y legible, cumpliendo `FR-012` y el edge case de cotización única.

**Alternatives considered**:
- Ocultar por completo la gráfica cuando solo existe 1 cotización → Descartado: el edge case de la especificación exige mostrar el punto base inicial (si existe) acompañado de un mensaje explicativo en español sin errores visuales.

---

## 4. Exposición Aditiva de `rol` (y `saldo`) en `PerfilUsuarioDto` y Compatibilidad con `StorageService`

**Decision**:
1. **En Backend** (`backend/src/controllers/dto/respuesta-autenticacion.dto.ts` y `backend/src/services/auth.service.ts`): añadir de forma aditiva `rol: RolUsuario` (`'USUARIO' | 'ADMIN'`) y `saldo: number` (`usuario.saldo.aNumero()`) en `PerfilUsuarioDto` y en `AuthService.mapearPerfil(usuario)`, manteniendo **intacto** `JwtStrategy.validate`.
2. **En Frontend** (`frontend/src/types/auth.types.ts`, `frontend/src/services/storage.service.ts` y `frontend/src/context/AuthProvider.tsx`): declarar `rol?: 'USUARIO' | 'ADMIN'` y `saldo?: number` como propiedades **opcionales** en `PerfilUsuario`, extender `PerfilUsuarioSchema` (que usa `.strict()` en Zod v4) con `rol: z.enum(['USUARIO', 'ADMIN']).optional()` y `saldo: z.number().nonnegative().optional()`, y añadir `refrescarPerfil?: () => Promise<void>` como método opcional en `ContextoAutenticacion`.

**Rationale**:
1. La auditoría completa de `backend/test/**` confirmó que ningún test de autenticación (`auth.service.spec.ts`, `auth-controller.spec.ts`, `auth-perfil.spec.ts`, `auth-cuj.e2e-spec.ts`) aplica `.toEqual` cerrado sobre `usuario`; el único `toEqual` estricto está en `jwt.strategy.spec.ts`, que permanece intacto porque no se toca `JwtStrategy`.
2. En `frontend/src/services/storage.service.ts`, `PerfilUsuarioSchema` utiliza `.strict()`: si no se declaran `rol` y `saldo` en el esquema Zod, `StorageService.guardarSesion()` rechazaría silenciosamente toda respuesta real de login/perfil que los incluya. A la inversa, declararlos como `.optional()` garantiza que `frontend/tests/unit/storage.service.test.ts` y todos los mocks de usuario existentes en `frontend/tests/**` sigan compilando en `tsc -b` y pasando al 100% sin tocar ningún archivo de test.
3. Disponer de `rol` desde el inicio/restauración de sesión habilita `FR-002`, `FR-027` (`AdminRoute` y link condicional en `Navbar`) y la prevención temprana en UI de autocompra primaria para `ADMIN` (`FR-015`). Disponer de `saldo` + `refrescarPerfil` brinda liquidez inmediata para el cálculo preventivo en el modal de detalle incluso antes de abrir `PortfolioView`.

**Alternatives considered**:
- Inferir el rol del usuario probando una llamada a `GET /admin/transactions` y viendo si retorna `403` → Descartado: genera peticiones fallidas intencionales (`403 Forbidden`) en red y consola para todos los inversores estándar en cada carga de sesión.
- Incluir `rol` dentro del JWT payload y cambiar `JwtStrategy.validate` → Descartado: rompería `backend/test/unit/auth/jwt.strategy.spec.ts` (prohibido por Principio IV) y sería redundante con `GET /auth/me` que `AuthProvider` ya consulta al restaurar sesión.

---

## 5. Clientes HTTP/REST Dedicados, Normalización de Contratos Reales y Fix de Cabeceras en `http-client.ts`

**Decision**:
1. Corregir en `frontend/src/api/http-client.ts` el orden del spread de `options` (`const { headers: extraHeaders, ...restOptions } = options`) para que pasar `headers: { Authorization: 'Bearer ...' }` en peticiones `POST`/`PUT`/`DELETE` **nunca sobrescriba** `'Content-Type': 'application/json'`.
2. Estructurar 4 clientes tipados dedicados sin estado ni WebSockets:
   - `marketplaceApi.ts`: `GET /players/ranking`, `GET /players/:id/quotes`, `GET /quotes/strategy`.
   - `ordersApi.ts`: `GET /orders`, `POST /orders/buy` (enviando **siempre** `jugadorId` tanto en primario como en secundario con `ordenVentaId`), `POST /orders/sell`, `DELETE /orders/:id`.
   - `portfolioApi.ts`: `GET /users/:id/portfolio`, `GET /users/:id/transactions` (acotando `limite` a `1..100` según `@Max(100)` del DTO real).
   - `adminApi.ts`: `PUT /quotes/strategy`, `POST /quotes/recalculate` (sin body extra por `forbidNonWhitelisted: true`), `GET /admin/transactions` (acotando `limite` a `1..200` según `@Max(200)` del DTO real).
3. Sincronizar el estado exclusivamente mediante revalidación automática en los hooks inmediatamente después de cada mutación confirmada (`buy`, `sell`, `cancel`, `strategy`, `recalculate`) más un botón explícito de **"Actualizar"** en cada vista/panel (`FR-004`).

**Rationale**:
1. En `http-client.ts` actual (líneas 21-27), `...options` aparece después de `headers: { 'Content-Type': 'application/json', ...options.headers }`, sobrescribiendo el objeto `headers` completo cuando `options.headers` está definido; esto haría que NestJS no parsee el body JSON en `POST /orders/buy`, `POST /orders/sell` y `PUT /quotes/strategy`. Reordenar el spread mantiene 100% verde `tests/unit/api/http-client.test.ts` y corrige todas las mutaciones autenticadas.
2. Respetar los límites exactos de `ValidationPipe` (`@Max(100)` en ranking, órdenes y transacciones de usuario; `@Max(200)` en auditoría admin; `jugadorId` obligatorio en `CrearOrdenCompraDto`; fechas ISO completas `T00:00:00.000Z` / `T23:59:59.999Z` para `@IsDateString()`) evita errores `400 Bad Request` en tiempo de ejecución.

**Alternatives considered**:
- Polling periódico con `setInterval` o WebSockets/SSE → Descartado: prohibido expresamente por la especificación y las instrucciones arquitectónicas (`100% HTTP/REST Stateless`, revalidación tras mutación y refresco manual).

---

## 6. Extensión No Intrusiva de `Navbar`, `HomeView`, `PlayersCatalogView` y `PlayerDetailModal`

**Decision**:
1. **`Navbar` y navegación global**: extender `Navbar.tsx` usando `useLocation()` para marcar el enlace activo (`aria-current="page"` y clase `.app-navbar-link-active`) manteniendo intactas sus props actuales, y centralizar en `construirItemsNavegacion(rol)` los enlaces `Inicio` (`/`), `Marketplace` (`/marketplace`), `Catálogo de Jugadores` (`/players`, conservando `id="nav-players-catalog"`), `Portfolio` (`/portfolio`) y condicional `Gobernanza` (`/admin` solo si `rol === 'ADMIN'`).
2. **`HomeView` (Dashboard)**: conservar en el primer render síncrono todos los nodos verificados por `LayoutAndViews.test.tsx` (avatar con inicial, saludo `¡Bienvenido de vuelta, {nombre}!`, estado `Activo`, `Sesión activa — {correo}`, botón `Cerrar sesión`) y añadir debajo el panel ejecutivo real alimentado por `useDashboardSummary` con degradación silenciosa y cancelación por `AbortController` cuando `fetch` no está disponible en tests aislados.
3. **`PlayerDetailModal` unificado**: conservar intactos sus selectores (`data-testid="player-detail-overlay"`, `#player-detail-close`, `role="dialog"`, `data-testid="modal-loading-spinner"`, `data-testid="stats-grid"`, `data-testid="stats-empty-notice"`) e inyectar `<PlayerMarketSection jugadorId={jugador.id} nombreJugador={jugador.nombre} />` **únicamente** dentro del bloque `{!loading && !error && jugador && (...)}`, leyendo la sesión mediante `useContext(AuthContext)` (sin lanzar excepción si se renderiza fuera de `<AuthProvider>` como en `PlayerDetailModal.test.tsx`) y evitando usar `role="alert"` para avisos pasivos de carga secundaria.

**Rationale**:
Garantiza cumplimiento simultáneo de `FR-001`, `FR-003`, `FR-009`..`FR-015` y `FR-021`..`FR-026` junto con el **Principio IV (0 modificaciones y 0 fallos en los archivos de test existentes)**.

**Alternatives considered**:
- Crear una página separada `/players/:id` y abandonar `PlayerDetailModal` en el Catálogo → Descartado: rompería la experiencia unificada pedida en `FR-009` o duplicaría ficha y `StatsGrid`. Extender `PlayerDetailModal` reutiliza el componente probado en `010` desde Catálogo, Ranking, Inicio y Portfolio, aceptando además una prop opcional `onMarketMutation?: () => void` para refrescar la vista padre tras comprar/vender/cancelar.

---

## 7. Arquitectura de Cobertura ≥ 80% en los 3 Perfiles de Vitest y Pipeline CI

**Decision**: Alinear la partición entre lógica pura y componentes interactivos con los `include` de cobertura de cada perfil de Vitest ejecutado en `.github/workflows/ci.yml`:
- **`vitest.unit.config.ts`** (`src/services/storage.service.ts`, `src/utils/**/*.ts`): concentrar toda la lógica determinista de negocio de UI (serie patrimonial en centavos, serie de cotizaciones, cálculo de P&L, validaciones preventivas de formularios de trading, normalización de filtros/fechas y rutas por rol) en `src/utils/*.ts` con tests exhaustivos en `tests/unit/utils/*.test.ts`, más `tests/unit/api/marketplace-api-clients.test.ts` y `tests/unit/storage.service.rol.test.ts`.
- **`vitest.integration.config.ts`** (`views`, `components`, `context`, `routes`, `hooks`): cubrir cada vista nueva/extendida, hook con `AbortController`, `AdminRoute`, primitivas `chart.tsx` y formularios de mercado primario/secundario/admin en `tests/integration/marketplace/*.test.tsx` ejercitando caminos felices y casos borde (0/1 puntos, stock 0, concurrencia 409, saldo insuficiente, autocompra).
- **`vitest.e2e.config.ts`** (`views`, `routes`, `context`, `services`): incorporar `tests/e2e/marketplace-cuj.test.tsx` validando los flujos integrales multi-vista (Inversor estándar y Administrador).
- **Backend (`backend/test/integration/marketplace/auth-perfil-rol.spec.ts`)**: añadir test de integración con Testcontainers verificando `rol` y `saldo` en `POST /auth/login`, `POST /auth/register` y `GET /auth/me`.

**Rationale**:
El pipeline de CI ejecuta los 3 perfiles por separado y luego `npm run test:coverage` con umbral bloqueante de **80% en `lines`, `branches`, `functions` y `statements`** más SonarCloud ratchet y `tsc -b && vite build`. Esta estructura asegura superar holgadamente el 80% en todas las métricas sin tocar ningún test preexistente.

**Alternatives considered**:
- Colocar lógica compleja de cálculo patrimonial y validaciones directamente dentro de componentes `.tsx` → Descartado: dificulta testear ramas aritméticas en aislamiento y desaprovecha el perfil `vitest.unit.config.ts`.

---

## 8. Gobernanza API y Verificación Automatizada de Sincronización Postman ↔ Swagger ↔ Contratos REST sin Modificar Endpoints Innecesariamente

**Decision**:
1. **Clasificación taxativa de superficie HTTP ("Cero Modificación Innecesaria de Endpoints")**:
   - **Grupo A — Extensión aditiva exclusiva de DTO sobre 3 endpoints existentes de Autenticación** (`POST /auth/register`, `POST /auth/login`, `GET /auth/me`): únicamente se añaden `@ApiProperty({ enum: ['USUARIO', 'ADMIN'] }) rol: RolUsuario` y `@ApiProperty() saldo: number` en `PerfilUsuarioDto` (`backend/src/controllers/dto/respuesta-autenticacion.dto.ts`) junto con su proyección en `AuthService.mapearPerfil` (`backend/src/services/auth.service.ts`). **`AuthController` no se modifica**: conserva intactos sus rutas, verbos HTTP, códigos de estado (`201`, `200`, `400`, `401`, `409`), guards y decoradores `@ApiResponse`, propagando automáticamente los campos aditivos al documento OpenAPI de `@nestjs/swagger`. Tampoco se crea ningún endpoint nuevo en `backend/`.
   - **Grupo B — Consumo en modo estrictamente inmutable (0 cambios de API en 17 endpoints preexistentes)**: los **12 endpoints de Marketplace, Cotización, OMS, Portfolio y Auditoría** provistos por `012-token-marketplace-oms` (`GET /players/ranking`, `GET /players/:id/quotes`, `GET /quotes/strategy`, `PUT /quotes/strategy`, `POST /quotes/recalculate`, `GET /orders`, `POST /orders/buy`, `POST /orders/sell`, `DELETE /orders/:id`, `GET /users/:id/portfolio`, `GET /users/:id/transactions`, `GET /admin/transactions`) y los **5 endpoints complementarios** (`GET /players`, `GET /players/filters`, `GET /players/:id`, `GET /scraping/jugadores/:id/estadisticas`, `POST /auth/logout`) **no sufren modificación alguna** en controladores, servicios, DTOs, rutas, códigos HTTP ni pipes de validación.
2. **Regla de precedencia ante diferencias en documentos YAML históricos**:
   - Para todo endpoint del Grupo B, la fuente canónica del contrato operativo es la implementación vigente en `backend/src/controllers/` expuesta por `SwaggerModule.createDocument` (`/api/docs-json`) y protegida por `backend/test/**` (Principio IV). Cuando un archivo YAML estático previo presenta diferencias documentales frente al endpoint real (por ejemplo, `specs/012-token-marketplace-oms/contracts/openapi-marketplace-oms.yaml` listaba `201` en `POST /orders/buy` mientras que `OrdersController`, Swagger y `postman/collection.json` operan con `200 OK`; o topes `200`/`500` frente a `@Max(100)` en `FiltroTransaccionesUsuarioDto` y `@Max(200)` en `FiltroTransaccionesAdminDto`), **queda prohibido modificar el controlador en backend**; la reconciliación queda documentada en los contratos versionados de `013` (`contracts/rest-api-consumption.contract.md` y `contracts/postman-swagger-sync.contract.md`), y para Autenticación se versiona `contracts/openapi-auth-perfil-v1.1.yaml`.
3. **Sincronización no destructiva de `postman/collection.json` y `postman/README.md`**:
   - Mantener intactos la secuencia ejecutable del Collection Runner y las variables de entorno (`football_tokens.postman_environment.json`).
   - En carpeta `1. Auth`: enriquecer los `pm.test` de `POST Register` y `POST Login` (`ADMIN`, `trader1`, `trader2`) para validar `usuario.rol`, `usuario.saldo`, `tipo === 'Bearer'` y tipos de cada propiedad; agregar `GET /auth/me` (ausente hasta ahora en `postman/collection.json`) y `POST /auth/logout`; e incorporar requests de error para `400 Bad Request` (registro inválido), `409 Conflict` (correo duplicado) y `401 Unauthorized` (login inválido y `/auth/me` sin token), verificando el esquema de `HttpExceptionFilter` (`{ codigoEstado, mensaje, marcaDeTiempo }`).
   - En carpetas `2` a `7` (Grupo B): conservar todos los endpoints sin tocar su contrato backend, asegurando que cada request consumido por `013-marketplace-frontend` incluya scripts `pm.test` que validen código de estado, estructura/tipos de respuesta exitosa y formato de error en los casos negativos (`400`, `401`, `403`, `404`, `409` cuando correspondan según Swagger).
4. **Verificación automatizada tripartita reproducible en CI (`postman-swagger-parity.spec.ts`)**:
   - Crear el test de integración contractual `backend/test/integration/marketplace/postman-swagger-parity.spec.ts` que levanta `SwaggerModule.createDocument(app, swaggerConfig)` en memoria y verifica automáticamente: (a) paridad de `PerfilUsuarioDto` (`rol`, `saldo`) entre Swagger vivo y `contracts/openapi-auth-perfil-v1.1.yaml`, (b) inmutabilidad contractual de los endpoints del Grupo B en `swaggerDoc.paths`, y (c) alineación 1:1 de `postman/collection.json` (presencia de los 20 endpoints, coincidencia de rutas normalizadas y verbos HTTP, validez de propiedades de payloads/query params frente a `whitelist`/`forbidNonWhitelisted` de Swagger, y existencia de scripts `pm.test` para los códigos exitosos y de error declarados), complementado por `auth-perfil-rol.spec.ts` ejecutando las peticiones reales contra PostgreSQL (Testcontainers).

**Rationale**:
1. Cumple de forma estricta `FR-033`, `FR-034`, `FR-035`, `SC-008` y la Constitución `v1.3.0` (Stack Tecnológico — *Herramientas de Consumo* y DoD #3) dejando evidencia ejecutable y determinista tanto para los 3 endpoints con DTO extendido como para los 17 endpoints consumidos sin cambios.
2. Evita el antipatrón de alterar códigos HTTP (`200` → `201`), topes de paginación o firmas de endpoints ya estabilizados en `001`..`012`, lo cual introduciría riesgo innecesario y violaría la suite inmutable `backend/test/**` (Principio IV).
3. Al usar `SwaggerModule.createDocument` y `js-yaml` (ya presente en `backend/package-lock.json`) dentro de `backend/test/integration/marketplace/`, la verificación corre automáticamente en local y en `.github/workflows/ci.yml` sin agregar dependencias nuevas ni depender de servicios externos.

**Alternatives considered**:
- Modificar `OrdersController` (`POST /orders/buy` a `201`) o crear endpoints nuevos como `GET /auth/role` → Descartado: modifica endpoints innecesariamente, rompe compatibilidad con consumidores/tests existentes y contradice el mandato explícito de alcance mínimo.
- Verificación exclusivamente manual mediante capturas de Swagger UI → Descartado: propensa a omisiones humanas (como la ausencia actual de `GET /auth/me` en `postman/collection.json`) y no previene regresiones en CI.
- Incorporar una dependencia CLI externa pesada (Newman en CI levantando servidor HTTP aparte) → Descartado: añade dependencias y tiempos de arranque redundantes cuando `SwaggerModule.createDocument` + Supertest + validación programática del AST JSON de `postman/collection.json` verifican determinísticamente contratos, payloads, respuestas y scripts en la misma suite de Jest.

