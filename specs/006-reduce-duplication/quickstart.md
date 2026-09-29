# Quickstart & Verification Guide: Code Duplication Reduction

**Feature**: `006-reduce-duplication`  
**Date**: 2026-09-28  

## Guía de Verificación y Validación Rápida

### 0. Línea base (antes de tocar código, tarea T001)
Guardar en `specs/006-reduce-duplication/baseline/`:
```bash
npm --prefix frontend test -- --reporter=json --outputFile=../specs/006-reduce-duplication/baseline/frontend-tests.json
npm --prefix backend test -- --json --outputFile=../specs/006-reduce-duplication/baseline/backend-tests.json
```
y el conteo de `expect(` por archivo de test (esperado: frontend 187, backend 166) más el reporte inicial de `jscpd`. El backend requiere Docker en ejecución.

**Comparación posterior (en cada checkpoint):** los títulos de tests deben ser idénticos, el total de `expect(` (tests + helpers) debe ser igual al de la línea base y los helpers no deben contener ninguno.

### 1. Medición de Duplicación Local
```bash
npx --yes jscpd --min-lines 5 --min-tokens 50 --pattern "**/*.{ts,tsx,css}" --ignore "**/.specify/**,**/node_modules/**,**/dist/**,**/coverage/**,**/specs/**" backend frontend
```
**Resultado esperado:** duplicación por debajo del 3,0%, o cada bloque restante registrado en "Duplicación Aceptada" con su justificación.

### 2. Tests de Frontend
```bash
npm --prefix frontend test
```
**Resultado esperado:** 8 archivos, 106 tests exitosos.

### 3. Tests de Backend (requiere Docker)
```bash
npm --prefix backend test
```
**Resultado esperado:** 10 suites, 48 tests exitosos.

### 4. Builds
```bash
npm --prefix frontend run build
npm --prefix backend run build
```
**Resultado esperado:** cero errores de TypeScript.

### 5. Verificación visual (cambios de CSS y de rutas)
Comparar capturas antes y después de `/login`, `/register` y `/players`; deben ser idénticas.

### 6. SonarCloud
La métrica final solo se confirma con un nuevo análisis de SonarCloud tras el push (duplicación en código nuevo ≤ 3,0%).
