# Phase 1 Data Model: Remediación Integral de los 49 Issues Abiertos en SonarQube Cloud

**Feature**: `020-remediate-sonarcloud-issues`
**Alcance de persistencia**: **Ningún cambio de esquema de base de datos relacional ni migraciones PostgreSQL / Redis**. Todas las modificaciones son refinamientos internos de entidades de dominio (`Model`), contratos de tipado en `frontend` y utilidades de observabilidad/auditoría.

---

## 1. Refinamiento Interno en Entidades de Dominio (`backend`)

### 1.1 `EstadisticaJugador` (`backend/src/scraping/domain/estadistica-jugador.entity.ts`)

- **Regla remediada**: `typescript:S2933` (`MAJOR`).
- **Naturaleza del cambio**: Reorganización interna de almacenamiento privado para fortalecer el `Rich Domain Model` (Principio II) y eliminar mutación dinámica por casting inseguro (`this as unknown as Record<string, unknown>`).
- **Estructura interna refinada**:
  - Tipo interno:
    - `EstadoMetricasEstadisticas`: intersección estricta `Record<CampoContadorEstadistico, number> & Record<CampoMetricaOpcional, number | null>` (25 métricas: 6 contadores numéricos + 19 métricas opcionales `number | null`).
  - Atributos inmutables (`private readonly`):
    - `_id: string`
    - `_jugadorId: string`
    - `_temporada: string`
    - `_liga: string`
    - `_fuente: string`
    - `_metricas: EstadoMetricasEstadisticas` (referencia inmutable; sus propiedades se actualizan de forma tipada dentro de `actualizarEstadisticas()`).
  - Atributos escalares mutables (`private`):
    - `_competencia: string | null`
    - `_etapa: string | null`
    - `_fechaActualizacion: Date`
- **Invariantes preservadas (sin cambios en reglas de negocio)**:
  - `jugadorId`, `temporada` y `liga` obligatorios y no vacíos.
  - `competencia` ≤ 100 caracteres; `etapa` ≤ 50 caracteres.
  - Contadores (`goles`, `asistencias`, `partidosJugados`, `minutosJugados`, `tarjetasAmarillas`, `tarjetasRojas`) ≥ 0.
  - Rangos: `rating` ∈ `[0, 10]`, `precisionPase` ∈ `[0, 100]`, `porcentajeAtajadas` ∈ `[0, 100]`.
- **Interfaz pública preservada**: Los 33 getters públicos, el método de fábrica `EstadisticaJugador.crear(props)`, `validarInvariantes()` y `actualizarEstadisticas(props)` conservan exactamente sus firmas y comportamiento.

### 1.2 `EquipoSemanal` (`backend/src/domain/equipo-semanal.entity.ts`)

- **Regla remediada**: `typescript:S4043` (`MAJOR`).
- **Naturaleza del cambio**: En el método privado `EquipoSemanal.seleccionarPorPosicion()`, la ordenación de candidatos se ejecuta en sentencia separada sobre una copia superficial (`const ordenados = [...candidatos]; ordenados.sort(compararCandidatos); return ordenados.slice(0, requeridos);`), compatible con `target: "ES2021"`.
- **Invariantes preservadas**:
  - Formación táctica estricta `4-3-3` (1 Portero, 4 Defensas, 3 Mediocampistas, 3 Delanteros).
  - Criterio determinista de desempate en `compararCandidatos`: mayor `cotizacion.valor`, luego mayor `cotizacion.score`, luego orden alfabético por `jugador.nombre`.
  - Mínimo de elegibilidad (`MINUTOS_MINIMOS_ELEGIBILIDAD = 270`), unicidad de 11 miembros y validación de semanas cerradas.

---

## 2. Refinamiento de Modelos de Tipos y Helpers de Observabilidad

### 2.1 `DesgloseTransacciones` (`frontend/src/types/observability.types.ts`)

- **Regla remediada**: `typescript:S6571` (`MINOR`, 2 ocurrencias en línea 52).
- **Antes**: `mercado: 'primario' | 'secundario' | string;`
- **Después**: `mercado: string;` (documentado con JSDoc indicando los valores nominales `'primario'` y `'secundario'`, manteniendo apertura para etiquetas adicionales de Prometheus).
- **Impacto**: Elimina redundancia de tipos sin restringir ningún payload proveniente del `backend` y permite suprimir el cast `as any` en `frontend/src/utils/formato-observabilidad.ts`.

### 2.2 Contratos Internos de Serialización Segura de Auditoría (`backend/src/observability/utils/audit-sanitizer.util.ts`)

- **Reglas remediadas**: `typescript:S3776` (`CRITICAL`), `typescript:S8786` (`MAJOR`), `typescript:S6551` (`MINOR`, 8 ocurrencias en el subsistema de observabilidad).
- **Nuevas unidades puras exportadas del utilitario**:
  - `convertirValorATextoSeguro(valor: unknown): string`: Convierte cualquier `unknown` (primitivos, `BigInt`, `Symbol`, funciones u objetos complejos/circulares) en una representación textual legible y libre de `'[object Object]'`, delegando objetos a `JSON.stringify(sanitizarValor(valor))` con protección fail-safe ante excepciones.
  - `convertirCampoEscalarATexto(valor: unknown): string | null`: Normaliza campos de identidad de actor HTTP (`id`, `email`, `rol`) aceptando únicamente primitivos representables (`string`, `number`, `boolean`, `bigint`) y devolviendo `null` ante valores ausentes u objetos no escalares.

---

## 3. Modelo de Trazabilidad de Remediación (Artefacto de Calidad)

| Entidad lógica | Atributos clave | Estado objetivo |
| --- | --- | --- |
| **Hallazgo SonarQube Cloud** | `rule` (17 reglas), `severity` (`CRITICAL`/`MAJOR`/`MINOR`), `module` (`backend`/`frontend`), `file` (19 archivos), `line`, `effort` | 49 → **0** (48 en producción + 1 en prueba condicionado a Principio IV) |
| **Compuerta de Inmutabilidad (Principio IV)** | `targetFile`: `backend/test/unit/observability/audit-sanitizer.spec.ts`, `line`: `74`, `rule`: `typescript:S5906`, `requiresExplicitUserApproval`: `true` | Sin editar hasta confirmación `"sí"` explícita del usuario en implementación |
| **Cobertura Independiente (Principio VI)** | `backend` (`lines >= 80%`, `branches >= 80%`), `frontend` (`lines >= 80%`, `branches >= 80%`) | Mantenida o incrementada sin reducción de umbrales |
