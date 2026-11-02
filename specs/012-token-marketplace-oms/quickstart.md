# Quickstart & Validation Guide: Marketplace de Tokens y OMS

**Feature**: `012-token-marketplace-oms`  
**Date**: 2026-11-01  
**Status**: Ready for Implementation

Esta guía describe los escenarios de validación ejecutables de extremo a extremo (E2E) y los comandos para comprobar el correcto funcionamiento de los 12 endpoints del marketplace, las estrategias de cotización, el bootstrap del `ADMIN` y el Order Management System (OMS).

---

## 1. Prerrequisitos y Variables de Entorno

1. **Servicios en ejecución**:
   - PostgreSQL 16 (instancia local o dinámica provista por Testcontainers durante la suite de pruebas).
   - Redis como caché L1 (con degradación controlada automática si no está disponible en entorno de pruebas).
2. **Migraciones aplicadas desde cero**:
   - Tablas base (`usuarios`, `jugadores`, `ligas`, `equipos`, `estadisticas_jugadores`).
   - Migración `1730000000000-create-marketplace-and-oms-tables.ts` (`configuraciones_mercado`, `balances_tokens`, `cotizaciones`, `ordenes`, `transacciones`, columnas `rol` y `saldo` en `usuarios`).
3. **Bootstrap del Superusuario y Usuarios de Prueba**:
   - Variables de arranque para `AdminBootstrapService`:
     - `ADMIN_CORREO=admin@marketplace.com`
     - `ADMIN_CONTRASENA=Admin1234!`
     - `ADMIN_NOMBRE="Administrador Marketplace"`
   - Usuarios inversores registrados por `POST /auth/register` (reciben rol `USUARIO` y saldo inicial de `1000.00`):
     - `trader1@marketplace.com` / `Trader1234!`
     - `trader2@marketplace.com` / `Trader1234!`

---

## 2. Escenarios de Validación de Extremo a Extremo (E2E)

### Escenario 1: Gobernanza de Estrategia y Recálculo Manual (`GET/PUT /quotes/strategy` y `POST /quotes/recalculate`)
- **Flujo**:
  1. Consultar `GET /quotes/strategy` y verificar que la estrategia inicial es `GLOBAL` (`GLOBAL_v1`) y se listan `GLOBAL_v1` y `POSICIONAL_v1`.
  2. Intentar `PUT /quotes/strategy` con `{ "estrategiaId": "POSICIONAL" }` usando el token de `trader1` → debe responder `403 Forbidden`.
  3. Autenticarse como `admin@marketplace.com`, ejecutar `PUT /quotes/strategy` con `{ "estrategiaId": "POSICIONAL" }` → `200 OK` con `estrategiaActivaVersion: "POSICIONAL_v1"`.
  4. Ejecutar `POST /quotes/recalculate` con el token de `admin` → `200 OK` con `totalJugadoresProcesados > 0`, `estrategiaAplicada: "POSICIONAL"`, `versionEstrategia: "POSICIONAL_v1"`.

### Escenario 2: Historial de Cotizaciones y Ranking (`GET /players/:id/quotes` y `GET /players/ranking`)
- **Flujo**:
  1. Consultar `GET /players/:id/quotes` para un jugador con estadísticas y otro sin estadísticas.
  2. Consultar `GET /players/ranking?limite=10` y `GET /players/ranking?posicion=Delantero&limite=5`.
- **Resultado Esperado**:
  - El historial expone `score`, `valor >= 1.00`, `estrategiaId`, `estrategiaVersion`, `sinEstadisticas` y el snapshot `metricas` (o `valor = 1.00` y `sinEstadisticas = true` si no tiene métricas).
  - El ranking ordena descendentemente por `cotizacionActual` y `score`, exponiendo `variacionPorcentual` y `tokensDisponibles`.

### Escenario 3: Compra en Mercado Primario y Trazabilidad de Estrategia (`POST /orders/buy`)
- **Flujo**:
  1. Con `trader1`, enviar `POST /orders/buy` con `{ "jugadorId": "<UUID_JUGADOR>", "cantidad": 5 }` (sin `ordenVentaId`).
