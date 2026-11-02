# Implementation Plan: Marketplace de Tokens de Jugadores y Order Management System (OMS)

**Branch**: `feat/marketplace` (`012-token-marketplace-oms`) | **Date**: 2026-11-01 | **Spec**: [specs/012-token-marketplace-oms/spec.md](spec.md)

**Input**: Feature specification from `specs/012-token-marketplace-oms/spec.md`, clarificaciones del usuario y contratos OpenAPI en `contracts/openapi-marketplace-oms.yaml`.

## Summary

Implementar un ecosistema completo de marketplace para tokens de futbolistas y un sistema de gestión de órdenes (OMS) en el backend NestJS que comprende:
1. **Emisión Idempotente de Tokens**: Suministro fijo e inalterable de 100 tokens indivisibles por jugador, valuados inicialmente en `1.00` crédito y asignados en posesión inicial del único superusuario (`ADMIN`), provisionado de forma idempotente al arranque vía variables de entorno.
2. **Valuación Dinámica mediante Estrategias**: Dos estrategias de cotización (`GLOBAL` / `GLOBAL_v1` y `POSICIONAL` / `POSICIONAL_v1`) en dominio puro que agregan estadísticas de temporada, normalizan métricas en $[0, 1]$ con límites de referencia fijos y convierten el score en cotización (`valor = 1.00 + score * 1.00`), con job semanal automatizado, snapshot de métricas y caché L1 en Redis para el ranking.
3. **Gobernanza y RBAC sin Regresiones**: Rol `ADMIN` (exclusivo para conmutar la estrategia activa vía `PUT /quotes/strategy`, forzar recálculos manuales vía `POST /quotes/recalculate` y auditar transacciones globales vía `GET /admin/transactions`) y rol `USUARIO`, resolviendo el rol vigente desde base de datos en `RolesGuard` sin alterar `JwtStrategy`.
4. **Order Management System (OMS) y Trazabilidad de Estrategia en Compras**: Gestión atómica A.C.I.D. (`SELECT ... FOR UPDATE` en orden determinista y Value Object `Dinero` en centavos) de compras inmediatas en mercado primario y secundario (eligiendo una oferta puntual `ordenVentaId` del libro `GET /orders`, con custodia preventiva de tokens y cancelación en `DELETE /orders/:id`), persistiendo en cada `Transaccion` el campo `estrategiaCotizacion` con la estrategia empleada en la cotización vigente del token al momento de la compra.
5. **12 Endpoints API REST**:
   - `GET /players/:id/quotes` (Cotización - Historial con desglose de métricas)
   - `GET /players/ranking` (Cotización - Ranking cacheado en Redis L1 con variación y suministro disponible)
   - `GET /quotes/strategy` (Cotización - Consulta de estrategia activa y versiones vigentes)
   - `PUT /quotes/strategy` (Cotización - Cambio de estrategia activa exclusivo `ADMIN`)
   - `POST /quotes/recalculate` (Cotización - Recálculo manual masivo exclusivo `ADMIN`)
   - `GET /orders` (Mercado - Libro de ofertas de venta del mercado secundario)
   - `POST /orders/buy` (Mercado - Compra inmediata primaria o sobre oferta puntual `ordenVentaId`)
   - `POST /orders/sell` (Mercado - Publicación de orden de venta con custodia preventiva)
   - `DELETE /orders/:id` (Mercado - Cancelación de orden de venta propia y liberación de custodia)
   - `GET /users/:id/portfolio` (Mercado - Portfolio valorizado con precio promedio de adquisición)
   - `GET /users/:id/transactions` (Mercado - Historial filtrable de transacciones del usuario con `estrategiaCotizacion`)
   - `GET /admin/transactions` (Auditoría - Historial global consolidado exclusivo `ADMIN`)

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.x, `@nestjs/swagger`, `@nestjs/schedule`, `@nestjs/passport`, `passport-jwt`, `bcryptjs`, `ioredis`  
**Storage**: PostgreSQL 16 (A.C.I.D. para persistencia primaria, bloqueo pesimista de órdenes e inmutabilidad histórica), Redis (`ioredis` con degradación controlada como caché L1)  
**Testing**: Jest (Unit testing para dominio en aislamiento total), Testcontainers con PostgreSQL 16 dinámico (Integration y E2E testing para Services, Repositories y Controllers)  
**Target Platform**: Servidor backend Linux/Container (Docker)  
**Project Type**: Web Service API REST (arquitectura desacoplada en 5 capas)  
**Performance Goals**: Recálculo semanal masivo $<50$ ms por jugador, liquidación atómica de órdenes en $<500$ ms, respuestas de consulta de ranking y portfolio $<200$ ms  
**Constraints**: Invariante matemática estricta de 100 tokens por jugador; transaccionalidad A.C.I.D. sin carreras críticas ni deadlocks en compras concurrentes; retrocompatibilidad total con tests existentes; cobertura mínima del 80% en líneas y branches  
**Scale/Scope**: ~2.500 jugadores activos de las 5 grandes ligas, 100 tokens por jugador (250.000 tokens en circulación total), soporte para operaciones concurrentes con bloqueo de fila  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Evidencia y Justificación Técnica |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas y Stateless** | **PASA** | Controllers (pasamanos HTTP + Guards sin lógica de negocio), Services (orquestación, transacciones y caché L1 en Redis), Model (toda la lógica de scoring, OMS, `Dinero` e invariantes), Data Access (TypeORM Repositories aislados). Backend 100% Stateless. |
| **II. Rich Domain Model y DDD** | **PASA** | Prohibidos los modelos anémicos. `Dinero`, `Usuario`, `ConfiguracionMercado`, `BalanceToken`, `Cotizacion`, `EstrategiaCotizacion`, `MetricasJugadorParaCotizacion`, `Orden` y `Transaccion` encapsulan sus invariantes, máquinas de estado y cálculos. |
| **III. Estrategia de Testing y Testcontainers** | **PASA** | Tests unitarios puros para estrategias, normalización y entidades de dominio sin BD. Tests de integración y E2E sobre PostgreSQL real mediante Testcontainers (`MarketplaceTestDatabaseHelper`). |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASA** | Ningún archivo de test existente se modifica ni elimina: `UsuarioProps` usa defaults retrocompatibles, `JwtStrategy` no se altera, `PlayersController` inyecta `QuotesService` como `@Optional()` y se usa un helper de BD separado para tests nuevos. |
| **V. Convenciones de Idioma y Terminología** | **PASA** | Identificadores de dominio y tablas en español sin acentos ni ñ (`cotizacion`, `estrategia_cotizacion`, `orden`, `transaccion`, `balance_token`, `dinero`, `saldo`); términos técnicos en inglés (`Controller`, `Service`, `Repository`, `Guard`, `Testcontainers`). |
| **VI. Calidad de Testing: Cobertura Mínima** | **PASA** | Suites unitaria (`domain`), integración (`services` + `data-access` + `common`), E2E (`controllers`) y consolidada verificadas en local y con enforcement automático en CI (`coverageThreshold >= 80%` líneas y branches + SonarCloud ratchet). |

