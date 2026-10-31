# Quickstart & Validation Guide: Marketplace de Tokens y OMS

**Feature**: `012-token-marketplace-oms`  
**Date**: 2026-10-31  
**Status**: Ready for Implementation

Esta guía describe los escenarios de validación ejecutables de extremo a extremo (E2E) y los comandos para comprobar el correcto funcionamiento de los 7 endpoints del marketplace, las estrategias de cotización y el Order Management System (OMS).

---

## 1. Prerrequisitos

1. **Servicios en ejecución**:
   - PostgreSQL en puerto 5432 (o instancia dinámica provista por Testcontainers durante la suite de pruebas).
   - Redis para caché L1.
2. **Migraciones aplicadas**:
   - Tablas base (`usuarios`, `jugadores`, `ligas`, `equipos`, `estadisticas_jugadores`).
   - Nuevas tablas (`balances_tokens`, `cotizaciones`, `ordenes`, `transacciones`, `configuraciones_mercado`).
3. **Semilla / Usuarios de prueba**:
   - Superusuario con rol `ADMIN`: `admin@marketplace.com` / `Admin1234!`
   - Usuario inversor con rol `USUARIO`: `trader1@marketplace.com` / `Trader1234!`
   - Usuario inversor secundario: `trader2@marketplace.com` / `Trader1234!`

---

## 2. Escenarios de Validación de Extremo a Extremo (E2E)

### Escenario 1: Recálculo de Cotizaciones por Estrategia Activa (`POST /quotes/recalculate`)
- **Objetivo**: Validar que el superusuario puede forzar el cálculo masivo y registrar cotizaciones con score, precio y versión.
- **Flujo**:
  1. Autenticarse como `admin@marketplace.com` (`POST /auth/login`) y obtener `ADMIN_TOKEN`.
  2. Ejecutar `POST /quotes/recalculate` con el header `Authorization: Bearer $ADMIN_TOKEN`.
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Retorna `totalJugadoresProcesados > 0`, `estrategiaAplicada` (`GLOBAL` o `POSICIONAL`) y `versionEstrategia`.
  - Si un usuario no admin ejecuta la petición, responde `403 Forbidden`.

### Escenario 2: Consulta de Historial de Cotizaciones de Jugador (`GET /players/:id/quotes`)
- **Objetivo**: Verificar la inmutabilidad y registro temporal de cotizaciones.
- **Flujo**:
  1. Tomar el `id` (UUID) de un futbolista activo con estadísticas.
  2. Ejecutar `GET /players/:id/quotes`.
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Lista de cotizaciones ordenada por fecha descendente. Cada elemento incluye: `score`, `valor >= 1.00`, `estrategiaId`, `estrategiaVersion`, `fechaCotizacion`.

### Escenario 3: Ranking de Jugadores (`GET /players/ranking`)
- **Objetivo**: Comprobar que los jugadores se ordenan según su valor/score calculado.
- **Flujo**:
  1. Ejecutar `GET /players/ranking?limite=10`.
  2. Ejecutar `GET /players/ranking?posicion=Delantero&limite=5`.
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Los jugadores se presentan ordenados de mayor a menor `cotizacionActual` y `score`.
  - Con filtro de posición, solo se devuelven delanteros con su club y cotización.

### Escenario 4: Compra de Tokens en Mercado Primario (`POST /orders/buy`)
- **Objetivo**: Probar adquisición de tokens contra la emisión original en poder del admin.
- **Flujo**:
  1. Autenticarse como `trader1` y obtener `USER_TOKEN`.
  2. Emitir orden de compra:
     ```json
     {
       "jugadorId": "<UUID_JUGADOR>",
       "cantidad": 5
     }
     ```
- **Resultado Esperado**:
  - Código HTTP `201 Created`.
  - Se debita del saldo monetario de `trader1`: $5 \times \text{cotizacionActual}$.
  - Se incrementa el balance de `trader1` en 5 tokens.
  - El balance del superusuario para ese jugador se reduce de 100 a 95 tokens.
  - La invariante del suministro total se mantiene estricta ($95 + 5 = 100$).

### Escenario 5: Creación de Orden de Venta en Mercado Secundario (`POST /orders/sell`)
- **Objetivo**: Poner tokens propios a la venta bloqueándolos en custodia.
- **Flujo**:
  1. `trader1` posee 5 tokens y pone 2 tokens a la venta a precio unitario $2.50:
     ```json
     {
       "jugadorId": "<UUID_JUGADOR>",
       "cantidad": 2,
       "precioUnitario": 2.50
     }
     ```
- **Resultado Esperado**:
  - Código HTTP `201 Created`.
  - `BalanceToken` de `trader1`: `cantidadDisponible = 3`, `cantidadBloqueada = 2`.
  - La orden de venta queda en estado `PENDIENTE`.

### Escenario 6: Consulta de Portfolio del Usuario (`GET /users/:id/portfolio`)
- **Objetivo**: Inspeccionar la posición patrimonial consolidada.
- **Flujo**:
  1. Ejecutar `GET /users/<TRADER1_ID>/portfolio` con `Authorization: Bearer $USER_TOKEN`.
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Retorna `saldoBilletera`, `posiciones`: jugador, club, `cantidadTokensDisponibles: 3`, `cantidadTokensEnVenta: 2`, `cotizacionActual`, `valoracionTotalPosicion`.

### Escenario 7: Historial de Operaciones del Usuario (`GET /users/:id/transactions`)
- **Objetivo**: Auditar todas las transacciones concluidas del usuario.
- **Flujo**:
  1. Ejecutar `GET /users/<TRADER1_ID>/transactions`.
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Lista cronológica que incluye la compra realizada en el Escenario 4 con cantidad, precio unitario, monto total liquidado y marca temporal.

---

## 3. Comandos de Verificación Automatizada

```bash
# 1. Ejecución de tests unitarios de dominio (aislamiento total, sin BD)
npm run test:unit -- test/unit/domain/cotizacion.spec.ts test/unit/domain/oms-orden.spec.ts test/unit/domain/estrategia.spec.ts

# 2. Ejecución de tests de integración (servicios y repositorios contra PostgreSQL con Testcontainers)
npm run test:integration -- test/integration/quotes.service.spec.ts test/integration/oms.service.spec.ts

# 3. Verificación de umbral de cobertura (mínimo 80% líneas y branches)
npm run test:cov
```

