#!/usr/bin/env bash
# Fast deploy: builds in ~10s, uploads only changed files (not GIFs)
set -e

SITE="proyectito-50262"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="$SCRIPT_DIR/dist"

echo "⚡ Building..."
rm -f "$DIST/index.html" && rm -rf "$DIST/assets"
cd "$SCRIPT_DIR" && npm run build
echo "✓ Build done"

echo "🚀 Deploying..."
python3 "$SCRIPT_DIR/deploy_helper.py" "$DIST" "$SITE"
