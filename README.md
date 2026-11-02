# Football Player Token Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Backend](https://img.shields.io/badge/backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](backend/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=111111)](frontend/)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](docker-compose.yml)
[![Coverage](https://img.shields.io/badge/coverage->95%25%20lines%20|%2080%25%20branches-brightgreen)](#pruebas-y-cobertura)

Plataforma integral para consultar, cotizar y operar con tokens respaldados por el rendimiento deportivo de futbolistas pertenecientes a las cinco grandes ligas europeas: **Premier League**, **Bundesliga**, **La Liga**, **Serie A** y **Ligue 1**.

El sistema integra recolección de estadísticas (WhoScored), gobernanza de estrategias matemáticas de valuación (GLOBAL y POSICIONAL), un Order Management System (OMS) primario y secundario con custodia y prevención de wash trading, y un portfolio valorizado en tiempo real con auditoría inmutable de transacciones.

> **Estado actual:** La plataforma cuenta con backend completo y validado en todas sus capas (Auth, Catálogo, Scraping, Cotizaciones/Marketplace, OMS y Portfolio/Auditoría) con cobertura global $\ge 80\%$ en Jest (backend) y Vitest (frontend). El frontend incluye login, catálogo responsivo con scroll infinito y filtros jerárquicos.

---

## Arquitectura

El proyecto está organizado como un monorepo liviano con dos aplicaciones independientes y servicios complementarios:

- `backend/`: API REST en NestJS 11, TypeScript, TypeORM y PostgreSQL 16.
  - **Módulo Auth:** Autenticación stateless mediante JWT en cabecera `Authorization: Bearer`, contraseñas hash con bcrypt y control de acceso basado en roles (`ADMIN` y `USUARIO`).
  - **Módulo Catálogo:** 2,600+ futbolistas de las cinco grandes ligas europeas, filtros jerárquicos, búsqueda textual y paginación con cursor/offset.
  - **Módulo Scraping:** Ingesta de métricas deportivas desde WhoScored y sincronización con football-data.org.
  - **Módulo Cotizaciones (Marketplace):** Motor de cálculo con estrategias versionadas e inmutables (`GLOBAL` y `POSICIONAL`), snapshots de métricas históricas, ranking por cotización vigente, gobernanza administrativa y recálculo programado/manual.
  - **Módulo OMS (Order Management System):**
    - *Mercado Primario:* Adquisición de tokens emitidos por la cuenta matriz del superusuario `ADMIN` a precio oficial vigente.
    - *Mercado Secundario:* Publicación de órdenes de venta con retención de tokens en custodia (`cantidadBloqueada`), libro de órdenes activas, compras directas entre usuarios y prevención estricta de autocompra (wash trading).
  - **Módulo Portfolio y Auditoría:** Valuación en tiempo real del patrimonio neto (saldo billetera + valor de mercado de tokens), precio promedio ponderado de compra (PPP), cálculo de ganancia/pérdida no realizada (PnL), historial de transacciones con filtros y pista de auditoría global reservada para `ADMIN`.
  - **Infraestructura y Rendimiento:** Caché en memoria L1 con TTL y revalidación granular por eventos, bootstrap automático de superusuario `ADMIN`, y emisor de tokens faltantes al arranque.
- `frontend/`: SPA en React 18 + TypeScript + Vite. Catálogo con scroll infinito, filtros por liga, equipo y posición, y login con feedback reactivo.
- `docker-compose.yml`: Servicio de base de datos PostgreSQL 16 configurado en el puerto `5433`.
- `postman/`: Suite de pruebas automatizadas y entorno local para Postman (`collection.json` y `football_tokens.postman_environment.json`).
- `specs/`: Especificaciones formales, contratos OpenAPI, modelos de datos y guías de pruebas por feature.

---

## Requisitos previos

- **Node.js** 20+ LTS y npm.
- **Docker Engine** o Docker Desktop con Docker Compose activo.
- **Git**.

---

## Instalación y configuración

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/salvanescki/dapps2026GrupoQ
   cd dapps2026GrupoQ
   ```

2. Configurar variables de entorno del backend:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Verificar que `backend/.env` incluya las credenciales del superusuario ADMIN:
   ```dotenv
   PORT=3000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5433
   DB_USER=postgres
   DB_PASSWORD=postgrespassword
   DB_NAME=football_tokens_db
   DB_LOGGING=false
   JWT_SECRET=super_secreto_para_desarrollo_tokens_2026_grupo_q
   JWT_EXPIRATION=24h
   ADMIN_CORREO=admin@marketplace.com
   ADMIN_CONTRASENA=Admin1234!
   ADMIN_NOMBRE="Administrador Marketplace"
   ```

---

## Base de datos con Docker

Para iniciar el contenedor de PostgreSQL 16:

```bash
docker compose up -d postgres
docker compose ps
```

Credenciales locales publicadas en el puerto `5433` del host:
```text
Usuario: postgres
Password: postgrespassword
Base de datos: football_tokens_db
Puerto: 5433
```

Para detener el servicio:
```bash
docker compose down
```

Para reiniciar desde cero eliminando los datos persistidos en el volumen Docker:
```bash
docker compose down -v
```

---

## Backend

En una terminal dedicada:

```bash
cd backend
npm install
npm run start:dev
```

> **Aprovisionamiento Automático:** Al iniciar, `AdminBootstrapService` detecta si el superusuario `ADMIN` existe; de no ser así, lo crea con saldo inicial y emite automáticamente la tenencia inicial de tokens de todos los futbolistas activos hacia su cuenta.

### Documentación de la API (Swagger)

Con el backend iniciado, la interfaz interactiva de Swagger OpenAPI está disponible en:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

### Endpoints Disponibles

#### 1. Autenticación — `/auth`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Registra un nuevo usuario inversor con saldo de bienvenida ($1,000.00) | Público |
| `POST` | `/auth/login` | Inicia sesión y devuelve token JWT con datos de perfil y rol | Público |
| `GET` | `/auth/me` | Retorna el perfil y saldo del usuario autenticado | JWT |
| `POST` | `/auth/logout` | Invalida/cierra la sesión del cliente | JWT |

#### 2. Catálogo y Ranking de Jugadores — `/players`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `GET` | `/players` | Catálogo paginado con filtros (`league`, `teamId`, `position`, `search`, `page`, `limit`) | Público |
| `GET` | `/players/filters` | Opciones disponibles para desplegables (ligas, equipos, posiciones) | Público |
| `GET` | `/players/ranking` | Ranking de futbolistas ordenados por su cotización oficial vigente | Público |
| `GET` | `/players/:id` | Ficha técnica y detalle individual de un futbolista por UUID | Público |
| `GET` | `/players/:id/quotes` | Historial cronológico inmutable de cotizaciones del futbolista | Público |
| `POST` | `/players/sync` | Sincronización manual de plantillas desde football-data.org | JWT (ADMIN) |

#### 3. Cotizaciones y Gobernanza — `/quotes`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `GET` | `/quotes/strategy` | Consulta la estrategia de valuación activa y el catálogo de estrategias | Público |
| `PUT` | `/quotes/strategy` | Conmuta la estrategia activa (`GLOBAL` o `POSICIONAL`) invalidando caché L1 | JWT (ADMIN) |
| `POST` | `/quotes/recalculate` | Dispara el recálculo masivo e inmutable de cotizaciones para todos los futbolistas | JWT (ADMIN) |

#### 4. Order Management System (OMS) — `/orders`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `POST` | `/orders/buy` | Ejecuta compra de tokens: primario (al ADMIN) o secundario (si envía `ordenVentaId`) | JWT |
| `POST` | `/orders/sell` | Publica oferta de venta en mercado secundario con retención de tokens en custodia | JWT |
| `GET` | `/orders` | Consulta el libro de ofertas de venta activas (`PENDIENTE`/`PARCIAL`) con filtros | Público |
| `GET` | `/orders/:id` | Obtiene el estado y detalle de una orden de venta por UUID | Público |
| `DELETE` | `/orders/:id` | Cancela una orden de venta activa y restituye los tokens en custodia a disponibles | JWT (Titular) |

#### 5. Portfolio y Transacciones de Usuario — `/users`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `GET` | `/users/:id/portfolio` | Valuación integral: saldo billetera, tenencias, precio promedio, valor actual y PnL | JWT (Titular o ADMIN) |
| `GET` | `/users/:id/transactions` | Historial de transacciones de compra/venta con trazabilidad de estrategia | JWT (Titular o ADMIN) |

#### 6. Auditoría y Trazabilidad — `/admin`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `GET` | `/admin/transactions` | Pista de auditoría global de todas las operaciones del marketplace con snapshot | JWT (ADMIN) |

#### 7. Estadísticas WhoScored — `/scraping`
| Método | Ruta | Descripción | Rol Requerido |
| --- | --- | --- | --- |
| `GET` | `/scraping/jugadores/:id/estadisticas` | Consulta estadísticas deportivas WhoScored de un jugador | Público |
| `POST` | `/scraping/ejecutar` | Dispara ejecución manual del scraper WhoScored | JWT (ADMIN) |
| `GET` | `/scraping/ejecuciones` | Historial y métricas de ejecuciones del pipeline de scraping | JWT (ADMIN) |

---

## Pruebas con Postman

En la carpeta [`postman/`](postman/) se encuentra la suite completa para pruebas funcionales y de integración:

- **Colección:** `postman/collection.json`
- **Entorno Local:** `postman/football_tokens.postman_environment.json`
- **Guía de uso detallada:** [`postman/README.md`](postman/README.md)

### Cuentas preconfiguradas para pruebas manuales

| Rol | Correo | Contraseña | Saldo Inicial | Descripción |
| --- | --- | --- | --- | --- |
| **ADMIN** | `admin@marketplace.com` | `Admin1234!` | $100,000.00 | Superusuario emisor inicial de tokens y gobernanza |
| **Trader 1** | `trader1@marketplace.com` | `Trader1234!` | $1,000.00 | Usuario comprador primario y vendedor secundario |
| **Trader 2** | `trader2@marketplace.com` | `Trader1234!` | $1,000.00 | Usuario comprador en mercado secundario |

---

## Frontend

En una terminal independiente con el backend en ejecución:

```bash
cd frontend
npm install
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173). Vite reenvía automáticamente las llamadas a `/api/*` hacia `http://localhost:3000`, facilitando el desarrollo local sin CORS.

---

## Pruebas y cobertura por perfiles

El proyecto implementa una arquitectura de testing estandarizada y segregada en tres perfiles independientes:

| Perfil | Alcance Backend | Alcance Frontend | Requiere Docker | Directorio Cobertura |
| --- | --- | --- | --- | --- |
| **Unitario** (`unit`) | Lógica pura de dominio y value objects (`src/domain/**/*.ts`) | Funciones puras y adaptadores (`src/utils/`, `storage.service.ts`) | **No** (offline) | `./coverage/unit` |
| **Integración** (`integration`) | Servicios, mappers y repositorios TypeORM (`src/services/`, `src/data-access/`) | Vistas y componentes con estado montados (`tests/integration/`) | **Sí** (Testcontainers) | `./coverage/integration` |
| **End-to-End** (`e2e`) | Flujos HTTP completos en NestJS (`test/e2e/**/*.spec.ts`) | Recorridos integrales de usuario (CUJ-01, CUJ-02, CUJ-03) | **Sí** (Testcontainers) | `./coverage/e2e` |

### Comandos de Testing

```bash
# Backend (Jest)
cd backend
npm run test:unit            # Pruebas unitarias (< 10s, sin Docker)
npm run test:integration     # Pruebas de integración con PostgreSQL efímero en Testcontainers
npm run test:e2e             # Pruebas E2E de flujos HTTP completos
npm run test:cov             # Suite completa con reporte de cobertura global

# Frontend (Vitest)
cd frontend
npm run test:unit            # Pruebas unitarias de componentes y utilidades
npm run test:coverage        # Suite completa con reporte de cobertura global
```

### Métricas de Cobertura Alcanzadas

- **Backend (Jest):**
  - **Líneas (Lines):** **95.55%** (Objetivo $\ge 80\%$)
  - **Ramas (Branches):** **80.00%** (Objetivo $\ge 80\%$)
  - **Funciones (Functions):** **100.00%** (Objetivo $\ge 80\%$)
  - **Sentencias (Statements):** **95.41%** (Objetivo $\ge 80\%$)
  - **Test Suites:** 69 exitosas (389 tests aprobados, 0 fallos).
- **Frontend (Vitest):**
  - Cobertura $\ge 80\%$ en líneas, ramas, funciones y sentencias.

---

## Estado de Capacidades del Dominio

- ~~Autenticación JWT, hash seguro de credenciales y roles (ADMIN/USUARIO)~~ ✅ Implementado
- ~~Catálogo de jugadores de las cinco ligas europeas con sincronización, paginación y filtros jerárquicos~~ ✅ Implementado
- ~~Scraping automatizado de métricas deportivas desde WhoScored~~ ✅ Implementado
- ~~Estrategias matemáticas configurables de valuación (`GLOBAL` y `POSICIONAL`) con pesos ponderados y versión registrada~~ ✅ Implementado
- ~~Cotización oficial vigente e historial inmutable con snapshots de métricas y recálculo programado/manual~~ ✅ Implementado
- ~~Order Management System (OMS) primario con superusuario ADMIN como tenedor y emisor inicial~~ ✅ Implementado
- ~~Order Management System (OMS) secundario con retención en custodia (`cantidadBloqueada`) y prevención de wash trading~~ ✅ Implementado
- ~~Portfolio valorizado en tiempo real, cálculo de Precio Promedio Ponderado (PPP), PnL no realizado e historial de transacciones~~ ✅ Implementado
- ~~Pista de auditoría global para administradores con trazabilidad inmutable de estrategia de cotización aplicada~~ ✅ Implementado
- ~~Caché L1 en memoria de alta velocidad con TTL y revalidación por eventos transaccionales~~ ✅ Implementado
