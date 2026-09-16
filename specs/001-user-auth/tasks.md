# Tasks: Registro e Inicio de Sesión de Usuarios

**Feature**: `001-user-auth` | **Branch**: `feature/login` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto desde cero, configuración de Docker Compose para PostgreSQL y estructura base del backend NestJS.

- [ ] T001 Crear archivo `docker-compose.yml` en la raíz del repositorio exponiendo únicamente el servicio `postgres` (imagen postgres:16-alpine, puerto 5432, volumen persistente `postgres_data` y credenciales de desarrollo).
- [ ] T002 Inicializar proyecto NestJS con TypeScript en `backend/package.json` y `backend/tsconfig.json` incluyendo dependencias nucleares (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `testcontainers`, `@testcontainers/postgresql`, `jest`, `ts-jest`, `@types/bcrypt`, `@types/passport-jwt`, `@types/jest`).
- [ ] T003 [P] Configurar scripts de ejecución (`start:dev`), compilación (`build`), tests unitarios (`test:unit`) y tests de integración (`test:integration`) en `backend/package.json` y configuración de Jest en `backend/jest.config.js`.
- [ ] T004 [P] Crear plantilla de variables de entorno en `backend/.env.example` y módulo de configuración tipado en `backend/src/config/database.config.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida y transversal que bloquea la implementación de las historias de usuario.

**⚠️ CRITICAL**: No puede iniciarse el trabajo en historias de usuario hasta completar esta fase.

- [ ] T005 Configurar conexión a PostgreSQL mediante TypeORM y carga de variables de entorno en `backend/src/app.module.ts`.
- [ ] T006 [P] Implementar filtro global de excepciones para mapeo estandarizado de errores HTTP y mensajes en español en `backend/src/common/filters/http-exception.filter.ts`.
- [ ] T007 [P] Configurar OpenAPI (Swagger) y validación global (`ValidationPipe` con whitelist) en `backend/src/main.ts`.
- [ ] T008 [P] Configurar helper para instanciar contenedores PostgreSQL dinámicos y efímeros mediante Testcontainers en `backend/test/integration/setup-testcontainers.ts`.

**Checkpoint**: Base lista — las historias de usuario pueden comenzar a implementarse.

---

## Phase 3: User Story 1 - Registro de Nueva Cuenta (Priority: P1) 🎯 MVP

**Goal**: Permitir a un visitante registrarse en la plataforma ingresando nombre (longitud entre 2 y 100 caracteres), correo electrónico válido y único en el sistema, y contraseña segura (mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número), almacenando la credencial con hash bcrypt en PostgreSQL.

**Independent Test**: Completar registro enviando payload válido a `/api/auth/register` verificando respuesta HTTP 201 y persistencia de la cuenta activa; rechazar registros con datos inválidos (HTTP 400) o correo duplicado (HTTP 409).

### Tests for User Story 1

> **NOTE: Los tests representan contratos funcionales inmutables; se deben ejecutar y fallar antes de completar la implementación.**

- [ ] T009 [P] [US1] Crear tests unitarios en aislamiento total para la entidad de dominio `Usuario` (validación de invariantes de nombre, correo y complejidad de contraseña) en `backend/test/unit/domain/usuario.entity.spec.ts`.
- [ ] T010 [P] [US1] Crear test de integración con Testcontainers para persistencia, consulta y unicidad de correo en `backend/test/integration/usuario.typeorm-repository.spec.ts`.
- [ ] T011 [P] [US1] Crear test de integración con Testcontainers para el servicio de registro de usuarios (`AuthService.registrar`) en `backend/test/integration/auth-registro.service.spec.ts`.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implementar entidad de dominio `Usuario` aplicando Rich Domain Model con métodos `crear()`, `validarInvariantes()`, `validarFormatoContrasena()` (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número) y excepciones de negocio en `backend/src/domain/usuario.entity.ts` y `backend/src/domain/exceptions/regla-de-negocio.exception.ts`.
- [ ] T013 [P] [US1] Definir la interfaz de puerto de dominio `UsuarioRepository` con métodos `guardar`, `buscarPorId`, `buscarPorCorreo` y `existePorCorreo` en `backend/src/domain/usuario.repository.interface.ts`.
- [ ] T014 [US1] Implementar entidad de persistencia TypeORM `UsuarioOrmEntity` (tabla `usuarios`) y mapper bidireccional de dominio en `backend/src/data-access/usuario.orm-entity.ts` y `backend/src/data-access/usuario.mapper.ts`.
- [ ] T015 [US1] Implementar el repositorio de persistencia `UsuarioTypeOrmRepository` implementando la interfaz `UsuarioRepository` en `backend/src/data-access/usuario.typeorm-repository.ts`.
- [ ] T016 [P] [US1] Crear DTO de entrada `RegistroUsuarioDto` con validaciones de `class-validator` y DTO de salida `RespuestaAutenticacionDto` en `backend/src/controllers/dto/registro-usuario.dto.ts`.
- [ ] T017 [US1] Implementar método de orquestación de registro en `AuthService` (hashing de contraseña con bcrypt a 10 rondas y delegación al repositorio) en `backend/src/services/auth.service.ts`.
- [ ] T018 [US1] Exponer endpoint `POST /api/auth/register` en `AuthController` actuando estrictamente como pasamanos HTTP sin lógica de negocio en `backend/src/controllers/auth.controller.ts`.

**Checkpoint**: User Story 1 completamente funcional y verificable de manera independiente (MVP alcanzado).

---

## Phase 4: User Story 2 - Inicio de Sesión de Usuario (Login con JWT) (Priority: P1)

**Goal**: Permitir a un usuario registrado autenticarse mediante correo y contraseña para obtener un token JWT stateless, denegando el acceso con HTTP 401 si las credenciales son erróneas.

**Independent Test**: Enviar credenciales válidas a `/api/auth/login` y verificar emisión de JWT en formato Bearer (HTTP 200); enviar credenciales erróneas y verificar denegación genérica (HTTP 401).

### Tests for User Story 2

- [ ] T019 [P] [US2] Crear tests unitarios para el método `verificarContrasena()` de la entidad `Usuario` en `backend/test/unit/domain/usuario-login.spec.ts`.
- [ ] T020 [P] [US2] Crear test de integración con Testcontainers para el servicio de autenticación y emisión de JWT (`AuthService.login`) en `backend/test/integration/auth-login.service.spec.ts`.

### Implementation for User Story 2

- [ ] T021 [P] [US2] Crear DTO de login `LoginUsuarioDto` con validación de correo y contraseña en `backend/src/controllers/dto/login-usuario.dto.ts`.
- [ ] T022 [US2] Configurar módulo de autenticación y proveedor JWT (`JwtModule` con secret y opciones de expiración) en `backend/src/auth/auth.module.ts`.
- [ ] T023 [US2] Implementar método `login` en `AuthService` para verificar credenciales contra la entidad de dominio `Usuario` y firmar token JWT con claims `sub` y `email` en `backend/src/services/auth.service.ts`.
- [ ] T024 [US2] Exponer endpoint `POST /api/auth/login` en `AuthController` en `backend/src/controllers/auth.controller.ts`.

**Checkpoint**: User Stories 1 y 2 operativas e integradas de forma independiente.

---

## Phase 5: User Story 3 - Cierre de Sesión y Acceso Protegido (Priority: P2)

**Goal**: Proteger rutas privadas de la API mediante estrategia Passport-JWT, proveer endpoint para consultar el perfil del usuario autenticado (`/api/auth/me`) y endpoint de logout (`/api/auth/logout`).

**Independent Test**: Enviar solicitud `GET /api/auth/me` con cabecera `Authorization: Bearer <token>` y verificar respuesta HTTP 200 con datos del perfil; enviar solicitud sin cabecera y verificar rechazo HTTP 401.

### Tests for User Story 3

- [ ] T025 [P] [US3] Crear test de integración con Testcontainers para validación de token JWT y protección del endpoint `/api/auth/me` en `backend/test/integration/auth-perfil.spec.ts`.

### Implementation for User Story 3

- [ ] T026 [P] [US3] Implementar estrategia Passport `JwtStrategy` y guard `JwtAuthGuard` en `backend/src/auth/jwt.strategy.ts` y `backend/src/auth/jwt-auth.guard.ts`.
- [ ] T027 [US3] Implementar y exponer endpoints `GET /api/auth/me` y `POST /api/auth/logout` con guard de autenticación en `AuthController` en `backend/src/controllers/auth.controller.ts`.

**Checkpoint**: Todas las historias de usuario implementadas y protegidas según los contratos OpenAPI.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación cruzada, cumplimiento del Definition of Done (DoD) y artefactos de entrega.

- [ ] T028 [P] Crear y validar la colección de Postman sincronizada con las variables de entorno en `postman/football_tokens_auth.postman_collection.json`.
- [ ] T029 Ejecutar y comprobar éxito de la suite completa de tests unitarios y de integración con Testcontainers (`npm run test:unit && npm run test:integration` en `backend/`).
- [ ] T030 Ejecutar validación end-to-end siguiendo los flujos de `specs/001-user-auth/quickstart.md` levantando PostgreSQL con Docker Compose y verificando compilación limpia en `backend/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas — se ejecuta inmediatamente.
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEA todas las historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Phase 2 — Habilita el registro de usuarios (MVP).
- **User Story 2 (Phase 4)**: Depende de Phase 2 y los modelos de persistencia de US1 — Habilita login y emisión de JWT.
- **User Story 3 (Phase 5)**: Depende de Phase 4 (JWT configurado) — Habilita guards y consulta de perfil.
- **Polish (Phase 6)**: Depende de la finalización de todas las historias de usuario.

