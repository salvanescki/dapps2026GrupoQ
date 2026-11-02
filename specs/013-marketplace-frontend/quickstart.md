# Quickstart: Validación Integral — Marketplace Frontend, Trading, Portfolio y Gobernanza

**Feature**: `013-marketplace-frontend` | **Phase**: 1 — Design & Contracts | **Date**: 2026-11-02

---

## 1. Prerrequisitos y Puesta en Marcha Local

1. **Infraestructura PostgreSQL y Redis activa**:
   ```bash
   docker compose up -d
   ```

2. **Backend (`012-token-marketplace-oms` + rol en `PerfilUsuarioDto`)**:
   Verificar que `backend/.env` contenga las credenciales de bootstrap del superusuario (`ADMIN_CORREO=admin@marketplace.com`, `ADMIN_CONTRASENA=Admin1234!`, `ADMIN_NOMBRE=Admin Marketplace`), instalar dependencias y levantar en `:3000`:
   ```bash
   cd backend
   npm ci --ignore-scripts
   npm run start:dev
   ```

3. **Frontend (`React 18 + Vite 6 + recharts`)**:
   Instalar dependencias (incluyendo `recharts`) y levantar el servidor de desarrollo en `:5173` (con proxy `/api` → `http://localhost:3000`):
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

4. **Catálogo y emisión inicial disponibles**:
   Al arrancar el backend, `AdminBootstrapService` aprovisiona la cuenta `ADMIN` y `TokensService` garantiza los 100 tokens iniciales a `1,00` crédito por cada jugador activo. Si la base está vacía, sincronizar jugadores con `POST http://localhost:3000/players/sync`.

---

## 2. Escenarios de Validación End-to-End (US1 – US5)

### Escenario 1 — Sesión con Rol, Dashboard Ejecutivo y Cartelera de Ranking (US1)
1. Registrar o iniciar sesión en `http://localhost:5173/login` con un inversor estándar (`trader1@marketplace.com` / `Trader1234!`).
2. Verificar en `Navbar`: enlaces visibles a **Inicio**, **Marketplace**, **Catálogo de Jugadores** y **Portfolio**, y ausencia del enlace **Gobernanza**.
3. Verificar en `/` (`HomeView`): saldo líquido real (`1.000,00` cr. iniciales), patrimonio neto, rendimiento latente (`0,00` cr. / `0,00%`), estrategia activa y top del ranking.
4. Navegar a `/marketplace`, cambiar el filtro de posición (`Delantero`, `Mediocampista`, `Portero`, `Todas`) y verificar el orden descendente por cotización vigente, badge de variación porcentual y disponibilidad sobre 100 tokens.

### Escenario 2 — Gráfica Lineal de Cotizaciones y Compra en Mercado Primario (US2)
1. Hacer clic sobre un jugador desde `/marketplace` o `/players` para abrir `PlayerDetailModal`.
2. Verificar la ficha deportiva, `StatsGrid` y la gráfica `PlayerQuoteLinearChart` (*shadcn/ui Line Chart - Linear*: segmentos rectos sin suavizado curvo, sin líneas verticales de cuadrícula y tooltip con fecha, valor, score, versión de estrategia e indicador `sinEstadisticas`).
3. En el formulario de compra primaria, ingresar `cantidad = 5` (y opcionalmente `precioMaximoUnitario`), comprobar el cálculo previo (`5 × cotización vigente` vs saldo disponible) y confirmar.
4. Verificar notificación de éxito en español y actualización inmediata (sin recargar el navegador) del saldo disponible, la tenencia del jugador y los tokens disponibles.

### Escenario 3 — Portfolio Personal, Gráfica Lineal Patrimonial e Historial Filtrable (US3)
1. Navegar a `/portfolio`.
2. Verificar los 4 indicadores consolidados: Saldo en Billetera, Valoración de Tokens, Patrimonio Neto Total y Ganancia/Pérdida Latente (créditos y `%`).
3. Inspeccionar `PortfolioBalanceLinearChart` (*Line Chart - Linear* con series `patrimonioNeto` en esmeralda `#10b981` y `saldoBilletera` en ámbar `#f59e0b`), comprobando que culmina exactamente en los valores vigentes del Portfolio.
4. Verificar la tabla de posiciones activas y probar los filtros combinables del historial (`Compra` / `Venta`, jugador, rango `Desde` y `Hasta`) y el botón de limpiar filtros.

### Escenario 4 — Mercado Secundario P2P: Custodia, Compra Parcial y Cancelación (US4)
1. Con `trader1`, publicar una orden de venta de `3` tokens a `1,80` cr. desde `/portfolio` o desde `PlayerDetailModal`.
2. Verificar que en el Portfolio de `trader1` esos `3` tokens figuran como retenidos en custodia (`en venta`), que en el libro secundario del jugador la oferta aparece propia (con autocompra bloqueada y botón **Cancelar orden** habilitado).
3. Iniciar sesión con `trader2@marketplace.com`, abrir el mismo jugador, seleccionar la oferta de `1,80` cr. en el libro secundario y comprar `1` token (`Parcial`). Verificar el débito exacto de `1,80` cr. y remanente `2`.
4. Volver a `trader1` y cancelar el remanente (`2` tokens) desde sus órdenes abiertas; comprobar la restitución inmediata a su saldo de tokens disponibles.