- **Resultado Esperado**:
  - `201 Created` con `tipoMercado: "PRIMARIO"` y `estrategiaCotizacion: "POSICIONAL_v1"` (la estrategia vigente en la cotización del token).
  - Débito exacto de $5 \times \text{cotizacionActual}$ en la billetera de `trader1`, 5 tokens disponibles en `trader1`, 95 tokens en `admin` ($95 + 5 = 100$).

### Escenario 4: Orden de Venta, Libro Secundario, Compra de Oferta Puntual, Concurrencia y Cancelación (`POST /orders/sell`, `GET /orders`, `POST /orders/buy`, `DELETE /orders/:id`)
- **Flujo**:
  1. `trader1` publica `POST /orders/sell` por 3 tokens a `2.50` → `201 Created` (`cantidadDisponible = 2`, `cantidadBloqueada = 3`, orden `PENDIENTE`).
  2. `trader2` consulta `GET /orders?jugadorId=<UUID_JUGADOR>` y obtiene el `ordenId` de la oferta de `trader1`.
  3. `trader1` intenta comprarse su propia oferta (`ordenVentaId`) → `400 Bad Request` (prohibición de autocontratación).
  4. `trader2` compra parcialmente 2 tokens enviando `POST /orders/buy` con `{ "jugadorId": "<UUID_JUGADOR>", "cantidad": 2, "ordenVentaId": "<ORDEN_ID>" }` → `201 Created` (`tipoMercado: "SECUNDARIO"`, `estrategiaCotizacion: "POSICIONAL_v1"`, orden pasa a `PARCIAL` con `cantidadRestante = 1`).
  5. Dos peticiones concurrentes intentan comprar el último token restante de `<ORDEN_ID>`: exactamente una responde `201 Created` y la otra falla con `409 Conflict` / `400 Bad Request`, conservando la suma exacta de 100 tokens.
  6. `trader1` publica una segunda orden de venta por 1 token y luego invoca `DELETE /orders/<SEGUNDA_ORDEN_ID>` → `200 OK`, estado `CANCELADA` y el token regresa a `cantidadDisponible`.

### Escenario 5: Portfolio Valorizado, Filtros Históricos y Auditoría ADMIN (`GET /users/:id/portfolio`, `GET /users/:id/transactions`, `GET /admin/transactions`)
- **Flujo**:
  1. `trader1` consulta `GET /users/<TRADER1_ID>/portfolio` → retorna `saldoBilletera`, `precioPromedioAdquisicion`, `cotizacionActual`, `valoracionTotalPosicion` y `patrimonioNetoTotal`.
  2. `trader1` intenta consultar `GET /users/<TRADER2_ID>/portfolio` o `/transactions` → `403 Forbidden`.
  3. `trader1` consulta `GET /users/<TRADER1_ID>/transactions?tipo=COMPRA&jugadorId=<UUID_JUGADOR>` → retorna sus compras con el campo `estrategiaCotizacion`.
  4. `admin` consulta `GET /admin/transactions?jugadorId=<UUID_JUGADOR>` → `200 OK` con todas las transacciones primarias y secundarias y su `estrategiaCotizacion` (`trader1` recibe `403 Forbidden` en `/admin/transactions`).

---

## 3. Comandos de Verificación Automatizada

```bash
cd backend

# 1. Compilación limpia
npm run build

# 2. Suite unitaria de dominio con umbral de cobertura >= 80%
npm run test:unit:cov

# 3. Suite de integración con PostgreSQL real (Testcontainers) y cobertura
npm run test:integration:cov

# 4. Suite E2E de controladores HTTP y flujos críticos con cobertura
npm run test:e2e:cov

# 5. Cobertura global consolidada con enforcement >= 80% líneas y branches
npm run test:cov -- --runInBand --testTimeout=60000

# 6. Smoke test de despliegue local con Docker Compose (DoD Constitución)
docker compose up -d postgres
DB_PORT=5433 ADMIN_CORREO=admin@marketplace.com ADMIN_CONTRASENA='Admin1234!' npm run start:prod
# En otra terminal: verificar HTTP 200 en http://localhost:3000/api/docs y http://localhost:3000/quotes/strategy
```
