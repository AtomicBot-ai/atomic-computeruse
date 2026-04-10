#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME=$(node -p "require('./package.json').name")
OLD_VERSION=$(node -p "require('./package.json').version")

npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

echo "=== ${PACKAGE_NAME}: ${OLD_VERSION} → ${NEW_VERSION} ==="

git add package.json package-lock.json 2>/dev/null || true
git commit -m "release: ${PACKAGE_NAME}@${NEW_VERSION}"
git push

echo "Version bumped and pushed."
echo "Run 'npm run publish' to build and publish to npm."
