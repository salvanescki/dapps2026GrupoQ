# Quickstart Validation Guide: Auditoría de Web-Services y Eventos Críticos de Negocio

**Feature**: `019-backend-audit-logging` | **Date**: 2026-11-28

Esta guía describe los pasos reproducibles para validar de punta a punta la auditoría estructurada de web-services (`HTTP_AUDIT`), los eventos críticos de negocio (`BUSINESS_AUDIT`), la redacción de datos sensibles, el filtrado de rutas técnicas y la supresión de alertas de Redis en modo producción.

Para el detalle de campos, niveles y contratos de entorno, consultar:
- Esquema de entidades y políticas: [`data-model.md`](./data-model.md)
- Contrato JSON formal: [`contracts/audit-log-events.schema.json`](./contracts/audit-log-events.schema.json)
- Contrato de runtime y correlación: [`contracts/audit-runtime-contract.md`](./contracts/audit-runtime-contract.md)

---

## 1. Prerrequisitos

- **Node.js**: v20+ (CI usa Node 20; compatible también con Node 22/24).
- **Docker**: en ejecución para levantar PostgreSQL/Redis locales y ejecutar tests de integración con Testcontainers.
- **Dependencias instaladas** en `backend/`:
  ```bash
  cd backend
  npm ci
  ```

---

## 2. Levantar Infraestructura Local y Backend

### 2.1 Escenario Desarrollo Local (salida legible o JSON)
```bash
# Desde la raíz del repositorio: levantar PostgreSQL (5433) y Redis (6379)
docker compose up -d postgres redis

# Arrancar backend en modo desarrollo (formato pino-pretty por defecto)
cd backend
npm run start:dev
```
Para inspeccionar el JSON estructurado exacto de producción en local:
```bash
cd backend
LOG_PRETTY=false npm run start:dev
```

### 2.2 Escenario Simulación Producción sin Redis (Render + Supabase Free Tier)
```bash
cd backend
npm run build
NODE_ENV=production LOG_LEVEL=info unset REDIS_URL REDIS_HOST
NODE_ENV=production LOG_LEVEL=info node dist/main.js
```
**Resultado esperado**:
- Arranque en JSON NDJSON a `stdout` (sin `console.log` plano ni `pino-pretty`).
- **0 advertencias (`WARN`)** por Redis no disponible al operar sobre `/players`, `/orders` o `/team-of-the-week`.

---

## 3. Escenarios de Validación Funcional End-to-End

### Escenario A — Auditoría HTTP, Redacción y Correlación (US1 / FR-001, FR-002, FR-003)
1. **Solicitud pública con credenciales en cuerpo** (`POST /auth/login` con encabezado `x-request-id: req-demo-001`):
   ```bash
   curl -i -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -H "x-request-id: req-demo-001" \
     -d '{"correo":"admin@marketplace.com","contrasena":"MiPasswordSecreta123"}'
   ```
   **Resultado esperado en `stdout` y respuesta**:
   - Respuesta incluye encabezado `x-request-id: req-demo-001`.
   - Exactamente **1** registro `tipoEvento: "HTTP_AUDIT"` con `timestamp` ISO-8601, `requestId: "req-demo-001"`, `usuario.autenticado: false`, `operacion.metodo: "POST"`, `parametros.cuerpo.contrasena: "[REDACTED]"`, `codigoEstado` y `tiempoEjecucion` numérico (ms).
   - Nunca aparece `"MiPasswordSecreta123"` en la salida.

2. **Solicitud autenticada y redacción de `Authorization`** (`GET /auth/me` con `Bearer <jwt>`):
   **Resultado esperado**:
   - Exactamente **1** registro `HTTP_AUDIT` con `usuario.autenticado: true`, `usuario.id` del titular y sin exponer el JWT en texto claro.

3. **Solicitud a ruta inexistente o no autorizada (`404` / `401`)**:
   ```bash
   curl -i http://localhost:3000/ruta-inexistente
   ```
   **Resultado esperado**:
   - Exactamente **1** registro `HTTP_AUDIT` en nivel `warn` (`40`), `usuario.tipo: "ANONIMO"`, `codigoEstado: 404` y `tiempoEjecucion >= 0`.

