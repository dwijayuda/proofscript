import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'bin', 'psc.mjs');

function run(args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.status, 0, `command failed: ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return result.stdout;
}

const jsonText = run(['kernel', 'status', '--json']);
const status = JSON.parse(jsonText);
assert.equal(status.status, 'accepted');
assert.equal(status.command, 'kernel status');
assert.equal(status.auditBaseline.coreFormat, 71);
assert.equal(status.auditBaseline.certificateFormat, 2);
assert.equal(status.checklist.total, 41);
assert.equal(status.checklist.implemented, 41);
assert.equal(status.checklist.partially_implemented, 0);
assert.equal(status.checklist.unsupported, 0);
assert.equal(status.auditedK3TBChecklistComplete, true);
assert.equal(status.fullLean4Equivalence, false);
assert.equal(status.sameTheoryAsFullLean4, false);
assert.ok(Number(status.formalLean4EquivalenceProvenObligations) >= 0);
assert.equal(status.standaloneRequiresLean, false);
assert.equal(status.evidence.resourceBoundsCoverage.present, true);

const text = run(['kernel', 'status']);
assert.match(text, /ProofScript kernel status/);
assert.match(text, /coreFormat=71/);
assert.match(text, /checklist=41\/41 implemented;0 partial;0 unsupported;0 blocked;0 needs_validation/);
assert.match(text, /auditedK3TBChecklistComplete=true/);
assert.match(text, /fullLean4Equivalence=false/);
assert.match(text, /trustBoundary=K3-TB audited checklist completion is not a proof of full Lean 4 language\/kernel equivalence/);

console.log('PSC_KERNEL_STATUS_TRUTH0=PASS');
