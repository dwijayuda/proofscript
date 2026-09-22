import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assurance = path.join(root, 'assurance', 'lean4331');
const formalRoot = path.join(assurance, 'formal');
const evidence = path.join(assurance, 'evidence');
fs.mkdirSync(evidence, { recursive: true });

const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const targetModule = 'ProofScriptKernelEquivalence.KernelV71AdmissionBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71AdmissionBoundary.lean';

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    env: opts.env ?? process.env,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    timeout: opts.timeoutMs ?? 10 * 60 * 1000,
  });
}

function text(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function assertCleanRun(result, label) {
  const out = text(result);
  assert.equal(result.status, 0, `${label} failed with status ${result.status}\n${out}`);
  assert.equal(result.signal, null, `${label} terminated with signal ${result.signal}\n${out}`);
  return out;
}

function expect(out, regex, label) {
  assert.match(out, regex, `${label} missing pattern ${regex}\n${out}`);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function sha256Text(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function sha256File(p) {
  return sha256Text(fs.readFileSync(p));
}

function rel(p) {
  return path.relative(root, p).replaceAll(path.sep, '/');
}

function assertFileHash(relPath, expectedHash) {
  const actual = sha256File(path.join(root, relPath));
  if (expectedHash !== undefined) {
    assert.equal(actual, expectedHash, `${relPath} hash changed`);
  }
  return { file: relPath, sha256: actual };
}

function assertCheckpointPass(relPath, checkpointName) {
  const checkpoint = readJson(relPath);
  assert.equal(checkpoint.checkpoint, checkpointName, `${relPath} checkpoint name`);
  assert.equal(checkpoint.status, 'PASS', `${relPath} status`);
  assert.equal(checkpoint.coreFormat, 71, `${relPath} core format`);
  return checkpoint;
}

const lean = process.env.PROOFSCRIPT_LEAN_BIN;
assert.ok(lean, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1');
assert.ok(fs.existsSync(lean), `PROOFSCRIPT_LEAN_BIN does not exist: ${lean}`);

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
expect(versionOut, /version 4\.33\.1/, 'Lean version');
expect(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const versions = readJson('versions.json');
assert.equal(versions.kernelArtifactFormat, 71, 'kernel artifact format');
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion, 'Lean semantic baseline');
assert.equal(versions.leanReleaseCommit, expectedLeanCommit, 'Lean release commit');

// Compile the formal target from a fresh Lake project so stale .olean files
// cannot satisfy the certificate.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-admission-boundary-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
const formalRun = run(lakeCmd, ['build', targetModule], {
  cwd: tmp,
  timeoutMs: 10 * 60 * 1000,
  env: { PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
});
const formalText = [
  `TARGET=${targetModule}`,
  `LEAN=${versionOut.trim()}`,
  `SOURCE=${targetRel}`,
  `SOURCE_SHA256=${sha256File(path.join(root, targetRel))}`,
  '',
  text(formalRun),
].join('\n');
const formalLog = path.join(evidence, 'v71-admission-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal v71 admission-boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedSlices_count',
  'outstandingK3Obligations_count',
  'nonMutualImplementationPackages_rawAdmission_sound',
  'nonMutualImplementationPackages_environment_sound',
  'formedEnvironmentLinkedRHS_sound',
  'v71AdmissionBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal v71 admission-boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal v71 admission-boundary has sorry marker');

const rhs = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json', 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1');
assert.equal(rhs.formal.reportedSorryAx, 0, 'RHS reported sorryAx');
assert.equal(rhs.executable.failures, 0, 'RHS executable failures');
assert.equal(rhs.executable.suiteCount, 5, 'RHS exact Lean suite count');
assertFileHash(rhs.formal.log, undefined);
for (const suite of rhs.executable.exactLeanSuites) {
  assertFileHash(suite.log, suite.sha256);
}

const implTrace = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json', 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1');
assert.equal(implTrace.formal.reportedSorryAx, 0, 'TS classifier implementation trace sorryAx');
assert.equal(implTrace.executable.failures, 0, 'TS classifier implementation trace failures');
assert.ok(implTrace.executable.sourceObligations >= 1, 'TS classifier source audit missing obligations count');
assert.equal(implTrace.executable.sourceMissing, 0, 'TS classifier source audit missing obligations');
assertFileHash(implTrace.formal.log, undefined);

const formed = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_FORMED_ENV_GENERALIZATION_CERT1.json', 'V71_FORMED_ENV_GENERALIZATION_CERT1');
assert.equal(formed.formal.reportedSorryAx, 0, 'formed env generalization sorryAx');
assert.equal(formed.inherited.fullLeanGate.status, 'PASS', 'formed env inherited full gate');
assertFileHash(formed.formal.log, undefined);

const nonmutual = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NONMUTUAL_DECL_ENV_CERT1.json', 'V71_NONMUTUAL_DECL_ENV_CERT1');
assert.equal(nonmutual.formal.reportedSorryAx, 0, 'non-mutual declaration environment sorryAx');

const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
assert.equal(fullGate.leanSemanticBaseline, expectedLeanVersion, 'full Lean gate version');
assert.equal(fullGate.leanReleaseCommit, expectedLeanCommit, 'full Lean gate commit');
const fullGateLogs = fullGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertFileHash(part.log, part.sha256);
});

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_ADMISSION_BOUNDARY_CERT1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  formal: {
    newTarget: targetModule,
    targetSource: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    targetTheorems: 6,
    reportedSorryAx: 0,
    log: rel(formalLog),
    totalFormalLeanFiles: formalStackFiles.length,
    theoremBoundary: 'non-mutual implementation raw admission + non-mutual environment preservation + mixed formed environment/RHS soundness; explicit ledger keeps full mutual/nested completeness and final K3 open',
  },
  inherited: {
    tsClassifierImplementationTrace: {
      status: 'PASS',
      formalFiles: implTrace.formal.totalFormalLeanFiles,
      sourceObligations: implTrace.executable.sourceObligations,
      missing: implTrace.executable.sourceMissing,
    },
    nonMutualDeclEnvironment: {
      status: 'PASS',
      formalFiles: nonmutual.formal.totalFormalLeanFiles,
    },
    formedEnvironmentGeneralization: {
      status: 'PASS',
      formalFiles: formed.formal.totalFormalLeanFiles,
    },
    mutualNestedRecursorRHS: {
      status: 'PASS',
      formalFiles: rhs.formal.totalFormalLeanFiles,
      exactLeanSuites: rhs.executable.suiteCount,
    },
    fullLeanGate: { status: 'PASS', parts: fullGate.partCount, logs: fullGateLogs },
  },
  scope: {
    completedSlices: [
      'non-mutual implementation raw-family admission soundness',
      'non-mutual implementation package environment preservation',
      'mixed non-mutual/mutual/nested formed-environment preservation',
      'mutual/nested linked recursor RHS endpoint correspondence',
    ],
    outstandingK3Obligations: [
      'full mutual admission completeness',
      'full nested preprocessing completeness',
      'full mutual+nested positivity completeness',
      'arbitrary Lean stored RecursorRule.rhs reconstruction',
      'final whole-kernel K3 equivalence theorem',
    ],
    doesNotProveYet: [
      'full K3 whole-kernel equivalence',
      'Lean accepts iff ProofScript accepts for every Lean kernel artifact',
      'complete arbitrary mutual/nested admission and positivity completeness',
      'complete arbitrary stored RecursorRule.rhs reconstruction',
    ],
  },
  status: 'PASS',
};