### Escenario 5 — Gobernanza de Estrategias, Recálculo Manual y Auditoría Global (US5)
1. Con `trader1` (`USUARIO`), intentar navegar manualmente a `http://localhost:5173/admin`: verificar bloqueo inmediato y redirección a `/` con aviso informativo en español.
2. Iniciar sesión con `admin@marketplace.com` (`ADMIN`) y acceder a `/admin` desde el enlace **Gobernanza** en `Navbar`.
3. Conmutar la estrategia activa entre `GLOBAL` (*Ponderación Global*) y `POSICIONAL` (*Ponderación Posicional*) y verificar confirmación inmediata.
4. Ejecutar **Recalcular cotizaciones ahora**, verificar estado de progreso (botón deshabilitado contra doble envío) y despliegue del resumen (`totalJugadoresProcesados`, `exitosos`, `fallidos`, `sinEstadisticas`, `versionEstrategia`, `duracionMs`).
5. Filtrar la tabla de auditoría global por mercado (`Primario` / `Secundario`), jugador, usuario y fechas.

---

## 3. Verificación Automatizada de Calidad, Tipado y Cobertura (≥ 80% CI)

### 3.1 Suite Completa de Frontend (3 Perfiles Vitest + Umbral Global + Build)
```bash
cd frontend
npm run test:unit:coverage
npm run test:integration:coverage
npm run test:e2e:coverage
npm run test:coverage
npm run build
```
**Resultado esperado**:
- 100% de tests preexistentes e incorporados en verde (0 archivos de test existentes modificados).
- Cobertura global ≥ 80% en `lines`, `branches`, `functions` y `statements`.
- Compilación `tsc -b && vite build` sin errores de tipos ni advertencias de bundle.

### 3.2 Suite Completa de Backend (Verificación de No-Regresión de `PerfilUsuarioDto` y Paridad Contractual)
```bash
cd backend
npm run test:unit:cov
npm run test:integration:cov
npm run test:e2e:cov
npm run test:cov -- --runInBand --testTimeout=60000
npm run build
```
**Resultado esperado**:
- Todas las suites unitarias, de integración (Testcontainers) y E2E pasan con cobertura ≥ 80% y 0 tests preexistentes modificados.

### 3.3 Verificación de Sincronización Postman ↔ Swagger ↔ Contratos REST (`FR-033`..`FR-035`, `SC-008`, DoD #3)
1. **Verificación automatizada determinista (Swagger en memoria vs Contratos REST versionados vs `postman/collection.json`)**:
   ```bash
   cd backend
   npx jest --config ./test/jest-integration.json \
     test/integration/marketplace/auth-perfil-rol.spec.ts \
     test/integration/marketplace/postman-swagger-parity.spec.ts \
     --runInBand
   ```
   **Resultado esperado**:
   - `SwaggerModule.createDocument(app, swaggerConfig)` coincide 1:1 con [`contracts/openapi-auth-perfil-v1.1.yaml`](./contracts/openapi-auth-perfil-v1.1.yaml) en `PerfilUsuarioDto` (`rol` en `['USUARIO', 'ADMIN']` y `saldo` numérico) con **0 modificaciones en `AuthController`**.
   - Los 17 endpoints preexistentes consumidos sin cambios (12 de Marketplace/OMS/Auditoría + 5 de Catálogo/Estadísticas/Logout) permanecen intactos en `swaggerDoc.paths` (**0 endpoints modificados innecesariamente**).
   - `postman/collection.json` cubre el 100% de los endpoints de alcance con rutas, verbos, payloads válidos para `ValidationPipe` (`whitelist`/`forbidNonWhitelisted`) y scripts `pm.test` para respuestas exitosas y errores aplicables (`400`, `401`, `403`, `404`, `409`).
2. **Validación interactiva opcional en Swagger UI y Postman Collection Runner**:
   - Con el backend activo en `:3000`, inspeccionar `http://localhost:3000/api/docs` y `http://localhost:3000/api/docs-json`.
   - Importar `postman/collection.json` y `postman/football_tokens.postman_environment.json` en Postman y ejecutar las carpetas `1. Auth` → `7. Scraping WhoScored` en el Collection Runner comprobando 100% de aserciones `pm.test` en verde.

---

## 4. Referencias de Diseño

- Especificación funcional: [spec.md](./spec.md)
- Decisiones de investigación: [research.md](./research.md)
- Modelo de datos y algoritmos de series lineales: [data-model.md](./data-model.md)
- Contratos HTTP/REST y clientes API: [contracts/rest-api-consumption.contract.md](./contracts/rest-api-consumption.contract.md)
- Contrato OpenAPI versionado de perfil autenticado (v1.1.0): [contracts/openapi-auth-perfil-v1.1.yaml](./contracts/openapi-auth-perfil-v1.1.yaml)
- Contrato de sincronización y verificación Postman ↔ Swagger ↔ REST: [contracts/postman-swagger-sync.contract.md](./contracts/postman-swagger-sync.contract.md)
- Contratos de rutas, hooks, componentes y `chart.tsx`: [contracts/ui-components-and-charts.contract.md](./contracts/ui-components-and-charts.contract.md)

