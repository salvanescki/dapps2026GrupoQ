# Guía de Inicio Rápido y Validación (Quickstart): 001-user-auth

Esta guía detalla los pasos para levantar el entorno de desarrollo, ejecutar las suites de pruebas unitarias y de integración (con Testcontainers), y validar los flujos de autenticación de forma end-to-end.

## 1. Prerrequisitos

- **Node.js**: Versión 20+ LTS y `npm` instalados.
- **Docker Desktop**: En ejecución (requerido tanto para el servicio local de PostgreSQL en `docker compose` como para que `@testcontainers/postgresql` pueda instanciar contenedores efímeros durante los tests de integración).

## 2. Configuración Inicial del Entorno

### 2.1. Levantar el Servicio PostgreSQL Local
En la raíz del proyecto, iniciar el contenedor de base de datos PostgreSQL expuesto por docker-compose:

```bash
docker compose up -d postgres
```

### 2.2. Variables de Entorno del Backend
Crear el archivo `backend/.env` con la siguiente configuración base:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=football_tokens_db
JWT_SECRET=super_secreto_para_desarrollo_tokens_2026
JWT_EXPIRATION=24h
```

### 2.3. Instalación de Dependencias
```bash
cd backend
npm install
```

---

## 3. Ejecución de Pruebas

Siguiendo el **Principio III de la Constitución**:

### 3.1. Pruebas Unitarias (Capa Model / Dominio)
Valida invariantes de entidad `Usuario` y reglas de contraseña en total aislamiento sin dependencias externas:

```bash
npm run test:unit
```

### 3.2. Pruebas de Integración (Capa Service y Repository con Testcontainers)
Valida `UsuarioTypeOrmRepository` y `AuthService` contra una base de datos PostgreSQL real levantada dinámicamente mediante Testcontainers (independiente de la base de datos local):

```bash
npm run test:integration
```

---

## 4. Ejecución del Servidor y Validación Manual de Endpoints

### 4.1. Iniciar la Aplicación Backend
```bash
npm run start:dev
```
La aplicación iniciará en `http://localhost:3000`. La documentación Swagger interactiva estará disponible en `http://localhost:3000/api/docs`.

### 4.2. Flujo 1: Registro de un Nuevo Usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Lionel Scaloni",
    "correo": "scaloni@afa.com",
    "contrasena": "Campeon2022"
  }'
```

**Resultado esperado (HTTP 201 Created):**
```json
{
  "tokenDeAcceso": "eyJhbGciOiJIUzI1NiIsIn...",
  "tipo": "Bearer",
  "usuario": {
    "id": "...",
    "nombre": "Lionel Scaloni",
    "correo": "scaloni@afa.com",
    "activo": true,
    "creadoEn": "..."
  }
}
```

### 4.3. Flujo 2: Inicio de Sesión (Login)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "scaloni@afa.com",
    "contrasena": "Campeon2022"
  }'
```

**Resultado esperado (HTTP 200 OK):**
Devuelve el token JWT válido para consumir endpoints protegidos.

### 4.4. Flujo 3: Acceso a Recurso Protegido (Perfil Actual)

Reemplazando `<TOKEN_OBTENIDO>` por el token recibido en el login:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN_OBTENIDO>"
```

**Resultado esperado (HTTP 200 OK):**
```json
{
  "id": "...",
  "nombre": "Lionel Scaloni",
  "correo": "scaloni@afa.com",
  "activo": true,
  "creadoEn": "..."
}
```

### 4.5. Flujo 4: Validación de Casos Borde y Error

- **Contraseña incorrecta (HTTP 401 Unauthorized):**
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"correo": "scaloni@afa.com", "contrasena": "ClaveIncorrecta1"}'
  ```
- **Correo duplicado en registro (HTTP 409 Conflict):**
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"nombre": "Otro", "correo": "scaloni@afa.com", "contrasena": "Valida1234"}'
  ```
- **Acceso sin autenticación (HTTP 401 Unauthorized):**
  ```bash
  curl -X GET http://localhost:3000/api/auth/me
  ```
