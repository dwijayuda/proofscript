#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'tools', 'check-development-workflow.ts');
const manifestPath = path.join(root, 'config', 'development-workflow.json');

function run(args = []) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const ok = run([]);
assert.equal(ok.status, 0, `development workflow checker should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /development workflow holds/);
assert.match(ok.stdout, /K3-TB trusted-boundary/);
assert.match(ok.stdout, /formalLean4EquivalenceProvenObligations.*0/s);
assert.match(ok.stdout, /feature implementation templates/s);

const json = run(['--json']);
assert.equal(json.status, 0, `development workflow JSON should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(parsed.release, manifest.release);
assert.equal(parsed.trustClaim.label, 'K3-TB trusted-boundary');
assert.equal(parsed.trustClaim.lean4Equivalent, false);
assert.equal(parsed.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(parsed.workflowStages >= 8);
assert.ok(parsed.templates >= 4);
assert.ok(parsed.plannedFeatures >= 4);
assert.ok(parsed.requiredArchitectureScripts.includes('test:feature-promotion'));
assert.ok(parsed.requiredArchitectureScripts.includes('test:proof-obligations'));

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-development-workflow-'));

const badTrustPath = path.join(tempDir, 'bad-trust.json');
const badTrust = structuredClone(manifest);
badTrust.trustClaim.lean4Equivalent = true;
fs.writeFileSync(badTrustPath, `${JSON.stringify(badTrust, null, 2)}\n`);
const badTrustResult = run(['--manifest', badTrustPath]);
assert.notEqual(badTrustResult.status, 0, 'checker should reject Lean-equivalence overclaims');
assert.match(`${badTrustResult.stdout}\n${badTrustResult.stderr}`, /must not mark lean4Equivalent true/i);

const missingTemplatePath = path.join(tempDir, 'missing-template.json');
const missingTemplate = structuredClone(manifest);
missingTemplate.templates.push('templates/does-not-exist.template.md');
fs.writeFileSync(missingTemplatePath, `${JSON.stringify(missingTemplate, null, 2)}\n`);
const missingTemplateResult = run(['--manifest', missingTemplatePath]);
assert.notEqual(missingTemplateResult.status, 0, 'checker should reject missing templates');
assert.match(`${missingTemplateResult.stdout}\n${missingTemplateResult.stderr}`, /missing development workflow template/i);

const missingStagePath = path.join(tempDir, 'missing-stage.json');
const missingStage = structuredClone(manifest);
missingStage.workflowStages = missingStage.workflowStages.filter((stage) => stage.id !== 'red-tests');
fs.writeFileSync(missingStagePath, `${JSON.stringify(missingStage, null, 2)}\n`);
const missingStageResult = run(['--manifest', missingStagePath]);
assert.notEqual(missingStageResult.status, 0, 'checker should reject missing canonical workflow stages');
assert.match(`${missingStageResult.stdout}\n${missingStageResult.stderr}`, /missing canonical development workflow stage red-tests/i);

const badFeaturePath = path.join(tempDir, 'bad-feature.json');
const badFeature = structuredClone(manifest);
badFeature.plannedFeatures[0].mustLinkProofObligations = [];
fs.writeFileSync(badFeaturePath, `${JSON.stringify(badFeature, null, 2)}\n`);
const badFeatureResult = run(['--manifest', badFeaturePath]);
assert.notEqual(badFeatureResult.status, 0, 'checker should require planned features to link proof obligations');
assert.match(`${badFeatureResult.stdout}\n${badFeatureResult.stderr}`, /planned feature .* mustLinkProofObligations must not be empty/i);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('✓ development workflow regression tests passed');
