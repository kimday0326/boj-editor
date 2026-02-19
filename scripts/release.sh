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
VERSION_NO_PREFIX="${VERSION#v}"
OUT_NAME="boj-editor-release-${VERSION}.zip"
OUT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
OUT_PATH="$OUT_DIR/$OUT_NAME"

cd "$ROOT_DIR"

MANIFEST_VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json", encoding="utf-8"))["version"])')"

if [[ "$MANIFEST_VERSION" != "$VERSION_NO_PREFIX" ]]; then
  echo "Version mismatch: manifest.json version is '$MANIFEST_VERSION' but release arg is '$VERSION'"
  echo "Please align manifest.json version with release version before packaging."
  exit 1
fi

rm -f "$OUT_PATH"

zip -r "$OUT_PATH" \
  manifest.json background.js \
  assets content lib sidepanel

echo "Created: $OUT_PATH"
echo "Contents:"
unzip -l "$OUT_PATH"
