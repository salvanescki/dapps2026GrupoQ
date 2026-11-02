# Contract: Sincronización y Verificación Tripartita Postman ↔ Swagger ↔ Contratos REST

**Feature**: `013-marketplace-frontend` | **Phase**: 1 — Design & Contracts | **Date**: 2026-11-02
**Requisitos cubiertos**: `FR-033`, `FR-034`, `FR-035`, `SC-008`, `US1 Escenario 6`, Constitución `v1.3.0` (*Stack Tecnológico — Herramientas de Consumo* y *DoD #3*).

---

## 1. Principio Rector: Cero Modificación Innecesaria de Endpoints

La funcionalidad `013-marketplace-frontend` consume la API REST existente bajo una separación taxativa en dos grupos para **prohibir cualquier alteración superflua de endpoints en `backend/`**:

1. **Grupo A — Extensión Aditiva Exclusiva de DTO sobre 3 Endpoints Preexistentes (`Auth`)**:
   - **Endpoints alcanzados**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
   - **Único cambio permitido en `backend/`**: añadir `@ApiProperty({ enum: ['USUARIO', 'ADMIN'] }) rol: RolUsuario` y `@ApiProperty() saldo: number` en `PerfilUsuarioDto` (`backend/src/controllers/dto/respuesta-autenticacion.dto.ts`) y proyectarlos en `AuthService.mapearPerfil` (`backend/src/services/auth.service.ts`).
   - **Invariantes protegidos**: `AuthController` **NO se edita**; no se crean endpoints nuevos; no cambian rutas, verbos HTTP, códigos de estado (`201`, `200`, `400`, `401`, `409`), payloads de entrada (`RegistroUsuarioDto`, `LoginUsuarioDto`), guards ni `JwtStrategy`.
2. **Grupo B — Consumo Estrictamente Inmutable de 17 Endpoints Preexistentes (0 Cambios de API)**:
   - **12 endpoints de Marketplace, Cotización, OMS, Portfolio y Auditoría (`012-token-marketplace-oms`)**:
     `GET /players/ranking`, `GET /players/:id/quotes`, `GET /quotes/strategy`, `PUT /quotes/strategy`, `POST /quotes/recalculate`, `GET /orders`, `POST /orders/buy`, `POST /orders/sell`, `DELETE /orders/:id`, `GET /users/:id/portfolio`, `GET /users/:id/transactions`, `GET /admin/transactions`.
   - **5 endpoints complementarios de Catálogo, Estadísticas y Sesión (`001`, `003`, `010`, `011`)**:
     `POST /auth/logout`, `GET /players`, `GET /players/filters`, `GET /players/:id`, `GET /scraping/jugadores/:id/estadisticas`.
   - **Prohibición expresa**: Queda terminantemente prohibido modificar controladores, rutas, códigos HTTP, decoradores, servicios o DTOs de cualquiera de los 17 endpoints del Grupo B.

---

## 2. Fuentes de Verdad y Regla de Precedencia Contractual

La verificación contrasta tres artefactos canónicos:

| Fuente | Ubicación / Generación | Rol en la Verificación |
|--------|------------------------|------------------------|
| **1. Swagger (OpenAPI vivo)** | `SwaggerModule.createDocument(app, swaggerConfig)` en memoria y `GET /api/docs-json` | Fuente canónica de las rutas reales, decoradores `@ApiResponse`, parámetros y esquemas DTO expuestos por el servidor NestJS. |
| **2. Contratos REST Versionados** | `specs/013-marketplace-frontend/contracts/openapi-auth-perfil-v1.1.yaml` (Grupo A) + `specs/013-marketplace-frontend/contracts/rest-api-consumption.contract.md` y referencia auditada a `specs/012-token-marketplace-oms/contracts/openapi-marketplace-oms.yaml` (Grupo B) | Especificación versionada en repositorio contra la cual se valida el diseño y el consumo de cliente. |
| **3. Colección Postman** | `postman/collection.json`, `postman/football_tokens.postman_environment.json` y `postman/README.md` | Herramienta ejecutable de consumo manual/automatizado con payloads, respuestas esperadas, errores y scripts `pm.test`. |

### Regla de Precedencia ante Diferencias Documentales Históricas (Sin Tocar Endpoints)

Cuando un contrato YAML histórico de una feature cerrada presenta una diferencia documental menor respecto al controlador real ya estabilizado en `backend/` y validado por `backend/test/**` (Principio IV), **prevalece el contrato real expuesto por el controlador/Swagger vigente y NUNCA se modifica el endpoint en backend**:

- `POST /orders/buy`: `OrdersController` declara `@HttpCode(HttpStatus.OK)` y `@ApiResponse({ status: 200, type: ResultadoCompraDto })` (al igual que `postman/collection.json`). El valor `'201'` presente en el borrador histórico `specs/012-token-marketplace-oms/contracts/openapi-marketplace-oms.yaml` se registra como nota de reconciliación documental; el endpoint permanece intacto en **`200 OK`**.
- `GET /users/:id/transactions` y `GET /admin/transactions`: se respetan los límites reales de `ValidationPipe` (`@Max(100)` en `FiltroTransaccionesUsuarioDto` y `@Max(200)` en `FiltroTransaccionesAdminDto`) sin alterar los DTOs del backend.

---

## 3. Matriz de Sincronización y Cobertura en `postman/collection.json`

### 3.1 Grupo A — Endpoints con Extensión Aditiva en `PerfilUsuarioDto` (`1. Auth`)

| Endpoint | Cambio en Backend | Requests Requeridos en `postman/collection.json` (`1. Auth`) | Validaciones Obligatorias en Scripts `pm.test` (`FR-033`, `FR-034`) |
|----------|-------------------|--------------------------------------------------------------|--------------------------------------------------------------------|
| `POST /auth/register` | Solo `PerfilUsuarioDto` (`+rol`, `+saldo`) | 1) `POST Register (trader1)` y `POST Register (trader2)` (payload obligatorio `{ nombre, correo, contrasena }`)<br>2) `POST Register inválido (-> 400)`<br>3) `POST Register correo duplicado (-> 409)` | - En `201`: `tokenDeAcceso` (`string`), `tipo === 'Bearer'`, `usuario.id` (UUID), `usuario.nombre`, `usuario.correo`, `usuario.activo === true`, `usuario.creadoEn` (ISO), `usuario.rol === 'USUARIO'`, `usuario.saldo` (`number >= 0`).<br>- En `400` y `409`: `codigoEstado` (`400`/`409`), `mensaje` (`string` o `string[]` no vacío) y `marcaDeTiempo` (ISO). |
| `POST /auth/login` | Solo `PerfilUsuarioDto` (`+rol`, `+saldo`) | 1) `POST Login ADMIN`<br>2) `POST Login trader1` y `POST Login trader2`<br>3) `POST Login credenciales inválidas (-> 401)` | - En `200` (`ADMIN`): `usuario.rol === 'ADMIN'`, `usuario.saldo` (`number >= 0`), `tokenDeAcceso` (`string`), `tipo === 'Bearer'`.<br>- En `200` (`trader1`/`trader2`): `usuario.rol === 'USUARIO'`, `usuario.saldo` (`number >= 0`).<br>- En `401`: `{ codigoEstado: 401, mensaje, marcaDeTiempo }`. |
| `GET /auth/me` | Solo `PerfilUsuarioDto` (`+rol`, `+saldo`) | 1) `GET Perfil Autenticado (trader1)` *(nuevo en colección)*<br>2) `GET Perfil Autenticado (ADMIN)` *(nuevo en colección)*<br>3) `GET Perfil sin token (-> 401)` *(nuevo en colección)* | - En `200`: objeto raíz `PerfilUsuarioDto` con `id`, `nombre`, `correo`, `activo`, `creadoEn`, `rol` (`'USUARIO'` / `'ADMIN'`) y `saldo` (`number >= 0`).<br>- En `401`: `{ codigoEstado: 401, mensaje, marcaDeTiempo }`. |

