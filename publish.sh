#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")

echo "=== Publishing ${PACKAGE_NAME}@${VERSION} ==="
echo ""

echo "[1/4] Cleaning dist/"
rm -rf dist

echo "[2/4] Installing dependencies"
npm install

echo "[3/4] Building"
npm run build

if [ ! -d "dist" ]; then
  echo "ERROR: dist/ not found after build"
  exit 1
fi

echo "[4/4] Publishing to npm"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "(dry run)"
  npm pack --dry-run
else
  npm publish --access public
  echo ""
  echo "Published ${PACKAGE_NAME}@${VERSION}"
  echo "https://www.npmjs.com/package/${PACKAGE_NAME}"
fi
