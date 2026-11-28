# Implementation Plan: Panel de Observabilidad y Monitoreo en Tiempo Real para Administradores

**Branch**: `018-frontend-observability-dashboard` | **Date**: 2026-11-23 | **Spec**: [spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/spec.md)

**Input**: Feature specification from `/specs/018-frontend-observability-dashboard/spec.md`

---

## Summary

Implementar en el frontend una vista interactiva de observabilidad y monitoreo en tiempo real exclusiva para administradores (`rol: 'ADMIN'`) en `/admin/observability`, protegida por `ProtectedRoute` y `AdminRoute`, y enlazada dinámicamente en la barra de navegación (`navegacion.ts`).

La solución consume los endpoints de telemetría ya disponibles en el backend (`/metrics`, `/health/ready`, `/health/live`), procesa las muestras de Prometheus mediante un parser ligero y determinista en TypeScript puro (`prometheus-parser.ts`), orquesta el ciclo de vida y auto-actualización periódica configurable (Pausado, 5s, 10s, 30s) con el hook `useObservability`, y renderiza dashboards visuales especializados con tarjetas métricas e interactividad gráfica (`Recharts` y `chart.tsx`), aislando fallos parciales para garantizar una alta resiliencia operativa.

---

## Technical Context

**Language/Version**: TypeScript ~5.6.0, Node.js `>= 20.x`, React `18.3.1`

**Primary Dependencies**: React 18, React Router DOM `7.18.4`, Recharts `^2.15.4`, Vite `^6.0.0`, Vitest `^4.1.11`

**Storage**: N/A (Vista de presentación en frontend; persistencia de sesión en `localStorage` mediante `storage.service.ts`)

**Testing**: Vitest (`vitest.unit.config.ts`, `vitest.integration.config.ts`), `@testing-library/react`, `@testing-library/jest-dom`

**Target Platform**: Navegadores Web modernos (Chrome, Firefox, Safari, Edge)

**Project Type**: Web Application (Módulo de observabilidad en frontend React consumiendo backend NestJS REST)

**Performance Goals**:
- Tiempo de redirección ante acceso no autorizado: `< 500 ms`
- Tiempo de carga inicial de sondas y métricas: `< 2.0 s`
- Latencia de refresco manual/periódico: `< 1.5 s`
- Ciclo de auto-actualización fluido sin parpadeos ni recargas completas de página

**Constraints**:
- Acceso restringido exclusivamente a usuarios autenticados con rol `'ADMIN'`
- Desconexión y resiliencia: no congelar la navegación ante fallos de red; aislar errores por bloque temático
- Sin dependencias pesadas de Node.js en el cliente: parseo de métricas Prometheus mediante función pura en TypeScript

**Scale/Scope**:
- 1 vista principal (`ObservabilityView.tsx`)
- 1 hook orquestador (`useObservability.ts`)
- 1 cliente API de observabilidad (`observabilityApi.ts`)
- 1 parser puro de texto Prometheus (`prometheus-parser.ts`)
- 1 formateador de telemetría y helpers de cálculo (`formato-observabilidad.ts`)
- 5 componentes de dashboard: `HealthStatusCard`, `MarketplaceMetricsCard`, `PricingMetricsCard`, `ScrapingMetricsCard`, `SystemIntegrationCard`
- 1 barra de control de operabilidad (`ObservabilityToolbar.tsx`)
- Enrutamiento en `AppRoutes.tsx` y navegación condicional en `navegacion.ts`

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluación de Principios Constitucionales

| Principio | Estado | Justificación y Cumplimiento |
|---|---|---|
| **I. Arquitectura en 5 Capas y Backend Stateless** | **PASS** | La feature se implementa exclusivamente en la capa de Interfaz de Usuario (Frontend React), respetando el desacoplamiento con el backend y consumiendo endpoints REST preexistentes sin alterar la condición Stateless ni la base de datos. |
| **II. Rich Domain Model y DDD** | **PASS** | El frontend modela estrictamente las entidades y value objects de telemetría (`SondaReadinessData`, `SondaLivenessData`, `MetricaDeMarketplace`, etc.) garantizando invariantes de cálculo seguro y ausencia de `NaN`/`Infinity`. |
| **III. Estrategia de Testing Rigurosa** | **PASS** | Pruebas unitarias para utilidades puras y parsers (`vitest.unit.config.ts`); pruebas de integración con mocks controlados de red para el hook `useObservability`, protección de rutas y componentes (`vitest.integration.config.ts`). |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASS** | No se modifican ni eliminan pruebas existentes. Todos los tests previos continúan pasando intactos. |
| **V. Convenciones de Idioma y Terminología** | **PASS** | Documentación, nombres de dominio (`sonda`, `metrica`, `estado`, `observabilidad`), interfaces visuales, badges y mensajes de error en español. Nombres técnicos estándar en inglés (`React`, `Hook`, `Controller`, `Recharts`). |
| **VI. Cobertura Mínima (>= 80%)** | **PASS** | Todo el código nuevo contará con cobertura `>= 80%` en líneas y bifurcaciones (*branches*), testeado independientemente mediante Vitest. |
| **DoD (Definition of Done)** | **PASS** | Se verifican suites de pruebas completas, compilación y empaquetado de producción (`npm run build`), y paridad documentada con la colección de Postman preexistente. |

