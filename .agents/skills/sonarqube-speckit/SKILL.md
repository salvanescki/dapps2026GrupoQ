---
name: sonarqube-speckit
description: >-
  Consulta los issues abiertos de SonarQube Cloud (región EU) de este repositorio usando el MCP
  oficial de SonarQube o el script auxiliar, solicita al usuario qué issues incluir (filtrando por
  severidad, módulo o regla) y orquesta un único Spec, Plan y Tasks de remediación mediante Speckit
  lanzando un subagente limpio sin contexto previo para cada etapa (speckit-specify, speckit-plan y speckit-tasks).
---

# Flujo SonarQube Cloud (EU) -> Speckit (con Subagentes Aislados por Fase)

Usa esta skill cuando el usuario pida:
- Ver o analizar los issues abiertos del repositorio en **SonarQube Cloud**.
- Crear una especificación (`spec.md`), plan de implementación (`plan.md`) o lista de tareas (`tasks.md`) con **Speckit** para corregir issues de SonarQube Cloud.

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

## Paso 1: Obtener y Resumir los Issues Abiertos (Agente Coordinador)

Tienes dos mecanismos complementarios disponibles en el repositorio:

1. **Vía Script Auxiliar Rápido (Recomendado para el resumen inicial)**:
   - Ejecuta desde la raíz del repositorio:
     ```bash
     python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary
     ```
   - Consulta la API de SonarQube Cloud EU (`https://sonarcloud.io/api/issues/search`) y agrupa todos los issues abiertos por **Módulo (`backend` vs `frontend`)**, **Severidad (`BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO`)** y **Regla (`typescript:Sxxxx`)**.

2. **Vía MCP Server Oficial (`sonarqube`)**:
   - También puedes usar `search_sonar_issues_in_projects` con `issueStatuses: ["OPEN", "CONFIRMED"]`, `get_component_measures`, `search_files_by_coverage` o `search_security_hotspots`.

---

## Paso 2: Consultar al Usuario el Alcance (Agente Coordinador)

Antes de lanzar cualquier subagente de Speckit:

1. Presenta al usuario el resumen claro de los issues abiertos actuales (por módulo, severidad y principales reglas).
2. Pregunta al usuario (usando `ask_question` cuando esté disponible) qué subconjunto de issues quiere incluir en el alcance. Opciones sugeridas:
   - Todos los issues abiertos (`backend` + `frontend`)
   - Solo issues de severidad `CRITICAL` / `MAJOR`
   - Solo issues de un módulo específico (`backend` o `frontend`)
   - Selección personalizada por reglas (p. ej. `typescript:S3776`, `typescript:S9382`, `typescript:S6819`)

---

## Paso 3: Orquestar Speckit mediante Subagentes Sin Contexto Previo

Una vez que el usuario confirme el filtro de issues, el **Agente Coordinador** debe ejecutar secuencialmente las fases delegando cada una a un subagente nuevo (`invoke_subagent` con `TypeName: "self"`):

### 3.1. Subagente 1 — Fase `speckit-specify` (Contexto Limpio)
Invoca un subagente nuevo (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Specify Agent"`) con estas instrucciones:
- Leer y ejecutar estrictamente `.agents/skills/speckit-specify/SKILL.md`.
- Obtener el insumo de issues ejecutando:
  ```bash
  python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief [filtros elegidos por el usuario]
  ```
- Crear **un único directorio de feature** en `specs/<NNN>-fix-sonarcloud-issues/` y persistir la ruta en `.specify/feature.json`.
- Redactar `spec.md` enfocándose en el **QUÉ** y **POR QUÉ** (criterios de éxito medibles, escenarios de aceptación verificables y tabla de trazabilidad de reglas/cantidades a llevar a 0, sin filtrar detalles de implementación de bajo nivel que rompan el checklist).
- Generar y validar `checklists/requirements.md` hasta que todos los ítems pasen.
- Devolver al coordinador únicamente la ruta de `SPECIFY_FEATURE_DIRECTORY`, `SPEC_FILE` y el estado del checklist.

### 3.2. Subagente 2 — Fase `speckit-plan` (Contexto Limpio, Sin Bias del Prompt Inicial)
Cuando el Subagente 1 termine exitosamente, invoca un **segundo subagente nuevo** (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Plan Agent"`):
- **No le pases el historial previo ni el prompt del usuario.**
- Indícale únicamente:
  1. Leer y ejecutar estrictamente `.agents/skills/speckit-plan/SKILL.md` para la feature activa en `.specify/feature.json` (`specs/<NNN>-fix-sonarcloud-issues/`).
  2. Consultar el detalle técnico de ubicaciones exactas (archivos y líneas) con `python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief [filtros]` (y/o herramientas del MCP `sonarqube`) durante la **Phase 0 (`research.md`)** para definir el patrón de remediación de cada regla de SonarQube e inspeccionar los archivos afectados.
  3. Validar contra `.specify/memory/constitution.md` (cobertura $\ge 80\%$ en `backend` y `frontend`).
  4. Generar `plan.md`, `research.md` y `quickstart.md`, y devolver las rutas de los artefactos creados.

### 3.3. Subagente 3 — Fase `speckit-tasks` (Contexto Limpio, Basado Solo en Artefactos)
Cuando el Subagente 2 termine exitosamente (o cuando el usuario pida generar las tareas), invoca un **tercer subagente nuevo** (`invoke_subagent`, `TypeName: "self"`, `Role: "Speckit Tasks Agent"`):
- **No le pases contexto conversacional previo.**
- Indícale únicamente:
  1. Leer y ejecutar estrictamente `.agents/skills/speckit-tasks/SKILL.md` tomando como única fuente de verdad los artefactos en disco de `specs/<NNN>-fix-sonarcloud-issues/` (`spec.md`, `plan.md`, `research.md`, `quickstart.md`).
  2. Generar `tasks.md` ordenado por dependencias, módulo y archivo, y devolver el resumen de tareas generadas.
