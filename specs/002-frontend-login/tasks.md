# Tasks: Frontend Login & Sesión Inicial

**Feature Branch**: `002-frontend-login` | **Spec**: [specs/002-frontend-login/spec.md](spec.md) | **Plan**: [specs/002-frontend-login/plan.md](plan.md)

---

## Phase 1: Setup (Frontend Initialization & Tooling)

**Purpose**: Inicialización del proyecto React con Vite, TypeScript y configuración del entorno de testing.

- [ ] T001 Initialize React 18+ TypeScript SPA project structure with Vite in `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, and `frontend/index.html`
- [ ] T002 [P] Configure dependencies (`react`, `react-dom`, `react-router-dom`) and dev dependencies (`vite`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`) in `frontend/package.json`
- [ ] T003 [P] Configure Vitest testing environment and DOM matchers in `frontend/vite.config.ts` and `frontend/tests/setup.ts`

---

## Phase 2: Foundational (Core Design System, Types, Storage & HTTP Base)

**Purpose**: Infraestructura transversal, sistema de diseño, modelos tipados y cliente HTTP que bloquean la implementación de las historias de usuario.

**⚠️ CRITICAL**: Completar esta fase antes de avanzar a la implementación de las historias de usuario.

- [ ] T004 [P] Define TypeScript interfaces and domain types (`CredencialesLogin`, `PerfilUsuario`, `RespuestaAutenticacion`, `EstadoAutenticacion`, `SesionAlmacenada`, `ErrorHttpRespuesta`) in `frontend/src/types/auth.types.ts` per data-model.md
- [ ] T005 [P] Implement client-side storage service (`StorageService`) in `frontend/src/services/storage.service.ts` for managing session and JWT token under key `football_marketplace_session`
- [ ] T006 [P] Create unit tests for storage service in `frontend/tests/unit/storage.service.test.ts`
- [ ] T007 [P] Implement design tokens and global base styles (dark obsidian palette `#0a0d14`, emerald green `#10b981`, player tier amber `#f59e0b`, glassmorphism surfaces) in `frontend/src/styles/tokens.css` and `frontend/src/styles/index.css`
- [ ] T008 Implement base HTTP client and auth API client in `frontend/src/api/cliente-http.ts` and `frontend/src/api/auth-api.client.ts` per OpenAPI contract `specs/002-frontend-login/contracts/auth-api-contract.yaml`

**Checkpoint**: Base lista: tipos, almacenamiento local, tokens de diseño y cliente API listos para construir las vistas y flujos de usuario.

---

## Phase 3: User Story 1 - Autenticación Exitosa y Acceso al Espacio Inicial (Priority: P1) 🎯 MVP

**Goal**: Permitir que un usuario existente ingrese sus credenciales válidas, se autentique contra `POST /api/auth/login`, reciba el token JWT y sea dirigido a una pantalla inicial/dashboard provisoria de bienvenida.

**Independent Test**: Ingresar correo y contraseña registrados válidos en la pantalla de login, verificar transición con indicador de carga y llegada a la pantalla inicial con saludo personalizado mostrando el nombre del usuario y confirmación de sesión activa.

### Tests for User Story 1

- [ ] T009 [P] [US1] Create integration tests for successful login flow and redirection in `frontend/tests/integration/LoginView.test.tsx`

### Implementation for User Story 1

- [ ] T010 [P] [US1] Implement `AuthContext` and `AuthProvider` in `frontend/src/context/AuthContext.tsx` and `frontend/src/context/AuthProvider.tsx` with custom hook in `frontend/src/hooks/useAuth.ts`
- [ ] T011 [US1] Implement visual styling for the login view (sports investment card, typography, glow effects, loading spinner) in `frontend/src/styles/login.css`
- [ ] T012 [US1] Implement `LoginView` component with email/password inputs, submit handler, loading feedback, and login dispatch in `frontend/src/views/LoginView.tsx`
- [ ] T013 [US1] Implement initial dashboard view (`HomeView`) with personalized user welcome, active investor status summary, and logout action in `frontend/src/views/HomeView.tsx`
- [ ] T014 [US1] Implement main routing structure and root app entry in `frontend/src/routes/AppRoutes.tsx`, `frontend/src/App.tsx`, and `frontend/src/main.tsx`

**Checkpoint**: User Story 1 (MVP) completamente funcional e independientemente verificable con credenciales válidas.

---

## Phase 4: User Story 2 - Notificación Clara ante Credenciales Inválidas o Fallo de Acceso (Priority: P2)

**Goal**: Mostrar mensajes explicativos y claros en español ante credenciales incorrectas (HTTP 401) o fallos de red/servidor sin bloquear ni congelar la pantalla.

**Independent Test**: Ingresar una contraseña incorrecta y verificar que se muestra la alerta `"Credenciales inválidas."` manteniendo el correo escrito; simular caída de red y verificar el aviso de imposibilidad de conexión.

### Tests for User Story 2

- [ ] T015 [P] [US2] Add integration tests in `frontend/tests/integration/LoginView.test.tsx` for HTTP 401 error response and network failure handling

### Implementation for User Story 2

- [ ] T016 [US2] Enhance `frontend/src/api/auth-api.client.ts` and `frontend/src/context/AuthProvider.tsx` to parse backend `HttpExceptionFilter` error envelopes and format network errors to user-friendly Spanish messages
- [ ] T017 [US2] Update `frontend/src/views/LoginView.tsx` to render contextual error alert banners, reset password field, and keep email field on authentication failure

**Checkpoint**: User Stories 1 y 2 funcionando e independientemente testeables.

---

## Phase 5: User Story 3 - Validación Local y Prevención de Envíos Prematuros (Priority: P3)

