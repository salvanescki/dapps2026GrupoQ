# Implementation Plan: Marketplace de Tokens de Jugadores y Order Management System (OMS)

**Branch**: `012-token-marketplace-oms` | **Date**: 2026-10-31 | **Spec**: [specs/012-token-marketplace-oms/spec.md](spec.md)

**Input**: Feature specification from `specs/012-token-marketplace-oms/spec.md` y endpoints definidos por el usuario (Plan 7).

## Summary

Implementar un ecosistema de marketplace para tokens de futbolistas y un sistema de gestión de órdenes (OMS) que comprende:
1. **Emisión de Tokens**: Suministro fijo de 100 tokens por jugador, valuados inicialmente en 1.00 crédito e inicialmente en posesión del superusuario (`admin`).
2. **Valuación Dinámica mediante Estrategias**: Dos estrategias de cotización (Global y Posicional) que normalizan métricas en $[0, 1]$, calculan un score y lo convierten en cotización (`valor = valorBase + score * factorEscala`), con job semanal automatizado y trazabilidad de versión (`GLOBAL_v1`, `POSICIONAL_v1`).
3. **Roles y Control de Acceso**: Superusuario con rol `ADMIN` (exclusivo para cambiar estrategia y forzar recálculos) y rol `USUARIO` para inversores/traders.
4. **Order Management System (OMS)**: Gestión atómica A.C.I.D. de compras en mercado primario (al emisor) y secundario (trading P2P con custodia preventiva de tokens), salvaguardando invariantes de no descubierto y balance total de 100 tokens.
5. **7 Endpoints API REST**:
   - `GET /players/:id/quotes` (Cotización)
   - `GET /players/ranking` (Cotización)
   - `POST /quotes/recalculate` (Cotización)
   - `POST /orders/buy` (Mercado)
   - `POST /orders/sell` (Mercado)
   - `GET /users/:id/portfolio` (Mercado)
   - `GET /users/:id/transactions` (Mercado)

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: NestJS 10.x, TypeORM, `@nestjs/swagger`, `@nestjs/schedule`, `@nestjs/passport`, `passport-jwt`, `bcrypt`  
**Storage**: PostgreSQL 16 (A.C.I.D. para persistencia primaria y transaccionalidad de órdenes), Redis (L1 cache)  
**Testing**: Jest (Unit testing para dominio en aislamiento total), Testcontainers con PostgreSQL dinámico (Integration testing para Services y Repositories)  
**Target Platform**: Servidor backend Linux/Container (Docker)  
**Project Type**: Web Service API REST (arquitectura desacoplada en 5 capas)  
**Performance Goals**: Recálculo semanal masivo $<50$ ms por jugador, liquidación atómica de órdenes en $<500$ ms, respuestas de consulta de ranking y portfolio $<200$ ms  
**Constraints**: Invariante matemática estricta de 100 tokens por jugador; transaccionalidad A.C.I.D. sin carreras críticas en compras concurrentes; cobertura mínima de pruebas del 80% en líneas y branches  
**Scale/Scope**: ~2.500 jugadores activos de las 5 grandes ligas, 100 tokens por jugador (250.000 tokens en circulación total), soporte para miles de transacciones concurrentes  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Evidencia y Justificación Técnica |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas y Stateless** | **PASA** | Controllers (pasamanos sin lógica), Services (orquestación y transacciones), Model (toda la lógica de scoring, OMS e invariantes), Data Access (TypeORM Repositories aislados). Backend 100% Stateless. |
| **II. Rich Domain Model y DDD** | **PASA** | Prohibidos los modelos anémicos. `Cotizacion`, `EstrategiaCotizacion`, `Orden`, `BalanceToken`, `Transaccion` y `Usuario` encapsulan sus propias invariantes, máquinas de estado y cálculos de negocio. |
| **III. Estrategia de Testing y Testcontainers** | **PASA** | Tests unitarios puros para las estrategias de cotización y entidades de dominio sin dependencias externas. Tests de integración para `QuotesService` y `OmsService` ejecutados sobre PostgreSQL real mediante Testcontainers. |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASA** | La totalidad de la suite de pruebas preexistente (auth, catálogo, scraping, filtros) se mantiene 100% intacta y funcional sin regresiones ni modificaciones no autorizadas. |
| **V. Convenciones de Idioma y Terminología** | **PASA** | Nombres de dominio en español sin acentos ni ñ (`cotizacion`, `estrategia`, `orden`, `transaccion`, `balance_token`, `billetera`, `saldo`). Términos técnicos y de diseño en inglés (`Controller`, `Service`, `Repository`, `A.C.I.D.`, `Testcontainers`). |
| **VI. Calidad de Testing: Cobertura Mínima** | **PASA** | Todo el código nuevo contará con tests unitarios y de integración para alcanzar y superar el umbral obligatorio del 80% de líneas y 80% de branches. |

