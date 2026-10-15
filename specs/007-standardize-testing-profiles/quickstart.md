# Quickstart: Validación de Perfiles de Testing

**Feature**: `007-standardize-testing-profiles`  
**Date**: 2026-10-13  
**Status**: Ready for Verification  

---

## Prerrequisitos

1. **Node.js**: Versión 20 LTS instalada (`node -v`).
2. **NPM**: Gestor de dependencias configurado.
3. **Docker Engine**: Activo y en ejecución (necesario para los perfiles de `integration` y `e2e` en backend vía Testcontainers).
4. Dependencias instaladas en ambos directorios:
   ```bash
   cd backend && npm ci --ignore-scripts
   cd ../frontend && npm ci --ignore-scripts
   ```

---

## Escenarios de Validación Rápida

### Escenario 1: Pruebas Unitarias Aisladas de Backend (Feedback Inmediato)
Verifica que las reglas de negocio de dominio se ejecutan de manera ultra-rápida sin depender de Docker ni red.

- **Comando**:
  ```bash
  cd backend
  npm run test:unit
  ```
- **Resultado Esperado**:
  - Pasan todas las suites unitarias de dominio (`jugador.entity.spec.ts`, `usuario.entity.spec.ts`, `usuario-login.spec.ts`, `criterio-filtro.spec.ts`).
  - Tiempo total de ejecución inferior a 10 segundos.
  - Código de salida: `0`.

---

### Escenario 2: Pruebas Unitarias Aisladas de Frontend
Verifica que los servicios puros y validadores se prueban en aislamiento sin montar componentes pesados ni servidores.

- **Comando**:
  ```bash
  cd frontend
  npm run test:unit
  ```
- **Resultado Esperado**:
  - Pasan los tests de validación y almacenamiento local (`storage.service.test.ts`, `validaciones.test.ts`, `validaciones-registro.test.ts`).
  - Tiempo total de ejecución inferior a 5 segundos.
  - Código de salida: `0`.

---

### Escenario 3: Pruebas de Integración con Entorno Aislado (Backend)
Verifica la persistencia contra base de datos PostgreSQL real levantada en Testcontainers.

- **Comando**:
  ```bash
  cd backend
  npm run test:integration:cov
  ```
- **Resultado Esperado**:
  - Testcontainers inicializa PostgreSQL dinámicamente.
  - Se ejecutan los tests de repositorios y servicios (`auth.service.spec.ts`, `jugador.service.spec.ts`, `usuario.typeorm-repository.spec.ts`, etc.).
  - Se genera el reporte de cobertura en `backend/coverage/integration/lcov.info`.
  - Los contenedores se limpian y destruyen al finalizar.
  - Código de salida: `0`.

---

### Escenario 4: Pruebas de Integración de Componentes (Frontend)
Verifica la interacción de vistas, estado de autenticación y rutas protegidas.

- **Comando**:
  ```bash
  cd frontend
  npm run test:integration:coverage
  ```
- **Resultado Esperado**:
  - Se ejecutan las suites de vistas y componentes con estado (`LoginView.test.tsx`, `RegisterView.test.tsx`, `ProtectedRoute.test.tsx`, `PlayersCatalogView.spec.tsx`).
  - Se genera el reporte en `frontend/coverage/integration/lcov.info`.
  - Código de salida: `0`.

---

### Escenario 5: Pruebas End-to-End (E2E) de Backend y Frontend
Verifica los flujos críticos de negocio descritos en [data-model.md](file:///home/nikkoros/dev/dapps2026GrupoQ/specs/007-standardize-testing-profiles/data-model.md).

- **Comandos**:
  ```bash
  # Backend E2E
  cd backend && npm run test:e2e:cov

  # Frontend E2E
  cd frontend && npm run test:e2e:coverage
  ```
- **Resultado Esperado**:
  - Se validan los flujos completos de autenticación (registro, login, `/auth/me`, logout) y catálogo.
  - Se generan los reportes en `backend/coverage/e2e/lcov.info` y `frontend/coverage/e2e/lcov.info`.
  - Código de salida: `0`.

---

### Escenario 6: Validación de Integridad de Cobertura para SonarQube
Verifica que las rutas de reportes generadas coinciden exactamente con las esperadas en `sonar-project.properties`.

- **Comando de verificación**:
  ```bash
  # Desde la raíz del repositorio
  ls -lh backend/coverage/unit/lcov.info
  ls -lh backend/coverage/integration/lcov.info
  ls -lh backend/coverage/e2e/lcov.info
  ls -lh frontend/coverage/unit/lcov.info
  ls -lh frontend/coverage/integration/lcov.info
  ls -lh frontend/coverage/e2e/lcov.info
  ```
- **Resultado Esperado**: Todos los archivos LCOV existen y contienen métricas sin colisiones destructivas.