### 3.2 Grupo B — Endpoints Preexistentes Consumidos SIN Cambios de API (`1. Auth` y Carpetas `2` a `7`)

Ninguno de estos 17 endpoints modifica código en `backend/`. En `postman/collection.json` se verifica su vigencia y que sus scripts `pm.test` validen estado, estructura/tipos y errores relevantes sin romper la corrida secuencial del Collection Runner:

| Carpeta Postman | Endpoint y Método | Estado de API | Cobertura de Payloads / Query y Scripts `pm.test` Verificados |
|-----------------|-------------------|---------------|---------------------------------------------------------------|
| `1. Auth` | `POST /auth/logout` | Vigente sin cambios | `200 OK` con Bearer (`{ mensaje: string }`) y rechazo `401` sin token. |
| `2. Catálogo de Jugadores` | `GET /players` | Vigente sin cambios | Query `page`, `limit`; `200 OK` con `items` (`array`) y paginación; captura `jugador_id`. |
| `2. Catálogo de Jugadores` | `GET /players/filters` | Vigente sin cambios | `200 OK` con `ligas`, `equipos`, `posiciones` (`array`). |
| `2. Catálogo de Jugadores` | `GET /players/ranking` | Vigente sin cambios | Query `limite` y opcional `posicion` (`Portero \| Defensa \| Mediocampista \| Delantero`); `200 OK` validando `posicionRanking`, `jugadorId`, `cotizacionActual`, `variacionPorcentual`, `estrategiaId`, `estrategiaVersion`, `tokensDisponibles` y rechazo `400` ante filtro inválido. |
| `2. Catálogo de Jugadores` | `GET /players/:id` | Vigente sin cambios | Path UUID `:id`; `200 OK` (`id`, `nombre`, `posicion`) y rechazo `400`/`404` ante UUID inválido o inexistente. |
| `2. Catálogo de Jugadores` | `GET /players/:id/quotes` | Vigente sin cambios | Path UUID `:id` + query opcional `limite`; `200 OK` validando `valor`, `score`, `estrategiaId`, `estrategiaVersion`, `sinEstadisticas`, `fechaCotizacion` y rechazo `404` para UUID inexistente. |
| `3. Cotización (Gobernanza ADMIN)` | `GET /quotes/strategy` | Vigente sin cambios | `200 OK` validando `estrategiaActivaId`, `estrategiaActivaVersion`, `actualizadoEn` y `estrategiasDisponibles` (`length >= 2`). |
| `3. Cotización (Gobernanza ADMIN)` | `PUT /quotes/strategy` | Vigente sin cambios | Body `{ estrategiaId: 'POSICIONAL' \| 'GLOBAL' }`; `200 OK` (`ADMIN`), rechazo `403` (`USUARIO` con envoltorio `{ codigoEstado: 403, mensaje, marcaDeTiempo }`) y `400`/`401`. |
| `3. Cotización (Gobernanza ADMIN)` | `POST /quotes/recalculate` | Vigente sin cambios | Sin body (`ADMIN`); `200 OK` validando `totalJugadoresProcesados`, `exitosos`, `fallidos`, `sinEstadisticas`, `estrategiaAplicada`, `versionEstrategia`, `duracionMs`, más rechazo `403` para `USUARIO`. |
| `4. OMS - Mercado Primario` | `POST /orders/buy` *(primario)* | Vigente sin cambios | Body `{ jugadorId, cantidad, precioMaximoUnitario? }` (sin `ordenVentaId`); `200 OK` validando `tipoMercado === 'PRIMARIO'`, `cantidadTokensComprados`, `precioUnitarioPagado`, `montoTotalDebitado`, `saldoRestanteUsuario`, `estrategiaCotizacion`, y rechazos `400` (precio máximo superado / autocompra `ADMIN` / cantidad inválida) y `401`. |
| `5. OMS - Mercado Secundario` | `POST /orders/sell` | Vigente sin cambios | Body `{ jugadorId, cantidad, precioUnitario }`; `201 Created` (`estado === 'PENDIENTE'`, `cantidadRestante`, `precioUnitario`) y rechazos `400` (custodia/saldo insuficiente) y `401`. |
| `5. OMS - Mercado Secundario` | `GET /orders` | Vigente sin cambios | Query `jugadorId`, `vendedorId?`, `estado=ACTIVA`, `limite?`; `200 OK` validando arreglo ordenado con `ordenId`, `vendedorId`, `precioUnitario`, `cantidadRestante`, `estado`. |
| `5. OMS - Mercado Secundario` | `POST /orders/buy` *(secundario)* | Vigente sin cambios | Body `{ jugadorId, cantidad, ordenVentaId }`; `200 OK` (`tipoMercado === 'SECUNDARIO'`), rechazo `400` (autocompra propia oferta) y rechazos `404`/`409` (oferta inexistente o ya cerrada/cancelada). |
| `5. OMS - Mercado Secundario` | `DELETE /orders/:id` | Vigente sin cambios | Path `:id` (UUID); `200 OK` (`estado === 'CANCELADA'`) y rechazos `403` (no titular), `404` (inexistente) y `409` (orden ya cancelada/completada). |
| `6. Portfolio y Auditoría` | `GET /users/:id/portfolio` | Vigente sin cambios | Path `:id`; `200 OK` (`usuarioId`, `saldoBilletera`, `valoracionTotalTokens`, `patrimonioNetoTotal`, `posiciones`) y rechazo `403` al consultar portfolio ajeno sin rol `ADMIN` (`{ codigoEstado: 403, mensaje, marcaDeTiempo }`). |
| `6. Portfolio y Auditoría` | `GET /users/:id/transactions` | Vigente sin cambios | Path `:id` + query opcionales `jugadorId`, `tipo`, `desde`, `hasta`, `limite` (`<= 100`); `200 OK` (`tipoOperacion`, `tipoMercado`, `montoTotal`, `estrategiaCotizacion`, `contraparte`) y rechazos `400`/`403`. |
| `6. Portfolio y Auditoría` | `GET /admin/transactions` | Vigente sin cambios | Query opcionales `jugadorId`, `usuarioId`, `tipoMercado`, `desde`, `hasta`, `limite` (`<= 200`); `200 OK` (`ADMIN`: `compradorId`, `vendedorId`, `estrategiaCotizacion`) y rechazo `403` (`USUARIO`). |
| `7. Scraping WhoScored` | `GET /scraping/jugadores/:id/estadisticas` | Vigente sin cambios | Path `:id` + query `temporada`; script `pm.test` validando `200 OK` o `404` controlado según disponibilidad de estadísticas de temporada. |

