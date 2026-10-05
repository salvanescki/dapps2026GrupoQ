#!/usr/bin/env bash
# ==============================================================================
# Graphify CLI Runner Script for Football Player Token Marketplace (Grupo Q)
# Interface Contract: specs/007-integrate-graphify-cli/contracts/cli-runner.contract.md
# Adheres strictly to Constitution v1.1.0 (Offline only, No MCP, No Cloud Sync)
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${REPO_ROOT}/.venv-graphify"
OUT_DIR="${REPO_ROOT}/graphify-out"

# ------------------------------------------------------------------------------
# 1. Offline Safety & Anti-MCP Verification (Constitución v1.1.0 & SC-002 / FR-003)
# ------------------------------------------------------------------------------
for arg in "$@"; do
    case "$arg" in
        *--mcp*|*graphify-mcp*|*-mcp*)
            echo "[ERROR] El protocolo MCP (Model Context Protocol) está terminantemente prohibido por la Constitución v1.1.0 del proyecto." >&2
            exit 1
            ;;
        *app.graphify.com*|*api.graphify.com*|*hosted*|*cloud-sync*)
            echo "[ERROR] Servicios o sincronización en la nube prohibidos. Graphify opera en modo 100% local y offline." >&2
            exit 1
            ;;
    esac
done

# Ensure environment variables do not leak cloud endpoints or telemetry
unset GRAPHIFY_HOSTED_URL 2>/dev/null || true
unset GRAPHIFY_API_KEY 2>/dev/null || true

# ------------------------------------------------------------------------------
# 2. Python Runtime Validation (Python >= 3.10 required)
# ------------------------------------------------------------------------------
check_python_prereqs() {
    if ! command -v python3 >/dev/null 2>&1; then
        echo "[ERROR] Python 3 no está instalado o no se encuentra en el PATH del sistema." >&2
        return 1
    fi

    local py_ok
    py_ok="$(python3 -c 'import sys; print(1 if sys.version_info >= (3, 10) else 0)' 2>/dev/null || echo 0)"
    if [ "$py_ok" != "1" ]; then
        echo "[ERROR] Se requiere Python >= 3.10. Versión detectada: $(python3 -V 2>&1)" >&2
        return 1
    fi
    return 0
}

# ------------------------------------------------------------------------------
# 3. Environment & Runtime Detection (Global vs Isolated venv)
# ------------------------------------------------------------------------------
resolve_graphify_binary() {
    # 1. Check if graphify is globally installed in PATH
    if command -v graphify >/dev/null 2>&1; then
        command -v graphify
        return 0
    fi

    # 2. Check if installed in isolated project virtualenv
    if [ -x "${VENV_DIR}/bin/graphify" ]; then
        echo "${VENV_DIR}/bin/graphify"
        return 0
    fi

    # 3. Bootstrap isolated virtual environment (.venv-graphify)
    echo "[INFO] Graphify CLI no detectado en PATH. Configurando entorno local aislado en .venv-graphify..." >&2
    rm -rf "${VENV_DIR}"

    local venv_created=0
    if python3 -c "import ensurepip" >/dev/null 2>&1; then
        if python3 -m venv "${VENV_DIR}" >/dev/null 2>&1; then
            venv_created=1
        fi
    fi

    if [ "$venv_created" -eq 0 ]; then
        # Minimal environment without ensurepip (common in Ubuntu/Debian)
        python3 -m venv --without-pip "${VENV_DIR}" >/dev/null 2>&1
        local get_pip_url="https://bootstrap.pypa.io/get-pip.py"
        local tmp_get_pip
        tmp_get_pip="$(mktemp /tmp/get-pip-XXXXXX.py)"
        if command -v curl >/dev/null 2>&1; then
            curl -sS "$get_pip_url" -o "$tmp_get_pip"
        elif command -v wget >/dev/null 2>&1; then
            wget -q "$get_pip_url" -O "$tmp_get_pip"
        else
            echo "[ERROR] No se pudo descargar pip para el entorno virtual aislado (curl o wget requeridos)." >&2
            rm -f "$tmp_get_pip"
            return 1
        fi
        "${VENV_DIR}/bin/python3" "$tmp_get_pip" --no-warn-script-location >/dev/null 2>&1 || true
        rm -f "$tmp_get_pip"
    fi

    echo "[INFO] Instalando paquete oficial open source 'graphifyy' en .venv-graphify..." >&2
    "${VENV_DIR}/bin/pip" install --quiet --disable-pip-version-check graphifyy >/dev/null 2>&1

    if [ -x "${VENV_DIR}/bin/graphify" ]; then
        echo "${VENV_DIR}/bin/graphify"
        return 0
    fi

    echo "[ERROR] No se pudo inicializar la CLI 'graphify'." >&2
    return 1
}

