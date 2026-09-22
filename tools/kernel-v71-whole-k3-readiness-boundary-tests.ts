import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const progressOverall = 98;
const previousProgress = 97;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71WholeK3ReadinessBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71WholeK3ReadinessBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_WHOLE_K3_READINESS_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_WHOLE_K3_READINESS_BOUNDARY1.md';
const evidence = path.join(root, 'assurance/lean4331/evidence');
const formalRoot = path.join(root, 'assurance/lean4331/formal');
fs.mkdirSync(evidence, { recursive: true });

const inheritedCheckpointRels = [
  'assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json',
  'assurance/lean4331/CHECKPOINT_V71_NONMUTUAL_DECL_ENV_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_NESTED_FORMED_ENV_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_FORMED_ENV_GENERALIZATION_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_ADMISSION_BOUNDARY_CERT1.json',
  'assurance/lean4331/CHECKPOINT_V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_NESTED_PREPROCESSING_COMPLETENESS_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_POSITIVITY_COMPLETENESS_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_KERNELTS_SEMANTICS_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1.json',
  'assurance/lean4331/CHECKPOINT_V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1.json',
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 120_000,
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}

function text(result) {
  return [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('');
}

function assertCleanRun(result, label) {
  const out = text(result);
  assert.equal(result.status, 0, `${label} failed with status ${result.status}\n${out}`);
  return out;
}

function sha256Text(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function expect(haystack, needle, label) {
  assert.match(haystack, needle, `${label}: expected ${needle}`);
}

function findFormalFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...findFormalFiles(abs));
    else if (ent.isFile() && ent.name.endsWith('.lean')) out.push(abs);
  }
  return out.sort();
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

console.log('WHOLE_K3_READINESS_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-whole-k3-readiness-formal-'));
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
const formalLog = path.join(evidence, 'v71-whole-k3-readiness-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal whole-K3 readiness target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedWholeK3ReadinessSlices_count',
  'outstandingWholeK3ReadinessObligations_count',
  'k3OverallProgress_percent',
  'inheritedRuntimeExtractionProgress_prior',
  'inheritedRuntimeExtractionTrustBoundary_checkpoint',
  'v71WholeK3ReadinessBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71WholeK3ReadinessBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal whole-K3 readiness unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal whole-K3 readiness has sorry marker');

console.log('WHOLE_K3_READINESS_PHASE=inherited-checkpoints');
const inherited = [];
let failures = 0;
for (const relPath of inheritedCheckpointRels) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const checkpoint = readJson(relPath);
  const status = checkpoint.status;
  if (status !== 'PASS') failures += 1;
  const progress = checkpoint.progress?.percent ?? null;
  const formalSorryAx = checkpoint.formal?.reportedSorryAx ?? 0;
  assert.equal(status, 'PASS', `${relPath} status`);
  assert.equal(formalSorryAx, 0, `${relPath} formal reportedSorryAx`);
  inherited.push({
    path: relPath,
    checkpoint: checkpoint.checkpoint ?? path.basename(relPath, '.json'),
    status,
    progress,
    sha256: sha256File(path.join(root, relPath)),
  });
}
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const runtime = readJson('assurance/lean4331/CHECKPOINT_V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1.json');
assert.equal(runtime.progress.percent, previousProgress, 'runtime/extraction prior progress');
assert.equal(runtime.executable.extractionAudit.runtimeVectorFailures, 0, 'runtime extraction vector failures');
const smallStep = readJson('assurance/lean4331/CHECKPOINT_V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1.json');
assert.equal(smallStep.progress.percent, 95, 'small-step inherited progress');
const storedRhs = readJson('assurance/lean4331/CHECKPOINT_V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.json');
assert.equal(storedRhs.progress.percent, 90, 'stored RHS inherited progress');

console.log('WHOLE_K3_READINESS_PHASE=source-ledger');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 47, `expected at least 47 formal files, got ${formalFiles.length}`);
const formalStackHash = sha256Text(formalFiles.map(file => `${rel(file)}:${sha256File(file)}`).join('\n'));
const checkpointLedgerHash = sha256Text(inherited.map(c => `${c.path}:${c.sha256}`).join('\n'));

