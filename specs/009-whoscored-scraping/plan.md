# Implementation Plan: Modulo de Scraping de Estadisticas WhoScored

**Branch**: `009-whoscored-scraping` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-whoscored-scraping/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Modulo NestJS autonomo que realiza scraping de estadisticas de jugadores de las 5 grandes ligas europeas desde WhoScored.com usando Playwright con plugin stealth, persiste los datos mediante upsert en PostgreSQL, y se ejecuta automaticamente cada 7 dias via cron de GitHub Actions. El modelo de datos incluye 25 campos estadisticos confirmados tras auditoria de la estructura DOM de WhoScored; 15 candidatos del spec fueron descartados por no estar disponibles como columnas en las tablas de liga.

## Technical Context

**Language/Version**: TypeScript 5.3 (Node.js 20 LTS)

**Primary Dependencies**:
- `playwright-extra` + `puppeteer-extra-plugin-stealth` — scraping con evasion de bot-detection
- `@nestjs/common`, `@nestjs/core` ^11.x — framework del backend
- `typeorm` ^0.3.20 + `pg` ^8.x — ORM y driver PostgreSQL
- `@nestjs/swagger` ^11.x — documentacion OpenAPI de los nuevos endpoints

**Storage**: PostgreSQL (tablas nuevas: `estadisticas_jugadores`, `ejecuciones_scraping`)

**Testing**: Jest (unitarios: mocks de Playwright + domain entities) + Testcontainers/PostgreSQL (integracion: repositorio)

**Target Platform**: Linux server (GitHub Actions ubuntu-latest) + Docker local

**Project Type**: Web-service (backend NestJS); modulo adicional sin frontend en v1

**Performance Goals**:
- Tiempo maximo de ejecucion completa (5 ligas): 4 horas (SC-006)
- 95% de jugadores activos de las 5 ligas procesados por ejecucion exitosa (SC-001)

**Constraints**:
- Los datos en DB no deben tener mas de 8 dias de antiguedad en condiciones normales (SC-002)
- Cobertura minima de tests: 80% lineas y branches (Principio VI)
- NO se exponen estadisticas al frontend en v1 (solo ingesta)

**Scale/Scope**: ~5 ligas x ~500 jugadores por liga = ~2500 jugadores por ejecucion (estimado); ejecutado semanalmente

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificacion | Estado |
|---|---|---|
| I. Arquitectura 5 capas | `ScrapingModule` define Controller, Service, Model (domain), Repository | ✅ PASS |
| I. Backend Stateless | El servicio de scraping no guarda estado entre requests HTTP; el browser se gestiona via lifecycle hooks | ✅ PASS |
| I. PostgreSQL + Redis | Los datos persisten en PostgreSQL; Redis no aplica para v1 de este modulo (no hay cache de lecturas) | ✅ PASS |
| II. Rich Domain Model | `EstadisticaJugador` y `EjecucionScraping` son Rich Models con invariantes y comportamiento, no objetos anémicos | ✅ PASS |
| III. Testing rigurosa | Unitarios para domain + mocks Playwright; integracion con Testcontainers para repositorios | ✅ PASS |
| IV. Inmutabilidad de tests | No se modifican tests existentes; todos los nuevos tests son adiciones | ✅ PASS |
| V. Idioma dual | Identificadores de dominio en español sin acentos/ñ; terminos tecnicos en ingles | ✅ PASS |
| VI. Coverage 80% | Incluido en criterios de DoD; verificado con `npm run test:unit:cov` y `test:integration:cov` | ✅ PASS |

**Re-evaluacion post-Phase 1**: Todos los gates pasan. La entidad `EjecucionScraping` con su tipo `EstadoEjecucion` y las validaciones en constructor satisfacen el Rich Domain Model. No hay violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/009-whoscored-scraping/
├── plan.md              # Este archivo (/speckit-plan command output)
├── research.md          # Phase 0 output — campos WhoScored, estrategia anti-bot, decisiones
├── data-model.md        # Phase 1 output — entidades, esquema SQL, variables de entorno
├── quickstart.md        # Phase 1 output — 6 escenarios de validacion
├── contracts/
│   └── scraping-api.openapi.yml  # Phase 1 output — contrato OpenAPI de los 3 nuevos endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── scraping/                          # Modulo NestJS autonomo (NUEVO)
│   │   ├── scraping.module.ts
│   │   ├── domain/
│   │   │   ├── estadistica-jugador.entity.ts
│   │   │   ├── estadistica-jugador.repository.interface.ts
│   │   │   ├── ejecucion-scraping.entity.ts
│   │   │   └── ejecucion-scraping.repository.interface.ts
│   │   ├── services/
│   │   │   ├── whoscored-playwright.service.ts  # Browser lifecycle + extraccion DOM
│   │   │   └── scraping.service.ts              # Orquestacion de scraping por liga
│   │   ├── data-access/
│   │   │   ├── estadistica-jugador.orm-entity.ts
│   │   │   ├── estadistica-jugador.mapper.ts
│   │   │   ├── estadistica-jugador.typeorm-repository.ts
│   │   │   ├── ejecucion-scraping.orm-entity.ts
│   │   │   ├── ejecucion-scraping.mapper.ts
│   │   │   └── ejecucion-scraping.typeorm-repository.ts
│   │   └── controllers/
│   │       └── scraping.controller.ts
│   ├── run-scraper.ts                     # Entry point standalone para CI (NUEVO)
│   └── app.module.ts                      # Actualizar para importar ScrapingModule
│
├── migrations/                            # O el directorio de migraciones existente
│   └── YYYYMMDDHHMMSS-create-scraping-tables.ts  # NUEVA migracion
│
├── .github/
│   └── workflows/
│       └── whoscored-scraper.yml          # NUEVO workflow de GitHub Actions
│
└── test/
    ├── unit/
    │   └── scraping/
    │       ├── estadistica-jugador.entity.spec.ts
    │       └── ejecucion-scraping.entity.spec.ts
    └── integration/
        └── scraping/
            ├── estadistica-jugador.repository.spec.ts
            └── ejecucion-scraping.repository.spec.ts
```

**Structure Decision**: Se utiliza Option 2 (web application con backend/frontend) ya que el proyecto tiene esta separacion establecida. El nuevo codigo se agrega bajo `backend/src/scraping/` como modulo NestJS autonomo, siguiendo el patron existente de `backend/src/players/`.

## Complexity Tracking

> No hay violaciones a la Constitucion; esta seccion no aplica.
