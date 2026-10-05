#!/usr/bin/env bash
# ==============================================================================
# Graphify CLI Runner Wrapper (Delegates to scripts/graphify.py)
# Football Player Token Marketplace - Grupo Q
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v python3 >/dev/null 2>&1; then
    exec python3 "${SCRIPT_DIR}/graphify.py" "$@"
elif command -v python >/dev/null 2>&1; then
    exec python "${SCRIPT_DIR}/graphify.py" "$@"
else
    echo "[ERROR] Python 3 no está instalado o no se encuentra en el PATH." >&2
    exit 1
fi
