# Contract: Observability API Endpoints

**Feature**: `018-frontend-observability-dashboard`  
**Date**: 2026-11-23  
**Status**: Stable (Backend preexistente)

Este contrato describe los endpoints expuestos por el backend de NestJS consumidos por el panel de observabilidad en el frontend.

---

## 1. Endpoint: Métricas de Prometheus

### `GET /metrics`

- **Descripción**: Expone las métricas estándar de Node.js y las métricas de negocio personalizadas registradas por `AppMetricsService`.
- **Autenticación**: No requiere encabezado estricto en el backend actual, pero el frontend envía el token de sesión Bearer si está disponible.
- **Content-Type de Respuesta**: `text/plain; version=0.0.4; charset=utf-8`

#### Respuesta Exitosa (HTTP 200)

```text
# HELP marketplace_orders_total Cantidad total de órdenes procesadas por el OMS
# TYPE marketplace_orders_total counter
marketplace_orders_total{tipo="compra",mercado="primario",estado="creada"} 12
marketplace_orders_total{tipo="venta",mercado="secundario",estado="completada"} 8

# HELP marketplace_transactions_total Cantidad total de transacciones liquidadas
# TYPE marketplace_transactions_total counter
marketplace_transactions_total{mercado="secundario",estrategia_version="GLOBAL_v1"} 8

# HELP marketplace_volume_cents_total Volumen acumulado operado en centavos de crédito
# TYPE marketplace_volume_cents_total counter
marketplace_volume_cents_total{mercado="primario"} 120000
marketplace_volume_cents_total{mercado="secundario"} 45000

# HELP marketplace_order_settlement_duration_seconds Duración de liquidación de órdenes con locks pesimistas en segundos
# TYPE marketplace_order_settlement_duration_seconds histogram
marketplace_order_settlement_duration_seconds_bucket{le="0.01",mercado="secundario"} 5
marketplace_order_settlement_duration_seconds_bucket{le="+Inf",mercado="secundario"} 8
marketplace_order_settlement_duration_seconds_sum{mercado="secundario"} 0.32
marketplace_order_settlement_duration_seconds_count{mercado="secundario"} 8

# HELP marketplace_active_sell_orders Cantidad actual de órdenes de venta activas en el mercado secundario
# TYPE marketplace_active_sell_orders gauge
marketplace_active_sell_orders 15

# HELP marketplace_slippage_rejections_total Cantidad total de órdenes de compra rechazadas por protección de slippage
# TYPE marketplace_slippage_rejections_total counter
marketplace_slippage_rejections_total{mercado="secundario"} 1

# HELP quotes_recalculations_total Cantidad total de ciclos de recálculo de cotizaciones ejecutados
# TYPE quotes_recalculations_total counter
quotes_recalculations_total{estrategia="GLOBAL_v1",estado="exito"} 14
quotes_recalculations_total{estrategia="GLOBAL_v1",estado="fallo"} 1

# HELP quotes_recalculation_duration_seconds Duración del proceso masivo de recálculo de cotizaciones en segundos
# TYPE quotes_recalculation_duration_seconds histogram
quotes_recalculation_duration_seconds_sum{estrategia="GLOBAL_v1"} 42.5
quotes_recalculation_duration_seconds_count{estrategia="GLOBAL_v1"} 15

# HELP quotes_players_evaluated_total Cantidad total de jugadores evaluados en recálculos de cotizaciones
# TYPE quotes_players_evaluated_total counter
quotes_players_evaluated_total{categoria="procesados"} 480
quotes_players_evaluated_total{categoria="sin_estadisticas"} 35
quotes_players_evaluated_total{categoria="fallidos"} 2

# HELP quotes_active_strategy Indicador de estrategia de cotización activa (1 para activa, 0 para inactiva)
# TYPE quotes_active_strategy gauge
quotes_active_strategy{estrategia="GLOBAL_v1"} 1
quotes_active_strategy{estrategia="POSICIONAL_v1"} 0

# HELP scraping_executions_total Cantidad total de ejecuciones del pipeline de scraping de WhoScored
# TYPE scraping_executions_total counter
scraping_executions_total{estado="exitoso"} 25
scraping_executions_total{estado="fallido"} 1
scraping_executions_total{estado="recuperada_atasco"} 2

# HELP scraping_execution_duration_seconds Duración de extracción y sincronización de scraping por liga en segundos
# TYPE scraping_execution_duration_seconds histogram
scraping_execution_duration_seconds_sum{liga="PL"} 1250
scraping_execution_duration_seconds_count{liga="PL"} 10

# HELP scraping_player_match_rate Tasa porcentual de asociación exacta de jugadores extraídos (0 a 100)
# TYPE scraping_player_match_rate gauge
scraping_player_match_rate{liga="PL"} 96.5

# HELP scraping_incidents_total Cantidad total de incidentes o reintentos anómalos durante el scraping
# TYPE scraping_incidents_total counter
scraping_incidents_total{liga="PL"} 3

# HELP football_data_requests_total Cantidad total de peticiones HTTP enviadas a Football-Data.org
# TYPE football_data_requests_total counter
football_data_requests_total{endpoint="matches",status="200"} 45

# HELP football_data_rate_limit_remaining Peticiones restantes reportadas por Football-Data.org
# TYPE football_data_rate_limit_remaining gauge
football_data_rate_limit_remaining 8

# HELP cache_requests_total Consultas a caché Redis L1 clasificadas por dominio y resultado (hit/miss)
# TYPE cache_requests_total counter
cache_requests_total{dominio="marketplace",resultado="hit"} 120
cache_requests_total{dominio="marketplace",resultado="miss"} 15

# HELP cache_fallback_total Cantidad de degradaciones a base de datos por fallo o indisponibilidad de Redis
# TYPE cache_fallback_total counter
cache_fallback_total{dominio="marketplace"} 0

# HELP auth_attempts_total Cantidad total de intentos de autenticación clasificados por resultado
# TYPE auth_attempts_total counter
auth_attempts_total{resultado="exito"} 95
auth_attempts_total{resultado="fallo"} 4

# HELP password_hashing_duration_seconds Duración del cómputo de hashing de contraseñas con bcrypt en segundos
# TYPE password_hashing_duration_seconds histogram
password_hashing_duration_seconds_sum 8.5
password_hashing_duration_seconds_count 99

# HELP nodejs_heap_size_used_bytes Process heap information from Node.js
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 84521472

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 189251584
```

