# Implementation Plan: Remediación Integral de Issues Abiertos en SonarQube Cloud

**Branch**: `015-fix-sonarcloud-issues` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-fix-sonarcloud-issues/spec.md`

## Summary

Resolver la totalidad de los **73 issues abiertos** distribuidos en **20 reglas** reportados por SonarQube Cloud (`salvanescki_dapps2026GrupoQ`, región EU) — **54 en `backend`** y **19 en `frontend`** (13 `CRITICAL`, 18 `MAJOR`, 42 `MINOR`) — llevando el conteo de hallazgos abiertos y los 559 minutos de deuda técnica a **0**, sin modificar ni eliminar ningún test existente, preservando el 100% de los contratos REST/OpenAPI y manteniendo la cobertura independiente $\ge 80\%$ en líneas y bifurcaciones tanto en `backend` como en `frontend`.

El enfoque técnico consolidado en [research.md](./research.md) aborda:
1. **Descomposición cohesiva por capa (`typescript:S3776`, `typescript:S3735`)**: Extracción de subtareas privadas dentro de la misma capa arquitectónica para garantizar complejidad cognitiva $\le 15$ en las 12 funciones reportadas y en las funciones auxiliares creadas durante refactorizaciones previas.
2. **Accesibilidad nativa y rendimiento en `frontend` (`typescript:S6819`, `typescript:S6847`, `css:S9440`, `css:S7924`, `typescript:S8786`, `typescript:S6481`, `typescript:S6564`)**: Uso de elementos semánticos nativos (`<button>`, `<dialog>`, `<fieldset>`), soporte explícito de `prefers-reduced-motion`, contraste sólido WCAG AA/AAA, formateo lineal $O(n)$ sin backtracking en `formato-mercado.ts` y memoización de `ChartContext`.
3. **Estandarización asíncrona e higiene en `backend` y `frontend` (`typescript:S9382`, `typescript:S7503`, `typescript:S7773`, `typescript:S4323`, `typescript:S3358`, `typescript:S2933`, `typescript:S6582`, `typescript:S7763`, `typescript:S6606`, `typescript:S6594`, `typescript:S7761`)**: Paralelización con `Promise.all` en lecturas independientes, encadenamiento secuencial con `reduce` / recursión asíncrona en flujos transaccionales o de Playwright, alineación de firmas `Promise<T>` sin `async` ocioso y modernización de expresiones TypeScript/DOM.

## Technical Context

**Language/Version**: TypeScript ~5.3.3 (`backend`, Node.js 20+) y TypeScript ~5.6.0 (`frontend`, React 18.3.1 + Vite 6.0.0)

**Primary Dependencies**:
- `backend`: NestJS 11, TypeORM 0.3.20, Playwright 1.64.1 (`playwright-extra`), PostgreSQL (`pg`), Redis (`ioredis`).
- `frontend`: React 18.3.1, React Router DOM 7.18.4, Recharts 2.15.4, Zod 4.6.5.

**Storage**: PostgreSQL (persistencia relacional A.C.I.D.) y Redis (caché L1) — *sin cambios de esquema ni migraciones en esta feature*.

**Testing**:
- `backend`: Jest 30.5.2 + Testcontainers (`@testcontainers/postgresql` 10.7.1) para pruebas unitarias, de integración y E2E.
- `frontend`: Vitest 4.1.11 + React Testing Library 16.1.0 + `@vitest/coverage-v8` para pruebas unitarias, de integración y E2E.

**Target Platform**: Contenedores Docker Linux (servidor Node.js para `backend`) y navegadores web modernos con soporte de accesibilidad y `prefers-reduced-motion` (`frontend`).

**Project Type**: Aplicación web full-stack (`backend/` API REST stateless en 5 capas + `frontend/` SPA React).

**Performance Goals**:
- Tiempo lineal $O(n)$ garantizado en el formateo de créditos de mercado (`typescript:S8786`).
- Eliminación de recreaciones de objeto por renderizado en `ChartContext.Provider` (`typescript:S6481`).
- Paralelización de consultas de lectura por lotes/jugadores donde no exista dependencia secuencial (`typescript:S9382`).

**Constraints**:
- Prohibición estricta de deshabilitar reglas de análisis estático (`// NOSONAR`, `eslint-disable`, exclusiones en `sonar-project.properties`).
- Prohibición no negociable de modificar o eliminar tests preexistentes (Principio IV de la Constitución).
- Cobertura mínima independiente $\ge 80\%$ en `lines` y $\ge 80\%$ en `branches` tanto en `backend` como en `frontend` (Principio VI de la Constitución).
- Cero cambios en contratos HTTP/OpenAPI y colección Postman.

