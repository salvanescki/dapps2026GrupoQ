# Feature Specification: Integración de Graphify CLI para Análisis y Navegación del Repositorio

**Feature Branch**: `007-integrate-graphify-cli`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Integrar Graphify (de Labs Graphify) al proyecto como herramienta open source CLI para el análisis y navegación del conocimiento del repositorio. La especificación debe definir los requisitos, alcance, comportamiento esperado y criterios de aceptación necesarios para incorporar Graphify al flujo de desarrollo existente. Excluir explícitamente Graphify Hosted y MCP."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generación Local del Grafo de Conocimiento del Repositorio (Priority: P1)

Como desarrollador o colaborador del proyecto,  
quiero ejecutar un comando local de línea de comandos (CLI) de Graphify para analizar el código y la documentación del repositorio y generar un grafo de conocimiento actualizado,  
para obtener una comprensión integral y estructurada de la arquitectura, módulos, componentes y dependencias del sistema sin depender de servicios externos en la nube.

**Why this priority**: Es el flujo fundamental y requisito mínimo viable (MVP). Sin la capacidad de analizar el repositorio y generar el grafo localmente de forma autónoma, ninguna otra funcionalidad de navegación o integración es posible.

**Independent Test**: Puede probarse de forma independiente ejecutando el comando de análisis de Graphify CLI en una copia limpia del repositorio y verificando que los artefactos del grafo de conocimiento se generan localmente con éxito, sin requerir credenciales de red, cuentas externas ni acceso a internet.

**Acceptance Scenarios**:

1. **Given** el repositorio clonado con sus dependencias instaladas, **When** el usuario ejecuta el comando de análisis de Graphify CLI sobre la raíz del proyecto, **Then** el sistema escanea el código fuente (backend, frontend, dominio y especificaciones) y genera los artefactos del grafo de conocimiento en el directorio local designado.
2. **Given** un entorno de desarrollo local desconectado de internet, **When** el desarrollador ejecuta la generación del grafo, **Then** el proceso completa satisfactoriamente en modo estrictamente offline sin intentar conectar con servicios de Graphify Hosted.
3. **Given** la estructura de archivos del proyecto con carpetas de dependencias (`node_modules`), artefactos de build (`dist`, `build`) y metadatos de Git (`.git`), **When** se ejecuta el análisis, **Then** la herramienta excluye automáticamente dichos directorios irrelevantes y analiza únicamente el código y artefactos de documentación del proyecto.

---

### User Story 2 - Navegación y Consulta Local del Conocimiento del Repositorio (Priority: P2)

Como arquitecto de software o desarrollador que explora o refactoriza el código,  
quiero consultar o explorar interactivamente el grafo de conocimiento generado mediante la CLI o interfaz local provista por la herramienta,  
para rastrear dependencias entre capas arquitectónicas (frontend, controllers, services, model de dominio y repositorios), evaluar el impacto de cambios y comprender las relaciones entre entidades.

**Why this priority**: Proporciona el valor operativo directo del grafo generado, permitiendo a los desarrolladores tomar decisiones de diseño informadas y verificar el cumplimiento de los límites arquitectónicos del proyecto.

**Independent Test**: Puede probarse de forma independiente ejecutando el comando de consulta o navegación de la herramienta sobre un grafo generado previamente, comprobando que se pueden visualizar o inspeccionar las entidades de dominio, los servicios y sus relaciones directas.

**Acceptance Scenarios**:

1. **Given** un grafo de conocimiento generado previamente, **When** el usuario ejecuta el comando de navegación o visualización local de Graphify CLI, **Then** la herramienta permite inspeccionar los nodos (módulos, archivos, componentes) y aristas (dependencias, llamadas, imports) de manera clara e interactiva a nivel local.
2. **Given** una consulta sobre una entidad del dominio (por ejemplo, `jugador`), **When** se explora su contexto en el grafo, **Then** se evidencian sus relaciones con los servicios y repositorios sin exponer detalles internos de herramientas externas.

---

### User Story 3 - Integración en el Flujo de Desarrollo y Estandarización de Comandos (Priority: P3)

Como integrante del equipo de desarrollo,  
quiero contar con comandos estandarizados en los scripts del proyecto y documentación clara en español en el repositorio,  
para incorporar fácilmente la regeneración del grafo a las rutinas de desarrollo y asegurar que los artefactos generados no ensucien el control de versiones.

**Why this priority**: Garantiza la adopción homogénea por parte de todo el equipo, facilita el onboarding de nuevos miembros y protege el repositorio contra commits accidentales de archivos pesados o efímeros.

**Independent Test**: Puede probarse siguiendo la documentación paso a paso en una máquina limpia: clonar el repositorio, ejecutar el comando estandarizado de análisis y verificar que los archivos resultantes son ignorados por Git de acuerdo a `.gitignore`.

**Acceptance Scenarios**:

1. **Given** el archivo `README.md` o la documentación de desarrollo, **When** un nuevo desarrollador consulta las instrucciones de uso de Graphify CLI, **Then** encuentra la guía en español con los prerrequisitos, comandos de ejecución, opciones de navegación y reglas de exclusión.
2. **Given** la ejecución del análisis de Graphify CLI que produce archivos de grafo o caché local, **When** el desarrollador ejecuta `git status`, **Then** los artefactos generados no aparecen como archivos sin seguimiento (*untracked*) gracias a las reglas configuradas en `.gitignore`.
3. **Given** los scripts definidos en el proyecto, **When** el desarrollador ejecuta el script estandarizado de generación (por ejemplo vía npm/CLI), **Then** la tarea se ejecuta con los parámetros de exclusión y configuración locales recomendados.

