# Contract: Consumo HTTP/REST Stateless y Clientes API Tipados

**Feature**: `013-marketplace-frontend` | **Phase**: 1 — Design & Contracts | **Date**: 2026-11-02

---

## 1. Infraestructura Base (`frontend/src/api/http-client.ts`)

- **Transporte**: `fetch` estándar sobre HTTP/REST 100% Stateless. Prohibido el uso de WebSockets, Server-Sent Events o polling continuo en segundo plano.
- **Resolución de URL**: `BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')`. En desarrollo local Vite reescribe `/api/*` → `http://localhost:3000/*`.
- **Preservación de Cabeceras**:
  ```typescript
  const { headers: extraHeaders, ...restOptions } = options;
  response = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
  ```
  Garantiza que las peticiones autenticadas con `headers: { Authorization: \`Bearer \${token}\` }` conserven `'Content-Type': 'application/json'` para que el `ValidationPipe` global de NestJS (`whitelist: true, forbidNonWhitelisted: true, transform: true`) procese correctamente los cuerpos JSON.
- **Contrato de Error (`HttpError`)**:
  El filtro global `HttpExceptionFilter` del backend devuelve:
  ```json
  {
    "codigoEstado": 400,
    "mensaje": "Saldo monetario insuficiente. Requerido: 10, Disponible: 5.",
    "marcaDeTiempo": "2026-11-02T05:20:00.000Z"
  }
  ```
  `httpRequest<T>` convierte respuestas `!response.ok` en `new HttpError(response.status, mensaje)` (uniendo `string[]` con espacio si proviene de `class-validator`) y propaga intactos los `AbortError` de `AbortController`.

---

## 2. Contrato Aditivo en Autenticación (`POST /auth/login`, `POST /auth/register`, `GET /auth/me`)

Contrato OpenAPI versionado de referencia: [`openapi-auth-perfil-v1.1.yaml`](./openapi-auth-perfil-v1.1.yaml).

| Archivo | Cambio Exacto | Compatibilidad |
|---------|---------------|----------------|
| `backend/src/controllers/dto/respuesta-autenticacion.dto.ts` | Añadir `rol: RolUsuario` (`'USUARIO' \| 'ADMIN'`) y `saldo: number` a `PerfilUsuarioDto` con `@ApiProperty({ enum: ['USUARIO', 'ADMIN'] })` y `@ApiProperty({ example: 1000 })`. | Aditivo; **0 cambios en `AuthController`**, request DTOs, rutas ni códigos HTTP (`200` / `201`). |
| `backend/src/services/auth.service.ts` | En `mapearPerfil(usuario)` añadir `rol: usuario.rol` y `saldo: usuario.saldo.aNumero()`. No modificar `JwtStrategy`. | 100% compatible con `backend/test/**` (0 modificaciones de tests existentes). |
| `frontend/src/api/auth-api.client.ts` | Sin cambios de firma; `obtenerPerfilAutenticado(token)` y `loginUsuario(credenciales)` ya retornan `PerfilUsuario` enriquecido. | 100% compatible con `tests/unit/api/api-clients.test.ts`. |
| `postman/collection.json` (`1. Auth`) | Actualizar `pm.test` en `POST /auth/register` y `POST /auth/login` (`rol`, `saldo`), incorporar `GET /auth/me` y casos de error `400`/`401`/`409`. | Verificado automáticamente contra Swagger y `openapi-auth-perfil-v1.1.yaml` (ver [`postman-swagger-sync.contract.md`](./postman-swagger-sync.contract.md)). |

---

## 3. Cliente 1: `frontend/src/api/marketplaceApi.ts`

Consume los endpoints públicos de valuación y cartelera del mercado:

| Función Cliente | Método y Ruta Backend | Query Params Permitidos | Respuesta (`200 OK`) | Notas de Validación Backend |
|-----------------|-----------------------|-------------------------|----------------------|-----------------------------|
| `obtenerRankingJugadores(params?, signal?)` | `GET /players/ranking` | `limite?: 1..100` (default `20`), `posicion?: 'Portero' \| 'Defensa' \| 'Mediocampista' \| 'Delantero'` | `JugadorRanking[]` | Omitir `posicion` cuando el filtro UI es `'Todas'`. No enviar `'No Clasificado'`. |
| `obtenerHistorialCotizaciones(jugadorId, limite?, signal?)` | `GET /players/:id/quotes` | `limite?: 1..100` (default `50`) | `CotizacionJugador[]` | Devuelto en orden `fechaCotizacion DESC`; el frontend lo invierte a `ASC` en `quotes-chart.ts` para el eje X. |
| `obtenerEstrategiaActiva(signal?)` | `GET /quotes/strategy` | — | `ConfiguracionEstrategia` | Incluye `estrategiaActivaId`, `estrategiaActivaVersion`, `actualizadoEn` y `estrategiasDisponibles`. |

