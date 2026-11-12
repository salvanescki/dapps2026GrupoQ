---
name: sonarqube-speckit
description: >-
  Consulta los issues abiertos de SonarQube Cloud (región EU) de este repositorio usando el MCP
  oficial de SonarQube o el script auxiliar, solicita al usuario qué issues incluir (filtrando por
  severidad, módulo o regla) y genera un único Spec y Plan de remediación mediante Speckit
  (speckit-specify, speckit-plan y speckit-tasks).
---

# Flujo SonarQube Cloud (EU) -> Speckit

Usa esta skill cuando el usuario pida:
- Ver o analizar los issues abiertos del repositorio en **SonarQube Cloud**.
- Crear una especificación (`spec.md`), plan de implementación (`plan.md`) o lista de tareas (`tasks.md`) con **Speckit** para corregir issues de SonarQube Cloud.

## Contexto del Proyecto en SonarQube Cloud
- **Región**: EU (`https://sonarcloud.io` - valor por defecto del MCP oficial)
- **Organización (`SONARQUBE_ORG`)**: `salvanescki`
- **Project Key (`SONARQUBE_PROJECT_KEY`)**: `salvanescki_dapps2026GrupoQ`
- **Credenciales**: Se leen localmente desde `.env` o `.env.local` (variable `SONARQUBE_TOKEN`). **Nunca** guardes ni expongas tokens en archivos seguidos por Git.

---

## Paso 1: Obtener y Resumir los Issues Abiertos

Tienes dos mecanismos complementarios disponibles en el repositorio:

1. **Vía MCP Server Oficial (`sonarqube`)**:
   - Usa la herramienta MCP `search_sonar_issues_in_projects` con `issueStatuses: ["OPEN", "CONFIRMED"]` (la organización `salvanescki` y el proyecto `salvanescki_dapps2026GrupoQ` ya están preconfigurados en el servidor MCP).
   - Para detalles adicionales de reglas o cobertura, puedes usar `get_component_measures`, `search_files_by_coverage` o `search_security_hotspots`.

2. **Vía Script Auxiliar Rápido (Resumen agrupado y Fallback sin contenedor)**:
   - Ejecuta desde la raíz del repositorio:
     ```bash
     python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary
     ```
   - Este script consulta la API de SonarQube Cloud EU (`https://sonarcloud.io/api/issues/search`) usando `SONARQUBE_TOKEN` de `.env` / `.env.local` si está definido, y agrupa todos los issues abiertos por **Módulo (`backend` vs `frontend`)**, **Severidad (`BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO`)** y **Regla (`typescript:Sxxxx`)**.

---

## Paso 2: Consultar al Usuario el Alcance (Obligatorio antes de Speckit)

Antes de ejecutar `speckit-specify` o `speckit-plan`:

1. Presenta al usuario el resumen claro de los issues abiertos actuales (por módulo, severidad y principales reglas).
2. Pregunta al usuario (usando la herramienta `ask_question` cuando esté disponible) qué subconjunto de issues quiere incluir en el Spec/Plan de Speckit. Opciones recomendadas:
   - Todos los issues abiertos (`backend` + `frontend`)
   - Solo issues de severidad `MAJOR` / `CRITICAL` / `BLOCKER`
   - Solo issues de un módulo específico (`backend` o `frontend`)
   - Selección personalizada por reglas (p. ej. `typescript:S9383`, `typescript:S6819`, `typescript:S9382`)

---

## Paso 3: Generar un Único Spec y Plan Consolidado con Speckit

Una vez que el usuario confirme el filtro de issues:

1. **Extraer el listado detallado de issues filtrados**:
   Ejecuta el script con `--speckit-brief` aplicando los filtros elegidos por el usuario:
   ```bash
   # Ejemplos de filtros opcionales:
   # --module backend|frontend
   # --severity MAJOR,CRITICAL
   # --rule typescript:S9383,typescript:S6819
   python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief
   ```

2. **Fase 1 - Especificación (`speckit-specify`)**:
   - Lee y sigue las instrucciones de [speckit-specify](../speckit-specify/SKILL.md).
   - Crea **un único directorio de feature** en `specs/<NNN>-fix-sonarcloud-issues/` (y actualiza `.specify/feature.json`).
   - Redacta `spec.md` agrupando los requerimientos funcionales por categoría de calidad/confiabilidad/accesibilidad/mantenibilidad (evitando acoplar el qué con detalles internos innecesarios en `spec.md`, tal como exige la validación de Speckit) y documentando en una tabla de trazabilidad las reglas y conteos objetivo a reducir a 0.
   - Genera y valida `checklists/requirements.md`.

3. **Fase 2 - Plan Técnico (`speckit-plan`)**:
   - Lee y sigue las instrucciones de [speckit-plan](../speckit-plan/SKILL.md).
   - Ejecuta `python3 .specify/scripts/python/setup_plan.py --json` desde la raíz del repositorio.
   - En `research.md`, documenta la decisión técnica de remediación para cada regla de SonarQube incluida (por ejemplo, cómo resolver promesas no esperadas `S9383`, accesibilidad en componentes interactivos `S6819`, `await` en bucles `S9382`, etc.).
   - En `plan.md`, detalla los archivos exactos de `backend/` y/o `frontend/` a modificar y la verificación contra la constitución del proyecto (`.specify/memory/constitution.md`, manteniendo cobertura >= 80%).
   - En `quickstart.md`, incluye los comandos de prueba (`npm run test:cov` en backend, `npm run test:coverage` en frontend) y el comando `python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary` o las herramientas MCP para verificar la resolución.

4. **Fase 3 - Tareas (`speckit-tasks`, opcional a pedido del usuario)**:
   - Si el usuario desea pasar directamente al desglose de tareas ejecutables, invoca [speckit-tasks](../speckit-tasks/SKILL.md) para generar `tasks.md` ordenado por archivo y regla.