---

### Edge Cases

- ¿Qué sucede si el repositorio contiene archivos binarios grandes, imágenes o directorios temporales de test (`coverage`, `.tmp`)?  
  → La configuración de Graphify CLI debe excluir por defecto patrones de archivos binarios, directorios de cobertura y temporales para no degradar el rendimiento del análisis.
- ¿Qué sucede si la CLI de Graphify incluye por defecto opciones para sincronizar con Graphify Hosted o exponer endpoints de MCP?  
  → Dichas opciones deben deshabilitarse o excluirse explícitamente tanto en los comandos documentados como en la configuración del proyecto, asegurando que ninguna telemetría o llamada externa sea disparada.
- ¿Qué sucede si se ejecuta el análisis sobre un repositorio con cambios no confirmados (*dirty working directory*)?  
  → El análisis debe reflejar el estado actual del árbol de trabajo local sin requerir que los cambios estén confirmados (*committed*) en Git.
- ¿Qué sucede si el grafo queda desactualizado tras modificaciones sustanciales en el código?  
  → El comando de generación debe admitir reejecución limpia (*clean rerun* o sobreescritura determinística) para regenerar el grafo en su totalidad sin dejar inconsistencias de análisis previos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir la ejecución local de Graphify exclusivamente a través de su herramienta de línea de comandos (CLI) de código abierto.
- **FR-002**: La integración MUST excluir de manera terminante cualquier dependencia, conexión o configuración con Graphify Hosted (versión en la nube/SaaS).
- **FR-003**: La integración MUST excluir de forma estricta cualquier funcionalidad, servidor o extensión basada en Model Context Protocol (MCP).
- **FR-004**: Graphify CLI MUST operar de manera completamente autónoma y local, sin exigir cuentas de usuario, claves de API externas ni conexión a internet durante su ejecución regular.
- **FR-005**: El análisis de Graphify CLI MUST procesar los componentes principales del repositorio (`backend`, `frontend`, modelos de dominio y documentación de `specs/`) para construir la red de conocimiento.
- **FR-006**: El análisis MUST ignorar dependencias externas (`node_modules`), artefactos de build (`dist`, `build`), carpetas de control de versiones (`.git`) y reportes de cobertura (`coverage`).
- **FR-007**: La herramienta MUST generar artefactos de salida del grafo de conocimiento estructurados y navegables en una ruta local predecible dentro del proyecto.
- **FR-008**: El sistema MUST proveer la capacidad de inspeccionar o navegar localmente el grafo de conocimiento generado a través de los mecanismos que provee la versión open source CLI.
- **FR-009**: Se MUST definir un comando o script estandarizado en el repositorio para invocar la generación y exploración del grafo de forma homogénea entre los desarrolladores.
- **FR-010**: Los artefactos y archivos temporales generados por Graphify CLI MUST estar incluidos en el archivo `.gitignore` del proyecto para evitar la persistencia de datos derivados o pesados en el historial de Git.
- **FR-011**: La documentación del proyecto (en español, conforme al Principio V de la Constitución) MUST incluir las instrucciones completas de instalación, configuración, ejecución y buenas prácticas de uso de Graphify CLI.

### Key Entities

- **Grafo de Conocimiento del Repositorio**: Modelo relacional estructurado compuesto por nodos (archivos, clases, funciones, componentes React, controladores NestJS, entidades de dominio) y aristas (relaciones de importación, herencia, inyección de dependencias y composición) que describe la topología del código fuente.
- **Configuración de Análisis Local**: Conjunto de reglas, patrones de inclusión y exclusión de rutas, y parámetros de salida que determinan el alcance del análisis local de Graphify CLI.
- **Artefactos del Grafo (Graph Output Artifacts)**: Archivos locales resultantes del procesamiento (formatos de grafo o visualización local offline) utilizados para la consulta e inspección del conocimiento arquitectónico.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La generación completa del grafo de conocimiento del repositorio mediante el comando CLI se completa en menos de 2 minutos en un entorno de desarrollo estándar.
- **SC-002**: Cero peticiones de red salientes (*network egress*) y cero solicitudes de credenciales o tokens de nube al ejecutar el análisis y la navegación local (100% de aislamiento offline).
- **SC-003**: El 100% de los módulos y capas del proyecto (frontend React, controladores NestJS, servicios, entidades del Rich Domain Model y repositorios) se encuentran indexados en el grafo generado.
- **SC-004**: El 100% de los artefactos generados por la herramienta son ignorados por el control de versiones de Git (`git status` permanece limpio tras la ejecución).
- **SC-005**: Cualquier desarrollador nuevo puede ejecutar el comando de análisis y navegar el grafo en su primer intento en menos de 5 minutos siguiendo la documentación en español provista en el repositorio.

## Assumptions

- Se asume que Graphify CLI se encuentra disponible como paquete de código abierto instalable en entornos Linux/macOS/Windows estándar mediante gestores de paquetes comunes (como npm o pip/pipx) sin requerir dependencias de software privativo.
- Se asume que el hardware convencional de desarrollo de los miembros del equipo dispone de memoria suficiente (mínimo 4 GB de RAM disponibles) para la construcción en memoria del grafo sin requerir aceleración por GPU.
- Se asume que el grafo de conocimiento es un artefacto derivado que se regenera bajo demanda y no requiere versionarse en Git.
- Se asume que el alcance excluye cualquier integración con agentes externos mediante el protocolo MCP y cualquier suscripción o servicio en la nube de Graphify Labs.
