# Research: Autenticación de Usuarios (Registro y Login con JWT)

## 1. Estrategia de Autenticación Stateless con JWT y NestJS

- **Decisión**: Implementar autenticación basada en JSON Web Tokens (JWT) mediante `@nestjs/jwt` y `@nestjs/passport` (Passport-JWT).
- **Rationale**: 
  - Cumple estrictamente con el Principio I de la Constitución ("Backend Stateless").
  - El servidor no almacena sesiones en memoria; el token JWT viaja en el header HTTP `Authorization: Bearer <token>` en cada solicitud autenticada.
  - El payload del JWT contendrá únicamente claims no sensibles: `sub` (ID de usuario) y `email`.
  - Duración del token configurada por variable de entorno (por defecto 1 hora o 24 horas para desarrollo).
- **Alternativas consideradas**:
  - *Sesiones con cookies de servidor y almacenamiento en Redis*: Descartado para la API principal de autenticación porque añade acoplamiento de estado en servidor para validar tokens simples en v1, mientras que JWT es el estándar de la industria para APIs REST móviles/SPA y satisface la directiva explícita del usuario.

## 2. Hashing de Contraseñas y Protección de Credenciales

- **Decisión**: Uso de `bcrypt` (o `argon2`) para el hashing unidireccional y salting de contraseñas con un factor de costo mínimo de 10 rondas.
- **Rationale**:
  - Garantiza el requerimiento `FR-004` (prohibición de contraseñas en texto plano).
  - La verificación de la contraseña (`compararContrasena`) se encapsula dentro del Value Object o entidad del Dominio (`Usuario` o `ContrasenaHash`), garantizando el Rich Domain Model (Principio II).
- **Alternativas consideradas**:
  - *PBKDF2*: Adecuado pero más verboso y menos común en el ecosistema NestJS/Node.js que bcrypt.

## 3. Acceso a Datos y Separación en 5 Capas (DDD)

- **Decisión**: Uso de TypeORM con PostgreSQL, implementando explícitamente el patrón Repository desacoplado.
- **Rationale**:
  - Las entidades de persistencia (`UsuarioOrmEntity`) mapean directamente a las tablas de PostgreSQL.
  - La entidad de dominio (`Usuario`) es pura, no extiende de BaseEntity de TypeORM y no tiene decoradores `@Column` o `@Entity` que contaminen el núcleo del dominio.
  - `UsuarioTypeOrmRepository` implementa la interfaz de dominio `UsuarioRepository` y traduce entre `UsuarioOrmEntity` y `Usuario` (Domain Aggregate).
  - Cumple plenamente con los Principios I y II de la Constitución: separación estricta de responsabilidades, Model agnóstico a la base de datos y Data Access como adaptador.
- **Alternativas consideradas**:
  - *Prisma*: Genera tipos propios, pero acopla el modelo a su cliente generado dificultando el Rich Domain Model puro.
  - *TypeORM con Active Record*: Rechazado tajantemente porque mezclar persistencia y lógica en la misma clase viola el Principio I y genera modelos anémicos o acoplados a la DB.

## 4. Estrategia de Pruebas: Tests Unitarios y Tests de Integración con Testcontainers

- **Decisión**:
  - **Tests Unitarios**: Jest ejecutando pruebas sobre las entidades de dominio (`Usuario`, reglas de validación de contraseña y email) sin mocks de base de datos ni dependencias externas.
  - **Tests de Integración**: Jest ejecutando pruebas sobre `UsuarioService` y `UsuarioTypeOrmRepository` contra un contenedor PostgreSQL efímero y real instanciado mediante `@testcontainers/postgresql`.
- **Rationale**:
  - Cumple con el Principio III ("Estrategia de Testing Rigurosa y Testcontainers").
  - Respeta la instrucción explícita del usuario: *"Los test siempre van contra testcontainers, no contra la DB local"*. Los tests de integración crean y destruyen su propio contenedor PostgreSQL sin depender del estado de la base de datos de desarrollo.
- **Alternativas consideradas**:
  - *Bases de datos en memoria (SQLite / H2)*: Prohibido por la constitución; no reproducen la semántica, extensiones ni comportamiento transaccional de PostgreSQL.
  - *Testear contra PostgreSQL local del docker-compose*: Prohibido por la instrucción del usuario; genera colisiones de datos y falta de idempotencia.

## 5. Entorno Docker Compose

- **Decisión**: `docker-compose.yml` en la raíz del repositorio configurado con un único servicio principal: `postgres`.
- **Rationale**:
  - Satisface la instrucción del usuario: *"El Docker-compose debe exponer un servicio para postgres (para la BD y testcontainers). No es necesario levantar el Frontend, ni Nest en el Docker-compose, simplemente Postgres"*.
  - Expone el puerto `5432` con volumen persistente para desarrollo local de la API NestJS.
- **Alternativas consideradas**:
  - *Incluir NestJS y frontend en docker-compose*: Rechazado por instrucción expresa del usuario.

## 6. Convenciones de Nomenclatura y Lenguaje

- **Decisión**:
  - Nombres de dominio e identificadores en español sin acentos ni ñ: `Usuario`, `UsuarioRepository`, `contrasenaHash`, `correo`, `nombre`, `activo`, `creadoEn`.
  - Componentes arquitectónicos y términos técnicos en inglés: `AuthController`, `AuthService`, `JwtStrategy`, `UsuarioTypeOrmRepository`, `Testcontainers`.
  - Documentación, mensajes de error y respuestas de la API en español.
- **Rationale**:
  - Cumplimiento estricto del Principio V de la Constitución.
