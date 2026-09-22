#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expected = {
  release: 'P5.85',
  packageVersionPattern: /0\.1\.0-production-p5\.85-arena-full-tutorial0(?:-WIP)?/,
  productionProfile: 'P5.85 arena-full-tutorial0',
  patchLevel: 'P5.85-arena-full-tutorial0',
  kernelProfile: 'KERNEL-level-instantiation-conformance1',
  coreFormat: 71,
  trustBoundary: 'K3-TB',
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assertCurrentStatus(rel, obj) {
  assert.equal(obj.coreFormat ?? obj.defaultKernelCoreFormat, expected.coreFormat, `${rel} must identify Core v71 as current/default`);
  assert.equal(obj.defaultKernel ?? obj.kernelProfile, expected.kernelProfile, `${rel} must identify v71 profile as current/default`);
  assert.equal(obj.kernelTrustBoundary ?? obj.trustBoundary, expected.trustBoundary, `${rel} must identify trusted-boundary K3-TB`);
  assert.equal(obj.fullyFormalK3, false, `${rel} must not claim fully formal K3`);
}

const pkg = readJson('package.json');
assert.equal(pkg.private, true, 'K3-TB package remains private; publish preflight is not npm publication');
assert.match(pkg.version, expected.packageVersionPattern, 'package version must identify the current P5.85 Arena full-tutorial slice');
assert.ok(pkg.scripts['test:v71:k3tb-default-consistency'].includes('node tools/kernel-v71-k3tb-default-consistency-tests.ts'));

const verifyProduction = readText('tools/verify-production.ts');
assert.match(verifyProduction, /test:v71:k3tb-default-consistency/, 'production verifier must include the default-kernel consistency guard');

const versions = readJson('versions.json');
assert.equal(versions.packageVersion, pkg.version, 'versions.json packageVersion must match package.json');
assert.equal(versions.release, expected.release, 'versions.json release');
assert.equal(versions.currentProductionSlice, expected.productionProfile, 'versions.json currentProductionSlice');
assert.equal(versions.defaultKernel, expected.kernelProfile, 'versions.json default kernel');
assert.equal(versions.defaultKernelCoreFormat, expected.coreFormat, 'versions.json Core format');
assert.equal(versions.kernelTrustBoundary, expected.trustBoundary, 'versions.json K3-TB label');
assert.equal(versions.fullyFormalK3, false, 'versions.json must not claim fully formal K3');

const releaseStatus = readJson('proofscript-production-p5.release-status.json');
assert.equal(releaseStatus.release, expected.release, 'P5 release status release field');
assert.equal(releaseStatus.currentProductionSlice, expected.productionProfile, 'P5 release status currentProductionSlice');
assert.equal(releaseStatus.packageVersion, pkg.version, 'P5 release status packageVersion must match package.json');
assert.equal(releaseStatus.version, pkg.version, 'P5 release status version field');
assert.equal(releaseStatus.verification.lastVerifiedPatch, expected.patchLevel, 'P5 release status last verified patch');
assertCurrentStatus('proofscript-production-p5.release-status.json', releaseStatus);

const integrationStatus = readJson('integration-status.json');
assert.equal(integrationStatus.packageVersion, pkg.version, 'integration-status packageVersion must match package.json');
assert.equal(integrationStatus.currentProductionSlice, expected.productionProfile, 'integration-status currentProductionSlice');
assert.match(integrationStatus.status, /P5_69|PASSING|PENDING|P5_85|P5\.77/, 'integration-status should describe the current P5.85 release lane');
assertCurrentStatus('integration-status.json', integrationStatus);

const implementationStatus = readJson('implementation-status.json');
assert.equal(implementationStatus.packageVersion, pkg.version, 'implementation-status packageVersion must match package.json');
assert.equal(implementationStatus.currentProductionSlice, expected.productionProfile, 'implementation-status currentProductionSlice');
assertCurrentStatus('implementation-status.json', implementationStatus);

