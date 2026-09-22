import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assurance = path.join(root, 'assurance/lean4331');
const evidence = path.join(assurance, 'evidence');
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 non-mutual declaration/environment certificate tests');
  process.exit(1);
}

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(existsSync(p), `missing ${rel}`);
  return readFileSync(p, 'utf8');
}
function expect(text, needle, label) {
  assert.match(text, needle, `${label}: missing ${needle}`);
}
function run(cmd, args, label, needle = null) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PROOFSCRIPT_LEAN_BIN: lean },
  });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  assert.equal(r.status, 0, `${label} failed\n${out}`);
  if (needle) expect(out, needle, label);
  return out;
}

const version = run(lean, ['--version'], 'Lean version');
expect(version, /version 4\.33\.1/, 'Lean version');
expect(version, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/, 'Lean version');

run(process.execPath, ['tools/kernel-v71-assurance-finalize.ts'], 'v71 full Lean gate finalizer', /PASS KERNEL-v71-assurance-finalize: wrote assurance\/lean4331\/FINAL_VALIDATION_V71_FULL_LEAN_GATE\.json/);
run(process.execPath, ['tools/kernel-v71-local-merged-regression-tests.ts'], 'v71 local merged regression', /V71_MERGED_LOCAL_COMPONENTS=2 FAILURES=0/);

const finalGate = JSON.parse(read('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json'));
assert.equal(finalGate.status, 'PASS');
assert.equal(finalGate.partCount, 6);
assert.equal(finalGate.leanSemanticBaseline, '4.33.1');
assert.equal(finalGate.leanReleaseCommit, '819816b2e0a3bf405af45ae5c7af2491d8f5bee6');
assert.equal(finalGate.formalWholeKernelEquivalence, 'IN_PROGRESS_NOT_YET_K3');

const inheritedFormal = read('assurance/lean4331/evidence/v71-env-induction-formal28.out');
expect(inheritedFormal, /FORMAL_STACK_MODULES=28 TARGET_STATEMENT=1 SORRYAX=0/, 'inherited environment formal stack');
const genericFormal = read('assurance/lean4331/evidence/v71-generic-nonmutual-formal1.out');
expect(genericFormal, /GENERIC_NONMUTUAL_MODULES=1 INHERITED_FORMAL_STACK=28 TARGET_STATEMENT=1 SORRYAX=0/, 'generic non-mutual formal stack');
const classifierFormal = read('assurance/lean4331/evidence/v71-nonmutual-classifier-formal1.out');
expect(classifierFormal, /NONMUTUAL_CLASSIFIER_MODULES=1 INHERITED_FORMAL_STACK=29 TARGET_STATEMENT=1 SORRYAX=0/, 'classifier formal stack');
const tsImplFormal = read('assurance/lean4331/evidence/v71-ts-classifier-implementation-contract-formal1.out');
expect(tsImplFormal, /TS_CLASSIFIER_IMPLEMENTATION_CONTRACT_MODULES=1 INHERITED_FORMAL_STACK=30 TARGET_STATEMENT=1 SORRYAX=0/, 'TypeScript classifier implementation formal contract');

for (const [label, text] of [
  ['inherited formal stack', inheritedFormal],
  ['generic non-mutual formal stack', genericFormal],
  ['classifier formal stack', classifierFormal],
  ['TypeScript implementation contract formal stack', tsImplFormal],
]) {
  assert.doesNotMatch(text, /sorryAx/, `${label}: unexpected sorryAx`);
  assert.doesNotMatch(text, /SORRY_FOUND/, `${label}: unexpected SORRY_FOUND`);
  assert.doesNotMatch(text, /declaration uses 'sorry'/, `${label}: unexpected Lean sorry declaration`);
}

const genericAdmission = read('assurance/lean4331/evidence/v71-generic-nonmutual-admission1.out');
expect(genericAdmission, /GENERIC_NONMUTUAL_ADMISSION_FAILURES=0/, 'generic non-mutual admission executable evidence');
expect(genericAdmission, /GENERIC_NONMUTUAL_INHERITED_ENV_COMPONENTS=6/, 'generic non-mutual env executable evidence');
const classifier = read('assurance/lean4331/evidence/v71-nonmutual-classifier-correspondence1.out');
expect(classifier, /NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0/, 'classifier correspondence executable evidence');
expect(classifier, /NONMUTUAL_CLASSIFIER_ENV_INDUCTION=6_COMPONENTS_PASS/, 'classifier environment executable evidence');
const tsImpl = read('assurance/lean4331/evidence/v71-ts-classifier-implementation-correspondence1.out');
expect(tsImpl, /TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0/, 'TypeScript classifier implementation executable evidence');

const checkpoint = JSON.parse(read('assurance/lean4331/CHECKPOINT_V71_NONMUTUAL_DECL_ENV_CERT1.json'));
assert.equal(checkpoint.checkpoint, 'V71_NONMUTUAL_DECL_ENV_CERT1');
assert.equal(checkpoint.coreFormat, 71);
assert.equal(checkpoint.semanticChange, false);
assert.equal(checkpoint.lean.version, '4.33.1');
assert.equal(checkpoint.lean.commit, '819816b2e0a3bf405af45ae5c7af2491d8f5bee6');
assert.equal(checkpoint.status, 'PASS');
assert.equal(checkpoint.formal.inheritedModules, 31);
assert.equal(checkpoint.formal.reportedSorryAx, 0);
assert.equal(checkpoint.executable.fullLeanGateParts, 6);
assert.equal(checkpoint.executable.localMergedComponents, 2);
assert.equal(checkpoint.scope.notClaimed.fullK3WholeKernelEquivalence, true);
assert.equal(checkpoint.scope.notClaimed.mutualOrNestedInductiveAdmission, true);
assert.equal(checkpoint.scope.notClaimed.completeTypeScriptImplementationCorrespondence, true);

console.log('NONMUTUAL_DECL_ENV_CERT_FORMAL_STACK=31 SORRYAX=0');
console.log('NONMUTUAL_DECL_ENV_CERT_EXECUTABLE_GATE=6_PARTS_PASS');
console.log('NONMUTUAL_DECL_ENV_CERT_LOCAL_MERGED=2_COMPONENTS_PASS');
console.log('PASS KERNEL-v71-nonmutual-decl-env-certificate: formal logs + executable Lean gate certify current generic non-mutual O-DECL/O-IND boundary');