### Convenciones Canónicas de Dominio y Contabilidad

- **Roles canónicos (`RolUsuario`)**: `'ADMIN'` (superusuario único poseedor de la emisión inicial y gobernanza) y `'USUARIO'` (trader/inversor estándar).
- **Posiciones canónicas (`PosicionJugador`) y correspondencia táctica**: `'Delantero'` (`FW`), `'Mediocampista'` (`MF`), `'Defensa'` (`DF`), `'Portero'` (`GK`) y `'No Clasificado'` (fallback determinista a los pesos de `GLOBAL_v1`).
- **Claves canónicas de métricas normalizadas**: `goals`, `assists`, `shots`, `keyPasses`, `dribbles`, `tackles`, `interceptions`, `saves`, `savePercentage`, `rating`. El adaptador `MetricasJugadorParaCotizacion` lee el getter preexistente e inmutable `EstadisticaJugador.intercepccionesPorPartido` (módulo `scraping`) y lo proyecta bajo la clave canónica `interceptions` sin renombrar la entidad existente.
- **Representación contable única del suministro**: La custodia por órdenes de venta activas se modela exclusivamente en `BalanceToken.cantidadBloqueada`; la invariante global se verifica como $\sum_u (\text{cantidadDisponible}_{u,j} + \text{cantidadBloqueada}_{u,j}) = 100$ sin sumar por separado las filas de `ordenes`.
- **Fuente de umbral previo y Ratchet de Cobertura**: El piso vigente de `80%` (`lines`, `branches`, `functions`, `statements`) reside en `backend/jest.config.js` y `backend/test/jest-unit.json`; queda prohibido reducir cualquier valor por debajo de `80%` y se verifica en CI mediante `npm run test:cov -- --runInBand --testTimeout=60000`.

