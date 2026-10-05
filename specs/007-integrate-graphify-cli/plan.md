# Implementation Plan: Integración de Graphify CLI para Análisis y Navegación del Repositorio

**Branch**: `007-integrate-graphify-cli` | **Date**: 2026-10-05 | **Spec**: [specs/007-integrate-graphify-cli/spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/007-integrate-graphify-cli/spec.md)

**Input**: Feature specification from `specs/007-integrate-graphify-cli/spec.md`

## Summary

Integrar la herramienta open source **Graphify CLI** (paquete PyPI `graphifyy` de Graphify Labs) al flujo de desarrollo del proyecto y al entorno Antigravity IDE, con el fin de generar, navegar e inspeccionar localmente el grafo de conocimiento del repositorio:
1. **Instalación y Aislamiento**: Configurar el acceso a la CLI open source mediante gestores modernos de paquetes (`pipx`, `uv`) y proveer un script orquestador ejecutable en el repositorio (`scripts/graphify.sh`) compatible con atajos en `package.json` (`npm run graphify`).
2. **Integración con Antigravity IDE**: Desarrollar la Workspace Skill en `.agents/skills/graphify/SKILL.md` para permitir que el IDE y los agentes consulten el grafo (`/graphify`) y naveguen dependencias de forma puramente local.
3. **Restricción Estricta**: Exclusión total de servidores MCP (Model Context Protocol) y servicios en la nube de Graphify Hosted, garantizando operación 100% offline y confidencial.
4. **Higiene del Repositorio y Documentación**: Configurar `.gitignore` para ignorar `graphify-out/` y archivos temporales de análisis, y documentar guías exhaustivas en español en `docs/graphify.md` y `README.md`.

## Technical Context

**Language/Version**: Python ≥ 3.10 (ejecución de Graphify CLI / Tree-sitter), Bash / Shell Scripting, TypeScript 5.6 (código base analizado en backend y frontend), Node.js ≥ 20.  
**Primary Dependencies**: `graphifyy` (CLI open source de Graphify Labs basado en Tree-sitter), Antigravity IDE Skills engine (`agy-customizations`).  
**Storage**: Archivos locales estructurados en `graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, caché SHA256). Sin bases de datos vectoriales ni servicios en la nube.  
**Testing**: Pruebas de integración de comandos CLI (`scripts/graphify.sh scan|report|view|query|clean`), verificación de reglas `.gitignore` (`git status --short`), verificación de no regresión en suites existentes de backend (Jest + Testcontainers) y frontend (Vitest).  
**Target Platform**: Linux, macOS, Windows (entorno de desarrollo local y workstation de desarrollador).  
**Project Type**: Monorepo Web Application (Backend NestJS + Frontend React) con integración de Developer Tooling & AI Assistant Skill.  
**Performance Goals**: Generación completa del grafo del repositorio en < 2 minutos (SC-001) y consulta local instantánea (< 1 segundo).  
**Constraints**: 
- Estricta exclusión de Graphify Hosted y de cualquier petición de red saliente (FR-002, FR-004, SC-002).
- Prohibición taxativa de servidores o configuraciones MCP (FR-003).
- Respeto irrestricto de la Constitución del proyecto v1.1.0 (en especial Principios I, II, III, IV y V).
- 100% de los artefactos generados ignorados por Git (FR-010, SC-004).  
**Scale/Scope**: Análisis de ~11k líneas de código fuente en backend y frontend, más especificaciones en `specs/` y documentación en `docs/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Arquitectura en 5 Capas y Backend Stateless)**: PASS. Graphify CLI opera puramente como herramienta de análisis estático del ciclo de desarrollo. No modifica la arquitectura de ejecución del backend ni introduce estado persistente en la API NestJS. Permite visualizar con mayor claridad la unidireccionalidad de las 5 capas (Controller → Service → Model → Repository).
- **Principle II (Rich Domain Model y DDD)**: PASS. El análisis sintáctico de Graphify mapea las entidades ricas de dominio (`Jugador`, `Usuario`, etc.) respetando su integridad, sin imponer interfaces anémicas ni alterar su lógica de negocio.
- **Principle III & IV (Testing Riguroso e Inmutabilidad de Tests - NON-NEGOTIABLE)**: PASS. La incorporación de Graphify CLI no modifica, reubica ni elimina ningún test preexistente en el backend (Jest / Testcontainers) ni en el frontend (Vitest). La suite de pruebas permanece intacta y continúa pasando al 100%.
- **Principle V (Convenciones de Idioma)**: PASS. Toda la documentación, especificaciones, guías de usuario y la definición de la skill en `.agents/skills/graphify/SKILL.md` se redactan en español. Los términos técnicos (`CLI`, `AST`, `Tree-sitter`, `Graphify`, `Antigravity IDE`) se conservan en inglés.
- **Stack Tecnológico y Estándares de Arquitectura (v1.1.0)**: PASS. Se incorpora Graphify de Graphify Labs exclusivamente a través de su versión open source CLI, cumpliendo explícitamente con la última ratificación de la constitución.
- **Definition of Done (DoD)**: PASS. Se mantienen las suites de pruebas existentes al 100%, compilación limpia, y no se alteran endpoints de la API (colección Postman intacta).

## Project Structure

### Documentation (this feature)

```text
specs/007-integrate-graphify-cli/
├── spec.md              # Especificación funcional de la integración
├── plan.md              # Este plan de implementación
├── research.md          # Investigación técnica: paquete PyPI, aislamiento y no-MCP
├── data-model.md        # Modelo de entidades, configuración y artefactos
├── quickstart.md        # Guía paso a paso de verificación y ejecución
└── contracts/           # Contratos de interfaces
    ├── cli-runner.contract.md        # Contrato del script orquestador scripts/graphify.sh
    └── antigravity-skill.contract.md # Contrato de la Workspace Skill de Antigravity IDE
```

### Source Code & Tooling Structure (repository root)

```text
dapps2026GrupoQ/
├── .gitignore                         # Actualización: exclusión de graphify-out/, cachés y .venv-graphify/
├── README.md                          # Actualización: sección de uso y navegación del grafo con Graphify CLI
├── package.json                       # [NUEVO o actualizado en raíz]: script de conveniencia "graphify"
├── scripts/
│   └── graphify.sh                    # [NUEVO] Script orquestador ejecutable local para scan, report, view, query, clean
├── docs/
│   └── graphify.md                    # [NUEVO] Guía completa de uso, arquitectura e integración en español
└── .agents/
    └── skills/
        └── graphify/
            └── SKILL.md               # [NUEVO] Workspace Skill para Antigravity IDE (/graphify)
```

**Structure Decision**: Se introduce el script orquestador en `scripts/graphify.sh`, la skill de IDE en `.agents/skills/graphify/SKILL.md`, la documentación detallada en `docs/graphify.md`, y la actualización de `.gitignore` y `README.md`. No se altera la estructura interna de `backend/` ni `frontend/`.

## Complexity Tracking

> *Sin violaciones constitucionales ni desvíos arquitectónicos. Todas las compuertas pasaron exitosamente.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Ninguna | N/A | N/A |