# ------------------------------------------------------------------------------
# 4. Command Handlers
# ------------------------------------------------------------------------------

cmd_help() {
    cat << 'EOF'
Uso: ./scripts/graphify.sh <subcomando> [opciones]
     npm run graphify -- <subcomando> [opciones]

Subcomandos disponibles:
  scan [--clean] [--path <ruta>]
      Escanea el repositorio con Tree-sitter de forma determinística y offline.
      Genera graphify-out/graph.json, graphify-out/graph.html y graphify-out/GRAPH_REPORT.md.
      Opciones:
        --clean       Limpia la caché previa y regenera los artefactos desde cero.
        --path <ruta> Especifica una ruta relativa o absoluta para escanear (por defecto la raíz).

  report
      Muestra en la salida estándar el reporte consolidado de nodos centrales (god nodes),
      comunidades arquitectónicas de Leiden y métricas desde graphify-out/GRAPH_REPORT.md.

  query <término>
      Busca un nodo, entidad de dominio o módulo en graphify-out/graph.json
      e imprime sus atributos, comunidad y conexiones directas.

  view [--port <puerto>]
      Abre graphify-out/graph.html en el navegador web local o inicia un servidor
      HTTP local estático sin conexión a internet.

  clean
      Elimina el directorio de artefactos graphify-out/, cachés (.graphify_cache/)
      y el entorno virtual aislado (.venv-graphify/).

  --help, -h
      Muestra este menú de ayuda.
EOF
}

cmd_scan() {
    local clean_mode=0
    local target_path="."

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --clean)
                clean_mode=1
                shift
                ;;
            --path)
                if [[ $# -lt 2 ]]; then
                    echo "[ERROR] --path requiere especificar una ruta." >&2
                    return 2
                fi
                target_path="$2"
                shift 2
                ;;
            *)
                echo "[ERROR] Opción desconocida para scan: $1" >&2
                return 2
                ;;
        esac
    done

    if ! check_python_prereqs; then
        return 1
    fi

    local graphify_bin
    if ! graphify_bin="$(resolve_graphify_binary)"; then
        return 1
    fi

    cd "$REPO_ROOT"

    if [ "$clean_mode" -eq 1 ]; then
        echo "[INFO] Modo limpio (--clean): eliminando artefactos y caché previa..."
        rm -rf "${OUT_DIR}" "${REPO_ROOT}/.graphify_cache" "${REPO_ROOT}"/.graphify_*.json
    fi

    echo "[INFO] Iniciando escaneo local determinístico AST (código y especificaciones)..."
    local start_time
    start_time="$(date +%s)"

    # Asegurar que .graphifyignore contenga los patrones de exclusión requeridos
    if [ ! -f "${REPO_ROOT}/.graphifyignore" ]; then
        cat << 'IGN' > "${REPO_ROOT}/.graphifyignore"
node_modules/
dist/
build/
.git/
coverage/
logs/
postgres_data/
.venv-graphify/
graphify-out/
IGN
    fi

    # Ejecutar extracción AST en modo local --code-only (cero peticiones de red / cero API keys)
    if ! "$graphify_bin" extract "$target_path" --code-only --out "$REPO_ROOT"; then
        echo "[ERROR] Falló la extracción del grafo con Graphify CLI." >&2
        return 2
    fi

    # Generar clustering determinístico, graph.html y GRAPH_REPORT.md
    echo "[INFO] Generando comunidades Leiden, reporte y visualización offline..."
    if ! "$graphify_bin" cluster-only "$REPO_ROOT" --no-label; then
        echo "[ERROR] Falló la clusterización y generación de reportes." >&2
        return 2
    fi

    local end_time
    end_time="$(date +%s)"
    local duration=$((end_time - start_time))

    if [ -f "${OUT_DIR}/graph.json" ] && [ -f "${OUT_DIR}/graph.html" ] && [ -f "${OUT_DIR}/GRAPH_REPORT.md" ]; then
        echo "[SUCCESS] Grafo de conocimiento generado exitosamente en ${duration}s."
        echo "  - Grafo JSON:      ${OUT_DIR}/graph.json"
        echo "  - Visualización:   ${OUT_DIR}/graph.html"
        echo "  - Reporte resumen: ${OUT_DIR}/GRAPH_REPORT.md"
        return 0
    else
        echo "[ERROR] Faltan artefactos esperados en ${OUT_DIR}." >&2
        return 2
    fi
}

