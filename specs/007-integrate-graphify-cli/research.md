# Research: Integración de Graphify CLI en el Repositorio y Antigravity IDE

**Feature Branch**: `007-integrate-graphify-cli`  
**Date**: 2026-10-05  
**Spec**: [specs/007-integrate-graphify-cli/spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/007-integrate-graphify-cli/spec.md)

---

## 1. Identificación y Distribución del Paquete Open Source

- **Decision**: Utilizar el paquete open source oficial de PyPI **`graphifyy`** (comando ejecutable `graphify`), mantenido por Graphify Labs en [github.com/Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify).
- **Rationale**: 
  - La herramienta `graphify` de Graphify Labs está construida en Python (requiere Python ≥ 3.10) y utiliza `tree-sitter` para análisis sintáctico determinístico (AST) y extracción estática multilingüe de más de 19 lenguajes (incluyendo TypeScript, JavaScript, Python, JSON, Bash, Markdown).
  - En PyPI se distribuye bajo el nombre de paquete `graphifyy` (con doble 'y') mientras que el comando CLI instalado es `graphify`.
  - No requiere base de datos vectorial externa ni almacenamiento centralizado; opera localmente produciendo archivos estructurados en el directorio local `graphify-out/`.
- **Alternatives considered**:
  - *Instalación de herramientas no oficiales o forks en npm*: Descartada por falta de soporte y desactualización respecto a la implementación oficial de Graphify Labs.
  - *Generación manual de grafos mediante scripts ad-hoc*: Descartada porque Graphify provee detección automática de comunidades (algoritmo Leiden), cálculo de nodos centrales (*god nodes*), visualización interactiva HTML offline y reportes consolidados en markdown sin mantenimiento adicional.

---

## 2. Aislamiento y Entorno de Ejecución Local

- **Decision**: Soportar dos vías complementarias de ejecución local desacopladas del entorno del sistema operativo:
  1. **Instalación global recomendada** vía `pipx install graphifyy` o `uv tool install graphifyy` para desarrollo diario en terminal.
  2. **Script orquestador de proyecto** (`scripts/graphify.sh`) y comando en `package.json` (`npm run graphify`) que detecta automáticamente si `graphify` está en el `PATH` o gestiona un entorno virtual local aislado (`.venv-graphify/`) sin requerir privilegios de superusuario (`sudo`) ni alterar paquetes globales del sistema (`--break-system-packages`).
- **Rationale**:
  - En distribuciones Linux modernas (Ubuntu/Debian con PEP 668), `pip install` directo en el sistema arroja error de entorno gestionado externamente (*externally-managed-environment*).
  - `pipx` y `uv` aíslan herramientas CLI en entornos virtuales dedicados de usuario.
  - El script orquestador local en el repositorio (`scripts/graphify.sh`) garantiza que cualquier desarrollador pueda ejecutar `npm run graphify` o `./scripts/graphify.sh` sin configuraciones manuales complejas.
- **Alternatives considered**:
  - *Contenedor Docker para Graphify*: Evaluado. Si bien garantiza reproducibilidad, añade sobrecarga innecesaria para una herramienta de análisis estático basada en AST que debe integrarse fluidamente con el IDE del desarrollador y con la terminal local.
  - *Ejecución con `pip install --break-system-packages`*: Descartado por violar buenas prácticas de administración del sistema y provocar potenciales conflictos de dependencias.

---

## 3. Integración con Antigravity IDE

- **Decision**: Implementar una Skill nativa para Antigravity IDE ubicada en el directorio de personalizaciones del espacio de trabajo: `.agents/skills/graphify/SKILL.md`.
- **Rationale**:
  - Conforme al sistema de personalizaciones de Antigravity IDE (`agy-customizations`), el directorio `.agents/skills/<nombre_skill>/SKILL.md` es descubierto automáticamente como Workspace Skill.
  - Al definir el disparador y las directivas en `.agents/skills/graphify/SKILL.md`, cualquier agente o desarrollador en Antigravity IDE puede invocar el comando o consultar la topología arquitectónica del proyecto.
  - La skill instruye al agente a invocar la CLI local `graphify`, leer los artefactos resultantes en `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`), consultar dependencias entre módulos y responder preguntas arquitectónicas sin necesidad de escanear repetidamente cientos de archivos ni consumir tokens redundantes.
