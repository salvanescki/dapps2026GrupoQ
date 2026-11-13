# Quickstart & Guía de Validación: Remediación SonarQube Cloud (`015-fix-sonarcloud-issues`)

Esta guía documenta los escenarios ejecutables para verificar de punta a punta que los **73 issues abiertos** (20 reglas) en `backend` y `frontend` han sido remediados sin regresiones funcionales, respetando la inmutabilidad de los tests existentes y manteniendo la cobertura mínima $\ge 80\%$ en líneas y bifurcaciones.

---

## 1. Prerrequisitos

- **Node.js**: v20+ y `npm` instalados.
- **Docker**: Activo y en ejecución (requerido por Testcontainers para las pruebas de integración de `backend` con PostgreSQL real).
- **Python 3**: Disponible para ejecutar el script de consulta a SonarQube Cloud.
- **Credenciales SonarQube Cloud**: Variable `SONARQUBE_TOKEN` configurada en `~/.gemini/config/sonarqube.env` o `.env` local (nunca versionada).

---

## 2. Verificación de Compilación (`backend` y `frontend`)

Desde la raíz del repositorio (`/home/nikkoros/dev/dapps2026GrupoQ`):

```bash
# Compilar backend (NestJS + TypeScript)
cd backend && npm run build

# Compilar frontend (TypeScript tsc -b + Vite build)
cd ../frontend && npm run build
```

**Resultado esperado**: Ambos comandos finalizan con código de salida `0` y sin errores de tipado ni empaquetado.

---

## 3. Verificación de Inmutabilidad de Tests Existentes (Principio Constitucional IV)

Verificar que ningún archivo de prueba preexistente haya sido modificado ni eliminado:

```bash
git status -s backend/test backend/src/**/*.spec.ts frontend/tests
```

**Resultado esperado**: Ningún archivo preexistente bajo `backend/test/`, `backend/src/**/*.spec.ts` o `frontend/tests/` aparece como modificado (`M`) o eliminado (`D`).

---

## 4. Ejecución de Suites de Pruebas y Cobertura ($\ge 80\%$ Independiente)

### 4.1. Módulo `backend`

```bash
cd /home/nikkoros/dev/dapps2026GrupoQ/backend

# Pruebas unitarias con cobertura
npm run test:unit:cov

# Pruebas de integración (Testcontainers PostgreSQL)
npm run test:integration
```

**Resultado esperado**:
- 100% de las suites unitarias y de integración pasan con `0` fallos.
- Cobertura global de `backend` $\ge 80\%$ en `Lines` y $\ge 80\%$ en `Branches`.

### 4.2. Módulo `frontend`

```bash
cd /home/nikkoros/dev/dapps2026GrupoQ/frontend

# Suite completa (unitarias + integración + E2E) con cobertura
npm run test:coverage
```

**Resultado esperado**:
- 100% de las suites de `frontend` pasan con `0` fallos (incluyendo `PlayerCard.test.tsx`, `PlayerDetailModal.test.tsx`, `PitchPlayerCard.test.tsx`, `catalog-modal-flow.test.tsx`, `home-and-marketplace-ranking.test.tsx`, `portfolio-view.test.tsx` y `TeamOfTheWeekView.test.tsx`).
- Cobertura global de `frontend` $\ge 80\%$ en `Lines` y $\ge 80\%$ en `Branches`.

---

## 5. Verificación de Contratos OpenAPI y Colección Postman (DoD #3)

Dado que esta feature no modifica ningún endpoint, ruta, DTO de entrada/salida ni código de estado HTTP de la API REST:

```bash
git diff --name-only backend/src/controllers/ postman/
```

**Resultado esperado**: Sin cambios en controladores ni en esquemas de payload, confirmando que la especificación OpenAPI (Swagger) y la colección Postman versionada permanecen 100% sincronizadas.

---

## 6. Verificación de Issues Abiertos en SonarQube Cloud

Una vez ejecutado el análisis de SonarQube Cloud en CI/rama:

```bash
cd /home/nikkoros/dev/dapps2026GrupoQ
python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary
```

**Resultado esperado**:
- Total de issues abiertos en las 20 reglas en alcance: **0** (reducción de 73 a 0; `CRITICAL`: 0, `MAJOR`: 0, `MINOR`: 0).