---

## 4. Cliente 2: `frontend/src/api/ordersApi.ts`

Consume los endpoints del Order Management System (mercado primario y secundario):

| Función Cliente | Método y Ruta Backend | Auth | Payload / Query | Respuesta Éxito | Errores Dominio Mapeados a Español |
|-----------------|-----------------------|------|-----------------|-----------------|------------------------------------|
| `listarOrdenesVenta(filtros?, signal?)` | `GET /orders` | Público | `jugadorId?`, `vendedorId?`, `estado?: 'ACTIVA' \| 'PENDIENTE' \| 'PARCIAL' \| 'COMPLETADA' \| 'CANCELADA'`, `limite?: 1..100` | `200 OK` → `OrdenVenta[]` (ordenado `precioUnitario ASC, creadoEn ASC`) | `400` filtro inválido. |
| `comprarTokens(token, payload)` | `POST /orders/buy` | `Bearer` | `{ jugadorId, cantidad, ordenVentaId?, precioMaximoUnitario? }` | **`200 OK`** → `ResultadoCompra` | `400` saldo insuficiente, stock primario insuficiente, precio máximo superado, autocompra ADMIN o autocompra propia oferta; `404` jugador/oferta inexistente; `409` oferta secundaria ya tomada o cancelada por concurrencia. |
| `publicarOrdenVenta(token, payload)` | `POST /orders/sell` | `Bearer` | `{ jugadorId, cantidad, precioUnitario }` | **`201 Created`** → `OrdenVenta` | `400` tenencia libre insuficiente o jugador inactivo; `404` jugador no encontrado. |
| `cancelarOrdenVenta(token, ordenId)` | `DELETE /orders/:id` | `Bearer` | Path `:id` (UUID) | **`200 OK`** → `OrdenVenta` (`estado: 'CANCELADA'`) | `403` no titular; `404` orden inexistente; `409` orden ya `COMPLETADA` o `CANCELADA`. |

> **Regla crítica de payload (`forbidNonWhitelisted: true`)**: En `comprarTokens`, `jugadorId` se envía **siempre** (tanto en compra primaria sin `ordenVentaId` como en compra secundaria con `ordenVentaId`), y `precioMaximoUnitario` solo se incluye en el JSON cuando el usuario ingresó un valor numérico válido (`!== undefined`), nunca como `null` ni `""`.

---

## 5. Cliente 3: `frontend/src/api/portfolioApi.ts`

Consume los endpoints privados de estado patrimonial e historial personal:

| Función Cliente | Método y Ruta Backend | Auth | Query Params Permitidos | Respuesta (`200 OK`) | Notas Críticas |
|-----------------|-----------------------|------|-------------------------|----------------------|----------------|
| `obtenerPortfolioUsuario(token, usuarioId, signal?)` | `GET /users/:id/portfolio` | `Bearer` (titular o `ADMIN`) | — | `PortfolioUsuario` | Expone `saldoBilletera`, `valoracionTotalTokens`, `patrimonioNetoTotal` y `posiciones` con tenencia > 0. |
| `obtenerTransaccionesUsuario(token, usuarioId, filtros?, signal?)` | `GET /users/:id/transactions` | `Bearer` (titular o `ADMIN`) | `jugadorId?`, `tipo?: 'COMPRA' \| 'VENTA'`, `desde?` (ISO), `hasta?` (ISO), `limite?: 1..100` | `TransaccionUsuario[]` (`fecha DESC`) | Acotar `limite = Math.min(filtros?.limite ?? 100, 100)` (enviar `> 100` produce `400 Bad Request`). Normalizar `YYYY-MM-DD` de `<input type="date">` a `T00:00:00.000Z` (`desde`) y `T23:59:59.999Z` (`hasta`). |

---

