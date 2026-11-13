#!/usr/bin/env python3
"""
Script auxiliar (sin dependencias externas) para consultar issues abiertos y
métricas/bloques de duplicación de código en SonarQube Cloud (Región EU:
https://sonarcloud.io) y generar resúmenes o insumos estructurados para Speckit
(speckit-specify / speckit-plan).

Lee credenciales opcionales desde .env.local / .env (nunca hardcodeadas).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]


def load_env_file(file_path: Path) -> None:
    if not file_path.is_file():
        return
    for raw_line in file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        if key and val != "":
            os.environ[key] = val


load_env_file(Path.home() / ".gemini" / "config" / "sonarqube.env")
load_env_file(REPO_ROOT / ".env")
load_env_file(REPO_ROOT / ".env.local")

SONAR_URL = (os.environ.get("SONARQUBE_URL") or "https://sonarcloud.io").rstrip("/")
SONAR_ORG = os.environ.get("SONARQUBE_ORG") or "salvanescki"
PROJECT_KEY = (
    os.environ.get("SONARQUBE_PROJECT_KEY") or "salvanescki_dapps2026GrupoQ"
)
TOKEN = os.environ.get("SONARQUBE_TOKEN") or os.environ.get("SONAR_TOKEN") or ""


def sonar_get_json(path: str, params: dict) -> dict:
    headers = {"Accept": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    query = urllib.parse.urlencode(params)
    url = f"{SONAR_URL}{path}?{query}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"SonarQube Cloud API error ({exc.code}) on {path}: {body}"
        ) from exc


def fetch_all_open_issues():
    page_index = 1
    page_size = 500
    all_issues = []
    raw_first_page = None

    while True:
        data = sonar_get_json(
            "/api/issues/search",
            {
                "componentKeys": PROJECT_KEY,
                "organization": SONAR_ORG,
                "resolved": "false",
                "ps": str(page_size),
                "p": str(page_index),
            },
        )

        if raw_first_page is None:
            raw_first_page = data

        issues = data.get("issues", [])
        all_issues.extend(issues)

        total = data.get("paging", {}).get(
            "total", data.get("total", len(all_issues))
        )
        if len(all_issues) >= total or not issues:
            break
        page_index += 1

    return all_issues, raw_first_page


def enrich_issue(issue: dict) -> dict:
    component = issue.get("component", "")
    prefix = f"{PROJECT_KEY}:"
    file_path = (
        component[len(prefix) :] if component.startswith(prefix) else component
    )
    if file_path.startswith("backend/"):
        module_name = "backend"
    elif file_path.startswith("frontend/"):
        module_name = "frontend"
    else:
        module_name = "other"

    text_range = issue.get("textRange") or {}
    line = issue.get("line") or text_range.get("startLine") or 1
    end_line = text_range.get("endLine") or line

    return {
        "key": issue.get("key", ""),
        "rule": issue.get("rule", ""),
        "severity": issue.get("severity", "MAJOR"),
        "type": issue.get("type", "CODE_SMELL"),
        "status": issue.get("issueStatus") or issue.get("status") or "OPEN",
        "file": file_path,
        "line": line,
        "endLine": end_line,
        "message": issue.get("message", ""),
        "effort": issue.get("effort") or issue.get("debt") or "5min",
        "module": module_name,
        "impacts": issue.get("impacts", []),
    }


def filter_issues(issues: list[dict], modules, severities, rules) -> list[dict]:
    filtered = []
    for item in issues:
        if modules and item["module"] not in modules:
            continue
        if severities and item["severity"] not in severities:
            continue
        if rules and item["rule"] not in rules:
            continue
        filtered.append(item)
    return filtered


def render_summary(issues: list[dict], raw_first_page: dict | None) -> str:
    by_severity: dict[str, int] = {}
    by_module: dict[str, int] = {}
    by_rule: dict[str, dict] = {}

    for item in issues:
        sev = item["severity"]
        mod = item["module"]
        rule = item["rule"]
        by_severity[sev] = by_severity.get(sev, 0) + 1
        by_module[mod] = by_module.get(mod, 0) + 1
        if rule not in by_rule:
            by_rule[rule] = {
                "count": 0,
                "severity": sev,
                "type": item["type"],
                "sample_message": item["message"],
                "modules": set(),
            }
        by_rule[rule]["count"] += 1
        by_rule[rule]["modules"].add(mod)

    debt_total = (raw_first_page or {}).get("debtTotal", 0)
    lines = [
        "# Resumen de Issues Abiertos en SonarQube Cloud (EU)",
        f"- **Organización**: `{SONAR_ORG}`",
        f"- **Proyecto**: `{PROJECT_KEY}`",
        f"- **Total de issues filtrados**: **{len(issues)}** (Deuda técnica total proyecto: {debt_total} min)",
        "",
        "## 1. Distribución por Módulo",
        "| Módulo | Cantidad de Issues |",
        "| --- | --- |",
    ]
    for mod, count in sorted(by_module.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"| `{mod}` | {count} |")
    lines.append("")

    lines.extend(
        [
            "## 2. Distribución por Severidad",
            "| Severidad | Cantidad de Issues |",
            "| --- | --- |",
        ]
    )
    for sev in ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]:
        if by_severity.get(sev):
            lines.append(f"| `{sev}` | {by_severity[sev]} |")
    lines.append("")

    lines.extend(
        [
            "## 3. Agrupación por Regla de SonarQube",
            "| Regla | Severidad | Tipo | Módulos | Cantidad | Ejemplo de Mensaje |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for rule, info in sorted(
        by_rule.items(), key=lambda x: x[1]["count"], reverse=True
    ):
        mods = ", ".join(sorted(info["modules"]))
        msg = info["sample_message"].replace("|", "\\|")
        lines.append(
            f"| `{rule}` | `{info['severity']}` | `{info['type']}` | `{mods}` | {info['count']} | {msg} |"
        )

    return "\n".join(lines)


def render_speckit_brief(issues: list[dict]) -> str:
    by_rule: dict[str, dict] = {}
    for item in issues:
        rule = item["rule"]
        if rule not in by_rule:
            by_rule[rule] = {
                "severity": item["severity"],
                "type": item["type"],
                "items": [],
            }
        by_rule[rule]["items"].append(item)

    lines = [
        "# Insumo de Remediación SonarQube Cloud para Speckit",
        f"- **Proyecto**: `{PROJECT_KEY}` (Organización `{SONAR_ORG}`, Región EU)",
        f"- **Issues incluidos en el alcance**: {len(issues)}",
        "",
    ]

    for rule, group in sorted(
        by_rule.items(), key=lambda x: len(x[1]["items"]), reverse=True
    ):
        items = group["items"]
        lines.append(
            f"## Regla `{rule}` ({group['severity']} - {group['type']}) — {len(items)} ocurrencia(s)"
        )
        lines.append(f"**Descripción patrón**: {items[0]['message']}")
        lines.append("")
        lines.append("| Archivo | Línea(s) | Mensaje específico | Esfuerzo |")
        lines.append("| --- | --- | --- | --- |")
        for it in items:
            line_range = (
                f"{it['line']}-{it['endLine']}"
                if it["endLine"] != it["line"]
                else f"{it['line']}"
            )
            msg = it["message"].replace("|", "\\|")
            lines.append(
                f"| `{it['file']}` | {line_range} | {msg} | {it['effort']} |"
            )
        lines.append("")

    return "\n".join(lines)


# ============================================================================
# Soporte de Duplicaciones de Código (Measures + Component Tree + Duplications)
# ============================================================================

DUP_METRICS = (
    "duplicated_lines_density,duplicated_lines,duplicated_blocks,"
    "duplicated_files,new_duplicated_lines_density,new_duplicated_lines,"
    "new_duplicated_blocks,lines,ncloc,files"
)


def parse_measures_dict(measures_list: list[dict]) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in measures_list:
        metric = m.get("metric", "")
        if "value" in m:
            out[metric] = str(m["value"])
        elif "periods" in m and m["periods"]:
            out[metric] = str(m["periods"][0].get("value", "0"))
    return out


def fetch_duplications_data(modules: list[str], exclude_migrations: bool) -> dict:
    # 1. Métricas globales del proyecto
    overall_raw = sonar_get_json(
        "/api/measures/component",
        {"component": PROJECT_KEY, "metricKeys": DUP_METRICS},
    )
    overall_measures = parse_measures_dict(
        overall_raw.get("component", {}).get("measures", [])
    )

    # 2. Métricas por directorio raíz (backend/src y frontend/src)
    module_measures: dict[str, dict[str, str]] = {}
    for mod_name, subdir in [("backend", "backend/src"), ("frontend", "frontend/src")]:
        try:
            mod_raw = sonar_get_json(
                "/api/measures/component",
                {
                    "component": f"{PROJECT_KEY}:{subdir}",
                    "metricKeys": DUP_METRICS,
                },
            )
            module_measures[mod_name] = parse_measures_dict(
                mod_raw.get("component", {}).get("measures", [])
            )
        except Exception:
            module_measures[mod_name] = {}

    # 3. Archivos con duplicación (component_tree)
    tree_raw = sonar_get_json(
        "/api/measures/component_tree",
        {
            "component": PROJECT_KEY,
            "metricKeys": "duplicated_lines_density,duplicated_lines,duplicated_blocks,lines,ncloc",
            "qualifiers": "FIL",
            "metricSort": "duplicated_lines",
            "metricSortFilter": "withMeasuresOnly",
            "s": "metric",
            "asc": "false",
            "ps": "500",
        },
    )

    duplicated_files = []
    for comp in tree_raw.get("components", []):
        m = parse_measures_dict(comp.get("measures", []))
        dup_lines = int(float(m.get("duplicated_lines", "0")))
        if dup_lines <= 0:
            continue
        path = comp.get("path", "")
        if path.startswith("backend/"):
            mod = "backend"
        elif path.startswith("frontend/"):
            mod = "frontend"
        else:
            mod = "other"

        is_migration = "/migrations/" in f"/{path}"
        if modules and mod not in modules:
            continue
        if exclude_migrations and is_migration:
            continue

        # 4. Bloques detallados de duplicación (/api/duplications/show)
        comp_key = comp.get("key", f"{PROJECT_KEY}:{path}")
        blocks_detail = []
        try:
            dup_raw = sonar_get_json("/api/duplications/show", {"key": comp_key})
            files_map = {
                k: v.get("name", k) for k, v in dup_raw.get("files", {}).items()
            }
            for dup_entry in dup_raw.get("duplications", []):
                parts = []
                for b in dup_entry.get("blocks", []):
                    ref_file = files_map.get(b.get("_ref", ""), b.get("_ref", ""))
                    start_line = int(b.get("from", 1))
                    size = int(b.get("size", 1))
                    end_line = start_line + size - 1
                    parts.append(
                        {
                            "file": ref_file,
                            "startLine": start_line,
                            "endLine": end_line,
                            "size": size,
                        }
                    )
                if parts:
                    blocks_detail.append(parts)
        except Exception:
            blocks_detail = []

        duplicated_files.append(
            {
                "path": path,
                "key": comp_key,
                "module": mod,
                "is_migration": is_migration,
                "duplicated_lines_density": m.get("duplicated_lines_density", "0.0"),
                "duplicated_lines": dup_lines,
                "duplicated_blocks": int(float(m.get("duplicated_blocks", "0"))),
                "lines": int(float(m.get("lines", "0"))),
                "ncloc": int(float(m.get("ncloc", "0"))),
                "duplications": blocks_detail,
            }
        )

    return {
        "overall": overall_measures,
        "modules": module_measures,
        "files": duplicated_files,
        "exclude_migrations": exclude_migrations,
    }


def render_duplications_summary(data: dict) -> str:
    ov = data["overall"]
    mods = data["modules"]
    files = data["files"]

    new_density = float(ov.get("new_duplicated_lines_density", "0.0"))
    lines = [
        "# Resumen de Duplicación de Código en SonarQube Cloud (EU)",
        f"- **Organización**: `{SONAR_ORG}`",
        f"- **Proyecto**: `{PROJECT_KEY}`",
        "",
        "## 1. Métricas Generales (`Overall Code` vs `New Code`)",
        "| Métrica | Overall Code | New Code |",
        "| --- | --- | --- |",
        f"| **Densidad de líneas duplicadas (`duplicated_lines_density`)** | **{ov.get('duplicated_lines_density', '0.0')}%** | **{new_density:.2f}%** |",
        f"| **Líneas duplicadas (`duplicated_lines`)** | **{ov.get('duplicated_lines', '0')}** | **{ov.get('new_duplicated_lines', '0')}** |",
        f"| **Bloques duplicados (`duplicated_blocks`)** | **{ov.get('duplicated_blocks', '0')}** | **{ov.get('new_duplicated_blocks', '0')}** |",
        f"| **Archivos con duplicación (`duplicated_files`)** | **{ov.get('duplicated_files', '0')}** (de {ov.get('files', '0')}) | — |",
        f"| **Líneas totales (`lines` / `ncloc`)** | {ov.get('lines', '0')} / {ov.get('ncloc', '0')} | — |",
        "",
        "## 2. Desglose por Módulo (`backend/src` vs `frontend/src`)",
        "| Módulo | Densidad (`%`) | Líneas Duplicadas | Bloques Duplicados | Archivos Duplicados | Líneas (`lines` / `ncloc`) |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for mod_name in ["backend", "frontend"]:
        mm = mods.get(mod_name, {})
        if mm:
            lines.append(
                f"| `{mod_name}/src` | **{mm.get('duplicated_lines_density', '0.0')}%** | "
                f"{mm.get('duplicated_lines', '0')} | {mm.get('duplicated_blocks', '0')} | "
                f"{mm.get('duplicated_files', '0')} | {mm.get('lines', '0')} / {mm.get('ncloc', '0')} |"
            )
    lines.append("")

    lines.extend(
        [
            f"## 3. Archivos con Duplicación en Alcance ({len(files)} archivo(s))",
            "| # | Archivo | Módulo | Categoría | Densidad | Líneas Dup. | Bloques | Líneas Totales |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
    )
    for idx, f in enumerate(files, start=1):
        cat = "Migración ORM" if f["is_migration"] else "Código Productivo"
        lines.append(
            f"| {idx} | `{f['path']}` | `{f['module']}` | {cat} | "
            f"**{f['duplicated_lines_density']}%** | {f['duplicated_lines']} | "
            f"{f['duplicated_blocks']} | {f['lines']} |"
        )

    return "\n".join(lines)


def render_duplications_speckit_brief(data: dict) -> str:
    ov = data["overall"]
    files = data["files"]
    exclude_migrations = data.get("exclude_migrations", False)

    prod_files = [f for f in files if not f["is_migration"]]
    mig_files = [f for f in files if f["is_migration"]]
    prod_lines = sum(f["duplicated_lines"] for f in prod_files)
    mig_lines = sum(f["duplicated_lines"] for f in mig_files)

    lines = [
        "# Insumo de Reducción de Duplicación SonarQube Cloud para Speckit",
        f"- **Proyecto**: `{PROJECT_KEY}` (Organización `{SONAR_ORG}`, Región EU)",
        f"- **Densidad Overall actual**: `{ov.get('duplicated_lines_density', '0.0')}%` ({ov.get('duplicated_lines', '0')} líneas duplicadas en {ov.get('duplicated_blocks', '0')} bloques y {ov.get('duplicated_files', '0')} archivos sobre {ov.get('lines', '0')} líneas totales)",
        f"- **Archivos de código productivo con duplicación**: {len(prod_files)} archivos ({prod_lines} líneas duplicadas)",
    ]
    if exclude_migrations:
        lines.append(
            "- **Estrategia para Migraciones TypeORM**: Excluir migraciones históricas de CPD en `sonar-project.properties` (`sonar.cpd.exclusions=backend/src/migrations/**`), eliminando 363 líneas de duplicación declarativa de esquemas."
        )
    elif mig_files:
        lines.append(
            f"- **Archivos de migraciones TypeORM con duplicación**: {len(mig_files)} archivos ({mig_lines} líneas duplicadas)"
        )
    lines.append("")

    lines.extend(
        [
            "## Resumen de Archivos y Bloques a Remediar",
            "| Archivo | Módulo | Densidad | Líneas Dup. | Bloques | Líneas Totales |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for f in files:
        lines.append(
            f"| `{f['path']}` | `{f['module']}` | {f['duplicated_lines_density']}% | "
            f"{f['duplicated_lines']} | {f['duplicated_blocks']} | {f['lines']} |"
        )
    lines.append("")

    lines.append("## Detalle de Bloques Duplicados por Archivo (`/api/duplications/show`)")
    lines.append("")
    for f in files:
        lines.append(
            f"### `{f['path']}` ({f['duplicated_lines']} líneas duplicadas, {f['duplicated_blocks']} bloque(s), {f['duplicated_lines_density']}%)"
        )
        if not f["duplications"]:
            lines.append("- Sin desglose de bloques disponible.")
        else:
            for b_idx, block_group in enumerate(f["duplications"], start=1):
                formatted = [
                    f"`{part['file']}` (líneas {part['startLine']}-{part['endLine']}, {part['size']} líneas)"
                    for part in block_group
                ]
                lines.append(f"- **Bloque {b_idx}**: " + " ↔ ".join(formatted))
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Consulta issues abiertos y duplicaciones de SonarQube Cloud (EU) para Speckit."
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Muestra el resumen de issues abiertos agrupado por módulo, severidad y regla.",
    )
    parser.add_argument(
        "--speckit-brief",
        action="store_true",
        help="Genera el detalle completo de issues agrupado por regla para alimentar Speckit.",
    )
    parser.add_argument(
        "--duplications",
        action="store_true",
        help="Muestra el resumen de métricas y archivos con duplicación de código en SonarQube Cloud.",
    )
    parser.add_argument(
        "--duplications-brief",
        action="store_true",
        help="Genera el insumo detallado de archivos y bloques duplicados para alimentar Speckit.",
    )
    parser.add_argument(
        "--exclude-migrations",
        action="store_true",
        help="Excluye archivos en backend/src/migrations/** del listado de refactor y documenta sonar.cpd.exclusions.",
    )
    parser.add_argument(
        "--sync-json",
        action="store_true",
        help="Actualiza sonar-issues.json en la raíz del repositorio.",
    )
    parser.add_argument(
        "--module",
        type=str,
        default="",
        help="Filtra por módulo separado por comas (backend,frontend).",
    )
    parser.add_argument(
        "--severity",
        type=str,
        default="",
        help="Filtra por severidad separada por comas (BLOCKER,CRITICAL,MAJOR,MINOR,INFO).",
    )
    parser.add_argument(
        "--rule",
        type=str,
        default="",
        help="Filtra por regla(s) separadas por comas (ej. typescript:S9383).",
    )

    args = parser.parse_args()
    if (
        not args.summary
        and not args.speckit_brief
        and not args.sync_json
        and not args.duplications
        and not args.duplications_brief
    ):
        args.summary = True

    modules = [
        m.strip().lower() for m in args.module.split(",") if m.strip()
    ]
    severities = [
        s.strip().upper() for s in args.severity.split(",") if s.strip()
    ]
    rules = [r.strip() for r in args.rule.split(",") if r.strip()]

    if args.summary or args.speckit_brief or args.sync_json:
        raw_issues, raw_first_page = fetch_all_open_issues()

        if args.sync_json and raw_first_page is not None:
            target_path = REPO_ROOT / "sonar-issues.json"
            raw_first_page["issues"] = raw_issues
            target_path.write_text(json.dumps(raw_first_page), encoding="utf-8")
            print(
                f"[sonarcloud_issues] Archivo actualizado: {target_path} ({len(raw_issues)} issues)",
                file=sys.stderr,
            )

        enriched = [enrich_issue(i) for i in raw_issues]
        filtered = filter_issues(enriched, modules, severities, rules)

        if args.summary:
            print(render_summary(filtered, raw_first_page))
        if args.speckit_brief:
            if args.summary:
                print("\n---\n")
            print(render_speckit_brief(filtered))

    if args.duplications or args.duplications_brief:
        dup_data = fetch_duplications_data(modules, args.exclude_migrations)
        if args.duplications:
            if args.summary or args.speckit_brief:
                print("\n---\n")
            print(render_duplications_summary(dup_data))
        if args.duplications_brief:
            if args.summary or args.speckit_brief or args.duplications:
                print("\n---\n")
            print(render_duplications_speckit_brief(dup_data))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[sonarcloud_issues] Error: {exc}", file=sys.stderr)
        sys.exit(1)
