#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(args) {
  return spawnSync(node, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const check = run(['tools/production-status.ts', '--check']);
assert.equal(check.status, 0, `production status --check should pass\nstdout:\n${check.stdout}\nstderr:\n${check.stderr}`);
assert.match(check.stdout, /production readiness gate holds/);
assert.match(check.stdout, /trusted-boundary/);
assert.match(check.stdout, /not-proven/);

const json = run(['tools/production-status.ts', '--json']);
assert.equal(json.status, 0, `production status --json should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const expectedRelease = packageJson.version.match(/production-p(\d+)\.(\d+)/i)
  ? `P${packageJson.version.match(/production-p(\d+)\.(\d+)/i)[1]}.${packageJson.version.match(/production-p(\d+)\.(\d+)/i)[2]}`
  : undefined;
assert.equal(parsed.release, expectedRelease);
assert.equal(parsed.status, 'architecture-gated-pre-production');
assert.equal(parsed.readyForControlledFeatures, true);
assert.equal(parsed.kernelTrust.status, 'trusted-boundary');
assert.equal(parsed.kernelTrust.proofStatus, 'not-proven');
assert.equal(parsed.currentArchitectureEstimates.formalLean4Equivalence, '0 proven obligations');
assert.ok(parsed.canonicalProductionPathPackages >= 10);
assert.ok(parsed.featurePromotion.supportedFeatures >= 10);
assert.equal(parsed.featurePromotion.proofObligationLinkedSupportedFeatures, parsed.featurePromotion.supportedFeatures);
assert.ok(parsed.featurePromotion.uniqueProofObligationLinks >= 6);
assert.ok(parsed.verificationMatrix.requiredClaims >= 14);
assert.equal(parsed.canonicalPackageDocs.docsChecked, 14);
assert.equal(parsed.canonicalPackageDocs.requiredHeadings, 5);
assert.ok(parsed.nonClaims.includes('not proven equivalent to Lean 4'));
assert.ok(parsed.nonClaims.includes('proof-obligation ledger is not itself a formal proof'));
assert.equal(parsed.proofObligations.provedFormalLean4EquivalenceObligations, 0);
assert.ok(parsed.proofObligations.requiredForFormalLean4Equivalence >= 6);
assert.ok(parsed.proofObligations.obligations >= 8);
assert.ok(parsed.productionTraceability.links.supportedFeatures >= 10);
assert.equal(parsed.productionTraceability.links.proofLinkedFeatures, parsed.productionTraceability.links.supportedFeatures);
assert.ok(parsed.productionTraceability.links.verificationClaims >= 14);
assert.ok(parsed.lineCounts.elaboratorIndex > 0);

const human = run(['tools/production-status.ts']);
assert.equal(human.status, 0, `production status human output should pass\nstdout:\n${human.stdout}\nstderr:\n${human.stderr}`);
assert.match(human.stdout, /ProofScript production readiness status/);
assert.match(human.stdout, /readyForControlledFeatures: true/);
assert.match(human.stdout, /canonicalPackageDocs: 14\/14/);
assert.match(human.stdout, /proofObligations: .*0 proved formal Lean-equivalence obligations/);
assert.match(human.stdout, /productionTraceability:/);
assert.match(human.stdout, /not fully formal K3/);

assert.ok(packageJson.scripts['production:status']);
assert.ok(packageJson.scripts['production:status:json']);
assert.ok(packageJson.scripts['test:production-readiness']);
assert.ok(packageJson.scripts['test:architecture'].includes('production-status.ts --check'));
assert.ok(packageJson.scripts['test:architecture'].includes('check-canonical-package-docs.ts'));
assert.ok(packageJson.scripts['test:canonical-package-docs']);
assert.ok(packageJson.scripts['test:proof-obligations']);
assert.ok(packageJson.scripts['test:feature-proof-obligation-linkage']);
assert.ok(packageJson.scripts['test:architecture:feature-proof-obligation-linkage']);
assert.ok(packageJson.scripts['test:production-traceability']);
assert.ok(packageJson.scripts['test:architecture:production-traceability']);
assert.ok(packageJson.scripts['test:architecture'].includes('check-production-traceability.ts'));
assert.ok(packageJson.scripts['test:architecture'].includes('check-proof-obligations.ts'));

const doc = fs.readFileSync(path.join(root, 'docs', 'PRODUCTION_READINESS_STATUS.md'), 'utf8');
assert.match(doc, /Production Readiness Status/);
assert.match(doc, /Canonical PSC-1 Production Path/);
assert.match(doc, /What Is Still Not Proven/);
assert.match(doc, /Feature Addition Gate/);
assert.match(doc, /K3-TB/);
assert.match(doc, /P5.1 Canonical Package Documentation Gate/);
assert.match(doc, /P5.2 Proof Obligation Ledger/);
assert.match(doc, /P5.3 Feature Proof-Obligation Linkage/);
assert.match(doc, /P5.4 Production Traceability Bundle/);
assert.match(doc, /P5.17 Minimal Do-Notation Feature/);
assert.match(doc, /P5.18 Array\.map Feature/);
assert.match(doc, /P5.20 List\.foldl Feature/);
assert.match(doc, /P5.21 Array\.foldl Feature/);
assert.match(doc, /P5.22 List\.filter \/ Array\.filter Feature/);
assert.match(doc, /P5\.24 List\.length \/ Array\.isEmpty Feature/);

console.log('✓ production readiness status tests passed');
