# Implementation Plan: Reducción de Duplicación de Código y Calidad SonarCloud

**Branch**: `006-reduce-duplication` | **Date**: 2026-09-28 | **Spec**: [specs/006-reduce-duplication/spec.md](file:///c:/Users/Joaquín/Desktop/DOCS/UNQ/dapps2026GrupoQ/specs/006-reduce-duplication/spec.md)

**Input**: Feature specification from `specs/006-reduce-duplication/spec.md`

## Summary

Reducir la tasa de duplicación de código reportada por SonarCloud (6,06% → ≤ 3,0%) mediante refactorizaciones específicas y justificadas en código productivo y en suites de prueba:
1. **Frontend Productivo**: Integrar `useForm` en `LoginForm`/`RegisterForm`, extraer `RouteLoading` para `ProtectedRoute`/`PublicRoute`, unificar cliente HTTP en `src/api/http-client.ts`, generalizar el tipado de `useForm` para poder integrarlo y consolidar CSS.
2. **Backend Productivo**: Aceptar y documentar como *Duplicación Aceptada* las similitudes en entidades de dominio y ORM para proteger el Rich Domain Model y la arquitectura en 5 capas.
3. **Suites de Testing (Frontend y Backend)**: Unificar `TestDatabaseHelper` en backend, extraer el contexto de setup compartido de los tests de jugadores (`players-test.context.ts`, sin tocar los datos semilla que viven dentro de cada `it`) y, en frontend, helpers locales dentro de cada archivo de test para los flujos repetidos. Se conserva estrictamente el 100% de los tests, nombres de casos y aserciones (106 en frontend, 48 en backend) y ningún helper contiene aserciones.

## Technical Context

**Language/Version**: TypeScript 5.6 (Frontend & Backend), Node.js >= 18  
**Primary Dependencies**: React 18.3.1, NestJS 11.x, TypeORM 0.3.x, Vitest 4.1.11, Jest 29.x, Testcontainers PostgreSQL 10.x  
**Storage**: PostgreSQL (persistencia relacional A.C.I.D.), `localStorage` (sesión frontend)  
**Testing**: Vitest (Frontend: 106 tests), Jest + Testcontainers (Backend: 48 tests)  
**Target Platform**: Web SPA + Node.js REST API  
**Project Type**: Web application (Frontend React + Backend NestJS)  
**Performance Goals**: Reducción de duplicación local a ≤ 3,0%, sin alterar el tiempo ni el comportamiento de las suites (cada archivo de test sigue levantando su propio contenedor, porque Jest aísla los módulos por archivo)  
**Constraints**: Inmutabilidad estricta de aserciones de tests (Principio IV), preservación del Rich Domain Model (Principio II), cero regresiones visuales o de contratos de API, helpers de test sin aserciones, `HttpError` importado siempre desde `auth-api.client` (los tests mockean ese módulo) y `vi.mock` conservado en cada archivo de test  
**Scale/Scope**: ~10.6k líneas de código total evaluadas, 50 clones analizados  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Arquitectura en 5 Capas y Backend Stateless)**: PASS. Las abstracciones propuestas respetan las 5 capas unidireccionales. El cliente HTTP y los helpers de test residen en sus capas correspondientes sin mezclar lógica de negocio.
- **Principle II (Rich Domain Model & DDD)**: PASS. Se decide explícitamente **no** crear clases base genéricas para entidades de dominio (`Usuario`, `Jugador`, etc.), preservando sus invariantes autónomas y documentándolas como duplicación aceptada.
- **Principle III & IV (Testing Riguroso e Inmutabilidad de Tests)**: PASS. El usuario autorizó expresamente la reestructuración estructural de tests. Se garantiza que los 106 tests de frontend y 48 tests de backend mantengan exactamente sus mismos nombres, escenarios y aserciones con valores esperados intactos. La tarea T001 captura una línea base exacta (títulos y cantidad de aserciones) que se compara en cada checkpoint.
- **Principle V (Convenciones de Idioma)**: PASS. Documentación y especificaciones en español; identificadores técnicos y de helpers en inglés; sin comentarios superfluos ni emojis en el código fuente.
- **DoD Check**: PASS. Suites de tests 100% pasando y compilación limpia en frontend y backend.

