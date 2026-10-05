# Guía de Uso e Integración de Graphify CLI

**Football Player Token Marketplace (Grupo Q)**  
*Análisis Estático, Grafo de Conocimiento y Navegación Arquitectónica Local*

---

## 1. Introducción y Propósito

**Graphify** es una herramienta open source desarrollada por Graphify Labs que permite extraer un grafo de conocimiento determinístico a partir del código fuente y especificaciones de un proyecto mediante análisis de Árbol de Sintaxis Abstracta (AST con Tree-sitter).

En este repositorio, Graphify se encuentra integrado como herramienta oficial de desarrollo y asistencia arquitectónica bajo las siguientes directrices:
- **100% Local y Offline**: No realiza llamadas de red, no utiliza endpoints en la nube ni requiere claves de API (SC-002, FR-004).
- **Sin MCP**: No implementa ni utiliza servidores bajo el protocolo MCP (Model Context Protocol), conforme a la Constitución del proyecto v1.1.0 (FR-003).
- **Aislamiento Total de Git**: Todos los artefactos derivados (`graphify-out/`, `.graphify_cache/`, `.venv-graphify/`) están estrictamente excluidos del control de versiones (SC-004, FR-010).
- **Asistencia en Antigravity IDE**: Permite a desarrolladores y agentes navegar dependencias y consultar relaciones mediante la skill `/graphify`.

---

## 2. Prerrequisitos del Sistema

- **Python**: Versión 3.10 o superior (`python3 --version`).
- **Node.js & npm**: Node.js versión 20 o superior (`node -v`, `npm -v`).
- **Git**: Sistema de control de versiones instalado.
- **Antigravity IDE**: Entorno de desarrollo para la invocación de la Workspace Skill.

---

## 3. Formas de Instalación y Ejecución

El proyecto ofrece dos métodos complementarios para ejecutar Graphify:

### Método A: Script Orquestador del Repositorio (Recomendado)
El proyecto incluye un script en `scripts/graphify.sh` que detecta automáticamente si `graphify` está instalado globalmente o, en su defecto, provisiona un entorno virtual aislado (`.venv-graphify`) sin alterar el sistema operativo ni requerir privilegios de superusuario (`sudo`).

Se puede invocar directamente:
```bash
./scripts/graphify.sh [subcomando] [opciones]
```
O a través del script de npm en la raíz:
```bash
npm run graphify -- [subcomando] [opciones]
```

### Método B: Instalación Global en la Estación de Trabajo
Si prefieres disponer del binario `graphify` de forma global en tu terminal:

- Usando **`pipx`**:
  ```bash
  pipx install graphifyy
  ```
- Usando **`uv`**:
  ```bash
  uv tool install graphifyy
  ```

*(Nota: El paquete en PyPI se denomina `graphifyy` con doble 'y', mientras que el binario ejecutable es `graphify`).*

---

## 4. Referencia de Subcomandos

### 4.1 `scan` — Generación del Grafo
Escanea el código fuente (`backend/src`, `frontend/src`), especificaciones y documentación, extrayendo los símbolos y relaciones mediante Tree-sitter y generando los artefactos en `graphify-out/`.

```bash
# Escaneo estándar
npm run graphify -- scan
# o
./scripts/graphify.sh scan

# Escaneo limpio (borra caché previa antes de indexar)
./scripts/graphify.sh scan --clean

# Escaneo de un subdirectorio específico
./scripts/graphify.sh scan --path backend/src
```

**Artefactos generados en `graphify-out/`**:
- `graph.json`: Grafo completo en formato NetworkX (nodos, aristas y atributos).
- `graph.html`: Visualizador interactivo offline 2D/3D con grafos de fuerza.
- `GRAPH_REPORT.md`: Resumen ejecutivo con nodos centrales (*god nodes*), métricas y comunidades de Leiden.

### 4.2 `report` — Reporte Resumen en Consola
Imprime en la salida estándar el contenido de `graphify-out/GRAPH_REPORT.md`.

