# Football Player Token Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Backend](https://img.shields.io/badge/backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](backend/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=111111)](frontend/)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](docker-compose.yml)
[![Coverage](https://img.shields.io/badge/coverage-local%20Jest%20%2B%20Vitest-informational)](#pruebas-y-cobertura)

Plataforma web para consultar y operar con tokens asociados a jugadores de fútbol de las cinco grandes ligas europeas: Premier League, Bundesliga, La Liga, Serie A y Ligue 1.

El producto calcula una cotización periódica para cada jugador a partir de métricas de rendimiento y contexto. Los usuarios podrán comprar y vender tokens, consultar la evolución histórica de las cotizaciones y controlar el valor y la rentabilidad de su portfolio.

> **Estado actual:** el repositorio contiene la base de autenticación del backend y el primer flujo de login del frontend. El catálogo de jugadores, las cotizaciones, el mercado de tokens y el portfolio forman parte del alcance funcional definido para las siguientes iteraciones.

## Arquitectura

El proyecto está organizado como un monorepo liviano con dos aplicaciones independientes:

- `backend/`: API REST en NestJS, TypeScript, TypeORM y PostgreSQL. Incluye registro, login, JWT, perfil autenticado, logout, validación global y Swagger.
- `frontend/`: SPA en React + TypeScript + Vite. Incluye login, validaciones locales, persistencia de sesión, protección de rutas y pantalla inicial.
- `docker-compose.yml`: servicio local de PostgreSQL 16.
- `specs/`: especificaciones, planes, contratos OpenAPI, modelo de datos y guías de validación.
- `postman/`: colección de Postman para probar autenticación.

La API utiliza una separación por controllers, services, domain/data-access y módulos de infraestructura. La autenticación es stateless mediante JWT en la cabecera `Authorization: Bearer`.

## Requisitos previos

- Node.js 20+ LTS y npm.
- Docker Engine o Docker Desktop con Docker Compose.
- Git.
- Docker disponible para los tests de integración con Testcontainers.

## Instalación y configuración

Clonar el repositorio y preparar las variables del backend:

```bash
git clone https://github.com/salvanescki/dapps2026GrupoQ
cd dapps2026GrupoQ
cp backend/.env.example backend/.env
```

El archivo `backend/.env.example` contiene la configuración de desarrollo.

## Base de datos con Docker

Desde la raíz:

```bash
docker compose up -d postgres
docker compose ps
```

El contenedor publica PostgreSQL en el puerto `5433` del host y usa estas credenciales locales, definidas en `docker-compose.yml`:

```text
Usuario: postgres
Password: postgrespassword
Base de datos: football_tokens_db
```

Para detenerlo:

```bash
docker compose down
```

Para detenerlo y eliminar también los datos persistidos:

```bash
docker compose down -v
```

## Backend

En una terminal:

```bash
cd backend
npm install
npm run start:dev
```

Comandos disponibles:

| Comando | Descripción |
| --- | --- |
| `npm run start:dev` | Servidor NestJS con recarga automática |
| `npm run build` | Compilación de producción |
| `npm run start:prod` | Ejecuta `dist/main` |
| `npm run format` | Formatea fuentes y tests con Prettier |
| `npm test` | Ejecuta toda la suite Jest |
| `npm run test:unit` | Tests unitarios de dominio |
| `npm run test:integration` | Tests de integración con Testcontainers |
| `npm run test:cov` | Tests backend con reporte de cobertura |

### Endpoints de autenticación disponibles

Todos los endpoints están bajo el prefijo `/api/auth`:

- `POST /api/auth/register`: registra un usuario y devuelve un JWT.
- `POST /api/auth/login`: autentica un usuario y devuelve un JWT.
- `GET /api/auth/me`: obtiene el perfil del usuario autenticado.
- `POST /api/auth/logout`: cierra la sesión del cliente autenticado.

La documentación interactiva está disponible en [Swagger](http://localhost:3000/api/docs) con el backend iniciado.

Ejemplo de registro:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Inversor Demo","correo":"inversor@tokens.com","contrasena":"Clave1234"}'
```

## Frontend

Con el backend ejecutándose, abrir otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173). Vite reenvía las peticiones `/api` al backend en `http://localhost:3000`, por lo que no se necesita configurar una URL adicional para el desarrollo local.

Comandos disponibles:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor Vite en modo desarrollo |
| `npm run build` | Type-check y build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm test` | Ejecuta tests con Vitest |
| `npm run test:watch` | Ejecuta Vitest en modo watch |
| `npm run test:coverage` | Tests frontend con reporte de cobertura |

## Pruebas y cobertura

Ejecutar las validaciones del backend:

```bash
cd backend
npm run test:unit
npm run test:integration
npm run test:cov
```

Los tests de integración crean PostgreSQL efímeros con Testcontainers y requieren Docker disponible. No dependen de la base local del `docker-compose.yml`.

Ejecutar las validaciones del frontend:

```bash
cd frontend
npm test
npm run test:coverage
```

Los reportes de cobertura se generan localmente en las carpetas de salida de Jest y Vitest. El badge de cobertura de este README indica cómo obtener la métrica local; no representa un porcentaje publicado en un servicio externo.

## Flujo de desarrollo completo

```bash
# Terminal 1: persistencia
docker compose up -d postgres

# Terminal 2: backend
cd backend
npm install
npm run start:dev

# Terminal 3: frontend
cd frontend
npm install
npm run dev
```

Después, abrir `http://localhost:5173/login` y autenticar un usuario creado mediante Swagger, Postman o `POST /api/auth/register`.

## Documentación del proyecto

- [Spec de autenticación](specs/001-user-auth/spec.md)
- [Plan y arquitectura del backend](specs/001-user-auth/plan.md)
- [Quickstart de autenticación](specs/001-user-auth/quickstart.md)
- [Contrato OpenAPI de autenticación](specs/001-user-auth/contracts/auth-api.yaml)
- [Spec del login frontend](specs/002-frontend-login/spec.md)
- [Plan del frontend](specs/002-frontend-login/plan.md)
- [Quickstart del frontend](specs/002-frontend-login/quickstart.md)
- [Colección Postman](postman/football_tokens_auth.postman_collection.json)

## Próximas capacidades del dominio

La visión funcional completa contempla:

- Catálogo de jugadores de las cinco ligas, alimentado por fuentes externas como WhoScored y Football-Data.org.
- Dos o más estrategias configurables de valuación, con pesos por métrica y registro de la versión utilizada.
- Cotización actual e histórica y recálculo periódico.
- Compra y venta de tokens con un superusuario como tenedor inicial.
- Portfolio, precio promedio, valor actual, ganancia/pérdida e historial de transacciones.
- Logs estructurados, correlation IDs, health checks, métricas, auditoría inmutable, caché y scheduler.

Estas capacidades están descritas en el documento de visión funcional entregado para el proyecto y se incorporarán por iteraciones.