4. **Exclusión de rutas técnicas de monitoreo (UptimeRobot / Prometheus / Swagger)**:
   ```bash
   curl -s http://localhost:3000/health/live > /dev/null
   curl -s http://localhost:3000/metrics > /dev/null
   curl -s http://localhost:3000/api/docs-json > /dev/null
   ```
   **Resultado esperado**:
   - Con `LOG_LEVEL=info`: **0** registros `HTTP_AUDIT` emitidos para esas rutas.
   - Con `LOG_LEVEL=debug`: se emiten únicamente en nivel `debug` (`20`).

---

### Escenario B — Auditoría de Transacciones de Tokens (US2 / FR-004)
1. Ejecutar compra primaria (`POST /orders/buy` sin `ordenVentaId`), compra secundaria (`POST /orders/buy` con `ordenVentaId`), creación/cancelación de orden de venta (`POST /orders/sell`, `DELETE /orders/:id`) e intento rechazado (por saldo insuficiente o `precioMaximoUnitario` excedido).
2. **Resultado esperado en `stdout`**:
   - Cada operación emite su evento `tipoEvento: "BUSINESS_AUDIT"` (`TRANSACCION_TOKENS` u `ORDEN_MERCADO_SECUNDARIO`) compartiendo el mismo `requestId` que el registro `HTTP_AUDIT` padre.
   - Contiene `mercado`, `compradorId`, `vendedorId`, `transaccionId`, `ordenId`, `jugadorId`, `cantidad`, `montoTotal`, `resultado` (`EXITO` o `RECHAZADO`), `motivo` y `tiempoEjecucion`.

---

### Escenario C — Auditoría de Cotizaciones y Team of the Week (US3 / FR-005, FR-006)
1. Como `ADMIN`, invocar `PUT /quotes/strategy`, `POST /quotes/recalculate` y `POST /team-of-the-week/generate`.
2. **Resultado esperado en `stdout`**:
   - Eventos `BUSINESS_AUDIT` correspondientes (`CAMBIO_ESTRATEGIA_COTIZACION`, `CALCULO_COTIZACIONES`, `CALCULO_TEAM_OF_THE_WEEK`) con `usuarioId` del administrador, contadores/semana ISO, resultado y `tiempoEjecucion`, correlacionados vía `requestId`.
   - Las ejecuciones automáticas vía `QuotesSchedulerService` y `TeamOfTheWeekSchedulerService` emiten los mismos esquemas con `origen: "PROGRAMADO"` y `requestId: null`.

---

### Escenario D — Auditoría del Scraper y Protección de Proxies (US4 / FR-007)
1. Disparar `POST /scraping/ejecutar` (o ejecutar `npm run scraper:run` con `SCRAPING_PROXY_URL=http://demoUser:demoPass@proxy.example.com:8080`).
2. **Resultado esperado en `stdout`**:
   - Eventos `SCRAPING_LIGA` y `SCRAPING_ESTADISTICAS` con `ejecucionId`, `disparador`, `ligasProcesadas`, `tasaAsociacion`, `conteoIncidencias`, `estadoFinal` y `tiempoEjecucion`.
   - En toda la salida emitida: **0 ocurrencias** de `demoUser` o `demoPass` (cualquier URL de proxy aparece como `http://[REDACTED]@proxy.example.com:8080` o sin credenciales).

---

## 4. Validación Automatizada (Tests, Cobertura y Compilación)

```bash
cd backend

# 1. Compilación estricta TypeScript / NestJS
npm run build

# 2. Suite completa de pruebas unitarias, integración y e2e con cobertura (sin modificar tests previos)
npm run test:cov -- --runInBand --testTimeout=60000

# 3. Ejecución focalizada de las nuevas suites de auditoría
npx jest test/unit/observability/ --coverage
npx jest test/integration/observability/http-audit-logging.integration.spec.ts --runInBand
npx jest test/integration/observability/business-audit-logging.integration.spec.ts --runInBand
```

**Criterios de verificación exitosa**:
- `npm run build` finaliza con código `0`.
- 100% de los tests preexistentes pasan sin modificaciones (Política de Inmutabilidad de Tests).
- Cobertura de líneas y bifurcaciones del código nuevo `>= 80%`, sin reducir el coverage global del backend.
- Verificación explícita de sincronización Swagger/OpenAPI y colección en `postman/` confirmando ausencia de cambios en contratos REST.