**Scale/Scope**: 73 issues abiertos en 20 reglas distribuidos en 33 archivos del repositorio (19 archivos en `backend/src/` y 14 archivos en `frontend/src/`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado Pre-Phase 0 | Evaluación y Garantías del Plan | Estado Post-Phase 1 |
| --- | --- | --- | --- |
| **I. Arquitectura en 5 Capas y Backend Stateless** | ✅ PASS | Las refactorizaciones de `typescript:S3776`, `typescript:S9382` y `typescript:S7503` se realizan estrictamente dentro de cada capa (`frontend`, `controllers`, `services`, `domain`, `data-access`) sin cruzar responsabilidades ni introducir estado en memoria. | ✅ PASS |
| **II. Rich Domain Model y DDD** | ✅ PASS | Las invariantes de `EquipoSemanal`, `MiembroEquipoSemanal`, `Orden`, `Usuario`, `EstadisticaJugador` y `EjecucionScraping` permanecen íntegramente en `domain/`. Los métodos extraídos en entidades de dominio son métodos privados cohesivos de la propia entidad. | ✅ PASS |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | ✅ PASS | Se ejecutan las suites unitarias, de integración (con PostgreSQL vía Testcontainers en `backend` y dobles de red en `frontend`) y E2E existentes; si alguna rama refactorizada requiere cobertura adicional, solo se agregan tests nuevos sin tocar los existentes. | ✅ PASS |
| **IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)** | ✅ PASS | **0 archivos de test existentes serán modificados o eliminados.** Las remediaciones de accesibilidad (`PlayerCard`, `PlayerDetailModal`, `PitchPlayerCard`, `RankingFiltersBar`) preservan todos los `data-testid`, roles ARIA (`dialog`, `button`, `group`) y manejadores de eventos verificados por las suites actuales. | ✅ PASS |
| **V. Convenciones de Idioma y Terminología Técnica** | ✅ PASS | Todos los artefactos de diseño (`plan.md`, `research.md`, `quickstart.md`), alias de tipos nuevos (`MontoSaldo`, `ValorDecimalNullableOrm`) y métodos privados extraídos se redactan en español sin acentos ni letra `ñ` en identificadores. | ✅ PASS |
| **VI. Calidad de Testing: Test Coverage Mínimo ($\ge 80\%$)** | ✅ PASS | El plan exige validar `npm run test:unit:cov` / `npm run test:integration:cov` en `backend` y `npm run test:coverage` en `frontend`, garantizando $\ge 80\%$ en `lines` y `branches` por separado y sin deshabilitar reglas de análisis estático. | ✅ PASS |

**Resultado Global del Gate Constitucional**: **PASS** (0 violaciones, 0 excepciones requeridas).

## Project Structure

### Documentation (this feature)

```text
specs/015-fix-sonarcloud-issues/
├── spec.md              # Especificación funcional y matriz de 20 reglas / 73 issues
├── plan.md              # Este archivo (Plan de implementación técnica)
├── research.md          # Fase 0: Diagnóstico de HEAD y decisiones por regla/archivo
├── quickstart.md        # Fase 1: Guía ejecutable de validación de no regresión y cobertura
└── tasks.md             # Fase 2: Tareas ordenadas por dependencia (generado por /speckit-tasks)
```

> **Nota sobre `data-model.md` y `contracts/`**: No se generan cambios de modelo de datos ni de contratos de interfaz externa porque los 73 issues corresponden exclusivamente a refactorizaciones internas de mantenibilidad, accesibilidad semántica/visual y estandarización de código sin alterar esquemas de base de datos ni endpoints REST.

### Source Code (repository root)

