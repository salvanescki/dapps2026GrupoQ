# Implementation Plan: Registro e Inicio de Sesión de Usuarios

**Branch**: `001-user-auth` | **Date**: 2026-09-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-auth/spec.md`

## Summary

Implementar desde cero la estructura base del proyecto e incorporar la funcionalidad de registro e inicio de sesión de usuarios para la plataforma de tokens de futbolistas. La solución se construirá sobre NestJS con TypeScript, aplicando estrictamente la arquitectura en 5 capas y Rich Domain Model (DDD). La autenticación será completamente stateless mediante JSON Web Tokens (JWT) y hashing de contraseñas con bcrypt. El entorno local contará con un servicio de PostgreSQL en Docker Compose, mientras que las pruebas de integración se ejecutarán de forma aislada contra contenedores dinámicos provisionados mediante Testcontainers.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ LTS

**Primary Dependencies**: NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`), TypeORM (`@nestjs/typeorm`, `typeorm`, `pg`), `bcrypt`, `class-validator`, `class-transformer`, `@nestjs/swagger`

**Storage**: PostgreSQL 16 (relacional, transaccional A.C.I.D.) vía `docker-compose.yml` para desarrollo local; instancias dinámicas efímeras de PostgreSQL vía `@testcontainers/postgresql` para tests de integración.

**Testing**: Jest (test runner), Supertest, `@testcontainers/postgresql`

**Target Platform**: Node.js runtime en Linux/macOS/Windows, Docker Engine

**Project Type**: Web service / REST API (Backend NestJS en `backend/`) con arquitectura desacoplada para futuro frontend React.

**Performance Goals**: < 150ms de latencia percibida en endpoints de autenticación; costo computacional calibrado para hashing (bcrypt 10 rondas).

**Constraints**:
- Backend estrictamente Stateless (JWT en header `Authorization: Bearer`).
- Arquitectura en 5 capas: Controllers como pasamanos sin lógica; Services de orquestación sin reglas de negocio; Model con Rich Domain Model (invariantes y validaciones encapsuladas); Data Access desacoplado con patrón Repository.
- Los tests de integración **MUST** ejecutarse exclusivamente contra Testcontainers (nunca contra la base de datos local).
- Inmutabilidad de tests no negociable.
- Convención idiomática dual (Español para conceptos de dominio, identidades y respuestas; Inglés para términos técnicos y arquitectónicos).

**Scale/Scope**: Módulo fundacional de autenticación con 4 endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Cumplimiento en el Diseño |
|--------------------------|--------|---------------------------|
| **I. Arquitectura en 5 Capas y Backend Stateless** | PASS | Capas claramente delimitadas (`controllers/`, `services/`, `domain/`, `data-access/`). Sin estado de sesión en memoria del servidor; autenticación por JWT. |
| **II. Rich Domain Model y DDD** | PASS | Entidad `Usuario` valida sus propias invariantes, reglas de contraseña segura y verificación de credenciales; objetos anémicos expresamente excluidos. |
| **III. Estrategia de Testing y Testcontainers** | PASS | Tests unitarios puros para `domain/`; tests de integración para `services/` y `data-access/` levantando contenedores PostgreSQL reales mediante Testcontainers. |
| **IV. Inmutabilidad de Tests** | PASS | Cada test escrito se preserva como contrato funcional inmutable. |
| **V. Convenciones de Idioma** | PASS | Dominio y DTOs en español sin acentos/ñ (`usuario`, `correo`, `contrasenaHash`); componentes técnicos en inglés (`AuthController`, `JwtStrategy`, `Testcontainers`). |
| **Stack Tecnológico y DoD** | PASS | NestJS, TypeScript, PostgreSQL, Docker (solo servicio Postgres), Jest, OpenAPI (Swagger) y colección Postman integrada. |

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # Plan de implementación y arquitectura
├── research.md          # Investigación técnica de JWT, bcrypt, TypeORM y Testcontainers
├── data-model.md        # Modelo de dominio enriquecido y esquema de base de datos
├── quickstart.md        # Guía de inicialización y verificación paso a paso
├── contracts/           # Contrato OpenAPI 3.0 de endpoints de autenticación
│   └── auth-api.yaml
└── checklists/
    └── requirements.md  # Validación de completitud y calidad del requerimiento
```

### Source Code (repository root)

```text
docker-compose.yml              # Expone únicamente el servicio postgres
backend/
├── src/
│   ├── domain/                 # [Capa 4: Model] Rich Domain Model y puertos
│   │   ├── usuario.entity.ts
│   │   ├── usuario.repository.interface.ts
│   │   └── exceptions/
│   │       ├── regla-de-negocio.exception.ts
│   │       └── usuario-duplicado.exception.ts
│   ├── services/               # [Capa 3: Service] Orquestación de aplicación
│   │   ├── auth.service.ts
│   │   └── usuario.service.ts
│   ├── controllers/            # [Capa 2: Controller] Pasamanos REST y Swagger
│   │   ├── auth.controller.ts
│   │   └── dto/
│   │       ├── registro-usuario.dto.ts
│   │       ├── login-usuario.dto.ts
│   │       └── respuesta-autenticacion.dto.ts
│   ├── data-access/            # [Capa 5: Data Access] Persistencia TypeORM y Mappers
│   │   ├── usuario.orm-entity.ts
│   │   ├── usuario.typeorm-repository.ts
│   │   └── usuario.mapper.ts
│   ├── auth/                   # Infraestructura de seguridad JWT
│   │   ├── jwt.strategy.ts
│   │   └── jwt-auth.guard.ts
│   ├── config/                 # Configuración de TypeORM y variables de entorno
│   │   └── database.config.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/                   # Tests unitarios puros de dominio (sin DB)
│   │   └── usuario.entity.spec.ts
│   └── integration/            # Tests de integración contra Testcontainers
│       ├── setup-testcontainers.ts
│       ├── usuario.typeorm-repository.spec.ts
│       └── auth.service.spec.ts
├── package.json
└── tsconfig.json
postman/
└── football_tokens_auth.postman_collection.json
```

**Structure Decision**: Se establece una estructura mono-repo modular preparada para crecimiento, iniciando con el `backend/` NestJS y la configuración en la raíz de `docker-compose.yml` (expone exclusivamente `postgres`), preservando el aislamiento estricto de las 5 capas arquitectónicas exigidas por la Constitución.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *Ninguna* | No se registran violaciones a la Constitución | El diseño se alinea 100% con los principios de arquitectura, DDD, testing y convenciones. |
