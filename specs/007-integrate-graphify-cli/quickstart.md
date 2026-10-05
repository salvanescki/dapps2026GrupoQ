# Quickstart Guide: Validación y Uso de Graphify CLI

**Feature Branch**: `007-integrate-graphify-cli`  
**Date**: 2026-10-05  
**Spec**: [specs/007-integrate-graphify-cli/spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/007-integrate-graphify-cli/spec.md)

---

## 1. Prerrequisitos

- Python ≥ 3.10 instalado en el sistema (`python3 --version`).
- Node.js 20+ y npm para ejecutar los scripts estándar del proyecto.
- Git para verificar que los artefactos generados son ignorados adecuadamente.
- Antigravity IDE (opcional, para invocar la Workspace Skill `/graphify`).

---

## 2. Escenario 1: Instalación y Preparación del Entorno

### Pasos
1. Verificar disponibilidad de Python:
   ```bash
   python3 --version
   ```
2. Opción A (Recomendada global con pipx o uv):
   ```bash
   pipx install graphifyy
   # o bien:
   uv tool install graphifyy
   ```
3. Opción B (Uso directo con el script orquestador del proyecto):
   ```bash
   chmod +x scripts/graphify.sh
   ./scripts/graphify.sh --help
   ```

### Resultado Esperado
- El comando `graphify` responde con su menú de ayuda, o `./scripts/graphify.sh` muestra los subcomandos disponibles sin arrojar errores de dependencias de sistema.

---

## 3. Escenario 2: Generación Local del Grafo de Conocimiento (P1)

### Pasos
1. Ejecutar el escaneo estático desde la raíz del repositorio:
   ```bash
   ./scripts/graphify.sh scan
   # o mediante npm:
   npm run graphify
   ```
2. Medir el tiempo de ejecución (debe ser inferior a 2 minutos conforme a SC-001):
   ```bash
   time ./scripts/graphify.sh scan
   ```
3. Verificar la creación de los artefactos esperados en `graphify-out/`:
   ```bash
   ls -la graphify-out/
   test -f graphify-out/graph.json && echo "graph.json OK"
   test -f graphify-out/graph.html && echo "graph.html OK"
   test -f graphify-out/GRAPH_REPORT.md && echo "GRAPH_REPORT.md OK"
   ```

### Resultado Esperado
- Los tres archivos (`graph.json`, `graph.html`, `GRAPH_REPORT.md`) se generan exitosamente en `graphify-out/`.
- El escaneo indexa los módulos de `backend/src`, `frontend/src`, `specs/` y `docs/` (SC-003).

---

## 4. Escenario 3: Verificación de Aislamiento de Git (P3, SC-004)

### Pasos
1. Ejecutar el estado del control de versiones inmediatamente después del escaneo:
   ```bash
   git status --short
   ```

### Resultado Esperado
- Ningún archivo dentro de `graphify-out/` ni archivos temporales (`.graphify_*.json`, `.venv-graphify/`) aparecen en la lista de archivos sin seguimiento (*untracked*). El árbol de trabajo se mantiene limpio gracias a las reglas configuradas en `.gitignore`.

---

## 5. Escenario 4: Inspección y Consulta del Conocimiento (P2)

### Pasos
1. Ver el reporte sintético del análisis en la terminal:
   ```bash
   ./scripts/graphify.sh report
   ```
2. Realizar una consulta sobre una entidad del dominio (ejemplo `jugador`):
   ```bash
   ./scripts/graphify.sh query jugador
   ```
3. Abrir la visualización interactiva offline:
   ```bash
   ./scripts/graphify.sh view
   ```

### Resultado Esperado
- `report` imprime en consola los nodos más conectados (*god nodes*) y los clusters arquitectónicos.
- `query` lista las relaciones directas de la entidad con controladores, servicios y repositorios.
- `view` abre el navegador local mostrando la red interactiva sin realizar peticiones a internet.

---

## 6. Escenario 5: Validación de la Integración con Antigravity IDE

### Pasos
1. En el chat de Antigravity IDE, invocar la skill:
   ```text
   /graphify
   ```
2. Formular una consulta contextual:
   ```text
   ¿Cuáles son las dependencias entre el catálogo de jugadores y los controladores del backend según el grafo?
   ```

### Resultado Esperado
- Antigravity IDE reconoce la skill `.agents/skills/graphify/SKILL.md` y responde con la arquitectura estructurada en español, leyendo directamente los artefactos locales de `graphify-out/` sin recurrir a servidores MCP ni conexiones en la nube.