```text
backend/
├── src/
│   ├── data-access/
│   │   ├── cotizacion.typeorm-repository.ts                      # typescript:S9382 (2)
│   │   └── jugador.typeorm-repository.ts                         # typescript:S9382 (1)
│   ├── domain/
│   │   ├── equipo-semanal.entity.ts                              # typescript:S3776 (1), typescript:S6582 (1)
│   │   ├── miembro-equipo-semanal.entity.ts                      # typescript:S7773 (2)
│   │   ├── orden.entity.ts                                       # typescript:S6606 (1)
│   │   └── usuario.entity.ts                                     # typescript:S4323 (1)
│   ├── scraping/
│   │   ├── data-access/
│   │   │   ├── estadistica-jugador.orm-entity.ts                 # typescript:S4323 (1)
│   │   │   └── estadistica-jugador.typeorm-repository.ts         # typescript:S9382 (2)
│   │   ├── domain/
│   │   │   ├── ejecucion-scraping.entity.ts                      # typescript:S2933 (1)
│   │   │   └── estadistica-jugador.entity.ts                     # typescript:S3776 (2)
│   │   └── services/
│   │       ├── normalizador-jugador.service.ts                   # typescript:S3776 (1)
│   │       ├── scraping.service.ts                               # typescript:S3776 (1), typescript:S9382 (5)
│   │       ├── whoscored-feed-adapter.interface.ts               # typescript:S3358 (1)
│   │       └── whoscored-playwright.service.ts                   # typescript:S9382 (14), typescript:S3776 (3), typescript:S2933 (1), typescript:S6594 (1), typescript:S7761 (1), typescript:S3358 (1)
│   └── services/
│       ├── equipo-semanal.service.ts                             # typescript:S7763 (1)
│       ├── jugador.service.ts                                    # typescript:S3776 (1)
│       ├── oms.service.ts                                        # typescript:S7503 (4)
│       ├── quotes.service.ts                                     # typescript:S9382 (2)
│       └── tokens.service.ts                                     # typescript:S9382 (1), typescript:S7503 (1)
└── test/                                                         # Suites unitarias, integración y E2E (INMUTABLES)

frontend/
├── src/
│   ├── components/
│   │   ├── catalog/
│   │   │   └── PlayerCard.tsx                                    # typescript:S6819 (1), typescript:S6847 (1)
│   │   ├── marketplace/
│   │   │   └── RankingFiltersBar.tsx                             # typescript:S6819 (1)
│   │   ├── player-detail/
│   │   │   ├── PlayerDetailModal.css                             # css:S9440 (2), css:S7924 (1)
│   │   │   └── PlayerDetailModal.tsx                             # typescript:S6819 (2)
│   │   ├── team-of-the-week/
│   │   │   ├── PitchPlayerCard.tsx                               # typescript:S6819 (1)
│   │   │   └── WeekSelector.tsx                                  # typescript:S7773 (2)
│   │   └── ui/
│   │       └── chart.tsx                                         # typescript:S6481 (1)
│   ├── hooks/
│   │   ├── usePlayerMarketPanel.ts                               # typescript:S3776 (1)
│   │   └── usePortfolio.ts                                       # typescript:S3776 (1)
│   ├── styles/
│   │   └── catalog.css                                           # css:S9440 (1) + soporte visual de button.player-card
│   ├── types/
│   │   └── marketplace.types.ts                                  # typescript:S6564 (1)
│   ├── utils/
│   │   ├── formato-mercado.ts                                    # typescript:S8786 (1)
│   │   └── portfolio-chart.ts                                    # typescript:S3776 (1)
│   └── views/
│       └── TeamOfTheWeekView.tsx                                 # typescript:S3735 (1)
└── tests/                                                        # Suites unitarias, integración y E2E (INMUTABLES)
```

**Structure Decision**: Se mantiene la arquitectura web full-stack existente (`backend/` y `frontend/`) interviniendo únicamente los 33 archivos de código de producción listados arriba.

## Estrategia de Implementación por Fases

### Etapa 1 (US1 - Prioridad P1): Hallazgos `CRITICAL` (`typescript:S3776` x12, `typescript:S3735` x1)
1. **Dominio y Servicios `backend`**:
   - Completar la descomposición de `EquipoSemanal.validarInvariantes` en `backend/src/domain/equipo-semanal.entity.ts`.
   - Verificar las simplificaciones declarativas ya aplicadas en `EstadisticaJugador` (`backend/src/scraping/domain/estadistica-jugador.entity.ts`), `NormalizadorJugadorService` (`backend/src/scraping/services/normalizador-jugador.service.ts`) y `JugadorService` (`backend/src/services/jugador.service.ts`), extrayendo adicionalmente `mapearEquipoResumenDto` y `mapearLigaResumenDto` en `JugadorService`.
   - Completar la reducción de complejidad cognitiva en `ScrapingService.asociarJugadoresLocales` (`backend/src/scraping/services/scraping.service.ts`) y en `WhoScoredPlaywrightService.descubrirEstructuraCompeticion` / `leerFilasDeTablaDom` (`backend/src/scraping/services/whoscored-playwright.service.ts`).
2. **Hooks, Utilidades y Vistas `frontend`**:
   - Consolidar la extracción de helpers en `usePlayerMarketPanel.ts`, `usePortfolio.ts` y `portfolio-chart.ts` para mantener todas sus funciones por debajo de 15 puntos de complejidad cognitiva.
   - Asegurar la eliminación de todo operador `void` en `frontend/src/views/TeamOfTheWeekView.tsx` (líneas 47 y 70).

