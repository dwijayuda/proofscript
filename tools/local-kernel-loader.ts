import './register-local-workspace.cts';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadKernel() {
  // Repository checks must execute the same local build whose hashes they report.
  // An installed workspace package can still point at a previous checkout.
  const localDist = resolve(repoRoot, 'packages/kernel/dist/index.js');
  if (existsSync(localDist)) return require(localDist);
  try {
    return require('@proofscript/kernel');
  } catch (error) {
    if (error && error.code !== 'MODULE_NOT_FOUND') throw error;
    if (!existsSync(localDist)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`cannot load @proofscript/kernel and local dist is missing; run npm run build first. Original error: ${message}`);
    }
    return require(localDist);
  }
}