cmd_report() {
    local report_file="${OUT_DIR}/GRAPH_REPORT.md"
    if [ ! -f "$report_file" ]; then
        echo "[ERROR] Archivo de reporte no encontrado en ${report_file}." >&2
        echo "Ejecute primero './scripts/graphify.sh scan' para generar el grafo." >&2
        return 1
    fi

    cat "$report_file"
    return 0
}

cmd_query() {
    local term="${1:-}"
    if [ -z "$term" ]; then
        echo "[ERROR] Debe especificar un término o entidad para consultar. Ejemplo: './scripts/graphify.sh query jugador'" >&2
        return 1
    fi

    local graph_file="${OUT_DIR}/graph.json"
    if [ ! -f "$graph_file" ]; then
        echo "[ERROR] Grafo local no encontrado en ${graph_file}." >&2
        echo "Ejecute primero './scripts/graphify.sh scan' para indexar el repositorio." >&2
        return 1
    fi

    python3 - "$graph_file" "$term" << 'PYEOF'
import sys
import json

graph_path = sys.argv[1]
query = sys.argv[2].lower()

try:
    with open(graph_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"[ERROR] No se pudo leer {graph_path}: {e}", file=sys.stderr)
    sys.exit(1)

nodes = data.get("nodes", [])
links = data.get("links", data.get("edges", []))

# Buscar coincidencias: exactas primero, luego parciales
exact_matches = []
partial_matches = []

for n in nodes:
    nid = str(n.get("id", ""))
    label = str(n.get("label", ""))
    path = str(n.get("source_file", n.get("path", "")))

    if query == label.lower() or query == nid.lower():
        exact_matches.append(n)
    elif query in label.lower() or query in nid.lower() or query in path.lower():
        partial_matches.append(n)

results = exact_matches if exact_matches else partial_matches

if not results:
    print(f"[INFO] No se encontraron nodos o entidades coincidentes con: '{query}'")
    sys.exit(1)

print(f"\n================================================================================")
print(f" Resultados de consulta para: '{query}' ({len(results)} coincidencia(s))")
print(f"================================================================================\n")

# Mostrar máximo 15 nodos para no saturar la terminal
for node in results[:15]:
    nid = node.get("id")
    label = node.get("label", nid)
    file_type = node.get("file_type", "código")
    community = node.get("community_name", f"Comunidad {node.get('community', 'N/A')}")
    source_file = node.get("source_file", node.get("path", ""))
    source_loc = node.get("source_location", "")

    loc_str = f" ({source_file}:{source_loc})" if source_file and source_loc else (f" ({source_file})" if source_file else "")
    print(f"• Nodo: {label} [{file_type}]{loc_str}")
    print(f"  ID: {nid}")
    print(f"  Comunidad: {community}")

    out_links = [l for l in links if l.get("source") == nid]
    in_links = [l for l in links if l.get("target") == nid]

    if out_links:
        print(f"  Conexiones salientes ({len(out_links)}):")
        for l in out_links[:8]:
            target_id = l.get("target", "")
            rel = l.get("relation", "relacionado_con")
            loc = l.get("source_location", "")
            print(f"    -> [{rel}] -> {target_id} {loc}".rstrip())
        if len(out_links) > 8:
            print(f"    ... y {len(out_links) - 8} conexiones salientes más")

    if in_links:
        print(f"  Conexiones entrantes ({len(in_links)}):")
        for l in in_links[:8]:
            source_id = l.get("source", "")
            rel = l.get("relation", "referenciado_por")
            loc = l.get("source_location", "")
            print(f"    <- [{rel}] <- {source_id} {loc}".rstrip())
        if len(in_links) > 8:
            print(f"    ... y {len(in_links) - 8} conexiones entrantes más")
    print()

if len(results) > 15:
    print(f"[INFO] Se omitieron {len(results) - 15} coincidencias secundarias. Especifique un término más preciso si es necesario.\n")

sys.exit(0)
PYEOF
}

