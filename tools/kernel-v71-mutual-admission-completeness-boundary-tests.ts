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
const targetModule = 'ProofScriptKernelEquivalence.KernelV71MutualAdmissionCompletenessBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71MutualAdmissionCompletenessBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1.md';
const progressOverall = 70;

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    env: opts.env ?? process.env,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 10 * 60 * 1000,
    maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
  });
}
function text(r) { return `${r.stdout ?? ''}${r.stderr ?? ''}`; }
function assertCleanRun(r, label) {
  const out = text(r);
  assert.equal(r.status, 0, `${label} failed with status ${r.status}\n${out}`);
  assert.equal(r.signal, null, `${label} terminated with signal ${r.signal}\n${out}`);
  return out;
}
function expect(out, regex, label) { assert.match(out, regex, `${label}: missing ${regex}\n${out}`); }
function readJson(relPath) { return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8')); }
function sha256Text(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha256File(p) { return sha256Text(fs.readFileSync(p)); }
function rel(p) { return path.relative(root, p).replaceAll(path.sep, '/'); }
function assertCheckpointPass(relPath, checkpointName) {
  const checkpoint = readJson(relPath);
  assert.equal(checkpoint.checkpoint, checkpointName, `${relPath} checkpoint name`);
  assert.equal(checkpoint.status, 'PASS', `${relPath} status`);
  assert.equal(checkpoint.coreFormat, 71, `${relPath} core format`);
  return checkpoint;
}
function assertFileHash(relPath, expectedHash) {
  const actual = sha256File(path.join(root, relPath));
  if (expectedHash !== undefined) assert.equal(actual, expectedHash, `${relPath} hash changed`);
  return { file: relPath, sha256: actual };
}

const lean = process.env.PROOFSCRIPT_LEAN_BIN;
assert.ok(lean, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1');
assert.ok(fs.existsSync(lean), `PROOFSCRIPT_LEAN_BIN does not exist: ${lean}`);
assert.ok(fs.existsSync(path.join(root, targetRel)), `missing ${targetRel}`);

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
expect(versionOut, /version 4\.33\.1/, 'Lean version');
expect(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const versions = readJson('versions.json');
assert.equal(versions.kernelArtifactFormat, 71, 'kernel artifact format');
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion, 'Lean semantic baseline');
assert.equal(versions.leanReleaseCommit, expectedLeanCommit, 'Lean release commit');

// Compile the new formal target from a fresh Lake project so stale .olean files
// cannot satisfy this certificate.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-mutual-admission-boundary-formal-'));
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
const formalLog = path.join(evidence, 'v71-mutual-admission-completeness-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal mutual admission boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
expect(formalText, /Build completed successfully \((\d+) jobs\)/, 'formal mutual admission boundary build');
for (const name of [
  'completedMutualAdmissionSlices_count',
  'outstandingMutualAdmissionObligations_count',
  'k3OverallProgress_percent',
  'mutualFormedEnvironment_sound',
  'mixedFormedLinkedRHS_sound',
  'v71MutualAdmissionCompletenessBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71MutualAdmissionCompletenessBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal mutual admission boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal mutual admission boundary has sorry marker');

const admission = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_ADMISSION_BOUNDARY_CERT1.json', 'V71_ADMISSION_BOUNDARY_CERT1');
assert.equal(admission.formal.reportedSorryAx, 0, 'admission-boundary sorryAx');
assert.equal(admission.inherited.fullLeanGate.status, 'PASS', 'admission-boundary inherited full gate');

const mutual = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json', 'V71_MUTUAL_FORMED_ENV_CERT1');
assert.equal(mutual.formal.reportedSorryAx, 0, 'mutual formed-env sorryAx');
assert.equal(mutual.executable.failures, 0, 'mutual exact Lean failures');
assert.equal(mutual.executable.suiteCount, 5, 'mutual exact Lean suite count');
assert.equal(mutual.executable.sourceAudit.obligations, 39, 'mutual source obligation count');
assert.equal(mutual.executable.sourceAudit.missing, 0, 'mutual source audit missing obligations');
for (const suite of mutual.executable.exactLeanMutualSuites) assertFileHash(suite.log, suite.sha256);

const rhs = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json', 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1');
assert.equal(rhs.formal.reportedSorryAx, 0, 'mutual/nested RHS sorryAx');
assert.equal(rhs.executable.failures, 0, 'mutual/nested RHS failures');
assert.equal(rhs.executable.suiteCount, 5, 'mutual/nested RHS exact Lean suite count');
assert.equal(rhs.executable.sourceAudit.missing, 0, 'RHS source audit missing obligations');

const formed = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_FORMED_ENV_GENERALIZATION_CERT1.json', 'V71_FORMED_ENV_GENERALIZATION_CERT1');
assert.equal(formed.formal.reportedSorryAx, 0, 'formed env generalization sorryAx');

const finalGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(finalGate.status, 'PASS', 'full Lean gate status');
assert.equal(finalGate.partCount, 6, 'full Lean gate part count');

// Freshly rerun the exact mutual suites so this checkpoint is not purely inherited.
const mutualSuites = [
  ['direct', 'tools/kernel-mutual-inductives-tests.ts', /bounded direct mutual inductives.*exact Lean differential/],
  ['parameters', 'tools/kernel-mutual-parameters-tests.ts', /shared\/dependent mutual parameters.*exact Lean differential/],
  ['indices', 'tools/kernel-mutual-indices-tests.ts', /mutual indices.*exact Lean differential/],
  ['higher-order', 'tools/kernel-mutual-higher-order-tests.ts', /higher-order positive mutual recursion.*exact Lean differential/],
  ['prop', 'tools/kernel-mutual-prop-tests.ts', /mutual Prop admission.*exact Lean differential/],
];
const freshMutualLogs = [];
for (const [label, script, regex] of mutualSuites) {
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { ...process.env, PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-mutual-admission-boundary-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} mutual exact Lean differential`);
  freshMutualLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
}

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  progress: {
    label: 'overall v71 K3 track',
    percent: progressOverall,
    basis: 'conservative engineering ledger, not a mathematical probability',
    completedEvidenceSlices: 5,
    outstandingMutualAdmissionObligations: 4,
    outstandingWholeK3Obligations: admission.scope.outstandingK3Obligations,
  },
  formal: {
    newTarget: targetModule,
    targetSource: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    targetTheorems: 6,
    reportedSorryAx: 0,
    log: rel(formalLog),
    totalFormalLeanFiles: formalStackFiles.length,
    theoremBoundary: 'formed mutual environment preservation + mixed formed/RHS boundary + inherited admission-boundary theorem + explicit progress ledger',
  },
  executable: {
    mutualSourceAudit: mutual.executable.sourceAudit,
    freshExactLeanMutualSuites: freshMutualLogs,
    suiteCount: freshMutualLogs.length,
    failures: 0,
  },
  inherited: {
    admissionBoundary: { status: 'PASS', formalFiles: admission.formal.totalFormalLeanFiles },
    mutualFormedEnvironment: { status: 'PASS', sourceObligations: mutual.executable.sourceAudit.obligations, missing: mutual.executable.sourceAudit.missing },
    formedEnvironmentGeneralization: { status: 'PASS', formalFiles: formed.formal.totalFormalLeanFiles },
    mutualNestedRecursorRHS: { status: 'PASS', exactLeanSuites: rhs.executable.suiteCount },
    fullLeanGate: { status: 'PASS', parts: finalGate.partCount },
  },
  scope: {
    newlyBoundThisCheckpoint: [
      'mutual-source obligations remain audited against the actual checkDirectMutualInductive implementation slice',
      'formed mutual declaration packages preserve Core-to-Lean environment translation',
      'mutual packages remain included in the mixed formed-environment/RHS boundary',
      'fresh exact-Lean mutual admission suites pass under Lean 4.33.1',
      'overall v71 K3 progress ledger is now recorded as 70%',
    ],
    stillNotProved: [
      'mechanized TypeScript mutual checker refinement theorem',
      'arbitrary Lean mutual block acceptance iff ProofScript acceptance',
      'exhaustive mutual positivity completeness for every Lean expression form',
      'arbitrary stored RecursorRule.rhs reconstruction',
      'final whole-kernel K3 equivalence theorem',
    ],
  },
  status: 'PASS',
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');

fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 Mutual Admission Completeness Boundary 1\n\nStatus: PASS\n\nOverall v71 K3-track progress recorded by this checkpoint: **${progressOverall}%**.\n\nThis is a conservative progress ledger, not a probability and not a full K3 theorem.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Newly bound evidence\n\n1. Mutual source obligations are still audited against the actual TypeScript implementation slice.\n2. Formed mutual packages preserve Core-to-Lean environment translation, direct typing lookup, and ordinary delta lookup.\n3. Mutual packages remain covered by the mixed formed-environment/RHS boundary.\n4. Five exact-Lean mutual suites were freshly rerun with Lean 4.33.1.\n5. The progress ledger advances the v71 K3 track to 70%.\n\n## Still not proved\n\n1. Mechanized TypeScript mutual checker refinement theorem.\n2. Arbitrary Lean mutual block acceptance iff ProofScript acceptance.\n3. Exhaustive mutual positivity completeness for every Lean expression form.\n4. Arbitrary stored RecursorRule.rhs reconstruction.\n5. Final whole-kernel K3 equivalence theorem.\n`);

const shaManifest = {
  checkpoint: 'V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1',
  progressOverall,
  files: [
    targetRel,
    checkpointRel,
    mdRel,
    rel(formalLog),
    'docs/superpowers/plans/2026-09-10-v71-mutual-admission-completeness-boundary.md',
  ].map(file => ({ file, sha256: sha256File(path.join(root, file)) })),
};
fs.writeFileSync(path.join(root, 'V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1_SHA256.json'), JSON.stringify(shaManifest, null, 2) + '\n');

console.log(`MUTUAL_ADMISSION_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=6 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`MUTUAL_ADMISSION_BOUNDARY_SOURCE_AUDIT=PASS OBLIGATIONS=${mutual.executable.sourceAudit.obligations} MISSING=${mutual.executable.sourceAudit.missing}`);
console.log(`MUTUAL_ADMISSION_BOUNDARY_EXACT_LEAN_SUITES=${freshMutualLogs.length} FAILURES=0`);
console.log(`MUTUAL_ADMISSION_BOUNDARY_PROGRESS_OVERALL=${progressOverall}%`);
console.log('MUTUAL_ADMISSION_BOUNDARY_STATUS=PARTIAL_COMPLETENESS_NOT_FULL_K3');
console.log('PASS KERNEL-v71-mutual-admission-completeness-boundary');