const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_ADMISSION_BOUNDARY_CERT1.json';
const checkpointPath = path.join(root, checkpointRel);
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_ADMISSION_BOUNDARY_CERT1.md';
fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 Admission Boundary Certificate 1\n\nStatus: PASS\n\nThis checkpoint binds the current v71 admission/completeness boundary into one conservative Lean-checked certificate.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Certified completed slices\n\n1. Non-mutual implementation raw-family admission soundness.\n2. Non-mutual implementation package environment preservation.\n3. Mixed non-mutual/mutual/nested formed-environment preservation.\n4. Mutual/nested linked recursor RHS endpoint correspondence.\n\n## Explicitly outstanding K3 obligations\n\n1. Full mutual admission completeness.\n2. Full nested preprocessing completeness.\n3. Full mutual+nested positivity completeness.\n4. Arbitrary Lean stored RecursorRule.rhs reconstruction.\n5. Final whole-kernel K3 equivalence theorem.\n\n## Boundary\n\nThis is an admission-boundary soundness certificate. It is not a full admission-completeness theorem and not a final K3 whole-kernel equivalence theorem.\n`);

const shaManifest = {
  checkpoint: 'V71_ADMISSION_BOUNDARY_CERT1',
  files: [
    targetRel,
    checkpointRel,
    mdRel,
    rel(formalLog),
    'docs/superpowers/plans/2026-09-10-v71-admission-boundary-certificate.md',
  ].map(file => ({ file, sha256: sha256File(path.join(root, file)) })),
};
fs.writeFileSync(path.join(root, 'V71_ADMISSION_BOUNDARY_CERT1_SHA256.json'), JSON.stringify(shaManifest, null, 2) + '\n');

console.log(`ADMISSION_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=6 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log('ADMISSION_BOUNDARY_COMPLETED_SLICES=4');
console.log('ADMISSION_BOUNDARY_OUTSTANDING_K3_OBLIGATIONS=5');
console.log(`ADMISSION_BOUNDARY_INHERITED_RHS_SUITES=${rhs.executable.suiteCount}`);
console.log(`ADMISSION_BOUNDARY_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log('ADMISSION_BOUNDARY_STATUS=SOUNDNESS_BOUNDARY_NOT_FULL_COMPLETENESS');
console.log('PASS KERNEL-v71-admission-boundary-certificate');
