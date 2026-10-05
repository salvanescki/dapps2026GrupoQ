#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""=============================================================================
Graphify CLI Runner Multiplataforma (Linux, Windows, macOS)
Football Player Token Marketplace - Grupo Q
Interface Contract: specs/007-integrate-graphify-cli/contracts/cli-runner.contract.md
Adhesión estricta a Constitución v1.1.0 (Modo 100% Offline, Sin MCP, Sin Nube)
============================================================================="""

from __future__ import annotations

import argparse
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import venv
import webbrowser
from pathlib import Path

# ------------------------------------------------------------------------------
# 1. Constantes y Rutas Base
# ------------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = REPO_ROOT / ".venv-graphify"
OUT_DIR = REPO_ROOT / "graphify-out"

# ------------------------------------------------------------------------------
# 2. Guardias de Seguridad Anti-MCP y Anti-Cloud (Constitución v1.1.0 & FR-003)
# ------------------------------------------------------------------------------
def verify_safety_guards() -> None:
    forbidden_mcp = {"--mcp", "graphify-mcp", "-mcp"}
    forbidden_cloud = {"app.graphify.com", "api.graphify.com", "hosted", "cloud-sync"}

    for arg in sys.argv[1:]:
        arg_lower = arg.lower()
        if any(f in arg_lower for f in forbidden_mcp):
            sys.stderr.write(
                "[ERROR] El protocolo MCP (Model Context Protocol) está terminantemente "
                "prohibido por la Constitución v1.1.0 del proyecto.\n"
            )
            sys.exit(1)
        if any(f in arg_lower for f in forbidden_cloud):
            sys.stderr.write(
                "[ERROR] Servicios o sincronización en la nube prohibidos. "
                "Graphify opera en modo 100% local y offline.\n"
            )
            sys.exit(1)

    # Eliminar cualquier variable de entorno que apunte a endpoints externos
    os.environ.pop("GRAPHIFY_HOSTED_URL", None)
    os.environ.pop("GRAPHIFY_API_KEY", None)


# ------------------------------------------------------------------------------
# 3. Validación de Prerrequisitos de Python
# ------------------------------------------------------------------------------
def check_python_prereqs() -> None:
    if sys.version_info < (3, 10):
        sys.stderr.write(
            f"[ERROR] Se requiere Python >= 3.10. "
            f"Versión detectada: {sys.version.split()[0]}\n"
        )
        sys.exit(1)


# ------------------------------------------------------------------------------
# 4. Detección y Aislamiento del Runtime (Global vs .venv-graphify)
# ------------------------------------------------------------------------------
def get_venv_executables() -> tuple[Path, Path, Path]:
    """Retorna las rutas a (python, pip, graphify) dentro de .venv-graphify."""
    is_windows = os.name == "nt"
    bin_dir = VENV_DIR / ("Scripts" if is_windows else "bin")
    py_exe = bin_dir / ("python.exe" if is_windows else "python")
    pip_exe = bin_dir / ("pip.exe" if is_windows else "pip")
    graphify_exe = bin_dir / ("graphify.exe" if is_windows else "graphify")
    return py_exe, pip_exe, graphify_exe


def resolve_graphify_binary() -> str:
    """Busca graphify en el PATH del sistema o inicializa el entorno virtual aislado."""
    # 1. Comprobar si graphify está en el PATH del sistema
    global_bin = shutil.which("graphify")
    if global_bin:
        return global_bin

    # 2. Comprobar si ya existe en el entorno virtual aislado del proyecto
    py_exe, pip_exe, graphify_exe = get_venv_executables()
    if graphify_exe.is_file() and os.access(graphify_exe, os.X_OK):
        return str(graphify_exe)

    # 3. Si no existe, inicializar el entorno virtual aislado
    sys.stderr.write(
        "[INFO] Graphify CLI no detectado en PATH. "
        "Configurando entorno local aislado en .venv-graphify...\n"
    )

    if VENV_DIR.exists():
        shutil.rmtree(VENV_DIR, ignore_errors=True)

    # Intentar creación estándar con ensurepip
    venv_created = False
    try:
        venv.create(VENV_DIR, with_pip=True)
        venv_created = True
    except Exception:
        venv_created = False

    # Si falló (ej. distribuciones minimalistas sin paquete python3-venv/ensurepip)
    if not venv_created or not pip_exe.exists():
        if VENV_DIR.exists():
            shutil.rmtree(VENV_DIR, ignore_errors=True)
        venv.create(VENV_DIR, with_pip=False)

        # Descargar bootstrap de get-pip.py
        get_pip_url = "https://bootstrap.pypa.io/get-pip.py"
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)

        try:
            with urllib.request.urlopen(get_pip_url, timeout=30) as resp, open(tmp_path, "wb") as f_out:
                shutil.copyfileobj(resp, f_out)
            subprocess.run(
                [str(py_exe), str(tmp_path), "--no-warn-script-location"],
                check=True,
                capture_output=True,
            )
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    # Instalar paquete oficial open source graphifyy
    sys.stderr.write("[INFO] Instalando paquete oficial open source 'graphifyy' en .venv-graphify...\n")
    subprocess.run(
        [str(pip_exe), "install", "--quiet", "--disable-pip-version-check", "graphifyy"],
        check=True,
    )

    if graphify_exe.is_file() and os.access(graphify_exe, os.X_OK):
        return str(graphify_exe)

    sys.stderr.write("[ERROR] No se pudo inicializar la CLI 'graphify' en el entorno local.\n")
    sys.exit(1)


# ------------------------------------------------------------------------------
# 5. Subcomandos
# ------------------------------------------------------------------------------
def cmd_scan(args: argparse.Namespace) -> int:
    check_python_prereqs()
    graphify_bin = resolve_graphify_binary()

    if args.clean:
        sys.stderr.write("[INFO] Modo limpio (--clean): eliminando artefactos y caché previa...\n")
        if OUT_DIR.exists():
            shutil.rmtree(OUT_DIR, ignore_errors=True)
        cache_dir = REPO_ROOT / ".graphify_cache"
        if cache_dir.exists():
            shutil.rmtree(cache_dir, ignore_errors=True)
        for f in REPO_ROOT.glob(".graphify_*.json"):
            f.unlink(missing_ok=True)

    target_path = args.path or "."
    sys.stderr.write("[INFO] Iniciando escaneo local determinístico AST (código y especificaciones)...\n")
    start_time = time.time()

    # Asegurar .graphifyignore
    graphify_ignore = REPO_ROOT / ".graphifyignore"
    if not graphify_ignore.exists():
        graphify_ignore.write_text(
            "node_modules/\ndist/\nbuild/\n.git/\ncoverage/\nlogs/\npostgres_data/\n.venv-graphify/\ngraphify-out/\n",
            encoding="utf-8",
        )

    # 1. Extracción AST en modo local --code-only
    extract_cmd = [graphify_bin, "extract", target_path, "--code-only", "--out", str(REPO_ROOT)]
    try:
        proc = subprocess.run(extract_cmd, cwd=REPO_ROOT)
        if proc.returncode != 0:
            sys.stderr.write("[ERROR] Falló la extracción del grafo con Graphify CLI.\n")
            return 2
    except Exception as e:
        sys.stderr.write(f"[ERROR] Excepción durante la extracción AST: {e}\n")
        return 2

    # 2. Clusterización determinística Leiden y reportes
    sys.stderr.write("[INFO] Generando comunidades Leiden, reporte y visualización offline...\n")
    cluster_cmd = [graphify_bin, "cluster-only", str(REPO_ROOT), "--no-label"]
    try:
        proc = subprocess.run(cluster_cmd, cwd=REPO_ROOT)
        if proc.returncode != 0:
            sys.stderr.write("[ERROR] Falló la clusterización y generación de reportes.\n")
            return 2
    except Exception as e:
        sys.stderr.write(f"[ERROR] Excepción durante la clusterización: {e}\n")
        return 2

    duration = int(time.time() - start_time)
    graph_json = OUT_DIR / "graph.json"
    graph_html = OUT_DIR / "graph.html"
    report_md = OUT_DIR / "GRAPH_REPORT.md"

    if graph_json.is_file() and graph_html.is_file() and report_md.is_file():
        print(f"[SUCCESS] Grafo de conocimiento generado exitosamente en {duration}s.")
        print(f"  - Grafo JSON:      {graph_json}")
        print(f"  - Visualización:   {graph_html}")
        print(f"  - Reporte resumen: {report_md}")
        return 0

    sys.stderr.write(f"[ERROR] Faltan artefactos esperados en {OUT_DIR}.\n")
    return 2


def cmd_report(args: argparse.Namespace) -> int:
    report_file = OUT_DIR / "GRAPH_REPORT.md"
    if not report_file.is_file():
        sys.stderr.write(
            f"[ERROR] Archivo de reporte no encontrado en {report_file}.\n"
            "Ejecute primero './scripts/graphify.py scan' (o 'npm run graphify -- scan') para generar el grafo.\n"
        )
        return 1

    try:
        print(report_file.read_text(encoding="utf-8"))
        return 0
    except Exception as e:
        sys.stderr.write(f"[ERROR] No se pudo leer {report_file}: {e}\n")
        return 1


def cmd_query(args: argparse.Namespace) -> int:
    term = (args.term or "").strip()
    if not term:
        sys.stderr.write("[ERROR] Debe especificar un término o entidad para consultar. Ejemplo: 'query Jugador'\n")
        return 1

    graph_file = OUT_DIR / "graph.json"
    if not graph_file.is_file():
        sys.stderr.write(
            f"[ERROR] Grafo local no encontrado en {graph_file}.\n"
            "Ejecute primero './scripts/graphify.py scan' para indexar el repositorio.\n"
        )
        return 1

    try:
        with open(graph_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        sys.stderr.write(f"[ERROR] No se pudo leer {graph_file}: {e}\n")
        return 1

    nodes = data.get("nodes", [])
    links = data.get("links", data.get("edges", []))
    q_lower = term.lower()

    exact_matches: list[dict] = []
    partial_matches: list[dict] = []

    for n in nodes:
        nid = str(n.get("id", ""))
        label = str(n.get("label", ""))
        path = str(n.get("source_file", n.get("path", "")))

        if q_lower == label.lower() or q_lower == nid.lower():
            exact_matches.append(n)
        elif q_lower in label.lower() or q_lower in nid.lower() or q_lower in path.lower():
            partial_matches.append(n)

    results = exact_matches if exact_matches else partial_matches

    if not results:
        print(f"[INFO] No se encontraron nodos o entidades coincidentes con: '{term}'")
        return 1

    print("\n" + "=" * 80)
    print(f" Resultados de consulta para: '{term}' ({len(results)} coincidencia(s))")
    print("=" * 80 + "\n")

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

    return 0


def cmd_view(args: argparse.Namespace) -> int:
    html_file = OUT_DIR / "graph.html"
    if not html_file.is_file():
        sys.stderr.write(
            f"[ERROR] Visualización no encontrada en {html_file}.\n"
            "Ejecute primero './scripts/graphify.py scan' para generar el grafo.\n"
        )
        return 1

    port = args.port or 8080
    print(f"[INFO] Visualización interactiva disponible en: {html_file}")

    # Intentar abrir con el navegador predeterminado del sistema (Windows, macOS, Linux GUI)
    opened = False
    try:
        opened = webbrowser.open(html_file.resolve().as_uri())
    except Exception:
        opened = False

    if opened:
        print("[SUCCESS] Visualizador abierto en el navegador predeterminado.")
        return 0

    # Modo servidor estático local si no hay navegador gráfico detectado
    print(f"[INFO] Iniciando servidor HTTP estático local en http://127.0.0.1:{port} (Ctrl+C para finalizar)...")
    os.chdir(OUT_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    try:
        with http.server.HTTPServer(("127.0.0.1", port), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido por el usuario.")
    return 0


def cmd_clean(args: argparse.Namespace) -> int:
    print("[INFO] Limpiando artefactos generados por Graphify...")
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR, ignore_errors=True)
    cache_dir = REPO_ROOT / ".graphify_cache"
    if cache_dir.exists():
        shutil.rmtree(cache_dir, ignore_errors=True)
    if VENV_DIR.exists():
        shutil.rmtree(VENV_DIR, ignore_errors=True)
    for f in REPO_ROOT.glob(".graphify_*.json"):
        f.unlink(missing_ok=True)

    print("[SUCCESS] Limpieza completada. El repositorio se encuentra limpio.")
    return 0


# ------------------------------------------------------------------------------
# 6. Parser Principal y Dispatcher
# ------------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="graphify.py",
        description="Graphify CLI Runner Multiplataforma (Linux, Windows, macOS) - Grupo Q",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Ejemplos:
  python scripts/graphify.py scan
  python scripts/graphify.py report
  python scripts/graphify.py query Jugador
  python scripts/graphify.py view
  python scripts/graphify.py clean
""",
    )
    subparsers = parser.add_subparsers(dest="subcommand", title="subcomandos")

    # scan
    p_scan = subparsers.add_parser("scan", help="Escanear repositorio y generar artefactos en graphify-out/")
    p_scan.add_argument("--clean", action="store_true", help="Limpiar caché previa y regenerar desde cero")
    p_scan.add_argument("--path", default=".", help="Ruta de escaneo (por defecto la raíz del proyecto)")
    p_scan.set_defaults(func=cmd_scan)

    # report
    p_report = subparsers.add_parser("report", help="Mostrar reporte consolidado (GRAPH_REPORT.md) en stdout")
    p_report.set_defaults(func=cmd_report)

    # query
    p_query = subparsers.add_parser("query", help="Buscar nodo o entidad y mostrar conexiones directas")
    p_query.add_argument("term", nargs="?", default="", help="Nombre del símbolo, entidad o concepto a consultar")
    p_query.set_defaults(func=cmd_query)

    # view
    p_view = subparsers.add_parser("view", help="Abrir visualización interactiva offline (graph.html)")
    p_view.add_argument("--port", type=int, default=8080, help="Puerto HTTP local si se ejecuta servidor (default: 8080)")
    p_view.set_defaults(func=cmd_view)

    # clean
    p_clean = subparsers.add_parser("clean", help="Eliminar graphify-out/, cachés y .venv-graphify/")
    p_clean.set_defaults(func=cmd_clean)

    return parser


def main() -> None:
    verify_safety_guards()
    parser = build_parser()

    # Si se invoca sin argumentos, ejecutar scan por omisión
    args = parser.parse_args(sys.argv[1:] if len(sys.argv) > 1 else ["scan"])
    if hasattr(args, "func"):
        sys.exit(args.func(args))
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    main()