```bash
npm run graphify -- report
```

Permite conocer rápidamente cuáles son los componentes más acoplados o centrales del sistema (por ejemplo: `Jugador`, `Liga`, `Equipo`, `Usuario`).

### 4.3 `query <término>` — Búsqueda de Entidades y Relaciones
Realiza una búsqueda semántica de nodos (clases, funciones, interfaces, DTOs) en el grafo generado e imprime sus conexiones entrantes y salientes.

```bash
npm run graphify -- query Jugador
# o
./scripts/graphify.sh query AuthService
```

**Salida estructurada**:
- Nombre y tipo de nodo (`code`, `spec`, `doc`).
- Archivo fuente y número de línea.
- Comunidad asignada por el algoritmo de clustering de Leiden.
- Conexiones salientes (métodos, dependencias inyectadas, llamadas).
- Conexiones entrantes (repositorios, servicios o controladores que lo referencian).

### 4.4 `view` — Visualización Gráfica Offline
Abre la visualización interactiva del grafo (`graphify-out/graph.html`) en el navegador web local o inicia un servidor HTTP estático local si se ejecuta en modo headless/servidor.

```bash
npm run graphify -- view
# o especificando un puerto personalizado
./scripts/graphify.sh view --port 8081
```

### 4.5 `clean` — Limpieza de Artefactos
Elimina de forma segura el directorio `graphify-out/`, los archivos temporales de análisis y el entorno virtual aislado `.venv-graphify/`.

```bash
npm run graphify -- clean
```

---

## 5. Integración con Antigravity IDE (Workspace Skill)

El repositorio incluye la Workspace Skill nativa en `.agents/skills/graphify/SKILL.md`.

### Invocación Explícita
En la consola de chat de Antigravity IDE:
- `/graphify`: Ejecuta el escaneo del repositorio si no existe el grafo.
- `/graphify report`: Muestra el resumen de comunidades y abstracciones núcleo.
- `/graphify query <concepto>`: Rastrea un concepto (ej. `/graphify query Jugador`).
- `/graphify view`: Abre la visualización interactiva.

### Navegación Contextual del Asistente
Cuando realices preguntas sobre la arquitectura global en Antigravity IDE (por ejemplo: *"¿Cómo se vincula el controlador de catálogo con la entidad Jugador y los repositorios TypeORM?"*), el agente consultará automáticamente el grafo de conocimiento local `graphify-out/` sin necesidad de leer manualmente decenas de archivos ni saturar el contexto de la conversación.

---

## 6. Alcance del Análisis y Reglas de Exclusión

El análisis se focaliza en el código que aporta valor al dominio y arquitectura:
- **Directorios Analizados**:
  - `backend/src/`: Controladores, servicios, entidades de dominio y repositorios TypeORM.
  - `frontend/src/`: Componentes React, hooks, páginas y tipos de datos.
  - `specs/`: Especificaciones funcionales, planes y contratos.
  - `docs/`: Documentación de arquitectura y visión.
- **Directorios Excluidos** (gestionados vía `.gitignore` y `.graphifyignore`):
  - `node_modules/`, `dist/`, `build/`
  - `.git/`, `coverage/`, `logs/`, `postgres_data/`
  - `.venv-graphify/`, `graphify-out/`, `.graphify_cache/`

---

## 7. Garantías Constitucionales y de Seguridad

Conforme a la **Constitución del Proyecto v1.1.0**:
1. **Inmutabilidad de Pruebas (Principio IV)**: La incorporación de Graphify CLI no modifica, reemplaza ni elimina ningún test unitario o de integración preexistente.
2. **Prohibición de MCP**: Se prohíbe de forma taxativa el uso de servidores o configuraciones Model Context Protocol (MCP).
3. **Cero Dependencia de la Nube**: El script bloquea cualquier intento de sincronización remota o uso de servicios SaaS de Graphify.
4. **Español Normativo (Principio V)**: Toda la documentación, mensajes de salida de herramientas y skills se redactan en español.
