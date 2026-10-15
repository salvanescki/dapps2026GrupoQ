# Contract Specification: Testing Profiles & CI Lifecycle

**Feature**: `007-standardize-testing-profiles`  
**Date**: 2026-10-13  
**Status**: Completed  

---

## 1. Contrato de Comandos de Ejecución (CLI Interface Contract)

Cada subproyecto (`backend` y `frontend`) expone un conjunto canónico de scripts en su respectivo `package.json`. Las herramientas de orquestación, desarrolladores y agentes de CI interactúan exclusivamente a través de esta interfaz.

### Backend (`/backend/package.json`)

| Comando | Perfil | Cobertura | Requiere Docker | Tiempo Esperado |
|---|---|---|---|---|
| `npm run test:unit` | Unitario | No | No | < 10 segundos |
| `npm run test:unit:cov` | Unitario | Sí (`./coverage/unit`) | No | < 15 segundos |
| `npm run test:integration` | Integración | No | Sí (Testcontainers) | < 45 segundos |
| `npm run test:integration:cov` | Integración | Sí (`./coverage/integration`) | Sí (Testcontainers) | < 60 segundos |
| `npm run test:e2e` | End-to-End | No | Sí (Testcontainers) | < 45 segundos |
| `npm run test:e2e:cov` | End-to-End | Sí (`./coverage/e2e`) | Sí (Testcontainers) | < 60 segundos |
| `npm run test:all` | Todos (secuencial) | No | Sí | Variable |
| `npm test` | Global / Legacy | No | Sí | Variable |

### Frontend (`/frontend/package.json`)

| Comando | Perfil | Cobertura | Requiere Red/DB | Tiempo Esperado |
|---|---|---|---|---|
| `npm run test:unit` | Unitario | No | No | < 5 segundos |
| `npm run test:unit:coverage` | Unitario | Sí (`./coverage/unit`) | No | < 10 segundos |
| `npm run test:integration` | Integración | No | No | < 15 segundos |
| `npm run test:integration:coverage`| Integración | Sí (`./coverage/integration`)| No | < 20 segundos |
| `npm run test:e2e` | End-to-End | No | No | < 15 segundos |
| `npm run test:e2e:coverage` | End-to-End | Sí (`./coverage/e2e`) | No | < 20 segundos |
| `npm run test:all` | Todos (secuencial) | No | No | Variable |
| `npm test` | Global / Legacy | No | No | Variable |

---

## 2. Contrato de Salida de Códigos (Exit Codes)

Todos los comandos deben respetar los códigos de salida estándar de procesos POSIX:
- `0`: Todos los tests del perfil pasaron satisfactoriamente.
- `!= 0` (habitualmente `1`): Al menos un test falló, se produjo un error de sintaxis/tipado o se violó un timeout.
- Ante fallo en un perfil durante `test:all`, el proceso debe interrumpirse inmediatamente con código distinto de 0 sin ejecutar los perfiles posteriores.

---

## 3. Contrato de Directorios de Cobertura y Consumo SonarQube

Para evitar colisiones entre perfiles y permitir la ingesta consolidada en SonarQube Cloud:

```text
backend/
└── coverage/
    ├── lcov.info               # Cobertura global (si se ejecuta jest con coverage)
    ├── unit/
    │   └── lcov.info           # Cobertura de tests unitarios (src/domain)
    ├── integration/
    │   └── lcov.info           # Cobertura de integración (src/services, src/data-access)
    └── e2e/
        └── lcov.info           # Cobertura E2E (src/controllers, endpoints)

frontend/
└── coverage/
    ├── lcov.info               # Cobertura global de frontend
    ├── unit/
    │   └── lcov.info           # Cobertura unitaria de frontend
    ├── integration/
    │   └── lcov.info           # Cobertura de integración de componentes
    └── e2e/
        └── lcov.info           # Cobertura de flujos E2E de usuario
```

### Configuración en `sonar-project.properties`:
```properties
sonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,backend/coverage/unit/lcov.info,backend/coverage/integration/lcov.info,backend/coverage/e2e/lcov.info,frontend/coverage/lcov.info,frontend/coverage/unit/lcov.info,frontend/coverage/integration/lcov.info,frontend/coverage/e2e/lcov.info
```

---

## 4. Contrato del Pipeline de CI (`.github/workflows/ci.yml`)

El pipeline define etapas separadas por perfil para trazabilidad inmediata de fallos:

```yaml
# Job: backend
- name: Run unit tests with coverage
  run: npm run test:unit:cov
- name: Run integration tests with coverage
  run: npm run test:integration:cov
- name: Run e2e tests with coverage
  run: npm run test:e2e:cov

# Job: frontend
- name: Run unit tests with coverage
  run: npm run test:unit:coverage
- name: Run integration tests with coverage
  run: npm run test:integration:coverage
- name: Run e2e tests with coverage
  run: npm run test:e2e:coverage
```