## Project Structure

### Documentation (this feature)

```text
specs/006-reduce-duplication/
├── spec.md              # Feature specification
├── plan.md              # Implementation Plan (este archivo)
├── research.md          # Baseline measurements & duplication decision matrix
├── data-model.md        # Interfaces & signatures of proposed abstractions
├── quickstart.md        # Verification and measurement guide
├── contracts/           # Interface contracts
│   ├── http-client.contract.md
│   └── test-helpers.contract.md
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code Changes & New Abstractions

```text
specs/006-reduce-duplication/
└── baseline/                          # [NUEVO] Snapshot exacto previo (títulos, expect() por archivo, jscpd)

backend/
├── src/
│   └── data-access/
│       └── *.orm-entity.ts            # Sin cambios: duplicación aceptada y documentada
└── test/
    └── integration/
        ├── test-database.helper.ts    # [NUEVO] Helper unificado de Testcontainers (reemplaza los dos setup)
        ├── players-test.context.ts    # [NUEVO] Contexto de setup compartido (repos, módulo Nest, mock del cliente); sin seeds
        ├── usuario.typeorm-repository.spec.ts  # Migrado a TestDatabaseHelper
        ├── auth.service.spec.ts                # Migrado a TestDatabaseHelper
        ├── auth-perfil.spec.ts                 # Migrado a TestDatabaseHelper
        ├── jugador.service.spec.ts             # Usa TestDatabaseHelper + contexto compartido
        ├── player-detail.spec.ts               # Usa TestDatabaseHelper + contexto compartido
        ├── players-filters.spec.ts             # Usa TestDatabaseHelper + contexto compartido
        ├── setup-testcontainers.ts             # [ELIMINADO] tras migrar todos sus consumidores
        └── setup-players-testcontainers.ts     # [ELIMINADO] tras migrar todos sus consumidores

frontend/
├── src/
│   ├── api/
│   │   ├── http-client.ts             # [NUEVO] httpRequest y HttpError compartidos
│   │   ├── auth-api.client.ts         # Consume http-client.ts y sigue exportando HttpError y sus funciones
│   │   └── playersApi.ts              # Consume http-client.ts (mismos exports: getPlayers, getPlayerById, getPlayerFilterOptions)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx          # Usa useForm (si no exige contorsiones)
│   │   │   └── RegisterForm.tsx       # Usa useForm (si no exige contorsiones)
│   │   └── layout/
│   │       └── RouteLoading.tsx       # [NUEVO] Componente común de carga de rutas
│   ├── hooks/
│   │   └── useForm.ts                 # Tipado generalizado (sin any, sanitize con otro tipo de salida)
│   ├── routes/
│   │   ├── ProtectedRoute.tsx         # Usa RouteLoading
│   │   └── PublicRoute.tsx            # Usa RouteLoading
│   └── styles/
│       ├── components.css             # Estilos base centralizados (+ .route-loading)
│       └── login.css                  # Limpieza de reglas duplicadas (home.css NO se toca)
└── tests/
    └── integration/
        ├── ProtectedRoute.test.tsx    # Helpers locales de render (AuthContext.Provider mock + MemoryRouter)
        ├── LoginView.test.tsx         # Helpers locales para completar y enviar el formulario
        └── RegisterView.test.tsx      # Helpers locales para completar y enviar el formulario
```

**Fuera de alcance por diseño**: `EmptyStateFilterReset.spec.tsx` y `PlayersCatalogView.spec.tsx` no se modifican. Lo único que repiten son bloques `vi.mock`, que Vitest hoistea por archivo y no conviene compartir; queda registrado como duplicación aceptada.

**Structure Decision**: Se crean solo las abstracciones con más de un consumidor real. Los helpers con un único consumidor (por ejemplo el render de `ProtectedRoute.test.tsx`) viven dentro del propio archivo de test.

## Complexity Tracking

> Ninguna violación constitucional identificada. Todas las decisiones de refactorizar vs. aceptar están respaldadas por los Principios I, II, IV y V.
