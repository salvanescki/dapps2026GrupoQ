---
name: "graphify"
description: "Analizar la arquitectura del repositorio y navegar el grafo de conocimiento local usando Graphify CLI (sin MCP ni nube)."
compatibility: "Antigravity IDE y agentes basados en agy-customizations"
metadata:
  author: "Grupo Q"
  scope: "workspace"
---

# Workspace Skill: Graphify CLI Local

Esta skill permite a los desarrolladores y agentes de **Antigravity IDE** generar, inspeccionar y consultar el grafo de conocimiento arquitectónico del repositorio de forma 100% local, determinística y offline, sin depender de servidores MCP ni servicios SaaS externos.

---

## Modos de Invocación

### 1. Invocación Explícita por Comando (`/graphify`)

El usuario puede invocar esta skill mediante el comando `/graphify` seguido de un subcomando opcional o término de búsqueda:

- `/graphify`: Ejecuta el escaneo estático de AST del repositorio si no existe `graphify-out/graph.json` o si se solicita refrescar el grafo.
- `/graphify report`: Lee y presenta el resumen arquitectónico desde `graphify-out/GRAPH_REPORT.md` (nodos centrales *god nodes*, comunidades Leiden y métricas).
- `/graphify query <término>`: Consulta nodos, clases, tipos o servicios que coincidan con `<término>` y analiza sus conexiones directas (ejemplo: `/graphify query Jugador`).
- `/graphify view`: Inicia la visualización interactiva del grafo abriendo `graphify-out/graph.html` o levantando el servidor HTTP local.
- `/graphify clean`: Elimina los artefactos efímeros en `graphify-out/` y cachés locales.

### 2. Invocación Contextual por el Agente

Cuando el usuario formule preguntas sobre la arquitectura general del sistema, relaciones entre capas o dependencias (por ejemplo: *"¿Qué componentes del backend dependen del agregador Jugador?"*, *"¿Cómo fluye la información entre el Controller y el Repository?"*, o *"¿Cuáles son las entidades más conectadas del sistema?"*):
1. **Verificar existencia del grafo**: Comprobar si `graphify-out/graph.json` y `graphify-out/GRAPH_REPORT.md` existen en la raíz del repositorio.
2. **Generar si no existe**: Si los artefactos no existen, ejecutar `./scripts/graphify.sh scan`.
3. **Consultar el grafo**: Utilizar `./scripts/graphify.sh query <concepto>` o inspeccionar `graphify-out/GRAPH_REPORT.md`.
4. **Responder estructuradamente**: Sintetizar los hallazgos respetando la arquitectura de 5 capas (Controller → Service → Model → Repository) sin volcar archivos JSON crudos en la respuesta.

---

## Reglas Obligatorias y Restricciones (Constitución v1.1.0)

1. **Operación 100% Offline**:
   - Queda terminantemente prohibido configurar servidores MCP (`mcp_config.json`, `graphify-mcp`, `--mcp`).
   - Queda terminantemente prohibido enviar datos o telemetría a `graphify.com`, endpoints en la nube o solicitar API keys externas.
2. **Preservación del Context Window**:
   - Nunca vuelques el contenido íntegro de `graphify-out/graph.json` en el chat (el archivo contiene cientos de nodos y miles de relaciones).
   - Utiliza `./scripts/graphify.sh query <término>` o filtra con scripts específicos de Python/Node para extraer únicamente la subred relevante.
3. **Convenciones Lingüísticas (Principio V)**:
   - Toda respuesta, análisis, resumen de nodos y explicaciones de arquitectura deben formularse en **español**.
   - Los términos técnicos internacionales (`Controller`, `Service`, `Repository`, `AST`, `Tree-sitter`, `Leiden`, `CLI`) se conservan en inglés.
4. **Higiene de Git (Principio IV & DoD)**:
   - Los archivos generados en `graphify-out/`, `.graphify_cache/` y `.venv-graphify/` son efímeros y están excluidos del control de versiones mediante `.gitignore`.
   - Nunca comitees artefactos generados en `graphify-out/`.

---

## Ejemplos de Flujo de Trabajo

### Ejemplo A: Inspección de Nodos Centrales (*God Nodes*)
```bash
./scripts/graphify.sh report
```
Permite identificar los conceptos con mayor grado de centralidad (ej. `Jugador`, `Liga`, `Equipo`, `Usuario`) y las comunidades aisladas del monorepo.

### Ejemplo B: Consulta de Trazabilidad entre Capas
```bash
./scripts/graphify.sh query AuthService
```
Muestra las conexiones entrantes (ej. `AuthController` delegando peticiones) y conexiones salientes (ej. `IUsuarioRepository`, llamadas a hashing o generación de tokens JWT).
