---
name: sonarqube-speckit
description: >-
  Consulta los issues abiertos y las métricas/bloques de duplicación de código de SonarQube Cloud
  (región EU) de este repositorio usando el MCP oficial de SonarQube o el script auxiliar, solicita
  al usuario el alcance a incluir y orquesta un único Spec, Plan y Tasks de remediación mediante
  Speckit lanzando un subagente limpio sin contexto previo para cada etapa (speckit-specify,
  speckit-plan y speckit-tasks).
---

# Flujo SonarQube Cloud (EU) -> Speckit (Issues y Duplicaciones con Subagentes Aislados por Fase)

Usa esta skill cuando el usuario pida:
- Ver o analizar los **issues abiertos** o las **duplicaciones de código** (`Overall Code` / `New Code`) del repositorio en **SonarQube Cloud**.
- Crear una especificación (`spec.md`), plan de implementación (`plan.md`) o lista de tareas (`tasks.md`) con **Speckit** para corregir issues o reducir duplicaciones de código en SonarQube Cloud.

## Contexto del Proyecto en SonarQube Cloud
- **Región**: EU (`https://sonarcloud.io` - valor por defecto del MCP oficial)
- **Organización (`SONARQUBE_ORG`)**: `salvanescki`
- **Project Key (`SONARQUBE_PROJECT_KEY`)**: `salvanescki_dapps2026GrupoQ`
- **Credenciales**: Se leen localmente desde `.env` o `.env.local` (variable `SONARQUBE_TOKEN`). **Nunca** guardes ni expongas tokens en archivos seguidos por Git.

---

## Principio de Aislamiento de Contexto (Anti-Bias de Speckit)

> **REGLA CRÍTICA DE ORQUESTACIÓN**:
> El agente principal actúa **únicamente como coordinador**. **NUNCA** ejecutes `speckit-specify`, `speckit-plan` y `speckit-tasks` juntos dentro del mismo contexto de conversación.
> Cada fase de Speckit **DEBE** ejecutarse invocando un **subagente nuevo y aislado** (`invoke_subagent` con `TypeName: "self"`, que inicia con contexto de conversación en blanco) de forma secuencial, para que cada etapa lea exclusivamente los artefactos persistidos en disco (`spec.md` -> `plan.md` -> `tasks.md`) sin sesgo (bias) de los pasos anteriores.

---

## Paso 1: Obtener y Resumir Issues Abiertos o Duplicaciones (Agente Coordinador)

Tienes dos mecanismos complementarios disponibles en el repositorio:

1. **Vía Script Auxiliar Rápido (Recomendado para resumen e insumo de Speckit)**:
   - **Para Issues Abiertos**:
     ```bash
     python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary
     ```
     Consulta `/api/issues/search` y agrupa todos los issues abiertos por **Módulo (`backend` vs `frontend`)**, **Severidad (`BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO`)** y **Regla (`typescript:Sxxxx`)**.
   - **Para Duplicaciones de Código (`Overall Code` y `New Code`)**:
     ```bash
     python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --duplications
     ```
     Consulta `/api/measures/component`, `/api/measures/component_tree` y `/api/duplications/show` para obtener la densidad de duplicación global/por módulo, los archivos afectados y los rangos exactos de líneas duplicadas (`inicio-fin`).

2. **Vía MCP Server Oficial (`sonarqube`)**:
   - También puedes usar `search_sonar_issues_in_projects` con `issueStatuses: ["OPEN", "CONFIRMED"]`, `get_component_measures` (métricas globales de cobertura/duplicación), `search_files_by_coverage` o `search_security_hotspots`.

---

## Paso 2: Consultar al Usuario el Alcance (Agente Coordinador)

Antes de lanzar cualquier subagente de Speckit:

1. Presenta al usuario el resumen claro (issues abiertos o bloques duplicados por módulo y archivo).
2. Pregunta al usuario (usando `ask_question` cuando esté disponible) qué subconjunto quiere incluir en el alcance:
   - **Si son Issues**: todos los abiertos, solo `CRITICAL`/`MAJOR`, por módulo (`backend`/`frontend`) o por reglas específicas.
   - **Si son Duplicaciones**: todas las duplicaciones de código productivo + exclusión de migraciones ORM en `sonar.cpd.exclusions` (`--exclude-migrations`), todas incluyendo migraciones, o un módulo específico (`--module backend` / `--module frontend`).

---

## Paso 3: Orquestar Speckit mediante Subagentes Sin Contexto Previo

Una vez que el usuario confirme el alcance, el **Agente Coordinador** debe ejecutar secuencialmente las fases delegando cada una a un subagente nuevo (`invoke_subagent` con `TypeName: "self"`):

### 3.1. Subagente 1 — Fase `speckit-specify` (Contexto Limpio)
Invoca un subagente nuevo (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Specify Agent"`) con estas instrucciones:
- Leer y ejecutar estrictamente `.agents/skills/speckit-specify/SKILL.md`.
- Obtener el insumo ejecutando según corresponda:
  - **Issues**:
    ```bash
    python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief [filtros]
    ```
  - **Duplicaciones**:
    ```bash
    python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --duplications-brief [--exclude-migrations] [--module ...]
    ```
- Crear **un único directorio de feature** en `specs/<NNN>-<short-name>/` y persistir la ruta en `.specify/feature.json`.
- Redactar `spec.md` enfocándose en el **QUÉ** y **POR QUÉ** (criterios de éxito medibles, escenarios de aceptación verificables y tabla de trazabilidad de reglas o bloques duplicados a reducir, sin filtrar detalles de implementación de bajo nivel que rompan el checklist).
- Generar y validar `checklists/requirements.md` hasta que todos los ítems pasen.
- Devolver al coordinador únicamente la ruta de `SPECIFY_FEATURE_DIRECTORY`, `SPEC_FILE` y el estado del checklist.

### 3.2. Subagente 2 — Fase `speckit-plan` (Contexto Limpio, Sin Bias del Prompt Inicial)
Cuando el Subagente 1 termine exitosamente, invoca un **segundo subagente nuevo** (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Plan Agent"`):
- **No le pases el historial previo ni el prompt del usuario.**
- Indícale únicamente:
  1. Leer y ejecutar estrictamente `.agents/skills/speckit-plan/SKILL.md` para la feature activa en `.specify/feature.json`.
  2. Consultar el detalle técnico de ubicaciones exactas (archivos y líneas) con `sonarcloud_issues.py --speckit-brief` o `--duplications-brief` durante la **Phase 0 (`research.md`)** para definir el patrón de remediación e inspeccionar los archivos afectados.
  3. Validar contra `.specify/memory/constitution.md` (arquitectura en 5 capas, modelo de dominio rico, inmutabilidad de tests existentes y cobertura $\ge 80\%$ en `backend` y `frontend`).
  4. Generar `plan.md`, `research.md` y `quickstart.md`, y devolver las rutas de los artefactos creados.

### 3.3. Subagente 3 — Fase `speckit-tasks` (Contexto Limpio, Basado Solo en Artefactos)
Cuando el Subagente 2 termine exitosamente, invoca un **tercer subagente nuevo** (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Tasks Agent"`):
- **No le pases contexto conversacional previo.**
- Indícale únicamente:
  1. Leer y ejecutar estrictamente `.agents/skills/speckit-tasks/SKILL.md` tomando como única fuente de verdad los artefactos en disco de la feature activa (`spec.md`, `plan.md`, `research.md`, `quickstart.md`).
  2. Generar `tasks.md` ordenado por dependencias, historia de usuario, módulo y archivo, y devolver el resumen de tareas generadas.
