#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowRel = '.github/workflows/ci.yml';
const workflowPath = path.join(root, workflowRel);
const workflow = fs.readFileSync(workflowPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const verifyProduction = fs.readFileSync(path.join(root, 'tools/verify-production.ts'), 'utf8');

const expected = {
  packageVersionPattern: /0\.1\.0-production-p5\.85-arena-full-tutorial0(?:-WIP)?/,
  productionGate: 'test:v71:k3tb-ci-publish-parity',
  leanVersion: '4.33.1',
  leanCommit: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
  leanZipSha256: '0376ac87487246b40dd077268c097e701f552e94c6d020d2373b50c7444fa22f',
};

assert.match(pkg.version, expected.packageVersionPattern, 'package version must identify the current P5.85 Arena full-tutorial slice');
assert.ok(pkg.scripts[expected.productionGate].includes('node tools/kernel-v71-k3tb-ci-publish-parity-tests.ts'));
assert.match(verifyProduction, new RegExp(expected.productionGate.replaceAll(':', ':')), 'production verifier must include the K3-TB CI publish-parity gate');

assert.match(workflow, /name:\s*ci/, 'workflow must remain the CI workflow');
assert.match(workflow, /npm ci --ignore-scripts/, 'CI must install reproducibly with npm ci --ignore-scripts');
assert.match(workflow, /npm run build/, 'CI must build before verification');
assert.match(workflow, /npm run verify:production:no-build/, 'CI must run the local production verifier, not only npm test');
assert.match(workflow, /npm run verify:k3tb:publish/, 'CI must run the exact K3-TB publish preflight when Lean is installed');
assert.match(workflow, /npm run doctor:k3tb/, 'CI must expose K3-TB Lean environment diagnostics before publish verification');
assert.match(workflow, /lean-4\.33\.1-linux\.zip/, 'CI must install exact Lean 4.33.1');
assert.match(workflow, new RegExp(expected.leanZipSha256), 'CI must pin the Lean 4.33.1 archive checksum');
assert.match(workflow, /PROOFSCRIPT_LEAN_BIN=.*GITHUB_ENV/, 'CI must export PROOFSCRIPT_LEAN_BIN for K3-TB publish preflight');
assert.match(workflow, /version\[\[:space:\]\]\+4\\\.33\\\.1/, 'CI must assert Lean reports version 4.33.1');
assert.match(workflow, new RegExp(expected.leanCommit), 'CI must assert the exact Lean commit expected by K3-TB');
assert.match(workflow, /trusted-boundary K3-TB|K3-TB/, 'CI comments/names must carry the K3-TB label');
assert.match(workflow, /not fully formal K3|not full formal K3|NOT_FULLY_FORMAL_K3/i, 'CI must preserve the non-fully-formal K3 caveat');
assert.doesNotMatch(workflow, /npm publish/, 'CI publish preflight must never publish to npm');

for (const rel of [
  'README.md',
  'PRODUCTION_P6_BUILD_REPORT.md',
  'PRODUCTION_P6_FINAL.md',
  'PRODUCTION_P6_17_K3TB_DEFAULT_CONSISTENCY_REPORT.md',
]) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.match(text, /verify:k3tb:publish/, `${rel} should point reviewers to the publish preflight command`);
  assert.match(text, /trusted-boundary K3-TB|K3-TB/, `${rel} must preserve the K3-TB label`);
}

console.log('K3TB_CI_PUBLISH_PARITY_STATUS=PASS');
console.log(`K3TB_CI_PUBLISH_PARITY_LEAN_VERSION=${expected.leanVersion}`);
console.log(`K3TB_CI_PUBLISH_PARITY_LEAN_COMMIT=${expected.leanCommit}`);
console.log('K3TB_CI_PUBLISH_PARITY_BOUNDARY=trusted-boundary K3-TB; not fully formal K3');