---

## 2. Endpoint: Sonda de Preparación (Readiness)

### `GET /health/ready`

- **Descripción**: Evalúa conectividad activa con PostgreSQL, Redis L1 y Football-Data.org.
- **Códigos HTTP esperados**:
  - `200 OK`: Todos los servicios activos.
  - `503 Service Unavailable`: Al menos un servicio degradado o inaccesible.
- **Content-Type**: `application/json`

#### Respuesta Nominal (HTTP 200)

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    },
    "footballData": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    },
    "footballData": {
      "status": "up"
    }
  }
}
```

#### Respuesta Degradada (HTTP 503)

```json
{
  "status": "error",
  "info": {
    "database": {
      "status": "up"
    },
    "footballData": {
      "status": "up"
    }
  },
  "error": {
    "redis": {
      "status": "down",
      "message": "Connection timeout after 3000ms"
    }
  },
  "details": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "down",
      "message": "Connection timeout after 3000ms"
    },
    "footballData": {
      "status": "up"
    }
  }
}
```

---

## 3. Endpoint: Sonda de Vivacidad (Liveness)

### `GET /health/live`

- **Descripción**: Evalúa que el consumo de memoria de Node.js esté dentro de los límites operativos (Heap < 300 MB, RSS < 1 GB).
- **Códigos HTTP esperados**:
  - `200 OK`: Memoria dentro de umbrales.
  - `503 Service Unavailable`: Memoria ha sobrepasado los límites.
- **Content-Type**: `application/json`

#### Respuesta Nominal (HTTP 200)

```json
{
  "status": "ok",
  "info": {
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    }
  }
}
```

#### Respuesta de Falla (HTTP 503)

```json
{
  "status": "error",
  "info": {
    "memory_rss": {
      "status": "up"
    }
  },
  "error": {
    "memory_heap": {
      "status": "down",
      "message": "Used heap (320 MB) exceeds threshold (300 MB)"
    }
  },
  "details": {
    "memory_heap": {
      "status": "down",
      "message": "Used heap (320 MB) exceeds threshold (300 MB)"
    },
    "memory_rss": {
      "status": "up"
    }
  }
}
```
