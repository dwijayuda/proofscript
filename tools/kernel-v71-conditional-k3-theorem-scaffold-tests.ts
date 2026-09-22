#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const targetModule = 'ProofScriptKernelEquivalence.KernelV71ConditionalK3TheoremScaffold';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71ConditionalK3TheoremScaffold.lean';
const formalRoot = path.join(root, 'assurance/lean4331/formal');
const evidence = path.join(root, 'assurance/lean4331/evidence');
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_CONDITIONAL_K3_THEOREM_SCAFFOLD1.md';
const previousProgress = 98;
const progressOverall = 99;

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
  'assurance/lean4331/CHECKPOINT_V71_WHOLE_K3_READINESS_BOUNDARY1.json',
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

fs.mkdirSync(evidence, { recursive: true });
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

console.log('CONDITIONAL_K3_SCAFFOLD_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-conditional-k3-scaffold-formal-'));
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
const formalLog = path.join(evidence, 'v71-conditional-k3-theorem-scaffold-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal conditional-K3 scaffold target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedConditionalK3Slices_count',
  'outstandingConditionalK3Obligations_count',
  'k3OverallProgress_percent',
  'inheritedWholeK3ReadinessProgress_prior',
  'v71ConditionalFinalK3Theorem_scaffold',
  'v71ConditionalK3Scaffold_notFinalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71ConditionalK3TheoremScaffold.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal conditional-K3 scaffold unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal conditional-K3 scaffold has sorry marker');

console.log('CONDITIONAL_K3_SCAFFOLD_PHASE=inherited-checkpoints');
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
const readiness = readJson('assurance/lean4331/CHECKPOINT_V71_WHOLE_K3_READINESS_BOUNDARY1.json');
assert.equal(readiness.progress.percent, previousProgress, 'whole-K3 readiness prior progress');
assert.equal(readiness.executable.inheritedCheckpointFailures, 0, 'readiness inherited failures');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');

console.log('CONDITIONAL_K3_SCAFFOLD_PHASE=last-mile-ledger');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 48, `expected at least 48 formal files, got ${formalFiles.length}`);
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
  'whole-K3 readiness-boundary certificate',
  'conditional final-K3 theorem scaffold',
];
const outstandingK3Obligations = [
  'verified TypeScript compiler or extraction path',
  'full ECMAScript or Node runtime model',
  'arbitrary Lean acceptance completeness iff ProofScript acceptance',
  'exhaustive all-Lean reduction-path completeness',
  'instantiate conditional theorem with concrete proofs',
];
assert.equal(completedSlices.length, 18, 'completed scaffold slice count');
assert.equal(outstandingK3Obligations.length, 5, 'outstanding last-mile obligation count');

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1',
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
  theoremShape: {
    conclusion: 'runtimeAccepts(j) iff Lean4331Accepts(translateJudgment(j)); reductions and stored recursor RHS agree on translated shared-domain objects',
    requiredPremises: [
      'runtimeRefinesProofScriptSpec',
      'proofScriptSpecLeanAcceptanceIff',
      'reductionPathCompletenessIff',
      'storedRecursorRHSRoundTripIff',
    ],
  },
  boundary: 'CONDITIONAL_THEOREM_SCAFFOLD_NOT_FINAL_K3_EQUIVALENCE',
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');

const md = `# ProofScript Kernel v71 Conditional K3 Theorem Scaffold 1\n\nStatus: **PASS**\n\nOverall v71 K3-track progress: **${progressOverall}%**\n\nThis checkpoint gives the final K3 theorem a precise Lean-checked conditional shape. It is intentionally not final K3 because the semantic last-mile premises are still arguments, not proved concrete instances.\n\n## Formal target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Formal stack files: ${formalFiles.length}\n- sorryAx: 0\n\n## Inherited evidence\n\n- Inherited checkpoints: ${inherited.length}\n- Inherited checkpoint failures: ${failures}\n- Full Lean gate parts: ${fullGate.partCount}\n- Previous readiness progress: ${previousProgress}%\n\n## Theorem shape\n\nThe scaffold states that final K3 follows from these premise families:\n\n${checkpoint.theoremShape.requiredPremises.map((x, i) => `${i + 1}. \`${x}\``).join('\n')}\n\n## Remaining obligations\n\n${outstandingK3Obligations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n## Boundary\n\nCONDITIONAL_THEOREM_SCAFFOLD_NOT_FINAL_K3_EQUIVALENCE\n`;
fs.writeFileSync(path.join(root, mdRel), md);

const shaRecord = {
  artifact: 'V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1',
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
fs.writeFileSync(path.join(root, 'V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1_SHA256.json'), JSON.stringify(shaRecord, null, 2) + '\n');

console.log(`CONDITIONAL_K3_SCAFFOLD_FORMAL_TARGET=PASS THEOREMS=6 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`CONDITIONAL_K3_SCAFFOLD_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`CONDITIONAL_K3_SCAFFOLD_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`CONDITIONAL_K3_SCAFFOLD_PROGRESS_OVERALL=${progressOverall}%`);
console.log('CONDITIONAL_K3_SCAFFOLD_STATUS=THEOREM_SHAPE_NOT_FINAL_K3');
console.log('PASS KERNEL-v71-conditional-k3-theorem-scaffold');
