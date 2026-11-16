# Quickstart Validation Guide: Backend Observability, Metrics & Health Checks

**Feature Branch**: `017-backend-observability`  
**Date**: 2026-11-16  
**Status**: Ready for Validation  

---

## 1. Prerrequisitos y Configuración del Entorno

Asegurarse de tener el entorno de desarrollo backend preparado con Node.js 20+, PostgreSQL y Redis en ejecución:

```bash
# 1. Asegurar variables de entorno en backend/.env
cd backend
cat << 'EOF' >> .env
# Configuración base de Observabilidad y Health Checks
FOOTBALL_DATA_API_KEY=tu_api_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=football_tokens
EOF

# 2. Levantar servicios dependientes (PostgreSQL y Redis) vía Docker
docker compose up -d postgres redis
```

---

## 2. Escenarios de Validación End-to-End

### Escenario 1: Verificación de la Sonda de Readiness (`GET /health/ready`)

**Objetivo**: Validar que la sonda de readiness evalúa correctamente PostgreSQL, Redis y la API Football-Data.

1. **Ejecución con dependencias disponibles**:
   ```bash
   curl -i http://localhost:3000/health/ready
   ```
   **Resultado Esperado**:
   - Código HTTP: `200 OK`
   - Payload JSON con `status: "ok"` e indicadores `database`, `redis`, `footballData` en estado `"up"`.

2. **Ejecución con Redis caído (simulación)**:
   ```bash
   # Detener temporalmente el contenedor de Redis
   docker compose stop redis
   curl -i http://localhost:3000/health/ready
   ```
   **Resultado Esperado**:
   - Código HTTP: `503 Service Unavailable`
   - Payload JSON con `status: "error"` y `details.redis.status: "down"`.
   ```bash
   # Restaurar Redis
   docker compose start redis
   ```

---

### Escenario 2: Verificación de la Sonda de Liveness (`GET /health/live`)

**Objetivo**: Validar que la sonda de liveness evalúa el consumo de memoria Heap (< 300 MB) y RSS (< 1 GB).

1. **Ejecución en condiciones normales**:
   ```bash
   curl -i http://localhost:3000/health/live
   ```
   **Resultado Esperado**:
   - Código HTTP: `200 OK`
   - Payload JSON con `status: "ok"` e indicadores `memory_heap` y `memory_rss` en `"up"`.

---

### Escenario 3: Verificación del Endpoint de Métricas Prometheus (`GET /metrics`)

**Objetivo**: Validar que el endpoint `/metrics` expone tanto las métricas de runtime estándar como las métricas personalizadas del dominio.

1. **Consulta inicial de métricas**:
   ```bash
   curl -s http://localhost:3000/metrics | grep -E "process_cpu|nodejs_eventloop|marketplace_|quotes_|scraping_|cache_|auth_"
   ```
   **Resultado Esperado**:
   - Código HTTP: `200 OK`
   - Cabecera: `Content-Type: text/plain; version=0.0.4; charset=utf-8`
   - Salida en texto plano conteniendo las definiciones `# HELP`, `# TYPE` y valores inicializados (0) para:
     - `marketplace_orders_total`
     - `marketplace_transactions_total`
     - `marketplace_volume_cents_total`
     - `marketplace_active_sell_orders`
     - `quotes_active_strategy`
     - `cache_requests_total`
     - `auth_attempts_total`

---

### Escenario 4: Incremento Dinámico de Métricas tras Operaciones de Dominio

**Objetivo**: Comprobar que las acciones sobre el OMS, autenticación y cotizaciones incrementan de forma reactiva y atómica las métricas correspondientes.

1. **Autenticación de un usuario**:
   ```bash
   curl -s -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"correo":"admin@marketplace.com","contrasena":"Admin123!"}'
   ```
   *Verificar en `/metrics`*:
   ```bash
   curl -s http://localhost:3000/metrics | grep "auth_attempts_total"
   # Debe mostrar un incremento en la etiqueta {estado="exito"}
   ```

2. **Creación o liquidación de una orden en el Marketplace**:
   *Ejecutar una compra en mercado primario o secundario y consultar `/metrics`*:
   ```bash
   curl -s http://localhost:3000/metrics | grep -E "marketplace_orders_total|marketplace_transactions_total|marketplace_volume_cents_total"
   # Debe reflejar los incrementos correspondientes según el mercado y el monto operado
   ```

3. **Recálculo manual de cotizaciones**:
   *Disparar recálculo como administrador*:
   ```bash
   curl -s -X POST http://localhost:3000/quotes/recalculate \
     -H "Authorization: Bearer <TOKEN_ADMIN>"
   ```
   *Verificar en `/metrics`*:
   ```bash
   curl -s http://localhost:3000/metrics | grep -E "quotes_recalculations_total|quotes_players_evaluated_total"
   ```

---

## 3. Ejecución de la Suite Automatizada de Pruebas

Para validar unitariamente e integradamente la feature sin levantar manualmente los servicios:

```bash
# 1. Ejecutar pruebas unitarias de observabilidad
npm run test:unit -- src/observability

# 2. Ejecutar pruebas de integración con Testcontainers (PostgreSQL dinámico)
npm run test:integration -- test/integration/observability

# 3. Validar que la cobertura cumpla con el umbral constitucional (>= 80% líneas y branches)
npm run test:unit:cov
npm run test:integration:cov
```