cmd_view() {
    local html_file="${OUT_DIR}/graph.html"
    if [ ! -f "$html_file" ]; then
        echo "[ERROR] Visualización no encontrada en ${html_file}." >&2
        echo "Ejecute primero './scripts/graphify.sh scan' para generar el grafo." >&2
        return 1
    fi

    local port=8080
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --port)
                if [[ $# -lt 2 ]]; then
                    echo "[ERROR] --port requiere especificar un número de puerto." >&2
                    return 1
                fi
                port="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    echo "[INFO] Visualización interactiva disponible en: ${html_file}"
    if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$html_file" >/dev/null 2>&1 &
            echo "[SUCCESS] Visualizador abierto en el navegador predeterminado."
            return 0
        elif command -v open >/dev/null 2>&1; then
            open "$html_file" >/dev/null 2>&1 &
            echo "[SUCCESS] Visualizador abierto en el navegador predeterminado."
            return 0
        fi
    fi

    echo "[INFO] Iniciando servidor HTTP estático local en http://127.0.0.1:${port} (Presione Ctrl+C para detener)..."
    python3 -m http.server "$port" --directory "${OUT_DIR}"
    return 0
}

cmd_clean() {
    echo "[INFO] Limpiando artefactos generados por Graphify..."
    rm -rf "${OUT_DIR}"
    rm -rf "${REPO_ROOT}/.graphify_cache"
    rm -rf "${REPO_ROOT}/.venv-graphify"
    rm -f "${REPO_ROOT}"/.graphify_*.json
    echo "[SUCCESS] Limpieza completada. El repositorio se encuentra limpio."
    return 0
}

# ------------------------------------------------------------------------------
# 5. CLI Dispatcher
# ------------------------------------------------------------------------------
main() {
    local subcommand="${1:-scan}"
    if [ $# -gt 0 ]; then
        shift
    fi

    case "$subcommand" in
        scan)
            cmd_scan "$@"
            ;;
        report)
            cmd_report "$@"
            ;;
        query)
            cmd_query "$@"
            ;;
        view)
            cmd_view "$@"
            ;;
        clean)
            cmd_clean "$@"
            ;;
        --help|-h|help)
            cmd_help
            ;;
        *)
            echo "[ERROR] Subcomando desconocido: '$subcommand'" >&2
            echo "Use './scripts/graphify.sh --help' para ver los comandos válidos." >&2
            exit 2
            ;;
    esac
}

main "$@"