---

## 4. Mecanismo de Verificación Automatizada (`postman-swagger-parity.spec.ts`)

Para garantizar que la verificación no dependa de inspección visual manual y se ejecute en cada corrida local y de CI (`.github/workflows/ci.yml`), se define el test de integración contractual `backend/test/integration/marketplace/postman-swagger-parity.spec.ts` (complementario a `auth-perfil-rol.spec.ts`, con **0 modificaciones a tests preexistentes**):

1. **Generación de OpenAPI Real en Memoria**:
   Instancia la aplicación NestJS (`AppModule` + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` + `HttpExceptionFilter`) sobre PostgreSQL Testcontainers y construye `swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig)`.
2. **Aserción Swagger ↔ Contratos REST Versionados**:
   - Carga `specs/013-marketplace-frontend/contracts/openapi-auth-perfil-v1.1.yaml` con `js-yaml` y comprueba que cada ruta (`/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`), método HTTP, códigos de respuesta y propiedades de `PerfilUsuarioDto` (`id`, `nombre`, `correo`, `activo`, `creadoEn`, `rol` con `enum: ['USUARIO', 'ADMIN']`, `saldo` numérico) coinciden exactamente con `swaggerDoc`.
   - Comprueba que los **17 endpoints del Grupo B** existen en `swaggerDoc.paths` con sus métodos HTTP, parámetros `path`/`query`, propiedades permitidas de `requestBody` y códigos `@ApiResponse` sin ninguna modificación respecto a su contrato vigente.
3. **Aserción `postman/collection.json` ↔ Swagger**:
   - Parsea `postman/collection.json`, recorre recursivamente todas las carpetas e ítems, y normaliza variables de path (`{{jugador_id}}`, `{{orden_venta_id}}`, `{{trader1_id}}`, `{{trader2_id}}`, UUIDs literales de prueba → `{id}`).
   - Verifica **cobertura 100%**: los 3 endpoints del Grupo A y los 17 endpoints del Grupo B están representados en `postman/collection.json` y cada `(rutaNormalizada, metodo)` existe en `swaggerDoc.paths`.
   - Verifica **paridad de payloads y query params**: en todo request destinado a caso exitoso (`200`/`201`), las claves del JSON `body.raw` y los `query` habilitados están declarados en el esquema OpenAPI correspondiente (previniendo rechazos por `forbidNonWhitelisted: true`).
   - Verifica **scripts de validación `pm.test` (`FR-034`)**: cada request sobre los 20 endpoints auditados contiene bloque `event[listen="test"].script.exec` con aserciones `pm.test(...)` sobre código HTTP declarado en Swagger y estructura JSON; y en `1. Auth` verifica presencia explícita de aserciones sobre `rol`, `saldo`, `tokenDeAcceso`, `tipo` y del esquema de error `{ codigoEstado, mensaje, marcaDeTiempo }` para `400`, `401` y `409`.
4. **Ejecución HTTP Real de Extensión Aditiva (`auth-perfil-rol.spec.ts`)**:
   - Ejecuta con Supertest contra PostgreSQL real los flujos `POST /auth/register`, `POST /auth/login` (`USUARIO` y `ADMIN`), `GET /auth/me` y los casos de error `400`, `401` y `409`, validando que las respuestas reales emitidas por el servidor satisfacen exactamente las mismas invariantes que los scripts `pm.test` de `postman/collection.json`.

---

## 5. Registro de Evidencia Requerido al Cierre de Implementación (`FR-035`, `SC-008`, DoD #3)

Al completar la tarea de sincronización en la fase de implementación (`/speckit-implement`), DEBE quedar registrada evidencia explícita con los tres puntos siguientes:

1. **Resultado de ejecución automatizada**: salida en verde de `postman-swagger-parity.spec.ts` y `auth-perfil-rol.spec.ts` dentro de `npm run test:integration:cov` / `npm run test:cov` (0 discrepancias entre `postman/collection.json`, `SwaggerModule.createDocument` y `openapi-auth-perfil-v1.1.yaml`).
2. **Detalle de contratos modificados (Grupo A)**: confirmación de actualización sincronizada en `POST /auth/register`, `POST /auth/login` y `GET /auth/me` únicamente por `PerfilUsuarioDto.{rol, saldo}` (`0` endpoints nuevos, `0` cambios en `AuthController`).
3. **Constancia explícita de endpoints validados sin cambios de API (Grupo B)**: confirmación expresa de que los 12 endpoints de Marketplace/OMS/Auditoría y los 5 endpoints de Catálogo/Estadísticas/Logout fueron verificados contra Swagger y Postman con resultado **"Conforme — Vigente sin cambios de API"**.