## 6. Cliente 4: `frontend/src/api/adminApi.ts`

Consume los endpoints exclusivos de gobernanza y auditoría (`@Roles('ADMIN')`):

| Función Cliente | Método y Ruta Backend | Auth | Payload / Query | Respuesta (`200 OK`) | Notas Críticas |
|-----------------|-----------------------|------|-----------------|----------------------|----------------|
| `cambiarEstrategiaMercado(token, estrategiaId)` | `PUT /quotes/strategy` | `Bearer ADMIN` | `{ estrategiaId: 'GLOBAL' \| 'POSICIONAL' }` | `ConfiguracionEstrategia` | Invalida automáticamente caché L1 de ranking en backend; el hook revalida estrategia y ranking. |
| `ejecutarRecalculoManual(token)` | `POST /quotes/recalculate` | `Bearer ADMIN` | Sin body (`method: 'POST'`) | `ResumenRecalculo` | Deshabilitar botón durante la corrida en curso; manejar eventual `409` o error en español si ocurre concurrencia. |
| `obtenerTransaccionesAuditoria(token, filtros?, signal?)` | `GET /admin/transactions` | `Bearer ADMIN` | `jugadorId?`, `usuarioId?`, `tipoMercado?: 'PRIMARIO' \| 'SECUNDARIO'`, `desde?`, `hasta?`, `limite?: 1..200` | `TransaccionAuditoria[]` (`fecha DESC`) | Acotar `limite = Math.min(filtros?.limite ?? 100, 200)` (`@Max(200)` estricto en backend). Omitir `jugadorId` o `usuarioId` vacíos; validar formato UUID v4 antes de consultar. |

---

## 7. Matriz de Revalidación Reactiva Post-Mutación (Sin WebSockets)

| Mutación Ejecutada | Datos Revalidados Automáticamente al Resolver |
|--------------------|-----------------------------------------------|
| `POST /orders/buy` (Primario o Secundario) | 1) Historial/cotización del jugador (`GET /players/:id/quotes`), 2) Libro de órdenes activas del jugador (`GET /orders?jugadorId=...&estado=ACTIVA`), 3) Perfil/saldo en `AuthContext` (`refrescarPerfil`) y tenencia del usuario (`GET /users/:id/portfolio`), 4) Callback `onMarketMutation?.()` hacia la vista contenedora (`MarketplaceView` / `HomeView` / `PortfolioView`). |
| `POST /orders/sell` (Publicar Venta) | 1) Libro de órdenes activas del jugador, 2) Portfolio del usuario (`disponibles` → `enVenta` en custodia), 3) Lista de órdenes propias abiertas (`GET /orders?vendedorId=:uid&estado=ACTIVA`). |
| `DELETE /orders/:id` (Cancelar Venta) | 1) Libro de órdenes activas del jugador, 2) Lista de órdenes propias abiertas, 3) Portfolio del usuario (restitución inmediata a `cantidadTokensDisponibles`). |
| `PUT /quotes/strategy` (Cambiar Estrategia) | 1) Configuración de estrategia vigente (`GET /quotes/strategy`), 2) Ranking de cotizaciones si está montado. |
| `POST /quotes/recalculate` (Recálculo Masivo) | 1) Resumen operativo de la corrida en pantalla, 2) Configuración de estrategia vigente, 3) Auditoría global / ranking bajo demanda. |

---

## 8. Inmutabilidad de Endpoints Consumidos y Paridad Postman ↔ Swagger

- **0 endpoints nuevos y 0 modificaciones en controladores**: las secciones 3, 4, 5 y 6 de este contrato consumen los 12 endpoints de `012-token-marketplace-oms` exactamente como están implementados y documentados en `@nestjs/swagger` (`SwaggerModule.createDocument`), sin alterar rutas, códigos de estado (`POST /orders/buy` se mantiene en `200 OK`, `POST /orders/sell` en `201 Created`) ni DTOs (`@Max(100)` en transacciones de usuario y `@Max(200)` en auditoría admin).
- **Verificación de sincronización**: el protocolo detallado de paridad entre `postman/collection.json`, Swagger (`/api/docs-json`) y los contratos REST versionados (`openapi-auth-perfil-v1.1.yaml` + este documento) se rige por [`postman-swagger-sync.contract.md`](./postman-swagger-sync.contract.md).