---

## Project Structure

### Documentation (this feature)

```text
specs/018-frontend-observability-dashboard/
├── spec.md                  # Especificación funcional de la feature
├── plan.md                  # Este plan de implementación (/speckit-plan)
├── research.md              # Decisiones técnicas y análisis de alternativas (Fase 0)
├── data-model.md            # Entidades, tipos, validaciones y diagramas (Fase 1)
├── quickstart.md            # Guía de validación y ejecución de escenarios (Fase 1)
├── contracts/               # Contratos de API y componentes (Fase 1)
│   ├── observability-api.contract.md
│   └── observability-client.contract.md
└── tasks.md                 # Tareas desglosadas en orden de dependencia (/speckit-tasks)
```

### Source Code (repository layout)

```text
frontend/
├── src/
│   ├── api/
│   │   ├── http-client.ts                # Cliente HTTP base existente
│   │   └── observabilityApi.ts           # NUEVO: Cliente para /metrics, /health/ready, /health/live
│   ├── components/
│   │   ├── admin/
│   │   │   ├── observability/            # NUEVO: Componentes modulares del dashboard
│   │   │   │   ├── HealthStatusCard.tsx
│   │   │   │   ├── MarketplaceMetricsCard.tsx
│   │   │   │   ├── PricingMetricsCard.tsx
│   │   │   │   ├── ScrapingMetricsCard.tsx
│   │   │   │   ├── SystemIntegrationCard.tsx
│   │   │   │   └── ObservabilityToolbar.tsx
│   │   └── ui/
│   │       ├── chart.tsx                 # Contenedores y tooltips shadcn / Recharts existentes
│   │       ├── Alert.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Spinner.tsx
│   ├── hooks/
│   │   └── useObservability.ts           # NUEVO: Hook de auto-actualización, polling y estados
│   ├── routes/
│   │   ├── AdminRoute.tsx                # Actualización menor: parametrización de avisoSeguridad
│   │   └── AppRoutes.tsx                 # Registro de la ruta /admin/observability
│   ├── styles/
│   │   └── observability.css             # NUEVO: Estilos y layout del panel de observabilidad
│   ├── types/
│   │   └── observability.types.ts        # NUEVO: Interfaces y tipos de telemetría y salud
│   ├── utils/
│   │   ├── navegacion.ts                 # Enlace a Observabilidad para rol ADMIN
│   │   ├── prometheus-parser.ts          # NUEVO: Parser de texto plano de Prometheus
│   │   └── formato-observabilidad.ts     # NUEVO: Helpers de cálculo seguro y formateo de métricas
│   └── views/
│       └── ObservabilityView.tsx         # NUEVO: Vista principal del panel de observabilidad
└── tests/
    ├── unit/
    │   ├── utils/
    │   │   ├── prometheus-parser.test.ts # NUEVO: Pruebas unitarias del parser Prometheus
    │   │   └── formato-observabilidad.test.ts # NUEVO: Pruebas unitarias de formateo
    │   └── utils/navegacion.rol.test.ts  # Pruebas de items de navegación con observabilidad
    └── integration/
        ├── ObservabilityView.test.tsx    # NUEVO: Pruebas de integración de la vista completa
        ├── ObservabilityAccess.test.tsx  # NUEVO: Pruebas de control de acceso y redirección
        └── hooks/useObservability.test.ts# NUEVO: Pruebas de polling, refresh y resiliencia
```

**Structure Decision**: Aplicación Web React existente (`frontend/`). No se requiere crear nuevas carpetas fuera del layout estándar establecido; se crean submódulos ordenados en `frontend/src/components/admin/observability`, `frontend/src/hooks`, `frontend/src/utils`, `frontend/src/types` y `frontend/tests`.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No existen violaciones constitucionales. Todas las directrices arquitectónicas, de cobertura y de gobernanza son respetadas estrictamente.*