### Parallel Opportunities

- En Phase 1: `T003` y `T004` pueden desarrollarse en paralelo tras `T001` y `T002`.
- En Phase 2: `T006`, `T007` y `T008` son paralelizables tras `T005`.
- En Phase 3: Los tests `T009`, `T010` y `T011` pueden escribirse en paralelo. La entidad `Usuario` (`T012`), interfaz `UsuarioRepository` (`T013`) y DTOs (`T016`) pueden desarrollarse en paralelo.
- En Phase 4: El DTO `T021` y los tests `T019`/`T020` pueden desarrollarse en paralelo.
- En Phase 5: `T025` y `T026` son paralelizables.
- En Phase 6: `T028` (Postman) puede construirse en paralelo a la ejecución de suites.

---

## Parallel Example: User Story 1

```bash
# Escribir tests primero en paralelo:
Task: T009 [P] [US1] "backend/test/unit/domain/usuario.entity.spec.ts"
Task: T010 [P] [US1] "backend/test/integration/usuario.typeorm-repository.spec.ts"

# Crear modelos de dominio y DTOs en paralelo:
Task: T012 [P] [US1] "backend/src/domain/usuario.entity.ts"
Task: T013 [P] [US1] "backend/src/domain/usuario.repository.interface.ts"
Task: T016 [P] [US1] "backend/src/controllers/dto/registro-usuario.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (`docker-compose.yml`, `package.json`, Jest).
2. Completar Phase 2: Foundational (TypeORM, Testcontainers, Swagger).
3. Completar Phase 3: User Story 1 (Entidad `Usuario`, Repository, Service y Controller de registro).
4. **STOP & VALIDATE**: Ejecutar `npm run test:unit` y `npm run test:integration` para validar registro y persistencia.

### Incremental Delivery

1. MVP (US1): Registro de cuentas activo y testeado con Testcontainers.
2. Incremento 1 (US2): Inicio de sesión y emisión de JWT activo.
3. Incremento 2 (US3): Protección de rutas, guards JWT, perfil de usuario y logout.
4. Finalización (DoD): Validación completa con Postman y compilación limpia.
