#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 v0.1.1"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="$1"
OUT_NAME="boj-editor-release-${VERSION}.zip"
OUT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
OUT_PATH="$OUT_DIR/$OUT_NAME"

cd "$ROOT_DIR"
rm -f "$OUT_PATH"

zip -r "$OUT_PATH" \
  manifest.json background.js \
  assets content lib sidepanel

echo "Created: $OUT_PATH"
echo "Contents:"
unzip -l "$OUT_PATH"
