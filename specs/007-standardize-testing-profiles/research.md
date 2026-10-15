# Research: Estandarización de Estrategia de Testing por Perfiles (Backend y Frontend)

**Feature**: `007-standardize-testing-profiles`  
**Date**: 2026-10-13  
**Status**: Completed  

---

## 1. Segregación de Perfiles en Backend (NestJS + Jest)

### Contexto & Problema
Actualmente el backend cuenta con dos archivos de configuración Jest:
- `test/jest-unit.json`: Ejecuta `test/unit/**/*.spec.ts` y mide cobertura sobre `src/domain/**/*.ts`.
- `test/jest-integration.json`: Ejecuta `test/integration/**/*.spec.ts` y mide cobertura sobre `src/services/**/*.ts` y `src/data-access/**/*.ts`.

Sin embargo, dentro de `test/integration/` coexisten tests de servicios/repositorios con tests de extremo a extremo HTTP completos con NestJS (`auth-perfil.spec.ts`), y no existe un perfil ni comando explícito `test:e2e` ni `test:e2e:cov`. Además, el comando raíz `npm test` ejecuta `jest.config.js` que busca indiscriminadamente `.*\.spec\.ts$`.

### Decisiones de Arquitectura
1. **Configuración de Perfiles Jest**:
   - **Unitario (`jest-unit.json`)**: Mantiene `testMatch: ["<rootDir>/test/unit/**/*.spec.ts"]`, cobertura en `src/domain/**/*.ts`, directorio de cobertura `./coverage/unit`. Totalmente offline, sin Docker ni servicios externos.
   - **Integración (`jest-integration.json`)**: Enfocado en servicios y repositorios (`testMatch: ["<rootDir>/test/integration/**/*.spec.ts"]`, excluyendo o diferenciando los tests E2E de API). Cobertura en `src/services/**/*.ts` y `src/data-access/**/*.ts`, directorio `./coverage/integration`. Utiliza Testcontainers.
   - **E2E (`jest-e2e.json`)**: Configuración dedicada para tests de endpoints completos HTTP (NestJS app + Supertest + Testcontainers). `testMatch: ["<rootDir>/test/e2e/**/*.spec.ts"]` (o patrón unificado que incluya `auth-perfil.spec.ts` y flujos de catálogo de jugadores), cobertura en `src/controllers/**/*.ts` (o módulos integrales), directorio `./coverage/e2e`.
   - **Preservación e Inmutabilidad (Principio IV)**: Para no mover ni romper `auth-perfil.spec.ts` de forma que infrinja la política de inmutabilidad, `test/e2e/` albergará los specs E2E y/o `jest-e2e.json` referenciará los tests E2E existentes y nuevos. Si `auth-perfil.spec.ts` permanece en `test/integration/`, `jest-e2e.json` puede incluirlo explícitamente (`testMatch: ["<rootDir>/test/e2e/**/*.spec.ts", "<rootDir>/test/integration/auth-perfil.spec.ts"]`), o se puede trasladar/referenciar manteniendo retrocompatibilidad exacta. Mantener una referencia o carpeta `test/e2e/` clara es el estándar canónico de NestJS.
2. **Scripts en `backend/package.json`**:
   - `test:unit`: `jest --config ./test/jest-unit.json`
   - `test:unit:cov`: `jest --config ./test/jest-unit.json --coverage`
   - `test:integration`: `jest --config ./test/jest-integration.json --runInBand`
   - `test:integration:cov`: `jest --config ./test/jest-integration.json --runInBand --coverage`
   - `test:e2e`: `jest --config ./test/jest-e2e.json --runInBand`
   - `test:e2e:cov`: `jest --config ./test/jest-e2e.json --runInBand --coverage`
   - `test:all`: Ejecución secuencial orquestada de los 3 perfiles (`npm run test:unit && npm run test:integration && npm run test:e2e`).
   - `test`: Mantiene `jest` para retrocompatibilidad completa con herramientas existentes.

### Alternativas Evaluadas
- *Ejecutar todo con filtros `--testPathPattern` en CLI*: Rechazado porque ensucia los comandos de CI y no permite aislar los directorios de cobertura ni timeouts específicos por perfil (`jest-integration` requiere `testTimeout: 60000`, `jest-unit` no).
- *Un único archivo `jest.config.js` con Jest projects*: Rechazado porque ejecutar `jest --selectProjects unit` resulta menos directo para scripts estándar de package.json y dificulta aislar reportes LCOV individuales para CI sin colisiones.

---

## 2. Segregación de Perfiles en Frontend (React + Vitest)

### Contexto & Problema
En `frontend/`, actualmente hay 8 suites de tests repartidas en:
- `tests/unit/`: `storage.service.test.ts`, `validaciones.test.ts`, `validaciones-registro.test.ts`
- `tests/integration/`: `LoginView.test.tsx`, `ProtectedRoute.test.tsx`, `RegisterView.test.tsx`
- `tests/views/`: `EmptyStateFilterReset.spec.tsx`, `PlayersCatalogView.spec.tsx`

El script en `frontend/package.json` solo tiene `test: vitest run`, `test:watch: vitest`, y `test:coverage: vitest run --coverage`. No existen comandos para perfiles aislados.