const completedSlices = [
  'full six-part Lean 4.33.1 executable gate',
  'non-mutual declaration environment certificate',
  'TypeScript classifier implementation trace certificate',
  'mutual formed-environment certificate',
  'nested formed-environment certificate',
  'mixed formed-environment generalization certificate',
  'mutual/nested linked recursor RHS certificate',
  'admission-boundary certificate',
  'mutual admission completeness-boundary certificate',
  'nested preprocessing completeness-boundary certificate',
  'TypeScript nested preprocessor refinement-boundary certificate',
  'positivity completeness-boundary certificate',
  'stored RecursorRule.rhs reconstruction-boundary certificate',
  'KernelTS semantics-boundary certificate',
  'KernelTS small-step execution-boundary certificate',
  'runtime/extraction trust-boundary certificate',
];
const outstandingK3Obligations = [
  'verified TypeScript compiler or extraction path',
  'full ECMAScript or Node runtime model',
  'arbitrary Lean acceptance completeness iff ProofScript acceptance',
  'exhaustive all-Lean reduction-path completeness',
  'final whole-kernel K3 equivalence theorem',
];
assert.equal(completedSlices.length, 16, 'completed readiness slice count');
assert.equal(outstandingK3Obligations.length, 5, 'outstanding readiness obligation count');

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_WHOLE_K3_READINESS_BOUNDARY1',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressOverall,
    previousPercent: previousProgress,
    label: 'v71 K3-track conservative engineering progress',
    note: 'Progress is a project ledger, not a probability and not a formal K3 theorem.',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    logSha256: sha256File(formalLog),
    targetTheorems: 6,
    reportedSorryAx: 0,
    effectiveFormalStackFiles: formalFiles.length,
    formalStackHash,
  },
  executable: {
    inheritedCheckpointCount: inherited.length,
    inheritedCheckpointFailures: failures,
    finalLeanGatePartCount: fullGate.partCount,
    finalLeanGateFailures: 0,
    checkpointLedgerHash,
  },
  inherited,
  completedSlices,
  outstandingK3Obligations,
  boundary: 'READINESS_BOUNDARY_NOT_FINAL_K3_EQUIVALENCE',
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');

const md = `# ProofScript Kernel v71 Whole-K3 Readiness Boundary 1\n\nStatus: **PASS**\n\nOverall v71 K3-track progress: **${progressOverall}%**\n\nThis checkpoint links all existing v71 certificates into one readiness ledger. It is intentionally not the final K3 theorem.\n\n## Formal target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Formal stack files: ${formalFiles.length}\n- sorryAx: 0\n\n## Executable/inherited evidence\n\n- Inherited checkpoints: ${inherited.length}\n- Inherited checkpoint failures: ${failures}\n- Full Lean gate parts: ${fullGate.partCount}\n\n## Remaining obligations\n\n${outstandingK3Obligations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n## Boundary\n\nREADINESS_BOUNDARY_NOT_FINAL_K3_EQUIVALENCE\n`;
fs.writeFileSync(path.join(root, mdRel), md);

const shaRecord = {
  artifact: 'V71_WHOLE_K3_READINESS_BOUNDARY1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalEvidence: rel(formalLog),
  formalEvidenceSha256: sha256File(formalLog),
  inheritedCheckpointLedgerHash: checkpointLedgerHash,
};
fs.writeFileSync(path.join(root, 'V71_WHOLE_K3_READINESS_BOUNDARY1_SHA256.json'), JSON.stringify(shaRecord, null, 2) + '\n');

console.log(`WHOLE_K3_READINESS_FORMAL_TARGET=PASS THEOREMS=6 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`WHOLE_K3_READINESS_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`WHOLE_K3_READINESS_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`WHOLE_K3_READINESS_PROGRESS_OVERALL=${progressOverall}%`);
console.log('WHOLE_K3_READINESS_STATUS=READINESS_BOUNDARY_NOT_FINAL_K3');
console.log('PASS KERNEL-v71-whole-k3-readiness-boundary');
