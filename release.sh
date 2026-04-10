#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME=$(node -p "require('./package.json').name")
OLD_VERSION=$(node -p "require('./package.json').version")

# Bump patch version
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

echo "=== Releasing ${PACKAGE_NAME}: ${OLD_VERSION} → ${NEW_VERSION} ==="
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
  echo "(dry run — no actual publish)"
  npm pack --dry-run
else
  npm publish --access public
  echo ""
  echo "Released ${PACKAGE_NAME}@${NEW_VERSION}"
  echo "https://www.npmjs.com/package/${PACKAGE_NAME}"
fi
