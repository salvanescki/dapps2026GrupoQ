# Quickstart & Validation Guide: Reducción Integral de Duplicación de Código en SonarQube Cloud

**Feature**: `016-reduce-sonar-duplications`  
**Date**: 2026-11-13

---

## 1. Prerrequisitos

- Node.js 20+ y `npm` instalados en el entorno local.
- Docker activo para la ejecución de tests de integración de `backend` basados en **Testcontainers** (PostgreSQL real).
- Variable `SONAR_TOKEN` configurada en `.env` o `~/.gemini/config/sonarqube.env` para consultar SonarQube Cloud (`salvanescki_dapps2026GrupoQ`, Región EU).

---

## 2. Verificación de Compilación y Tipado Estricto

Validar que las refactorizaciones en las capas `Model`, `Data Access`, `Service` y `Frontend` compilan sin errores de TypeScript:

```bash
# Compilación del módulo backend
cd backend && npm run build

# Compilación y verificación de tipos del módulo frontend
cd ../frontend && npm run build
```

**Resultado esperado**: Ambos comandos finalizan con código de salida `0` y sin errores de compilación ni de tipado.

---

## 3. Ejecución de Suites de Pruebas y Umbrales de Cobertura (≥ 80% Líneas y Ramas)

Ejecutar las suites de pruebas automatizadas en ambos stacks y verificar el cumplimiento del umbral mínimo constitucional (**≥ 80% en `lines` y ≥ 80% en `branches` por separado en `backend` y `frontend`**):

```bash
# Backend: tests unitarios, de integración (Testcontainers) y reporte de cobertura
cd backend && npm run test:cov

# Frontend: tests unitarios y de componentes con reporte de cobertura
cd ../frontend && npm run test:coverage
```

**Resultado esperado**:
- `backend`: 100% de suites y tests pasando (`0 failed`), cobertura global y de archivos nuevos/modificados ≥ 80% en `Lines` y ≥ 80% en `Branches`.
- `frontend`: 100% de suites y tests pasando (`0 failed`), cobertura global y de archivos modificados ≥ 80% en `Lines` y ≥ 80% en `Branches`.

---

## 4. Auditoría de Inmutabilidad de Pruebas Preexistentes (Principio IV)

Verificar que ningún archivo de prueba preexistente haya sido modificado ni eliminado durante la refactorización (solo se permite agregar nuevos archivos o bloques de prueba para cubrir unidades nuevas como `BaseRedisCacheService`):

```bash
git status --short backend/test frontend/tests
```

**Resultado esperado**: Ningún test preexistente aparece modificado (`M`) ni eliminado (`D`) sin autorización explícita del usuario.

---

## 5. Verificación de Contratos API, OpenAPI (Swagger) y Colección Postman (DoD)

Dado que esta intervención es una refactorización interna de mantenibilidad y configuración de CPD que no modifica rutas, controladores, DTOs ni códigos de respuesta HTTP:

```bash
git diff --name-only backend/src/controllers backend/src/scraping/controllers postman/
```

**Resultado esperado**: Sin cambios en endpoints ni esquemas de payload; la especificación OpenAPI (Swagger) y la colección Postman del repositorio permanecen 100% sincronizadas con el comportamiento expuesto.

---

## 6. Verificación de Duplicación en SonarQube Cloud

Una vez ejecutado el análisis de SonarQube Cloud (vía CI o `sonar-scanner`), consultar el estado actualizado de duplicaciones del proyecto:

```bash
python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --duplications
```

**Resultado esperado**:
- `duplicated_lines`: `0` (reducción desde `562`)
- `duplicated_blocks`: `0` (reducción desde `23`)
- `duplicated_files`: `0` (reducción desde `10`)
- `duplicated_lines_density`: `0.0%` en `Overall Code` (desde `2.0%`) y `0.0%` en `New Code` (desde `1.47%`)