## Project Structure

### Documentation (this feature)

```text
specs/012-token-marketplace-oms/
├── spec.md              # Especificación funcional validada
├── plan.md              # Este plan de implementación arquitectónico
├── research.md          # Decisiones de diseño y patrones (Phase 0)
├── data-model.md        # Entidades, Value Objects, invariantes y estados (Phase 1)
├── quickstart.md        # Guía de validación y escenarios E2E ejecutables (Phase 1)
├── contracts/           # Contratos OpenAPI de los 12 endpoints (Phase 1)
│   └── openapi-marketplace-oms.yaml
├── checklists/
│   └── requirements.md  # Checklist de calidad funcional
└── tasks.md             # Lista ordenada y trazable de tareas de implementación (Phase 2)
```

### Source Code (repository layout)

```text
backend/
├── src/
│   ├── auth/
│   │   └── auth.module.ts                           # Exportar USUARIO_REPOSITORY sin tocar JwtStrategy
│   ├── common/
│   │   ├── decorators/roles.decorator.ts
│   │   └── guards/roles.guard.ts
│   ├── config/
│   │   └── database.config.ts                       # Registro de migración 1730000000000
│   ├── controllers/
│   │   ├── players.controller.ts                    # Extensión opcional: GET /players/ranking, GET /players/:id/quotes
│   │   ├── quotes.controller.ts                     # GET/PUT /quotes/strategy, POST /quotes/recalculate
│   │   ├── orders.controller.ts                     # GET /orders, POST /orders/buy, POST /orders/sell, DELETE /orders/:id
│   │   ├── users.controller.ts                      # GET /users/:id/portfolio, GET /users/:id/transactions
│   │   ├── admin-transactions.controller.ts         # GET /admin/transactions
│   │   └── dto/
│   │       ├── cotizacion.dto.ts
│   │       ├── ranking-jugadores.dto.ts
│   │       ├── configuracion-estrategia.dto.ts
│   │       ├── recalculo-cotizaciones.dto.ts
│   │       ├── orden-compra.dto.ts
│   │       ├── orden-venta.dto.ts
│   │       ├── portfolio-usuario.dto.ts
│   │       └── transaccion-usuario.dto.ts
│   ├── marketplace/
│   │   └── marketplace.module.ts
│   ├── services/
│   │   ├── admin-bootstrap.service.ts               # Bootstrap idempotente de ADMIN al arranque
│   │   ├── tokens.service.ts                        # Emisión inicial idempotente de 100 tokens y cotización base
│   │   ├── marketplace-cache.service.ts             # Caché L1 en Redis para ranking con degradación controlada
│   │   ├── quotes.service.ts                        # Estrategias, ranking, historial y recálculo
│   │   ├── oms.service.ts                           # Orquestación A.C.I.D. de compras, ventas, cancelación, portfolio y auditoría
│   │   └── scheduler/
│   │       └── quotes-scheduler.service.ts          # Cron semanal @Cron('0 0 * * 0') con advisory lock
│   ├── domain/
│   │   ├── dinero.value-object.ts
│   │   ├── usuario.entity.ts                        # Extensión: rol, saldo (Dinero), métodos de billetera
│   │   ├── usuario.repository.interface.ts          # Extensión: buscarAdmin()
│   │   ├── jugador.repository.interface.ts          # Extensión: listarActivos()
│   │   ├── configuracion-mercado.entity.ts
│   │   ├── configuracion-mercado.repository.interface.ts
│   │   ├── balance-token.entity.ts
│   │   ├── balance-token.repository.interface.ts
│   │   ├── cotizacion.entity.ts
│   │   ├── cotizacion.repository.interface.ts
│   │   ├── orden.entity.ts
│   │   ├── orden.repository.interface.ts
│   │   ├── transaccion.entity.ts
│   │   ├── transaccion.repository.interface.ts
│   │   └── strategies/
│   │       ├── estrategia-cotizacion.interface.ts
│   │       ├── metricas-jugador-cotizacion.value-object.ts
│   │       ├── estrategia-global.strategy.ts
│   │       └── estrategia-posicional.strategy.ts
│   ├── data-access/
│   │   ├── usuario.orm-entity.ts
│   │   ├── usuario.mapper.ts
│   │   ├── usuario.typeorm-repository.ts
│   │   ├── jugador.typeorm-repository.ts
│   │   ├── configuracion-mercado.orm-entity.ts
│   │   ├── configuracion-mercado.mapper.ts
│   │   ├── configuracion-mercado.typeorm-repository.ts
│   │   ├── balance-token.orm-entity.ts
│   │   ├── balance-token.mapper.ts
│   │   ├── balance-token.typeorm-repository.ts
│   │   ├── cotizacion.orm-entity.ts
│   │   ├── cotizacion.mapper.ts
│   │   ├── cotizacion.typeorm-repository.ts
│   │   ├── orden.orm-entity.ts
│   │   ├── orden.mapper.ts
│   │   ├── orden.typeorm-repository.ts
│   │   ├── transaccion.orm-entity.ts
│   │   ├── transaccion.mapper.ts
│   │   └── transaccion.typeorm-repository.ts
│   ├── scraping/
│   │   ├── domain/estadistica-jugador.repository.interface.ts # Extensión: buscarPorJugadores(jugadorIds)
│   │   └── data-access/estadistica-jugador.typeorm-repository.ts
│   └── migrations/
│       └── 1730000000000-create-marketplace-and-oms-tables.ts
└── test/
    ├── unit/
    │   └── domain/
    │       ├── usuario-wallet.spec.ts
    │       ├── configuracion-mercado.entity.spec.ts
    │       ├── balance-token.entity.spec.ts
    │       ├── cotizacion.entity.spec.ts
    │       ├── estrategia-cotizacion.spec.ts
    │       ├── estrategia-normalizacion.spec.ts
    │       ├── orden.entity.spec.ts
    │       └── transaccion.entity.spec.ts
    ├── integration/
    │   └── marketplace/
    │       ├── marketplace-test-database.helper.ts
    │       ├── marketplace-rbac-migration.spec.ts
    │       ├── tokens-emission.spec.ts
    │       ├── quotes.service.spec.ts
    │       ├── quotes-scheduler.spec.ts
    │       ├── quotes-admin.spec.ts
    │       ├── oms-primario.service.spec.ts
    │       ├── oms-secundario.service.spec.ts
    │       └── users-portfolio.spec.ts
    ├── e2e/
    │   └── marketplace-oms.e2e-spec.ts
    └── jest-integration.json                        # Incluir src/common/**/*.ts en collectCoverageFrom

.github/
└── workflows/
    └── ci.yml                                       # Enforcement automático de umbral >= 80% (test:cov --runInBand) + SonarCloud
postman/
└── collection.json                                  # Sincronizada con los 12 endpoints del marketplace y OMS
```

**Structure Decision**: Se respeta rigurosamente la arquitectura en 5 capas existente del backend NestJS (`controllers`, `services`, `domain`, `data-access`) agrupada en `MarketplaceModule`, aislando los tests de integración del marketplace bajo `backend/test/integration/marketplace/` y la suite E2E de controladores en `backend/test/e2e/marketplace-oms.e2e-spec.ts` sin modificar ningún test preexistente.

## Complexity Tracking

> **No violations**: Todas las decisiones de diseño se ajustan estrictamente a los 6 principios de la Constitución. No se introducen microservicios externos ni colas asíncronas; el modelo síncrono transaccional en PostgreSQL con `SELECT ... FOR UPDATE` ordenados y caché L1 en Redis provee las garantías A.C.I.D. y de rendimiento requeridas.
