# Implementation Plan: Frontend Refactor & Reusable Components

**Branch**: `005-frontend-refactor` | **Date**: 2026-09-28 | **Spec**: [specs/005-frontend-refactor/spec.md](file:///c:/Users/Joaquín/Desktop/DOCS/UNQ/dapps2026GrupoQ/specs/005-frontend-refactor/spec.md)

**Input**: Feature specification from `specs/005-frontend-refactor/spec.md`

## Summary

Ejecutar un refactor exhaustivo del frontend en `frontend/` para modularizar vistas monolíticas (`LoginView`, `RegisterView`, `HomeView`, `PlayersCatalogView`), extraer un catálogo de componentes atómicos UI reutilizables (`Input`, `Button`, `Alert`, `Card`, `Navbar`, `Spinner`), unificar la capa de formularios mediante custom hooks (`useForm`), centralizar el servicio de autenticación y erradicar deuda técnica (estilos inline, warnings de `act(...)` en tests, tipados laxos y duplicación de código), preservando al 100% el comportamiento funcional y los contratos de pruebas existentes.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3.1  
**Primary Dependencies**: React Router DOM 7.18.4, Zod 4.6.5, Vite 6.0  
**Storage**: `localStorage` (sesión de usuario validada con esquemas Zod)  
**Testing**: Vitest 4.1.11, React Testing Library 16.1.0, JSDOM 25.0.1  
**Target Platform**: Navegador Web moderno (SPA responsive, tema oscuro con Glassmorphism)  
**Project Type**: Single Page Application (SPA) - Web Frontend  
**Performance Goals**: Cero re-renders innecesarios en formularios, carga instantánea de componentes y transiciones fluidas a 60 fps  
**Constraints**: Uso estricto de Vanilla CSS (sin frameworks como Tailwind/Bootstrap), retrocompatibilidad total con tests preexistentes, sin degradación visual  
**Scale/Scope**: 4 vistas principales (`HomeView`, `LoginView`, `RegisterView`, `PlayersCatalogView`), 6 componentes atómicos UI, 2 layouts y suite de tests (>106 tests)  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Arquitectura en 5 Capas y Backend Stateless)**: PASS. El refactor opera exclusivamente sobre la capa 1 (Interfaz de Usuario / Frontend) sin alterar la naturaleza stateless del backend ni sus contratos OpenAPI.
- **Principle II (Rich Domain Model & DDD)**: PASS. La lógica de dominio de negocio sigue residiendo en el backend; el frontend actúa como cliente consumidor desacoplado.
- **Principle III & IV (Testing Riguroso e Inmutabilidad de Tests)**: PASS. La suite completa de 106 tests de frontend debe conservarse y continuar pasando al 100%. Las nuevas abstracciones se acompañarán de pruebas unitarias de componentes y hooks.
- **Principle V (Convenciones de Idioma)**: PASS. Mensajes al usuario y validaciones en español; identificadores técnicos y de arquitectura en inglés.
- **DoD Check**: PASS. Compilación limpia (`npm run build`) y tests pasando al 100%.

## Project Structure

### Documentation (this feature)

```text
specs/005-frontend-refactor/
├── spec.md              # Feature specification
├── plan.md              # Implementation Plan (este archivo)
├── research.md          # Phase 0: Architectural research & decisions
├── data-model.md        # Phase 1: Component interfaces & hook signatures
├── quickstart.md        # Phase 1: Quickstart and validation guide
├── contracts/           # Phase 1: Interface contracts
│   ├── ui-components.contract.md
│   └── auth-domain.contract.md
└── tasks.md             # Phase 2: Tasks (generado por speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── api/
│   │   ├── auth-api.client.ts
│   │   └── players-api.client.ts
│   ├── components/
│   │   ├── auth/                # Subcomponentes de dominio auth
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── catalog/             # Subcomponentes del catálogo de jugadores
│   │   │   ├── ActiveFiltersBar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── FilterModal.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── PlayerGrid.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── layout/              # Layouts y navegación
│   │   │   ├── AppLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── Navbar.tsx
│   │   └── ui/                  # Componentes base reutilizables (Design System)
│   │       ├── Alert.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── PasswordInput.tsx
│   │       └── Spinner.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── AuthProvider.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useForm.ts
│   │   ├── useInfinitePlayers.ts
│   │   └── usePlayerFilters.ts
│   ├── routes/
│   │   └── AppRouter.tsx
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── storage.service.ts
│   ├── styles/
│   │   ├── catalog.css
│   │   ├── components.css       # Estilos centralizados de componentes UI base
│   │   ├── home.css
│   │   ├── login.css
│   │   └── variables.css
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── player.types.ts
│   │   └── ui.types.ts
│   ├── utils/
│   │   └── validaciones.ts
│   ├── views/
│   │   ├── HomeView.tsx
│   │   ├── LoginView.tsx
│   │   ├── PlayersCatalogView.tsx
│   │   └── RegisterView.tsx
│   ├── App.tsx
│   └── main.tsx
└── tests/
    ├── integration/
    ├── unit/
    └── views/
```

**Structure Decision**: Se adopta una estructura modular clara en `frontend/src/components/`, separando componentes de UI pura (`ui/`), estructuras de navegación (`layout/`), componentes de autenticación (`auth/`) y catálogo (`catalog/`), complementado con custom hooks en `hooks/` y tipos en `types/`.

## Complexity Tracking

> Ninguna violación constitucional identificada. Diseño 100% alineado con los principios del repositorio.