**Goal**: Validar en cliente campos obligatorios y formato de email antes de enviar la petición HTTP, previniendo envíos duplicados mientras exista una solicitud en curso.

**Independent Test**: Intentar enviar el formulario con campos vacíos o email inválido (`usuario_sin_arroba`) y verificar que se muestran mensajes de validación sin emitir llamadas de red; verificar que el botón se deshabilita durante el envío.

### Tests for User Story 3

- [ ] T018 [P] [US3] Implement unit tests for client-side form validation rules in `frontend/tests/unit/validaciones.test.ts`

### Implementation for User Story 3

- [ ] T019 [P] [US3] Implement validation functions (`validarCorreo`, `validarContrasena`, `validarFormularioLogin`) and string sanitization in `frontend/src/utils/validaciones.ts`
- [ ] T020 [US3] Update `frontend/src/views/LoginView.tsx` with client-side inline validation errors and submit button disablement during active requests

**Checkpoint**: Validación local instantánea y protección contra clics repetidos funcionando.

---

## Phase 6: User Story 4 - Persistencia Básica de Sesión y Protección de Rutas (Priority: P4)

**Goal**: Mantener la sesión activa tras recargas de página (`F5`), proteger rutas privadas redirigiendo anónimos a `/login`, y redirigir usuarios autenticados que visiten `/login` hacia `/`.

**Independent Test**: Iniciar sesión, recargar la página en `/` y confirmar que no se solicita login; acceder directamente a `/` como usuario anónimo y confirmar redirección a `/login`; acceder a `/login` estando autenticado y confirmar redirección a `/`.

### Tests for User Story 4

- [ ] T021 [P] [US4] Implement route guard tests in `frontend/tests/integration/ProtectedRoute.test.tsx`

### Implementation for User Story 4

- [ ] T022 [P] [US4] Implement route guards `ProtectedRoute` in `frontend/src/routes/ProtectedRoute.tsx` and `PublicRoute` in `frontend/src/routes/PublicRoute.tsx`
- [ ] T023 [US4] Integrate route guards and session hydration lifecycle in `frontend/src/routes/AppRoutes.tsx` and `frontend/src/context/AuthProvider.tsx`

**Checkpoint**: Persistencia de sesión y navegación protegida completamente funcionales.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes de integración, proxy de desarrollo y validación integral de calidad.

- [ ] T024 [P] Configure development API proxy in `frontend/vite.config.ts` targeting `http://localhost:3000`
- [ ] T025 Execute all frontend test suites and verify 100% pass rate (`npm test` in `frontend/`)
- [ ] T026 Execute backend test suite to verify test immutability and zero regressions (`npm test` in `backend/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas - inicializa el workspace de frontend.
- **Foundational (Phase 2)**: Depende de Setup - **BLOQUEA** todas las historias de usuario.
- **User Stories (Phases 3 to 6)**: Dependen de Foundational (Phase 2).
  - Pueden implementarse secuencialmente por prioridad (US1 → US2 → US3 → US4) o en paralelo.
- **Polish (Phase 7)**: Depende de la finalización de las historias de usuario.

### User Story Dependencies

- **US1 (P1 - MVP)**: Inicia tras Phase 2. No depende de otras historias.
- **US2 (P2 - Errores & 401)**: Inicia tras Phase 2 / US1. Extiende el manejo de errores del cliente y vista.
- **US3 (P3 - Validación Local)**: Inicia tras Phase 2. Añade validaciones cliente en `validaciones.ts` e integra en `LoginView.tsx`.
- **US4 (P4 - Persistencia & Guards)**: Inicia tras Phase 2 / US1. Añade guards de ruta e hidratación de sesión.

---

## Parallel Opportunities

- **Fase 1**: T002 y T003 pueden ejecutarse en paralelo una vez generado T001.
- **Fase 2**: T004 (tipos), T005 (storage service), T006 (tests de storage) y T007 (estilos/tokens CSS) pueden desarrollarse en paralelo.
- **Fase 3 (US1)**: T009 (tests de login), T010 (AuthContext) y T011 (login.css) pueden trabajarse en paralelo.
- **Fase 5 (US3)**: T018 (tests de validación) y T019 (utils de validación) pueden trabajarse en paralelo.
- **Fase 6 (US4)**: T021 (tests de guards) y T022 (guards de ruta) pueden trabajarse en paralelo.

---

## Parallel Example: User Story 1 (MVP)

```bash
# Lanzar diseño visual y lógica de contexto en paralelo:
Task: "Implement visual styling for the login view in frontend/src/styles/login.css"
Task: "Implement AuthContext and AuthProvider in frontend/src/context/AuthContext.tsx and frontend/src/context/AuthProvider.tsx"
Task: "Create integration tests for successful login flow in frontend/tests/integration/LoginView.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar **Phase 1 (Setup)** y **Phase 2 (Foundational)**.
2. Implementar **Phase 3 (User Story 1)**.
3. **Validación Independiente**: Probar inicio de sesión con credenciales válidas contra backend y navegación al dashboard provisorio de bienvenida.
4. Demostrar/Verificar MVP funcional.

### Entrega Incremental

1. **Incremento 1**: Setup + Foundational + US1 → Login funcional básico y bienvenida (MVP).
2. **Incremento 2**: US2 → Manejo robusto de errores 401 y conectividad.
3. **Incremento 3**: US3 → Validación reactiva en cliente y prevención de envíos duplicados.
4. **Incremento 4**: US4 → Persistencia en recarga (`F5`) y guards de rutas privadas/públicas.
5. **Incremento 5**: Polish y verificación de inmutabilidad de la suite backend.
