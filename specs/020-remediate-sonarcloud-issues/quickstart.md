# Quickstart Validation Guide: Remediación Integral de los 49 Issues de SonarQube Cloud

**Feature**: `020-remediate-sonarcloud-issues`
**Referencias**: [research.md](research.md) | [data-model.md](data-model.md) | [contracts/observability-endpoints-preservation.md](contracts/observability-endpoints-preservation.md)

Esta guía define los escenarios ejecutables de validación end-to-end para demostrar que los 49 hallazgos de SonarQube Cloud fueron remediados sin regresiones funcionales, preservando la Constitución del proyecto y la cobertura independiente ≥ 80% en `backend` y `frontend`.

---

## 1. Prerrequisitos

- Node.js 20+ y `npm` instalados.
- Dependencias instaladas en `backend/` y `frontend/` (`npm install` si corresponde).
- Docker activo para ejecutar las pruebas de integración y E2E de `backend` con Testcontainers PostgreSQL.
- Credencial `SONARQUBE_TOKEN` configurada exclusivamente en `.env`, `.env.local` (ignorados por `.gitignore`) o `~/.gemini/config/sonarqube.env` (nunca en archivos versionados).

---

## 2. Escenario 1 — Compilación y Verificación de Tipado (`backend` y `frontend`)

Verifica que no existen errores de compilación ni incompatibilidades de `target` (`ES2021` en `backend`, `ES2022` estricto en `frontend`):

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

**Resultado esperado**:
- `backend`: `nest build` finaliza con código de salida `0` y genera `dist/` sin errores.
- `frontend`: `tsc -b && vite build` finaliza con código de salida `0` sin errores de tipado ni empaquetado.

---

## 3. Escenario 2 — Suites de Pruebas y Cobertura Independiente ≥ 80% (`backend`)

Ejecuta las suites unitarias, cobertura completa e integración/E2E con Testcontainers:

```bash
cd backend
npm run test:unit:cov
npm run test:cov
npm run test:integration
npm run test:e2e
```

**Resultado esperado**:
- **0 pruebas fallidas** en todas las suites (`unit`, `integration`, `e2e`), incluyendo las nuevas suites aditivas de remediación y sin regresiones en `equipo-semanal`, `estadistica-jugador`, `health.controller`, `metrics.controller` y todo el subsistema `observability`.
- Cobertura global de `backend` (reporte de `npm run test:cov`) con **≥ 80% en líneas** y **≥ 80% en bifurcaciones**, y cobertura propia **≥ 80%** en el código nuevo incorporado (Principio VI).

---

## 4. Escenario 3 — Suites de Pruebas y Cobertura Independiente ≥ 80% (`frontend`)

Ejecuta las pruebas unitarias, integración, E2E y el reporte global de cobertura de `frontend`:

```bash
cd frontend
npm run test:all
npm run test:coverage
```

**Resultado esperado**:
- **0 pruebas fallidas** en `unit`, `integration` y `e2e`, incluyendo pruebas de `observabilityApi`, `useObservability`, `formato-observabilidad`, `prometheus-parser`, `navegacion` y la nueva suite aditiva anti-ReDoS/casos límite.
- Cobertura global de `frontend` (`npm run test:coverage`) con **≥ 80% en líneas** y **≥ 80% en bifurcaciones**, sin reducir umbrales vigentes (Principio VI).

---

## 5. Escenario 4 — Auditoría de Inmutabilidad de Pruebas (Principio IV) y Contratos API (DoD #3)

1. **Inmutabilidad de pruebas existentes**:
   ```bash
   git diff --name-only -- backend/test frontend/tests
   ```
   - **Resultado esperado para los 48 issues de producción**: Ningún archivo de prueba existente aparece modificado (solo pueden figurar archivos nuevos aditivos).
   - **Compuerta explícita para `typescript:S5906`**: `backend/test/unit/observability/audit-sanitizer.spec.ts` (línea 74) solo puede aparecer modificado si el usuario otorgó un `"sí"` explícito previo a la edición; en caso contrario, el archivo permanece intacto.

2. **Verificación de contratos Swagger/OpenAPI y colección Postman**:
   ```bash
   git diff -- backend/src/health/health.controller.ts backend/src/observability/controllers/metrics.controller.ts postman/
   ```
   - **Resultado esperado**: Solo la remoción de `async` en los 3 métodos listados en [contracts/observability-endpoints-preservation.md](contracts/observability-endpoints-preservation.md), sin alteración de rutas, códigos HTTP ni decoradores Swagger; `postman/football_tokens_auth.postman_collection.json` permanece sincronizada sin cambios requeridos.

---

## 6. Escenario 5 — Verificación de Cero Hallazgos en SonarQube Cloud

Una vez subidos y analizados los cambios en SonarQube Cloud (CI / análisis del repositorio `salvanescki_dapps2026GrupoQ`):

```bash
python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary
```

**Resultado esperado**:
- Total de issues abiertos: **0** (49 → 0, con 0 `CRITICAL`, 0 `MAJOR`, 0 `MINOR` y 0 minutos de deuda técnica asociada; o 1 exclusivamente si el usuario decidió no autorizar la edición de `audit-sanitizer.spec.ts` L74 bajo el Principio IV).
- Sin introducción de nuevos hallazgos, duplicaciones adicionales ni alertas de seguridad.
