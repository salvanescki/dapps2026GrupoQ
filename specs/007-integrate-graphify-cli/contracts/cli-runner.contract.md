# Interface Contract: Graphify CLI Runner Script (`scripts/graphify.sh`)

**Feature Branch**: `007-integrate-graphify-cli`  
**Contract Version**: `1.0.0`  
**Spec**: [specs/007-integrate-graphify-cli/spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/007-integrate-graphify-cli/spec.md)

---

## 1. Propósito

Definir la interfaz de línea de comandos, subcomandos, argumentos, códigos de retorno y comportamiento esperado del script orquestador local `scripts/graphify.sh` y sus comandos mapeados en `package.json`.

---

## 2. Sintaxis de Invocación

```bash
./scripts/graphify.sh <subcomando> [opciones]
# o alternativamente:
npm run graphify -- <subcomando> [opciones]
```

---

## 3. Subcomandos Soportados

### 3.1 `scan` (o invocación sin argumentos)
- **Descripción**: Escanea el repositorio, excluye `node_modules`, `dist`, `build`, `.git`, `coverage`, temporales, y genera los artefactos del grafo en `graphify-out/`.
- **Argumentos opcionales**:
  - `--clean`: Borra la caché previa antes de escanear para garantizar un análisis desde cero.
  - `--path <ruta>`: Especifica una ruta o subdirectorio particular (por defecto la raíz del proyecto `.`).
- **Precondiciones**:
  - Python ≥ 3.10 disponible en el sistema.
- **Efectos secundarios**:
  - Crea o actualiza `graphify-out/graph.json`.
  - Crea o actualiza `graphify-out/graph.html`.
  - Crea o actualiza `graphify-out/GRAPH_REPORT.md`.
  - Actualiza la caché en `graphify-out/cache/` (o `.graphify_cache/`).
  - No genera ningún archivo visible en `git status` (protegido por `.gitignore`).
- **Códigos de salida**:
  - `0`: Análisis completado exitosamente.
  - `1`: Error de requisitos previos (Python no encontrado o versión < 3.10).
  - `2`: Fallo durante la ejecución del análisis AST o escritura de artefactos.

### 3.2 `report`
- **Descripción**: Muestra en la salida estándar (`stdout`) el reporte sintético consolidado de nodos clave, comunidades arquitectónicas y métricas generado en `graphify-out/GRAPH_REPORT.md`.
- **Precondiciones**:
  - El subcomando `scan` debe haberse ejecutado previamente (debe existir `graphify-out/GRAPH_REPORT.md`).
- **Códigos de salida**:
  - `0`: Reporte emitido en consola.
  - `1`: Archivo de reporte no encontrado (solicita ejecutar `scan` primero).

### 3.3 `view`
- **Descripción**: Abre en el navegador predeterminado del sistema o inicia un servidor HTTP estático local (puerto local aleatorio o `8080`) para visualizar `graphify-out/graph.html` sin acceso a internet.
- **Códigos de salida**:
  - `0`: Visualizador abierto o servidor local levantado.
  - `1`: `graph.html` no encontrado.

### 3.4 `query <término>`
- **Descripción**: Realiza una consulta sobre el grafo local `graphify-out/graph.json` y devuelve los nodos conectados y relaciones del concepto buscado.
- **Argumentos**:
  - `<término>` (Requerido): Nombre de la entidad, módulo o concepto (ejemplo: `jugador`, `AuthService`, `Catalogo`).
- **Salida**: Formato estructurado en texto con las conexiones directas e indirectas detectadas.
- **Códigos de salida**:
  - `0`: Consulta completada con resultados.
  - `1`: Consulta sin coincidencias o grafo inexistente.

### 3.5 `clean`
- **Descripción**: Elimina de forma segura el directorio `graphify-out/` y cualquier archivo temporal de escaneo (`.graphify_*.json`, `.venv-graphify/`).
- **Códigos de salida**:
  - `0`: Limpieza completada.

---

## 4. Garantías de Seguridad y Restricciones (Constitución v1.1.0)

1. **Sin MCP**: El script nunca invoca `graphify-mcp` ni incluye la bandera `--mcp`.
2. **Sin Hosted/Cloud**: El script nunca solicita tokens de API, credenciales de Graphify Cloud, ni realiza peticiones HTTP/HTTPS externas para telemetría o procesamiento remoto.
3. **Aislamiento**: Si `graphify` no está presente globalmente, el script utiliza o inicializa un entorno virtual local (`.venv-graphify`) para evitar modificar paquetes del sistema operativo.