### Etapa 2 (US2 - Prioridad P2): Hallazgos `MAJOR` (`S6819` x5, `S6847` x1, `css:S9440` x3, `css:S7924` x1, `S8786` x1, `S6481` x1, `S6564` x1, `S3358` x2, `S2933` x2, `S7761` x1)
1. **Accesibilidad Semántica en `frontend`**:
   - `PlayerCard.tsx`: renderizar `<button type="button" className="player-card" ...>` cuando `onSelect` está presente y `<article className="player-card" ...>` sin listeners ni roles cuando no es interactivo.
   - `PlayerDetailModal.tsx`: reemplazar `<div role="presentation" onClick={...}>` y `<div role="dialog">` por `<button type="button" className="player-detail-backdrop" data-testid="player-detail-overlay" onClick={onClose} tabIndex={-1} aria-hidden="true" />` y `<dialog open className="player-detail-panel" aria-modal="true" aria-labelledby="player-detail-title">`.
   - `PitchPlayerCard.tsx`: reemplazar `<div role="button" tabIndex={0} ...>` por `<button type="button" ...>`.
   - `RankingFiltersBar.tsx`: reemplazar `<div className="ranking-position-tabs" role="group" ...>` por `<fieldset className="ranking-position-tabs" ...>`.
2. **Accesibilidad Visual CSS en `frontend`**:
   - `PlayerDetailModal.css`: agregar soporte `@media (prefers-reduced-motion: no-preference)` y `@media (prefers-reduced-motion: reduce)` para `.player-detail-panel` y `.stat-card`, estilizar `.player-detail-backdrop` y reemplazar el fondo semitransparente de `.player-detail-close-btn:hover, .player-detail-close-btn:focus-visible` por color sólido oscuro `#262d3d` con contraste > 12:1 frente a `#ffffff`.
   - `catalog.css`: agregar soporte `@media (prefers-reduced-motion: no-preference)` y `@media (prefers-reduced-motion: reduce)` para `.filter-modal-content` y asegurar que `button.player-card` herede tipografía y alineación.
3. **Rendimiento y Tipos en `frontend`**:
   - `formato-mercado.ts`: reemplazar la regex con backtracking por formateo lineal $O(n)$ de separadores de miles.
   - `chart.tsx`: envolver `{ config }` en `useMemo` antes de pasarlo a `ChartContext.Provider`.
   - `marketplace.types.ts`: eliminar `export type EstrategiaVersion = string;` y usar `string` en sus 5 referencias.
4. **Calidad Mayor en `backend`**:
   - `whoscored-feed-adapter.interface.ts` y `whoscored-playwright.service.ts`: extraer ternarios anidados (`typescript:S3358`) en sentencias `if/else` independientes.
   - `ejecucion-scraping.entity.ts` y `whoscored-playwright.service.ts`: agregar `readonly` a `_detalle` y `scrapingConfig` (`typescript:S2933`).
   - `whoscored-playwright.service.ts`: reemplazar `tr.getAttribute('data-player-id')` por `(tr as HTMLElement).dataset.playerId` (`typescript:S7761`).

### Etapa 3 (US3 - Prioridad P3): Hallazgos `MINOR` (`S9382` x27, `S7503` x5, `S7773` x4, `S4323` x2, `S6582` x1, `S7763` x1, `S6606` x1, `S6594` x1)
1. **Procesamiento Asíncrono en `backend`**:
   - Resolver las 27 ocurrencias de `typescript:S9382` en `cotizacion.typeorm-repository.ts`, `jugador.typeorm-repository.ts`, `estadistica-jugador.typeorm-repository.ts`, `quotes.service.ts`, `tokens.service.ts`, `scraping.service.ts` y `whoscored-playwright.service.ts` mediante `Promise.all` (lecturas independientes) y encadenamiento `reduce` / recursión asíncrona (flujos secuenciales).
   - Resolver las 5 ocurrencias de `typescript:S7503` en `oms.service.ts` y `tokens.service.ts` removiendo `async` ocioso de los métodos envolventes que retornan `this.dataSource.transaction(...)`.
2. **Higiene y Expresividad en `backend` y `frontend`**:
   - Definir y aplicar los alias `MontoSaldo` en `usuario.entity.ts` y `ValorDecimalNullableOrm` en `estadistica-jugador.orm-entity.ts` (`typescript:S4323`).
   - Aplicar `??` en `orden.entity.ts` (`typescript:S6606`), optional chaining en `equipo-semanal.entity.ts` (`typescript:S6582`), `RegExp.exec()` en `whoscored-playwright.service.ts` (`typescript:S6594`), `export ... from` en `equipo-semanal.service.ts` (`typescript:S7763`) y `Number.isNaN` en `miembro-equipo-semanal.entity.ts` y `WeekSelector.tsx` (`typescript:S7773`).

## Complexity Tracking

> **No existen violaciones a la Constitución del proyecto.**
