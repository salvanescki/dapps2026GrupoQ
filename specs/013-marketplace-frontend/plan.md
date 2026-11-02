# Implementation Plan: Experiencia Integral de Marketplace de Tokens, Trading, Portfolio Personal y Gobernanza

**Branch**: `013-marketplace-frontend` (`feature/marketplace-frontend`) | **Date**: 2026-11-02 | **Spec**: [specs/013-marketplace-frontend/spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-marketplace-frontend/spec.md`, lineamientos arquitectónicos de `013-marketplace-frontend` sobre **Constitución v1.3.0** y estrategia de verificación de sincronización entre Postman, Swagger (OpenAPI) y contratos REST sin modificar endpoints innecesariamente.

---

## Summary

Implementar la experiencia completa de usuario en `frontend/` (SPA React 18 + TypeScript estricto + React Router v7 + Vite 6) para el **Marketplace de Tokens de Jugadores, Trading en Mercado Primario y Secundario, Portfolio Personal del Inversor y Panel de Gobernanza del Administrador**, manteniendo **0 modificaciones en los controladores y endpoints de `backend/`** y aplicando únicamente la proyección aditiva y retrocompatible de `rol` (`'USUARIO' | 'ADMIN'`) y `saldo` en `PerfilUsuarioDto` / `AuthService.mapearPerfil`:

1. **Comunicación 100% HTTP/REST Stateless sin WebSockets**: Extensión no intrusiva de `frontend/src/api/http-client.ts` (preservando `'Content-Type': 'application/json'` junto a `Authorization: Bearer`) y creación de cuatro clientes tipados dedicados (`marketplaceApi.ts`, `ordersApi.ts`, `portfolioApi.ts`, `adminApi.ts`) sobre los 12 endpoints reales de Marketplace/OMS/Auditoría y los 5 endpoints complementarios vigentes de `012-token-marketplace-oms`, con revalidación reactiva en hooks inmediatamente después de cada mutación (`buy`, `sell`, `cancel`, `strategy`, `recalculate`) y controles explícitos de actualización manual.
2. **Gráficas Interactivas `shadcn/ui` ("Line Chart - Linear") con `recharts` y `tokens.css`**: Incorporación de `recharts` e implementación de las primitivas `ChartConfig`, `ChartContainer`, `ChartStyle`, `ChartTooltip` y `ChartTooltipContent` en `frontend/src/components/ui/chart.tsx` (+ `src/styles/chart.css`), acopladas directamente a la paleta oscura glassmorphism de `tokens.css` (`#10b981` esmeralda y `#f59e0b` ámbar) **sin activar preflight global de Tailwind CSS**, aplicadas en:
   - `PlayerQuoteLinearChart`: evolución cronológica ascendente de `GET /players/:id/quotes` con `score`, `estrategiaVersion` y `sinEstadisticas` en el tooltip.
   - `PortfolioBalanceLinearChart`: evolución cronológica reconstruida de forma pura y determinista en centavos enteros en `src/utils/portfolio-chart.ts` a partir de `GET /users/:id/transactions` y `GET /users/:id/portfolio`, culminando con exactitud matemática en `patrimonioNetoTotal` y `saldoBilletera` vigentes.
3. **Cinco Experiencias Integradas y Segregación RBAC**: Dashboard ejecutivo real en `HomeView`, cartelera filtrable en `MarketplaceView`, detalle unificado de cotizaciones y trading primario/secundario en `PlayerDetailModal`, control patrimonial e historial filtrable en `PortfolioView`, y gobierno económico + auditoría global en `AdminGovernanceView` protegido por `AdminRoute`.
4. **Cero Regresión e Inmutabilidad Total de Tests**: Preservación absoluta de todos los archivos de test preexistentes en `frontend/tests/**` y `backend/test/**`, planificando cobertura ≥ 80% en `lines`, `branches`, `functions` y `statements` a través de los 3 perfiles de Vitest (`unit`, `integration`, `e2e`) y el chequeo consolidado de CI.
5. **Verificación Automatizada de Sincronización Postman ↔ Swagger ↔ Contratos REST sin Modificar Endpoints Innecesariamente**: Separación taxativa entre el **Grupo A** (3 endpoints preexistentes de `Auth` cuya respuesta incorpora `rol` y `saldo` vía `PerfilUsuarioDto` sin editar `AuthController`) y el **Grupo B** (17 endpoints consumidos sin cambios de API en backend: 12 de Marketplace/OMS/Auditoría y 5 de Catálogo/Estadísticas/Logout), para un total de **20 endpoints verificados**. La evidencia se respalda en contratos versionados (`openapi-auth-perfil-v1.1.yaml` y `postman-swagger-sync.contract.md`), sincronización de `postman/collection.json` (`GET /auth/me`, errores `400`/`401`/`403`/`404`/`409` y scripts `pm.test`) y verificación automatizada en CI mediante `postman-swagger-parity.spec.ts` contra `SwaggerModule.createDocument`.

---

## Technical Context

**Language/Version**: TypeScript ~5.6 (Frontend React 18.3 / Vite 6) y TypeScript 5.x / Node.js 20+ (Backend NestJS 11 únicamente para `PerfilUsuarioDto` y tests de paridad contractual)

**Primary Dependencies**:
- **Frontend**: `react` `^18.3.1`, `react-dom` `^18.3.1`, `react-router-dom` `^7.18.4`, `zod` `^4.6.5`, `recharts` `^2.15.1` *(nueva dependencia para primitivas `shadcn/ui` `chart.tsx`)*; Vanilla CSS modular sobre `src/styles/tokens.css` (sin Tailwind preflight)
- **Backend**: NestJS 11, `@nestjs/swagger` (únicamente `@ApiProperty` aditivos en `PerfilUsuarioDto` y proyección en `AuthService.mapearPerfil`; `js-yaml` ya disponible en `backend/package-lock.json` para parseo de contratos OpenAPI en tests)

**Storage**: Sin nuevas tablas ni migraciones. Consumo stateless de PostgreSQL 16 (A.C.I.D.) y caché L1 en Redis ya provistos por `012-token-marketplace-oms`; sesión autenticada validada con Zod en `localStorage` (`football_marketplace_session`).

**Testing**:
- **Frontend**: Vitest 4 + `@testing-library/react` 16 + `@testing-library/user-event` 14 + `@vitest/coverage-v8` sobre `jsdom` en 3 perfiles (`vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.e2e.config.ts`) + corrida global (`vite.config.ts`)
- **Backend**: Jest + Supertest + Testcontainers (PostgreSQL 16 real) para `auth-perfil-rol.spec.ts` (validación HTTP real de `rol` y `saldo` + errores `400`/`401`/`409`) y `postman-swagger-parity.spec.ts` (verificación automatizada de sincronización entre `SwaggerModule.createDocument`, contratos REST versionados y `postman/collection.json`)

**Target Platform**: Navegadores modernos de escritorio (≥ 1024 px) y dispositivos móviles (360 px – 768 px); entorno servidor Linux / Docker Compose

**Project Type**: Web application (SPA React en `frontend/` + API REST NestJS en `backend/`)

**Performance Goals**: Revalidación reactiva en pantalla de saldos, tenencias y libro de órdenes en < 2 s tras confirmar una orden (`SC-002`); renderizado fluido de gráficas lineales de hasta 100 puntos en < 100 ms; 0 peticiones en bucle ni canales persistentes en segundo plano

**Constraints**: Comunicación 100% HTTP/REST Stateless (prohibido WebSockets/SSE/polling continuo); **prohibición de crear o modificar endpoints de backend innecesariamente** (0 cambios en `backend/src/controllers/*.controller.ts` y 0 cambios en los 17 endpoints preexistentes fuera del DTO aditivo `PerfilUsuarioDto`); prohibición absoluta de modificar o eliminar cualquier test existente en `frontend/tests/**` o `backend/test/**` (Constitución §IV); prohibición de activar un CSS reset/preflight global que altere vistas existentes; umbral mínimo obligatorio ≥ 80% en `lines`, `branches`, `functions` y `statements` por stack (Constitución §VI); identificadores de dominio en español sin acentos ni `ñ` y términos técnicos en inglés (Constitución §V); paridad verificable entre Postman, Swagger y contratos REST versionados (Constitución v1.3.0 DoD #3, `FR-033`..`FR-035`, `SC-008`)

**Scale/Scope**: ~2.500 futbolistas activos de las 5 grandes ligas, suministro fijo de 100 tokens indivisibles por jugador, **17 endpoints REST preexistentes validados sin cambios de API** (12 de marketplace/OMS/auditoría + 5 de catálogo/estadísticas/logout) + **3 endpoints de autenticación con DTO aditivo de perfil** sincronizados en Swagger, contratos REST versionados y Postman, 4 clientes API nuevos, 5 utilidades puras, 5 hooks, 1 primitiva `chart.tsx` + 2 gráficas lineales, 3 vistas nuevas (`MarketplaceView`, `PortfolioView`, `AdminGovernanceView`) y 3 vistas/modales extendidos (`HomeView`, `PlayersCatalogView`, `PlayerDetailModal`).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluación Pre-Phase 0 y Re-evaluación Post-Phase 1

| Principio Constitucional (v1.3.0) | Gate Pre-Phase 0 | Gate Post-Phase 1 | Evidencia y Justificación en el Diseño |
|-----------------------------------|:----------------:|:-----------------:|----------------------------------------|
| **I. Arquitectura en 5 Capas y Backend Stateless** | ✅ PASS | ✅ PASS | El frontend opera como capa 1 (UI React) consumiendo exclusivamente HTTP/REST Stateless vía proxy `/api` sin WebSockets. En backend, ningún controlador (`*.controller.ts`) se modifica y `AuthService.mapearPerfil` solo proyecta `usuario.rol` y `usuario.saldo.aNumero()` hacia `PerfilUsuarioDto` sin lógica de negocio en Controller ni Services. |
| **II. Rich Domain Model y DDD** | ✅ PASS | ✅ PASS | Todas las invariantes transaccionales A.C.I.D., custodia de tokens, estrategias `GLOBAL_v1`/`POSICIONAL_v1` y `Dinero` residen y se ejecutan en la capa Model del backend (`012`). En frontend, las transformaciones de presentación (reconstrucción de serie patrimonial en centavos y validaciones preventivas de formulario) se aíslan en funciones puras deterministas (`src/utils/`) sin duplicar ni suplantar la autoridad del dominio backend. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | ✅ PASS | ✅ PASS | Cumple la estrategia diferenciada por stack de `v1.3.0`: en Frontend, tests unitarios aislados (`src/utils/**`, `storage.service.ts`, clientes HTTP) y tests de integración/E2E con dobles de red controlados; en Backend, integración con PostgreSQL real vía Testcontainers (`auth-perfil-rol.spec.ts`) más verificación contractual automatizada (`postman-swagger-parity.spec.ts`), cubriendo happy paths y edge cases. |
| **IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)** | ✅ PASS | ✅ PASS | **0 archivos de test existentes modificados o eliminados** en `frontend/tests/**` y `backend/test/**`. `PerfilUsuario.rol` y `saldo` son opcionales en TS/Zod para respetar `storage.service.test.ts`; `JwtStrategy` y todos los controladores permanecen intactos; `HomeView`, `Navbar`, `PlayersCatalogView` y `PlayerDetailModal` conservan sus selectores, roles ARIA y nodos síncronos; `ChartContainer` resuelve el fallback de `ResizeObserver` sin editar `frontend/tests/setup.ts`. |
| **V. Convenciones de Idioma y Terminología Técnica** | ✅ PASS | ✅ PASS | Textos visibles, etiquetas, estados vacíos y errores 100% en español claro (`FR-031`). Identificadores de dominio en español sin tildes ni `ñ` (`cotizacion`, `ordenVenta`, `patrimonioNeto`, `saldoBilletera`, `gananciaLatente`, `sinEstadisticas`) y términos técnicos en inglés (`View`, `Modal`, `Chart`, `Hook`, `Client`, `Props`, `Route`). |
| **VI. Calidad de Testing: Test Coverage Mínimo (≥ 80% + Ratchet)** | ✅ PASS | ✅ PASS | Planificado para superar ≥ 80% independiente en `lines`, `branches`, `functions` y `statements` tanto en `frontend` (`test:unit:coverage`, `test:integration:coverage`, `test:e2e:coverage` y `test:coverage` global) como en `backend` (`test:cov`), verificado además con `npm run build` en ambos stacks. |
| **Stack Tecnológico (OpenAPI/Swagger & Postman) y DoD #3** | ✅ PASS | ✅ PASS | Definido en [`contracts/postman-swagger-sync.contract.md`](./contracts/postman-swagger-sync.contract.md) y [`contracts/openapi-auth-perfil-v1.1.yaml`](./contracts/openapi-auth-perfil-v1.1.yaml): sincronización de `postman/collection.json` (payloads, respuestas, errores `400`/`401`/`403`/`404`/`409` y scripts `pm.test`), contraste automatizado contra `SwaggerModule.createDocument` y registro explícito de conformidad sin cambios para los 17 endpoints no modificados (`FR-033`..`FR-035`, `SC-008`). |

**Resultado de Gates (Pre y Post-Design)**: **APROBADO SIN VIOLACIONES**.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-marketplace-frontend/
├── spec.md                                         # Especificación funcional de la feature (FR-001..FR-035, SC-001..SC-008)
├── plan.md                                         # Este plan técnico de implementación (/speckit-plan)
├── research.md                                     # Decisiones arquitectónicas y gobernanza API Phase 0
├── data-model.md                                   # Entidades tipadas, algoritmos lineales y validaciones Phase 1
├── quickstart.md                                   # Guía ejecutable de validación manual, CI y paridad Postman/Swagger Phase 1
├── contracts/                                      # Contratos técnicos Phase 1
│   ├── openapi-auth-perfil-v1.1.yaml               # Contrato OpenAPI 3.0.3 versionado para extensión aditiva de PerfilUsuarioDto
│   ├── postman-swagger-sync.contract.md            # Matriz y protocolo de verificación tripartita Postman ↔ Swagger ↔ REST
│   ├── rest-api-consumption.contract.md            # Mapeo 1:1 de clientes HTTP/REST e inmutabilidad de endpoints consumidos
│   └── ui-components-and-charts.contract.md        # Contratos de rutas, hooks, componentes, chart.tsx y no-regresión
└── tasks.md                                        # Tareas ordenadas de implementación (/speckit-tasks - Phase 2)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   ├── *.controller.ts                         # (INMUTABLES) 0 modificaciones en controladores ni rutas de endpoints
│   │   └── dto/
│   │       └── respuesta-autenticacion.dto.ts      # (EXTENDIDO) +@ApiProperty rol: RolUsuario, +@ApiProperty saldo: number en PerfilUsuarioDto
│   └── services/
│       └── auth.service.ts                         # (EXTENDIDO) mapearPerfil incluye rol y saldo.aNumero()
└── test/
    └── integration/
        └── marketplace/
            ├── auth-perfil-rol.spec.ts             # (NUEVO) Integración Testcontainers para rol/saldo y errores 400/401/409 en /auth/*
            └── postman-swagger-parity.spec.ts      # (NUEVO) Verificación automatizada Postman ↔ SwaggerModule.createDocument ↔ Contratos REST

frontend/
├── package.json                                    # (EXTENDIDO) +recharts ^2.15.1
├── src/
│   ├── api/
│   │   ├── http-client.ts                          # (EXTENDIDO) Preservar Content-Type al fusionar headers custom
│   │   ├── marketplaceApi.ts                       # (NUEVO) GET /players/ranking, /players/:id/quotes, /quotes/strategy
│   │   ├── ordersApi.ts                            # (NUEVO) GET /orders, POST /orders/buy, POST /orders/sell, DELETE /orders/:id
│   │   ├── portfolioApi.ts                         # (NUEVO) GET /users/:id/portfolio, GET /users/:id/transactions
│   │   └── adminApi.ts                             # (NUEVO) PUT /quotes/strategy, POST /quotes/recalculate, GET /admin/transactions
│   ├── types/
│   │   ├── auth.types.ts                           # (EXTENDIDO) +RolUsuario, +rol?, +saldo?, +refrescarPerfil?
│   │   └── marketplace.types.ts                    # (NUEVO) Interfaces de cotizaciones, ranking, órdenes, portfolio y admin
│   ├── services/
│   │   └── storage.service.ts                      # (EXTENDIDO) PerfilUsuarioSchema acepta rol? y saldo? opcionales
│   ├── context/
│   │   └── AuthProvider.tsx                        # (EXTENDIDO) Expone refrescarPerfil() sincronizado con GET /auth/me
│   ├── utils/
│   │   ├── formato-mercado.ts                      # (NUEVO) Formateo créditos, %, signos, fechas ISO desde/hasta y contrapartes
│   │   ├── navegacion.ts                           # (NUEVO) Construcción de ítems de Navbar según rol USUARIO/ADMIN
│   │   ├── quotes-chart.ts                         # (NUEVO) Serie cronológica ASC y dominio Y seguro para cotizaciones
│   │   ├── portfolio-chart.ts                      # (NUEVO) Reconstrucción determinista en centavos de balance/patrimonio y P&L
│   │   └── validaciones-mercado.ts                 # (NUEVO) Validaciones preventivas en español para compra, venta y filtros
│   ├── hooks/
│   │   ├── useDashboardSummary.ts                  # (NUEVO) Resumen ejecutivo para HomeView con degradación limpia
│   │   ├── useMarketplaceRanking.ts                # (NUEVO) Estrategia activa + ranking filtrable por demarcación
│   │   ├── usePlayerMarketPanel.ts                 # (NUEVO) Cotizaciones + libro secundario + mutaciones buy/sell/cancel
│   │   ├── usePortfolio.ts                         # (NUEVO) Portfolio + serie patrimonial + órdenes propias + historial filtrable
│   │   └── useAdminGovernance.ts                   # (NUEVO) Cambio de estrategia + recálculo manual + auditoría filtrable
│   ├── routes/
│   │   ├── AdminRoute.tsx                          # (NUEVO) Guard exclusivo rol ADMIN con redirección informativa a '/'
│   │   └── AppRoutes.tsx                           # (EXTENDIDO) Rutas /marketplace, /portfolio y /admin
│   ├── components/
│   │   ├── ui/
│   │   │   └── chart.tsx                           # (NUEVO) Primitivas shadcn/ui (ChartContainer, ChartTooltip, ChartTooltipContent)
│   │   ├── layout/
│   │   │   └── Navbar.tsx                          # (EXTENDIDO) Resaltado de sección activa (aria-current="page") retrocompatible
│   │   ├── marketplace/
│   │   │   ├── StrategyBanner.tsx                  # (NUEVO) Bloque informativo de estrategia vigente (nombre, versión, descripción)
│   │   │   ├── RankingFiltersBar.tsx               # (NUEVO) Filtro por posición táctica + botón de refresco manual
│   │   │   └── RankingTable.tsx                    # (NUEVO) Tabla/tarjetas responsivas del ranking con variación y stock /100
│   │   ├── player-detail/
│   │   │   ├── PlayerDetailModal.tsx               # (EXTENDIDO) Integra PlayerMarketSection preservando selectores de 010
│   │   │   ├── PlayerMarketSection.tsx             # (NUEVO) Contenedor unificado de gráfica, mercado primario y secundario
│   │   │   ├── PlayerQuoteLinearChart.tsx          # (NUEVO) Line Chart - Linear de evolución histórica de cotizaciones
│   │   │   ├── PrimaryBuyForm.tsx                  # (NUEVO) Compra primaria con costo estimado, precio máx opcional y alertas
│   │   │   ├── SecondaryOrderBook.tsx              # (NUEVO) Libro secundario ordenado por precio con compra parcial y cancelación
│   │   │   └── PublishSellOrderForm.tsx            # (NUEVO) Formulario reutilizable de publicación de orden de venta P2P
│   │   ├── portfolio/
│   │   │   ├── PortfolioSummaryCards.tsx           # (NUEVO) 4 KPIs consolidados (liquidez, tokens, patrimonio, P&L cr. y %)
│   │   │   ├── PortfolioBalanceLinearChart.tsx     # (NUEVO) Line Chart - Linear de evolución de patrimonio y saldo líquido
│   │   │   ├── PortfolioPositionsTable.tsx         # (NUEVO) Tabla de posiciones con custodia, promedio, P&L y acción vender
│   │   │   ├── OpenSellOrdersSection.tsx           # (NUEVO) Órdenes de venta propias activas con cancelación directa
│   │   │   └── UserTransactionsHistory.tsx         # (NUEVO) Historial filtrable por tipo, jugador y rango de fechas
│   │   └── admin/
│   │       ├── StrategyGovernanceCard.tsx          # (NUEVO) Conmutación entre Ponderación Global y Ponderación Posicional
│   │       ├── ManualRecalculateCard.tsx           # (NUEVO) Disparo manual con estado en progreso y métricas de corrida
│   │       └── AdminAuditTable.tsx                 # (NUEVO) Pista de auditoría global con filtros combinables
│   ├── views/
│   │   ├── HomeView.tsx                            # (EXTENDIDO) Resumen financiero/mercado real + accesos rápidos + aviso RBAC
│   │   ├── PlayersCatalogView.tsx                  # (EXTENDIDO) Barra de navegación global unificada
│   │   ├── MarketplaceView.tsx                     # (NUEVO) Vista principal de cartelera y ranking del Marketplace
│   │   ├── PortfolioView.tsx                       # (NUEVO) Vista integral de Portfolio Personal e Historial
│   │   └── AdminGovernanceView.tsx                 # (NUEVO) Vista exclusiva de Gobernanza y Auditoría para ADMIN
│   └── styles/
│       ├── chart.css                               # (NUEVO) Estilos de ChartContainer y ChartTooltipContent con tokens.css
│       ├── marketplace.css                         # (NUEVO) Estilos glassmorphism responsivos de ranking y paneles de trading
│       ├── portfolio.css                           # (NUEVO) Estilos responsivos de KPIs, posiciones, custodia e historial
│       └── admin.css                               # (NUEVO) Estilos responsivos de gobernanza, recálculo y auditoría
└── tests/
    ├── unit/
    │   ├── storage.service.rol.test.ts             # (NUEVO) Tests de rol y saldo opcionales en StorageService
    │   ├── api/
    │   │   └── marketplace-api-clients.test.ts     # (NUEVO) Tests unitarios de marketplaceApi, ordersApi, portfolioApi, adminApi
    │   └── utils/
    │       ├── formato-mercado.test.ts             # (NUEVO) Tests de formateo, signos y normalización ISO de fechas
    │       ├── navegacion.test.ts                  # (NUEVO) Tests de enlaces por rol USUARIO vs ADMIN
    │       ├── quotes-chart.test.ts                # (NUEVO) Tests de ordenamiento ASC, 0/1/N cotizaciones y dominio Y
    │       ├── portfolio-chart.test.ts             # (NUEVO) Tests de reconstrucción exacta en centavos y P&L sin NaN
    │       └── validaciones-mercado.test.ts        # (NUEVO) Tests de reglas preventivas de compra, venta y fechas
    ├── integration/
    │   └── marketplace/
    │       ├── chart-primitives.test.tsx           # (NUEVO) Tests de chart.tsx, PlayerQuoteLinearChart y PortfolioBalanceLinearChart
    │       ├── home-and-marketplace-ranking.test.tsx # (NUEVO) Tests de US1 (Dashboard real, Navbar, Ranking y filtros)
    │       ├── player-detail-primary-trading.test.tsx # (NUEVO) Tests de US2 (Modal unificado, compra primaria y errores)
    │       ├── secondary-market-trading.test.tsx   # (NUEVO) Tests de US4 (Venta en custodia, compra parcial, autocompra, cancelación, 409)
    │       ├── portfolio-view.test.tsx             # (NUEVO) Tests de US3 (0 operaciones, posiciones, custodia e historial filtrable)
    │       └── admin-governance-and-guard.test.tsx # (NUEVO) Tests de US5 (AdminRoute, cambio estrategia, recálculo y auditoría)
    └── e2e/
        └── marketplace-cuj.test.tsx                # (NUEVO) Flujos CUJ integrales multi-vista (Inversor y Administrador)

postman/
├── collection.json                                 # (EXTENDIDO) Sincronización de 1. Auth (+GET /auth/me, rol/saldo, errores 400/401/409, pm.test) y auditoría sin cambios de 2..7
└── README.md                                       # (EXTENDIDO) Árbol actualizado de 1. Auth y guía de verificación contra Swagger/contratos REST
```

**Structure Decision**: Aplicación web desacoplada en `frontend/` (React 18 + Vite 6) y `backend/` (NestJS 11). En `frontend/` se respeta estrictamente la organización modular existente (`api/`, `types/`, `services/`, `context/`, `utils/`, `hooks/`, `routes/`, `components/`, `views/`, `styles/`) agrupando los nuevos componentes por subdominio (`marketplace/`, `portfolio/`, `admin/` y extensión de `player-detail/`) y ubicando los nuevos tests en archivos independientes bajo `tests/unit/`, `tests/integration/marketplace/` y `tests/e2e/`. En `backend/` no se modifica ningún controlador ni ruta HTTP: solo se agregan los dos atributos aditivos en `PerfilUsuarioDto` / `AuthService.mapearPerfil` y dos suites nuevas de integración (`auth-perfil-rol.spec.ts` y `postman-swagger-parity.spec.ts`) sin alterar ningún archivo de test preexistente.

---

## Verificación de Sincronización Postman ↔ Swagger ↔ Contratos REST (Sin Modificar Endpoints Innecesariamente)

Para satisfacer `FR-033`, `FR-034`, `FR-035`, `SC-008` y el DoD #3 de la Constitución `v1.3.0` evitando cualquier modificación innecesaria de endpoints existentes, el plan establece cuatro reglas operativas obligatorias (detalladas en [`contracts/postman-swagger-sync.contract.md`](./contracts/postman-swagger-sync.contract.md)):

### 1. Separación Taxativa de Superficie API (Cero Cambios en Controladores)

| Clasificación | Endpoints Alcanzados | Alcance en `backend/` | Alcance en Contratos y Postman |
|---------------|----------------------|-----------------------|--------------------------------|
| **Grupo A — Extensión aditiva exclusiva de DTO** (3 endpoints) | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | **0 cambios en `AuthController`**, rutas, verbos, códigos HTTP (`201`/`200`/`400`/`401`/`409`) ni DTOs de entrada. Solo `PerfilUsuarioDto` suma `@ApiProperty` `rol` y `saldo`, proyectados en `AuthService.mapearPerfil`. | Emisión de [`openapi-auth-perfil-v1.1.yaml`](./contracts/openapi-auth-perfil-v1.1.yaml); incorporación de `GET /auth/me` y casos de error (`400`, `401`, `409`) en `postman/collection.json` (`1. Auth`), más aserciones `pm.test` sobre `rol`, `saldo`, tipos y `{ codigoEstado, mensaje, marcaDeTiempo }`. |
| **Grupo B — Consumo en modo estrictamente inmutable** (17 endpoints) | **12 de Marketplace/OMS/Auditoría**: `GET /players/ranking`, `GET /players/:id/quotes`, `GET /quotes/strategy`, `PUT /quotes/strategy`, `POST /quotes/recalculate`, `GET /orders`, `POST /orders/buy`, `POST /orders/sell`, `DELETE /orders/:id`, `GET /users/:id/portfolio`, `GET /users/:id/transactions`, `GET /admin/transactions`<br>**5 complementarios**: `POST /auth/logout`, `GET /players`, `GET /players/filters`, `GET /players/:id`, `GET /scraping/jugadores/:id/estadisticas` | **0 modificaciones de código en `backend/`** (prohibido alterar controladores, rutas, códigos de respuesta, límites `@Max` o DTOs). | Verificación de vigencia sin cambios contra Swagger (`SwaggerModule.createDocument`), refuerzo no destructivo de scripts `pm.test` en `postman/collection.json` cuando falten validaciones de esquema/error (`400`/`401`/`403`/`404`/`409` aplicables) y registro explícito de conformidad sin cambios. |

### 2. Regla de Precedencia ante Desvíos Documentales Históricos

Cuando un YAML histórico previo presenta una divergencia meramente documental respecto al controlador real ya validado por `backend/test/**` (p. ej., `POST /orders/buy` documentado con `201` en el YAML histórico de `012` mientras que `OrdersController`, Swagger y `postman/collection.json` operan con `200 OK`, o topes `@Max(100)` / `@Max(200)` en filtros de transacciones), **prevalece siempre el contrato real expuesto por el controlador/Swagger vigente**: se reconcilia en los contratos de `013` y **jamás se altera el endpoint en backend**.

### 3. Protocolo Automatizado de Verificación en 4 Etapas y Evidencia (`postman-swagger-parity.spec.ts`)

1. **Swagger real en memoria**: construcción programática de `swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig)` sobre `AppModule` real con `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`) y `HttpExceptionFilter`.
2. **Contraste Swagger ↔ Contratos REST versionados**: verificación automática con `js-yaml` de que `swaggerDoc` coincide 1:1 con `contracts/openapi-auth-perfil-v1.1.yaml` en `PerfilUsuarioDto` (`id`, `nombre`, `correo`, `activo`, `creadoEn`, `rol` enum `['USUARIO', 'ADMIN']`, `saldo` numérico) y de que los 17 endpoints del Grupo B conservan intactas sus rutas, métodos, parámetros y códigos `@ApiResponse`.
3. **Contraste `postman/collection.json` ↔ Swagger**: parseo recursivo de `postman/collection.json` comprobando: (a) presencia del 100% de los 20 endpoints (3 Grupo A + 17 Grupo B) sin rutas huérfanas, (b) pertenencia de todas las propiedades de `body.raw` y `query` en los casos positivos a los esquemas whitelist de Swagger, y (c) existencia de scripts `pm.test` que validen tanto los códigos HTTP exitosos como los errores relevantes declarados en Swagger (`400`, `401`, `403`, `404`, `409` según corresponda) y el formato `{ codigoEstado, mensaje, marcaDeTiempo }`.
4. **Ejecución real con Testcontainers y registro explícito de evidencia (`FR-035`, `SC-008`, DoD #3)**: corrida en verde de `auth-perfil-rol.spec.ts` + `postman-swagger-parity.spec.ts` dentro de `npm run test:integration:cov` / `npm run test:cov` dejando constancia explícita tanto de la sincronización del Grupo A como de la conformidad sin cambios de API del Grupo B.

---

## Complexity Tracking

> Sin violaciones constitucionales detectadas. Todos los requerimientos funcionales, visuales y de paridad contractual (Postman ↔ Swagger ↔ Contratos REST) se resuelven dentro de la arquitectura vigente en 5 capas, comunicación HTTP/REST Stateless, sistema de estilos `tokens.css` y 0 modificaciones innecesarias de endpoints.
