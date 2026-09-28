# Tasks: Frontend Refactor & Reusable Components

**Input**: Design artifacts from `/specs/005-frontend-refactor/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

---

## Phase 1: Setup (Shared Infrastructure & UI Types)

**Purpose**: Definición de tipos compartidos, tokens de diseño y estilos centralizados de componentes.

- [X] T001 Create TypeScript interfaces and types for UI components and layouts in `frontend/src/types/ui.types.ts`
- [X] T002 [P] Centralize base component styles and design tokens (inputs, buttons, alerts, cards, navbar) in `frontend/src/styles/components.css`

---

## Phase 2: Foundational (Base Atomic Components & Hooks)

**Purpose**: Implementar los componentes atómicos reutilizables del Design System y custom hooks base.

**⚠️ CRITICAL**: Ninguna vista puede refactorizarse antes de completar estos componentes base.

- [X] T003 [P] Implement accessible `Spinner` component in `frontend/src/components/ui/Spinner.tsx`
- [X] T004 [P] Implement `Alert` component with ARIA live regions (`role="alert"` / `role="status"`) in `frontend/src/components/ui/Alert.tsx`
- [X] T005 [P] Implement `Button` component with variant, size, loading spinner and disabled state handling in `frontend/src/components/ui/Button.tsx`
- [X] T006 [P] Implement accessible `Input` (`FormField`) and `PasswordInput` components in `frontend/src/components/ui/Input.tsx` and `frontend/src/components/ui/PasswordInput.tsx`
- [X] T007 [P] Implement `Card` component with glassmorphism variants in `frontend/src/components/ui/Card.tsx`
- [X] T008 [P] Implement generic `useForm` custom hook with change/blur validation and error handling in `frontend/src/hooks/useForm.ts`
- [X] T009 [P] Implement unified `Navbar` component supporting user session and navigation items in `frontend/src/components/layout/Navbar.tsx`
- [X] T010 [P] Implement `AppLayout` and `AuthLayout` structural wrappers in `frontend/src/components/layout/AppLayout.tsx` and `frontend/src/components/layout/AuthLayout.tsx`

**Checkpoint**: Componentes UI base y layouts listos para ser consumidos en vistas y componentes de dominio.

---

## Phase 3: User Story 1 - Experiencia de Usuario Consistente e Inalterada (Priority: P1) 🎯 MVP

**Goal**: Migrar las vistas principales (`HomeView` y `PlayersCatalogView`) a los nuevos componentes base y `Navbar` unificado, eliminando estilos inline y preservando intacta la funcionalidad.

**Independent Test**: Navegar por `/` y `/players`, comprobando que la navegación entre páginas, logout y filtros funcionan idéntico visual y funcionalmente.

- [X] T011 [P] [US1] Refactor `HomeView.tsx` to use `Navbar`, `AppLayout`, `Card` and clean CSS classes (removing hardcoded inline styles) in `frontend/src/views/HomeView.tsx`
- [X] T012 [US1] Refactor `PlayersCatalogView.tsx` to use unified `Navbar` and `AppLayout` in `frontend/src/views/PlayersCatalogView.tsx`
- [X] T013 [US1] Run existing view tests in `frontend/tests/views/` and verify all tests pass without regressions

**Checkpoint**: `HomeView` y `PlayersCatalogView` utilizan layouts y componentes unificados manteniendo 100% de compatibilidad.

---

## Phase 4: User Story 2 - Modularidad y Componentes de Autenticación (Priority: P1)

**Goal**: Descomponer las vistas monolíticas de login y registro en componentes de dominio modulares (`LoginForm`, `RegisterForm`) utilizando los componentes base y `useForm`.

**Independent Test**: Ejecutar los flujos de registro en `/register` y login en `/login`, validando que se muestran los mensajes de error en campos y los banners de servidor exactamente como en la especificación.

- [X] T014 [P] [US2] Implement modular `LoginForm` component using `Input`, `Button`, `Alert` and `useForm` in `frontend/src/components/auth/LoginForm.tsx`
- [X] T015 [P] [US2] Implement modular `RegisterForm` component using `Input`, `PasswordInput`, `Button`, `Alert` and `useForm` in `frontend/src/components/auth/RegisterForm.tsx`
- [X] T016 [US2] Refactor `LoginView.tsx` to delegate form rendering and state to `LoginForm` and `AuthLayout` in `frontend/src/views/LoginView.tsx`
- [X] T017 [US2] Refactor `RegisterView.tsx` to delegate form rendering and state to `RegisterForm` and `AuthLayout` in `frontend/src/views/RegisterView.tsx`
- [X] T018 [US2] Run integration test suites `tests/integration/LoginView.test.tsx` and `tests/integration/RegisterView.test.tsx` ensuring 100% pass rate and eliminating `act(...)` warnings

**Checkpoint**: Vistas de autenticación completamente desacopladas, testeables y con lógica de formulario centralizada.

---

## Phase 5: User Story 3 - Manejo Robusto de Errores y Calidad de Código (Priority: P2)

**Goal**: Estandarizar la integración con la API de autenticación, asegurar tipado estricto en TypeScript y reforzar la accesibilidad semántica.

**Independent Test**: Verificar que no existan tipos `any`, que los lectores de pantalla puedan asociar errores con campos (`aria-describedby`) y que los fallos HTTP se comuniquen amigablemente.

- [X] T019 [P] [US3] Extend `auth.service.ts` and `useAuth.ts` to include unified `register` method and standardized error mapping in `frontend/src/services/auth.service.ts` and `frontend/src/hooks/useAuth.ts`
- [X] T020 [US3] Audit and enforce strict TypeScript typing (zero `any`, complete event and props typing) in `frontend/src/`
- [X] T021 [US3] Audit and ensure accessible markup (`htmlFor`, `id`, `aria-invalid`, `aria-describedby`, `role="alert"`) in all form controls

**Checkpoint**: Calidad de código, robustez de tipado y accesibilidad web verificadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Limpieza final, eliminación de código muerto y validación completa del sistema.

- [X] T022 [P] Clean up deprecated CSS styles and unused imports across `frontend/src/`
- [X] T023 Run full frontend test suite (`npm --prefix frontend test`) verifying 106+ tests passing with zero errors
- [X] T024 Run production build (`npm --prefix frontend run build`) and execute manual validation scenarios from `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas - inicia de inmediato.
- **Foundational (Phase 2)**: Depende de Phase 1 - BLOQUEA las historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Phase 2 (Foundational).
- **User Story 2 (Phase 4)**: Depende de Phase 2 (Foundational).
- **User Story 3 (Phase 5)**: Depende de Phase 3 y Phase 4.
- **Polish (Phase 6)**: Depende de todas las fases anteriores completas.

### Parallel Opportunities

- **Phase 1**: T001 y T002 pueden ejecutarse en paralelo.
- **Phase 2**: T003, T004, T005, T006, T007, T008, T009, T010 pueden desarrollarse en paralelo al estar en archivos independientes.
- **Phase 3**: T011 puede avanzar en paralelo a componentes de catálogo.
- **Phase 4**: T014 y T015 pueden implementarse en paralelo.

---

## Implementation Strategy

### MVP First (User Story 1 & Foundational Components)
1. Completar Setup (T001-T002).
2. Completar Foundational UI Components (T003-T010).
3. Implementar US1 (`HomeView`, `PlayersCatalogView` con nuevo `Navbar` y `AppLayout`) (T011-T013).
4. Validar que la navegación y catálogo siguen 100% operativos.

### Entrega Incremental
1. Integrar US2 (Modularización de `LoginForm` y `RegisterForm` con `useForm`).
2. Ejecutar y validar tests de integración de auth (T018).
3. Aplicar US3 (unificación de servicios, tipado estricto y accesibilidad).
4. Ejecutar validación final de build y suite de pruebas (T022-T024).
