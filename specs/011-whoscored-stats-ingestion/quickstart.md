# Quickstart & Validation Guide: Ingesta Integral de Estadísticas WhoScored e Identidad Externa

**Feature**: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)  
**Feature Branch**: `feat/scraping-whoscored`  
**Date**: 2026-10-25 (Ajustes Obligatorios de Arquitectura)  

---

## 1. Requisitos Previos y Entorno

- **Node.js**: Versión 20 o superior.
- **Gestor de Paquetes**: `npm`.
- **Navegador Playwright Chromium**: Instalado para integración y scraping en vivo (`npm run playwright:install`).
- **PostgreSQL**: Instancia PostgreSQL 16 (local o contenedor Docker) requerida únicamente para integración.
- **Redis (Caché L1)**: Opcional en desarrollo local (`REDIS_HOST`, `REDIS_PORT`); si no está activo, el servicio activa degradación controlada emitiendo log `WARN` y consultando en vivo al navegador sin abortar el proceso.

### Dependencias y Bloqueos Conocidos
- **Testcontainers**: Las pruebas de integración (`npm run test:integration`) requieren obligatoriamente el socket de Docker activo (`/var/run/docker.sock`). En entornos sandbox donde Docker no esté disponible, se deben ejecutar exclusivamente las pruebas unitarias.
- **Acceso a WhoScored**: En ejecuciones en vivo desde data centers o sin cabeceras adecuadas, la fuente puede presentar desafíos anti-bot interactivos. En pruebas automatizadas se utilizan fixtures mockeados para garantizar determinismo y reproducibilidad.

---

## 2. Niveles de Validación Separados

### Nivel 1: Tests Unitarios Mockeados (Aislamiento Total)

> [!NOTE]
> Los tests unitarios se ejecutan en aislamiento absoluto: **NO** requieren base de datos PostgreSQL, **NO** requieren Redis y **NO** requieren conexión a internet ni a WhoScored. Validan invariantes, lógica de deduplicación y orquestación utilizando mocks y fixtures determinísticos. Todos los comandos son scripts reales de `backend/package.json`.

```bash
cd backend

# 1. Validar dominio e identidades externas (Feature 01: invariantes, getters y métodos de dominio mínimos)
npm run test:unit -- test/unit/domain/jugador.identidad-externa.spec.ts test/unit/domain/equipo.identidad-externa.spec.ts test/unit/scraping/estadistica-jugador.procedencia.spec.ts

# 2. Validar normalización y fallback determinístico por club local con fixtures
npm run test:unit -- test/unit/scraping/scraping.service.spec.ts

# 3. Validar resiliencia ante pausas, límites de reintentos y errores aislados por equipo
npm run test:unit -- test/unit/scraping/scraping-resilience.spec.ts

# 4. Validar adaptador de feed WhoScored, validación de esquema y fallback DOM observable
npm run test:unit -- test/unit/scraping/whoscored-feed-adapter.spec.ts

# 5. Validar caché L1 Redis: TTL de 24h, cache hit, cache miss y degradación controlada (mockeando cliente Redis)
npm run test:unit -- test/unit/scraping/scraping-cache.service.spec.ts
```
**Resultado Esperado**: Todas las suites unitarias finalizan en `PASS` con cobertura >= 80% en código nuevo y 0 regresiones en suites existentes.

---

### Nivel 2: Migraciones e Integración con Testcontainers (PostgreSQL Real)

> [!IMPORTANT]
> Requiere Docker daemon activo para levantar contenedores efímeros de PostgreSQL con Testcontainers. Valida persistencia real y transaccionalidad sin dependencias de red externa.

```bash
cd backend

# Ejecutar tests de integración de repositorios, migración incremental y upsert transaccional
npm run test:integration -- test/integration/scraping/estadistica-jugador-contexto.integration.spec.ts test/integration/scraping/scraping-upsert.spec.ts
```
**Resultado Esperado**:
- La migración agrega las columnas nullable (`who_scored_player_id`, `who_scored_team_id`, `competencia`, `etapa`) y crea el índice único funcional `uq_estadistica_jugador_contexto` (verificando que aborta con excepción clara si detecta duplicados legacy no resueltos).
- La persistencia transaccional demuestra aislamiento estricto por liga e idempotencia comprobada (0 duplicados en re-ejecuciones).

---

### Nivel 3: Ejecución Real Controlada del Scraper (`run-scraper`)

> [!CAUTION]
> Esta prueba ejecuta el scraper real contra WhoScored en un navegador Chromium interactivo/stealth. Requiere conexión activa a internet y entorno gráfico o emulador de display.

```bash
cd backend

# 1. Compilar proyecto TypeScript y verificar tipado estricto
npm run build

# 2. Ejecutar el runner standalone controlado de scraping
npm run test:unit -- test/unit/scraping/run-scraper.spec.ts
```
**Resultado Esperado**:
- Se inicializa Chromium con Stealth.
- Se resuelve el descubrimiento de competición y equipos (almacenando en Redis L1 si está activo).
- Se procesan los equipos aplicando pausas reguladas (1.5s - 3.5s).
- Se validan los umbrales de cobertura (>= 350 jugadores con minutos por liga) y asociación (>= 85%).
- Se registra en base de datos la auditoría estructurada con desglose pormenorizado por liga.
