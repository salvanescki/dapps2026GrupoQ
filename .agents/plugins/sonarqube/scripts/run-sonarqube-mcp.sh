#!/usr/bin/env sh
# ============================================================================
# Wrapper seguro para iniciar el servidor oficial SonarQube MCP (Docker Stdio)
# Lee credenciales locales desde .env / .env.local (ignorados por Git)
# ============================================================================
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../../.." && pwd)

load_env_file() {
  env_file="$1"
  if [ -f "$env_file" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
      clean_line=$(printf '%s' "$line" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
      case "$clean_line" in
        ""|\#*) continue ;;
      esac
      clean_line=${clean_line#export }
      key=${clean_line%%=*}
      val=${clean_line#*=}
      case "$val" in
        \"*\") val=${val#\"}; val=${val%\"} ;;
        \'*\') val=${val#\'}; val=${val%\'} ;;
      esac
      if [ -n "$key" ]; then
        export "$key=$val"
      fi
    done < "$env_file"
  fi
}

# Prioridad de carga: global del usuario -> .env del repo -> .env.local del repo
load_env_file "$HOME/.gemini/config/sonarqube.env"
load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.local"

# Soportar SONAR_TOKEN como alias por compatibilidad con GitHub Actions CI
if [ -z "${SONARQUBE_TOKEN:-}" ] && [ -n "${SONAR_TOKEN:-}" ]; then
  export SONARQUBE_TOKEN="$SONAR_TOKEN"
fi

# Valores por defecto del proyecto (SonarQube Cloud EU)
export SONARQUBE_ORG="${SONARQUBE_ORG:-salvanescki}"
export SONARQUBE_PROJECT_KEY="${SONARQUBE_PROJECT_KEY:-salvanescki_dapps2026GrupoQ}"

if [ -z "${SONARQUBE_TOKEN:-}" ]; then
  echo "[sonarqube-mcp] ERROR: SONARQUBE_TOKEN no está definido." >&2
  echo "[sonarqube-mcp] Configura tu User Token en $REPO_ROOT/.env o $REPO_ROOT/.env.local" >&2
  echo "[sonarqube-mcp] Puedes generarlo en: https://sonarcloud.io/account/security" >&2
  exit 1
fi

# En SonarQube Cloud región EU (https://sonarcloud.io), omitir SONARQUBE_URL usa EU por defecto.
# Solo pasamos SONARQUBE_URL si se especificó otra URL distinta a la por defecto de EU.
EXTRA_ENV_ARGS=""
if [ -n "${SONARQUBE_URL:-}" ] && [ "$SONARQUBE_URL" != "https://sonarcloud.io" ] && [ "$SONARQUBE_URL" != "https://sonarcloud.io/" ]; then
  EXTRA_ENV_ARGS="-e SONARQUBE_URL"
fi

# shellcheck disable=SC2086
exec docker run \
  --init \
  --pull="${SONARQUBE_DOCKER_PULL:-missing}" \
  -i \
  --rm \
  -e SONARQUBE_TOKEN \
  -e SONARQUBE_ORG \
  -e SONARQUBE_PROJECT_KEY \
  $EXTRA_ENV_ARGS \
  -v "$REPO_ROOT:/app/mcp-workspace" \
  sonarsource/sonarqube-mcp

