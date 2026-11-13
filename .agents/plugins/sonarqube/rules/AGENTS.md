# Integración SonarQube Cloud (EU) + Speckit

Este proyecto está vinculado con **SonarQube Cloud (Región EU - `https://sonarcloud.io`)**:
- **Organización (`SONARQUBE_ORG`)**: `salvanescki`
- **Project Key (`SONARQUBE_PROJECT_KEY`)**: `salvanescki_dapps2026GrupoQ`

## Reglas para los Agentes

1. **Seguridad de Credenciales**:
   - **NUNCA** escribas ni hardcodees `SONARQUBE_TOKEN` o `SONAR_TOKEN` en archivos versionados (`.agents/`, `.vscode/`, `docker-compose.yml`, etc.).
   - El token siempre debe residir únicamente en `.env`, `.env.local` (ignorados por `.gitignore`) o en `~/.gemini/config/sonarqube.env`.

2. **Consulta de Issues y Planificación con Speckit (Subagentes sin Contexto por Fase)**:
   - Cuando el usuario pida revisar los issues abiertos de SonarQube Cloud o armar un plan con **Speckit** para corregirlos, activa y sigue la skill **`sonarqube-speckit`** (`.agents/skills/sonarqube-speckit/SKILL.md`).
   - Siempre consulta primero al usuario qué issues abiertos incluir (filtrando por severidad, módulo `backend`/`frontend` o regla).
   - **Aislamiento de contexto obligatorio**: El agente principal solo coordina. Cada etapa de Speckit (`speckit-specify` -> `speckit-plan` -> `speckit-tasks`) **debe ejecutarse en un subagente nuevo e independiente** (`invoke_subagent` con `TypeName: "self"`) sin historial previo para evitar bias entre etapas.