## Project Structure

### Documentation (this feature)

```text
specs/012-token-marketplace-oms/
├── spec.md              # Especificación funcional validada
├── plan.md              # Este plan de implementación arquitectónico
├── research.md          # Decisiones de diseño y patrones (Phase 0)
├── data-model.md        # Entidades, Value Objects, invariantes y estados (Phase 1)
├── quickstart.md        # Guía de validación y escenarios ejecutables (Phase 1)
├── contracts/           # Contratos OpenAPI de los 7 endpoints (Phase 1)
│   └── openapi-marketplace-oms.yaml
└── checklists/
    └── requirements.md  # Checklist de calidad funcional
```

### Source Code (repository layout)

```text
backend/
├── src/
│   ├── common/
│   │   ├── decorators/roles.decorator.ts
│   │   └── guards/roles.guard.ts
│   ├── controllers/
│   │   ├── players.controller.ts            # Extension: GET /players/:id/quotes, GET /players/ranking
│   │   ├── quotes.controller.ts             # POST /quotes/recalculate
│   │   ├── orders.controller.ts             # POST /orders/buy, POST /orders/sell
│   │   ├── users.controller.ts              # GET /users/:id/portfolio, GET /users/:id/transactions
│   │   └── dto/
│   │       ├── cotizacion.dto.ts
│   │       ├── ranking-jugadores.dto.ts
│   │       ├── recalculo-cotizaciones.dto.ts
│   │       ├── orden-compra.dto.ts
│   │       ├── orden-venta.dto.ts
│   │       ├── portfolio-usuario.dto.ts
│   │       └── transaccion-usuario.dto.ts
│   ├── services/
│   │   ├── quotes.service.ts                # Orquestación de recálculo y ranking
│   │   ├── oms.service.ts                   # Orquestación transaccional A.C.I.D. de órdenes
│   │   └── scheduler/
│   │       └── quotes-scheduler.service.ts  # Cron job semanal
│   ├── domain/
│   │   ├── cotizacion.entity.ts
│   │   ├── balance-token.entity.ts
│   │   ├── orden.entity.ts
│   │   ├── transaccion.entity.ts
│   │   ├── configuracion-mercado.entity.ts
│   │   ├── token-jugador.entity.ts
│   │   ├── usuario.entity.ts                # Extensión: rol, saldo, métodos de billetera
│   │   ├── strategies/
│   │   │   ├── estrategia-cotizacion.interface.ts
│   │   │   ├── estrategia-global.strategy.ts
│   │   │   └── estrategia-posicional.strategy.ts
│   │   └── repositories/
│   │       ├── cotizacion.repository.interface.ts
│   │       ├── balance-token.repository.interface.ts
│   │       ├── orden.repository.interface.ts
│   │       ├── transaccion.repository.interface.ts
│   │       └── configuracion-mercado.repository.interface.ts
│   ├── data-access/
│   │   ├── cotizacion.orm-entity.ts
│   │   ├── cotizacion.mapper.ts
│   │   ├── cotizacion.typeorm-repository.ts
│   │   ├── balance-token.orm-entity.ts
│   │   ├── balance-token.mapper.ts
│   │   ├── balance-token.typeorm-repository.ts
│   │   ├── orden.orm-entity.ts
│   │   ├── orden.mapper.ts
│   │   ├── orden.typeorm-repository.ts
│   │   ├── transaccion.orm-entity.ts
│   │   ├── transaccion.mapper.ts
│   │   ├── transaccion.typeorm-repository.ts
│   │   ├── configuracion-mercado.orm-entity.ts
│   │   └── configuracion-mercado.typeorm-repository.ts
│   └── migrations/
│       └── 1730000000000-create-marketplace-and-oms-tables.ts
└── test/
    ├── unit/
    │   └── domain/
    │       ├── estrategia-cotizacion.spec.ts
    │       ├── cotizacion.entity.spec.ts
    │       ├── balance-token.entity.spec.ts
    │       ├── orden.entity.spec.ts
    │       └── usuario-wallet.spec.ts
    └── integration/
        ├── quotes.service.spec.ts
        ├── oms.service.spec.ts
        └── marketplace-controllers.spec.ts
```

**Structure Decision**: Se adhiere rigurosamente a la arquitectura existente en 5 capas del backend NestJS. Se separan limpiamente los submódulos de Cotizaciones (`quotes`) y Mercado/OMS (`orders`, `users/portfolio`) respetando DDD.

## Complexity Tracking

> **No violations**: Todas las decisiones de diseño se ajustan estrictamente a los 6 principios de la Constitución. No se introducen microservicios externos ni patrones de mensajería asíncrona no requeridos; el modelo síncrono transaccional en PostgreSQL provee las garantías ACID requeridas de forma robusta.
