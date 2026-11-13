#!/usr/bin/env python3
"""
Script auxiliar (sin dependencias externas) para consultar issues abiertos de
SonarQube Cloud (Región EU: https://sonarcloud.io) y generar resúmenes o
insumos estructurados para Speckit (speckit-specify / speckit-plan).

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


def fetch_all_open_issues():
    headers = {"Accept": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    page_index = 1
    page_size = 500
    all_issues = []
    raw_first_page = None

    while True:
        params = urllib.parse.urlencode(
            {
                "componentKeys": PROJECT_KEY,
                "organization": SONAR_ORG,
                "resolved": "false",
                "ps": str(page_size),
                "p": str(page_index),
            }
        )
        url = f"{SONAR_URL}/api/issues/search?{params}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"SonarQube Cloud API error ({exc.code}): {body}"
            ) from exc

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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Consulta issues abiertos de SonarQube Cloud (EU) para Speckit."
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Muestra el resumen agrupado por módulo, severidad y regla.",
    )
    parser.add_argument(
        "--speckit-brief",
        action="store_true",
        help="Genera el detalle completo agrupado por regla para alimentar Speckit.",
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
    if not args.summary and not args.speckit_brief and not args.sync_json:
        args.summary = True

    modules = [
        m.strip().lower() for m in args.module.split(",") if m.strip()
    ]
    severities = [
        s.strip().upper() for s in args.severity.split(",") if s.strip()
    ]
    rules = [r.strip() for r in args.rule.split(",") if r.strip()]

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


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[sonarcloud_issues] Error: {exc}", file=sys.stderr)
        sys.exit(1)

