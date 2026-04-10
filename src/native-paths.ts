import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const thisDir = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a native script path relative to the package root.
 *
 * When running from source (src/), native/ is at ../native/.
 * When running from dist/, native/ is at ../../native/ (package root).
 */
export function resolveNativeScript(relativePath: string): string {
  // From source: src/ -> native/
  const fromSource = join(thisDir, "..", "native", relativePath);
  if (existsSync(fromSource)) return fromSource;

  // From dist: dist/ -> native/
  const fromDist = join(thisDir, "..", "..", "native", relativePath);
  if (existsSync(fromDist)) return fromDist;

  return fromSource;
}
