#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=/opt/data/formadigital_app
RUNTIME_DIR="$APP_DIR/.runtime"
DEPLOYED_FILE="$RUNTIME_DIR/deploy/deployed.sha"

cd "$APP_DIR"
mkdir -p "$RUNTIME_DIR/deploy" "$RUNTIME_DIR/logs"
git fetch --quiet origin deploy || exit 0

target=$(git rev-parse origin/deploy)
deployed=$(cat "$DEPLOYED_FILE" 2>/dev/null || true)
[[ "$target" == "$deployed" ]] && exit 0

"$APP_DIR/deploy.sh"