const kernelStatus = readJson('kernel-status.json');
assert.equal(kernelStatus.auditBaseline.implementationProfile, expected.kernelProfile, 'kernel-status audit baseline profile');
assert.equal(kernelStatus.auditBaseline.coreFormat, expected.coreFormat, 'kernel-status audit baseline Core format');
assert.equal(kernelStatus.fullKernelComplete, false, 'kernel-status must not use ambiguous fullKernelComplete=true for K3-TB checklist completion');
assert.equal(kernelStatus.auditedK3TBChecklistComplete, true, 'kernel-status preserves current audited profile completeness under explicit K3-TB checklist field');
assert.equal(kernelStatus.fullLean4KernelComplete, false, 'kernel-status must not claim full Lean 4 kernel completion');
assert.equal(kernelStatus.sameTheoryAsLean4, false, 'kernel-status must not claim same theory as Lean 4');

const provenance = readJson('RELEASE_PROVENANCE_K3TB.json');
assert.match(provenance.package.version, /p5\.85-arena-full-tutorial0|p5\.75-metadata-claim-separation0|p5\.74-kernel-classical-choice-active0|p5\.71-kernel-propext-active0|p5\.65-kernel-nonmutual-recursor-defeq0|p6\.19-k3tb-one-command-doctor-guard/, 'release provenance package version records either inherited K3TB provenance or current P5.85 package');
assert.equal(provenance.label, expected.trustBoundary, 'release provenance K3-TB label');
assert.match(provenance.status, /NOT_FULLY_FORMAL_K3/, 'release provenance must keep non-full-formal boundary');
assert.equal(provenance.package.private, true, 'release provenance must keep private package guard');

const bridge = readText('packages/unified-bridge/src/index.ts');
assert.match(bridge, /export const CORE_PROFILE = "KERNEL-level-instantiation-conformance1" as const;/);
assert.match(bridge, /export const CORE_FORMAT = 71 as const;/);
assert.doesNotMatch(bridge, /Core v68/, 'unified bridge source must not describe current lowering as Core v68 after v71 default integration');

const decidable = readText('packages/unified-bridge/src/wave-b-decidable.ts');
assert.doesNotMatch(decidable, /Core v68/, 'checked library comments must not describe the current bridge as frozen Core v68');

for (const rel of [
  'README.md',
  'PRODUCTION_P6_BUILD_REPORT.md',
  'PRODUCTION_P6_FINAL.md',
  'PRODUCTION_P6_15_K3TB_INTEGRATION_REPORT.md',
  'PRODUCTION_P6_16_K3TB_LEAN_ENV_DOCTOR_REPORT.md',
  'PRODUCTION_P6_17_K3TB_DEFAULT_CONSISTENCY_REPORT.md',
  'PRODUCTION_P6_18_K3TB_CI_PUBLISH_PARITY_REPORT.md',
  'PRODUCTION_P6_19_K3TB_ONE_COMMAND_DOCTOR_GUARD_REPORT.md',
]) {
  const s = readText(rel);
  assert.match(s, /trusted-boundary K3-TB|K3-TB/, `${rel} must carry K3-TB boundary label`);
  assert.match(s, /not fully formal K3|not full(?:y)? formal K3|does not claim fully formal K3/i, `${rel} must carry non-full-formal caveat`);
}

console.log('K3TB_DEFAULT_CONSISTENCY_STATUS=PASS');
console.log(`K3TB_DEFAULT_CONSISTENCY_PACKAGE_VERSION=${pkg.version}`);
console.log(`K3TB_DEFAULT_CONSISTENCY_CORE_FORMAT=${expected.coreFormat}`);
console.log(`K3TB_DEFAULT_CONSISTENCY_KERNEL=${expected.kernelProfile}`);
console.log('PASS KERNEL-v71-k3tb-default-consistency');