- **Alternatives considered**:
  - *Integración como servidor MCP (Model Context Protocol)*: **ESTRICTAMENTE PROHIBIDO** por la Constitución del proyecto (v1.1.0) y por los requerimientos FR-002 y FR-003. No se configurará ningún entrypoint `graphify-mcp`, ni flags `--mcp`, ni servidores MCP en `mcp_config.json`.
  - *Integración con Graphify Hosted (SaaS en la nube)*: **ESTRICTAMENTE PROHIBIDO** por la Constitución y los requerimientos FR-002 y FR-004. Cero tráfico de red hacia la nube.

---

## 4. Alcance del Análisis y Reglas de Exclusión

- **Decision**: Configurar la ejecución de Graphify para escanear exclusivamente los directorios de valor del proyecto (`backend/src`, `frontend/src`, `specs/`, `docs/`, `docker-compose.yml`), omitiendo dependencias, artefactos de build y temporales.
- **Rationale**:
  - El proyecto posee `node_modules` en backend y frontend, además de carpetas de compilación (`dist`, `build`), cobertura (`coverage`), metadatos (`.git`), y artefactos de tests.
  - Incluir estos directorios saturaría el grafo de conocimiento con millones de líneas irrelevantes, ralentizaría el análisis superando los 2 minutos (incumpliendo SC-001) y degradaría la claridad de los grafos.
  - Graphify detecta por omisión o mediante parámetros de ruta los directorios a incluir, asegurando que solo el código productivo, dominio y especificaciones sean indexados (SC-003).
- **Alternatives considered**:
  - *Escanear indiscriminadamente todo el directorio raíz `.`*: Descartado porque procesar `node_modules/` provoca cuellos de botella de memoria y artefactos de grafo contaminados con dependencias de terceros.

---

## 5. Gestión de Artefactos y Control de Versiones

- **Decision**: Incorporar en `.gitignore` las siguientes entradas dedicadas a Graphify:
  ```gitignore
  # Graphify CLI outputs & local caches
  graphify-out/
  .graphify_*.json
  .graphify_cache/
  .venv-graphify/
  ```
- **Rationale**:
  - Los artefactos generados por Graphify (`graphify-out/graph.json`, `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`, carpetas de caché) son derivados y efímeros.
  - Mantenerlos fuera de Git garantiza que el repositorio permanezca liviano, que `git status` se mantenga limpio tras la ejecución (SC-004, FR-010) y evita conflictos en Pull Requests.
- **Alternatives considered**:
  - *Comitear `GRAPH_REPORT.md` en Git*: Descartado para cumplir estrictamente con la premisa de que los artefactos derivados no deben versionarse en el historial de Git, regenerándose bajo demanda.

---

## 6. Estandarización de Comandos y Flujo de Uso

- **Decision**: Crear el script ejecutable `scripts/graphify.sh` con subcomandos claros y agregar atajos de ejecución en el `package.json` raíz (o backend/scripts):
  - `npm run graphify` o `./scripts/graphify.sh scan`: Ejecuta el análisis completo del repositorio y genera los artefactos en `graphify-out/`.
  - `./scripts/graphify.sh report`: Muestra el resumen del reporte generado (`GRAPH_REPORT.md`).
  - `./scripts/graphify.sh view`: Inicia un servidor web local estático o abre en el navegador `graphify-out/graph.html` sin conexión a internet.
  - `./scripts/graphify.sh clean`: Limpia los artefactos y archivos temporales generados.
- **Rationale**:
  - Proporciona una interfaz unificada, homogénea y reproducible para todos los miembros del equipo, cumpliendo con FR-009 y SC-005.
- **Alternatives considered**:
  - *Instruir a los desarrolladores a memorizar comandos CLI directos*: Descartado por propensión a errores de sintaxis y falta de consistencia en exclusiones entre miembros del equipo.
