# Quickstart Validation Guide: Mejora de Cobertura de Tests (Frontend y Backend >= 80%)

**Feature Branch**: `008-improve-test-coverage`  
**Date**: 2026-10-15  
**Spec Reference**: [spec.md](spec.md) | **Contracts**: [contracts/](contracts/)

---

## Prerequisites

1. **Node.js**: >= 20.x
2. **Docker**: Daemon activo (necesario para Testcontainers en las pruebas de integración del backend).
3. **Dependencias instaladas**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

---

## Validation Scenarios

### Scenario 1: Validación de Cobertura y Umbrales en Backend

1. **Comando de ejecución**:
   ```bash
   cd backend
   npm run test:cov
   ```
2. **Resultados esperados**:
   - Se ejecutan todos los test suites unitarios y de integración con Testcontainers.
   - 100% de los tests pasan exitosamente (`PASS`).
   - La tabla de cobertura de Jest reporta:
     - `% Lines` >= 80% (global)
     - `% Branch` >= 80% (global)
   - El comando termina con código de salida `0`.
   - Se generan los reportes en `backend/coverage/`.

---

### Scenario 2: Validación de Cobertura y Umbrales en Frontend

1. **Comando de ejecución**:
   ```bash
   cd frontend
   npm run test:coverage
   ```
2. **Resultados esperados**:
   - Se ejecutan todos los test suites unitarios y de integración en jsdom.
   - 100% de los tests pasan exitosamente (`PASS`).
   - La tabla de cobertura de Vitest (v8) reporta:
     - `% Lines` >= 80% (global)
     - `% Branch` >= 80% (global)
   - El comando termina con código de salida `0`.
   - Se generan los reportes en `frontend/coverage/`.

---

### Scenario 3: Comprobación de Fallo ante Caída por Debajo de Umbral (Gate Enforcement)

1. **Prueba de regresión / efecto ratchet**:
   - Si temporalmente se reduce la cobertura (o se incrementa el umbral por encima de la cobertura actual), la herramienta de prueba detiene el pipeline con código de error distinto de cero.
2. **Resultado esperado**:
   - Jest emite: `Jest: "global" coverage threshold for branches (80%) not met: XX%` y código de salida 1.
   - Vitest emite: `ERROR: Coverage threshold for branches (80%) not met` y código de salida 1.

---

### Scenario 4: Ejecución Combinada del Monorepo

1. **Comando de validación global**:
   ```bash
   cd backend && npm run test:cov && cd ../frontend && npm run test:coverage
   ```
2. **Resultado esperado**:
   - Ambos comandos finalizan con código `0` de manera independiente, confirmando el cumplimiento de ambos umbrales sin compensación cruzada.
