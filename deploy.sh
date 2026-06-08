#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=/opt/data/formadigital_app
NODE_BIN=/opt/data/runtime/node/current/bin
RUNTIME_DIR="$APP_DIR/.runtime"
export PATH="$NODE_BIN:/usr/local/bin:/usr/bin:/bin"
export PM2_HOME="$RUNTIME_DIR/pm2"

cd "$APP_DIR"
mkdir -p "$RUNTIME_DIR/deploy" "$RUNTIME_DIR/logs"

exec 9>"$RUNTIME_DIR/deploy/deploy.lock"
flock -n 9 || { echo "Another deploy is already running."; exit 1; }

git fetch origin deploy
git checkout main
git merge --ff-only origin/deploy

install_node_dependencies() {
  local directory=$1
  local marker="$RUNTIME_DIR/deploy/$(basename "$directory").lock.sha256"
  local checksum
  checksum=$(sha256sum "$directory/package-lock.json" | cut -d' ' -f1)

  if [[ ! -d "$directory/node_modules" ]] || [[ ! -f "$marker" ]] || [[ "$(cat "$marker")" != "$checksum" ]]; then
    (cd "$directory" && npm ci)
    printf '%s\n' "$checksum" > "$marker"
  fi
}

install_node_dependencies "$APP_DIR/apps/backend"
install_node_dependencies "$APP_DIR/apps/frontend"

(
  cd "$APP_DIR/apps/backend"
  npx prisma generate
  npx prisma migrate deploy
  npm run build
)

(cd "$APP_DIR/apps/frontend" && npm run build)

HARV3ST_DIR="$APP_DIR/services/harv3st"
HARV3ST_MARKER="$RUNTIME_DIR/deploy/harv3st-requirements.sha256"
HARV3ST_CHECKSUM=$(sha256sum "$HARV3ST_DIR/requirements.txt" | cut -d' ' -f1)
if [[ ! -x "$HARV3ST_DIR/.venv/bin/gunicorn" ]] || [[ ! -f "$HARV3ST_MARKER" ]] || [[ "$(cat "$HARV3ST_MARKER")" != "$HARV3ST_CHECKSUM" ]]; then
  [[ -d "$HARV3ST_DIR/.venv" ]] || python3 -m venv "$HARV3ST_DIR/.venv"
  "$HARV3ST_DIR/.venv/bin/pip" install -r "$HARV3ST_DIR/requirements.txt"
  PLAYWRIGHT_BROWSERS_PATH="$RUNTIME_DIR/playwright" "$HARV3ST_DIR/.venv/bin/python" -m playwright install chromium
  printf '%s\n' "$HARV3ST_CHECKSUM" > "$HARV3ST_MARKER"
fi

pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 save

sleep 5
curl --fail --silent --show-error http://127.0.0.1:3001/ >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/api/pipeline/summary >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/api/harv3st/api/status >/dev/null

git rev-parse origin/deploy > "$RUNTIME_DIR/deploy/deployed.sha"
echo "Deploy completed: $(git rev-parse --short HEAD)"