### Decisiones de Arquitectura
1. **Configuración de Perfiles Vitest**:
   - Se crearán archivos de configuración específicos (o configuración modular con Vitest configs) para que cada perfil tenga su propio `include`, `coverage.reportsDirectory` y flags:
     - `vitest.unit.config.ts`: `include: ['tests/unit/**/*.{test,spec}.{ts,tsx}']`, cobertura en `src/services/storage.service.ts`, `src/utils/**/*.ts`, directorio `./coverage/unit`. Entorno `node` o `jsdom` ultrarrápido sin dependencias de renderizado complejo.
     - `vitest.integration.config.ts`: `include: ['tests/integration/**/*.{test,spec}.{ts,tsx}', 'tests/views/**/*.{test,spec}.{ts,tsx}']` (excluyendo flujos E2E de simulación completa), directorio `./coverage/integration`.
     - `vitest.e2e.config.ts`: `include: ['tests/e2e/**/*.{test,spec}.{ts,tsx}']`, directorio `./coverage/e2e`. Ejecuta flujos de extremo a extremo que validan el flujo completo de navegación, autenticación y catálogo del usuario montando la aplicación con React Router (`MemoryRouter`) y estado persistido.
2. **Scripts en `frontend/package.json`**:
   - `test:unit`: `vitest run --config vitest.unit.config.ts`
   - `test:unit:coverage`: `vitest run --config vitest.unit.config.ts --coverage`
   - `test:integration`: `vitest run --config vitest.integration.config.ts`
   - `test:integration:coverage`: `vitest run --config vitest.integration.config.ts --coverage`
   - `test:e2e`: `vitest run --config vitest.e2e.config.ts`
   - `test:e2e:coverage`: `vitest run --config vitest.e2e.config.ts --coverage`
   - `test:all`: `npm run test:unit && npm run test:integration && npm run test:e2e`
   - `test`: `vitest run` (mantiene ejecución global para compatibilidad)
   - `test:coverage`: `vitest run --coverage` (mantiene reporte global en `./coverage`)

### Alternativas Evaluadas
- *Cypress / Playwright para E2E*: Rechazado para este feature porque introduciría dependencias pesadas de navegadores binarios (Chromium/Firefox), aumentaría los tiempos de CI en minutos, y requeriría levantar servidores de desarrollo completos en GitHub Actions cuando la especificación técnica (Assumptions) explicita que Vitest y Testing Library son suficientes y adecuados para verificar los flujos críticos de vistas sin browsers externos.
- *Filtros simples por CLI (`vitest run tests/unit`)*: Viable para ejecución básica, pero no permite fijar directorios de reporte de cobertura diferenciados (`coverage/unit`, `coverage/integration`, `coverage/e2e`) de manera limpia y mantenible.

---

## 3. Estrategia de Cobertura y Compatibilidad con SonarQube Cloud

### Contexto & Problema
En `sonar-project.properties`:
```properties
sonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,backend/coverage/unit/lcov.info,backend/coverage/integration/lcov.info,frontend/coverage/lcov.info
```
Si backend genera `backend/coverage/e2e/lcov.info` o frontend genera reportes particionados en `frontend/coverage/unit/lcov.info`, `frontend/coverage/integration/lcov.info`, `frontend/coverage/e2e/lcov.info`, SonarQube debe poder leer todos ellos sin perder cobertura de ninguna capa.

### Decisiones
1. Actualizar `sonar-project.properties` para incluir:
   ```properties
   sonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,backend/coverage/unit/lcov.info,backend/coverage/integration/lcov.info,backend/coverage/e2e/lcov.info,frontend/coverage/lcov.info,frontend/coverage/unit/lcov.info,frontend/coverage/integration/lcov.info,frontend/coverage/e2e/lcov.info
   ```
2. Garantizar que cada configuración de cobertura emita reporte LCOV con `projectRoot: '..'` para que las rutas de archivo relativas coincidan con la raíz del repositorio que inspecciona el scanner de SonarQube.

---

## 4. Pipeline de Integración Continua (GitHub Actions)

### Contexto & Problema
En `.github/workflows/ci.yml`, el job `backend` corre:
```yaml
- name: Run unit tests with coverage
  run: npm run test:unit:cov
- name: Run integration tests with coverage
  run: npm run test:integration:cov
```
Falta el paso explícito para E2E en backend (`npm run test:e2e:cov`), y en frontend solo corre `npm run test:coverage` monolíticamente.

### Decisiones
1. **En Job `backend`**:
   - Step 1: `Run unit tests with coverage` (`npm run test:unit:cov`)
   - Step 2: `Run integration tests with coverage` (`npm run test:integration:cov`)
   - Step 3: `Run e2e tests with coverage` (`npm run test:e2e:cov`)
   - Step 4: `Build` (`npm run build`)
2. **En Job `frontend`**:
   - Step 1: `Run unit tests with coverage` (`npm run test:unit:coverage`)
   - Step 2: `Run integration tests with coverage` (`npm run test:integration:coverage`)
   - Step 3: `Run e2e tests with coverage` (`npm run test:e2e:coverage`)
   - Step 4: `Build` (`npm run build`)
3. La modularización por pasos dentro del mismo job garantiza ejecución rápida y diagnóstica: si falla la etapa unitaria, el paso de CI falla de inmediato indicando exactamente "Run unit tests with coverage", cumpliendo SC-005 y FR-009.
