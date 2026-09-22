import assert from 'node:assert/strict';
import { loadStandardBootstrap } from '@proofscript/environment';

export function standardBootstrapAxioms(): string[] {
  return loadStandardBootstrap().artifact.declarations
    .filter((declaration) => declaration.kind === 'axiom')
    .map((declaration) => declaration.name)
    .sort();
}

export function standardBootstrapAxiomSet(): Set<string> {
  return new Set(standardBootstrapAxioms());
}

export function assertOnlyStandardBootstrapAssumptions(actual: readonly string[], label = 'kernel summary'): void {
  assert.deepEqual(
    [...actual].sort(),
    standardBootstrapAxioms(),
    `${label} should expose exactly the explicit checked-bootstrap runtime-helper axioms`,
  );
}


export function assertCoreDeclarationsRejected(
  summary: { status: string; message?: string },
  pattern: RegExp,
  label = 'tampered Core declarations',
): void {
  assert.equal(summary.status, 'rejected', `${label} must be rejected`);
  assert.match(summary.message ?? '', pattern, `${label} should report the expected kernel rejection reason`);
}
