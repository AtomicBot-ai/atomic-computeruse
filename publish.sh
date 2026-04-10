#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME=$(node -p "require('./package.json').name")
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo "=== Publishing ${PACKAGE_NAME}@${CURRENT_VERSION} ==="
echo ""

# Ensure clean build
echo "[1/4] Cleaning dist/"
rm -rf dist

echo "[2/4] Installing dependencies"
npm install

echo "[3/4] Building"
npm run build

# Verify dist exists
if [ ! -d "dist" ]; then
  echo "ERROR: dist/ not found after build"
  exit 1
fi

echo "[4/4] Publishing to npm"

# Check if --dry-run flag is passed
if [[ "${1:-}" == "--dry-run" ]]; then
  echo "(dry run — no actual publish)"
  npm pack --dry-run
else
  npm publish --access public
  echo ""
  echo "Published ${PACKAGE_NAME}@${CURRENT_VERSION}"
  echo "https://www.npmjs.com/package/${PACKAGE_NAME}"
fi
