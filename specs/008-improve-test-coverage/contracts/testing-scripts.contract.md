# Testing Scripts & CLI Execution Contract

**Feature Branch**: `008-improve-test-coverage`  
**Date**: 2026-10-15  
**Spec Reference**: [spec.md](spec.md)

---

## 1. Backend Testing Interface Contract

### Command: `npm run test:cov`
- **Working Directory**: `backend/`
- **Input**: None (o flags de Jest estándar pasados tras `--`)
- **Expected Artifacts**:
  - `backend/coverage/lcov.info`
  - `backend/coverage/index.html`
- **Quality Gate Criteria**:
  - `Lines >= 80%`
  - `Branches >= 80%`
  - 100% de los tests pasando (sin fallos).
- **Exit Codes**:
  - `0`: Todos los tests pasaron Y se cumplieron todos los umbrales de cobertura.
  - `!= 0`: Fallo en algún test O cobertura de líneas < 80% O cobertura de bifurcaciones < 80%.

---

## 2. Frontend Testing Interface Contract

### Command: `npm run test:coverage`
- **Working Directory**: `frontend/`
- **Input**: None
- **Expected Artifacts**:
  - `frontend/coverage/lcov.info`
  - `frontend/coverage/index.html`
- **Quality Gate Criteria**:
  - `Lines >= 80%`
  - `Branches >= 80%`
  - 100% de los tests pasando (sin fallos).
- **Exit Codes**:
  - `0`: Todos los tests pasaron Y se cumplieron todos los umbrales de cobertura.
  - `!= 0`: Fallo en algún test O cobertura de líneas < 80% O cobertura de bifurcaciones < 80%.
