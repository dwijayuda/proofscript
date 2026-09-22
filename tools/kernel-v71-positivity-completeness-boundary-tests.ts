import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assurance = path.join(root, 'assurance/lean4331');
const evidence = path.join(assurance, 'evidence');
const formalRoot = path.join(assurance, 'formal');
fs.mkdirSync(evidence, { recursive: true });

const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const progressOverall = 85;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71PositivityCompletenessBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71PositivityCompletenessBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_POSITIVITY_COMPLETENESS_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_POSITIVITY_COMPLETENESS_BOUNDARY1.md';

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 10 * 60 * 1000,
    maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}
function text(r) { return `${r.stdout ?? ''}${r.stderr ?? ''}`; }
function assertCleanRun(result, label) {
  const out = text(result);
  assert.equal(result.status, 0, `${label} failed with status ${result.status}\n${out}`);
  assert.equal(result.signal, null, `${label} terminated with signal ${result.signal}\n${out}`);
  return out;
}
function expect(out, regex, label) { assert.match(out, regex, `${label} missing pattern ${regex}\n${out}`); }
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-positivity-boundary-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
console.log('POSITIVITY_BOUNDARY_PHASE=formal-build');
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
const formalLog = path.join(evidence, 'v71-positivity-completeness-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal positivity boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedPositivitySlices_count',
  'outstandingPositivityObligations_count',
  'k3OverallProgress_percent',
  'inheritedTSNestedPreprocessorProgress_prior',
  'directStrictPositiveTranslation_boundary',
  'indexedStrictPositiveTranslation_boundary',
  'tsNestedPreprocessorBoundary_inherited',
  'v71PositivityCompletenessBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71PositivityCompletenessBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal positivity boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal positivity boundary has sorry marker');

const tsNested = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1.json', 'V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1');
assert.equal(tsNested.formal.reportedSorryAx, 0, 'TS nested preprocessor refinement sorryAx');
assert.equal(tsNested.progress.percent, 80, 'prior TS nested preprocessor progress');
assert.equal(tsNested.executable.failures, 0, 'prior TS nested preprocessor failures');

const nestedBoundary = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NESTED_PREPROCESSING_COMPLETENESS_BOUNDARY1.json', 'V71_NESTED_PREPROCESSING_COMPLETENESS_BOUNDARY1');
assert.equal(nestedBoundary.formal.reportedSorryAx, 0, 'nested preprocessing boundary sorryAx');
assert.equal(nestedBoundary.progress.percent, 75, 'nested preprocessing prior progress');

const mutualAdmission = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1.json', 'V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1');
assert.equal(mutualAdmission.formal.reportedSorryAx, 0, 'mutual admission boundary sorryAx');
assert.equal(mutualAdmission.progress.percent, 70, 'mutual admission prior progress');

const finalGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(finalGate.status, 'PASS', 'full Lean gate status');
assert.equal(finalGate.partCount, 6, 'full Lean gate part count');

// Static audit for the actual non-mutual and mutual positivity classifiers.
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
function sliceBetween(startNeedle, endNeedle) {
  const start = kernelSource.indexOf(startNeedle);
  const end = kernelSource.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0 && end > start, `could not locate source slice ${startNeedle}`);
  return kernelSource.slice(start, end);
}
const directSlice = sliceBetween('function positiveRecursiveFieldType(', '/**\n * Lean 4.33.1 strict-positivity classifier');
const mutualSlice = sliceBetween('function positiveMutualRecursiveFieldType(', '/**\n * Lean 4.33.1 constructor-field universe admission rule');
const usageSlice = kernelSource.slice(kernelSource.indexOf('function checkDirectMutualInductive('), kernelSource.indexOf('function tryCheckNestedInductive('));
assert.ok(usageSlice.length > 0, 'could not locate mutual-to-nested checker usage slice');
const directObligations = [
  ['direct function located', /function positiveRecursiveFieldType\(/],
  ['WHNF root normalization', /const root=kernelWhnf\(env,field\)/],
  ['nonrecursive no-op', /if\(!containsConst\(root,selfName\)\)return undefined/],
  ['Pi domain rejection', /non-positive occurrence of \$\{selfName\} in recursive function domain/],
  ['terminal app flattening', /flattenApps\(t\)/],
  ['family head check', /head\.tag!=="const"\|\|head\.name!==selfName/],
  ['universe equality check', /levelDefEq\(l,selfLevels\[i\]\)/],
  ['parameter-index arity check', /decl\.numParams\+decl\.numIndices/],
  ['uniform parameter metadata check', /paramBaseIndices\.length!==decl\.numParams/],
  ['uniform parameter defeq branch', /env\.allowUniformParameterDefEq/],
  ['recursive index rejection', /recursive occurrence of \$\{selfName\} inside an index is invalid/],
  ['resource bound', /positivity checking resource limit exceeded/],
];
const mutualObligations = [
  ['mutual function located', /function positiveMutualRecursiveFieldType\(/],
  ['mutual WHNF root normalization', /const root=kernelWhnf\(env,field\)/],
  ['mutual nonrecursive no-op', /if\(!containsAnyConst\(root,memberNames\)\)return undefined/],
  ['mutual Pi domain rejection', /non-positive mutual occurrence in recursive function domain/],
  ['mutual terminal app flattening', /flattenApps\(t\)/],
  ['mutual family head membership', /!memberNames\.has\(head\.name\)/],
  ['target member lookup', /members\.find\(m=>m\.name===head\.name\)/],
  ['shared universe parameters', /expectedLevels=blockLevelParams\.map/],
  ['mutual parameter-index arity check', /numParams\+target\.numIndices/],
  ['mutual uniform parameter defeq', /defEq\(env,localCtx,args\[p\],expected\)/],
  ['recursive mutual index rejection', /mutual recursive indices may not contain a mutual family occurrence/],
  ['higher-order marker', /higherOrder:depth>0/],
  ['mutual resource bound', /mutual positivity checking resource limit exceeded/],
];
const usageObligations = [
  ['mutual checker calls positivity classifier', /positiveMutualRecursiveFieldType\(/],
  ['higher-order gated by capability', /positive\.higherOrder&&!env\.allowHigherOrderMutualRecursion/],
  ['direct checker calls positivity classifier', /positiveRecursiveFieldType\(/],
  ['nested path reuses direct mutual checker', /checkDirectMutualInductive\(transformed,synthetic\)/],
];
function missing(obligations, source) { return obligations.filter(([, re]) => !re.test(source)); }
const missingAll = [
  ...missing(directObligations, directSlice).map(([n]) => `direct:${n}`),
  ...missing(mutualObligations, mutualSlice).map(([n]) => `mutual:${n}`),
  ...missing(usageObligations, kernelSource).map(([n]) => `usage:${n}`),
];
assert.deepEqual(missingAll, [], `missing positivity source obligations: ${missingAll.join(', ')}`);
const sourceAudit = {
  direct: {
    path: 'packages/kernel/src/kernel.ts#positiveRecursiveFieldType',
    sha256: sha256Text(directSlice),
    obligations: directObligations.length,
    lineCount: directSlice.split(/\r?\n/).length,
  },
  mutual: {
    path: 'packages/kernel/src/kernel.ts#positiveMutualRecursiveFieldType',
    sha256: sha256Text(mutualSlice),
    obligations: mutualObligations.length,
    lineCount: mutualSlice.split(/\r?\n/).length,
  },
  usage: {
    path: 'packages/kernel/src/kernel.ts#direct/mutual/nested positivity call sites',
    sha256: sha256Text(usageSlice),
    obligations: usageObligations.length,
    lineCount: usageSlice.split(/\r?\n/).length,
  },
  totalObligations: directObligations.length + mutualObligations.length + usageObligations.length,
  missing: missingAll.length,
};

const positivitySuites = [
  ['direct', 'tools/kernel-inductive-positivity-tests.ts', /higher-order strict positivity.*exact Lean observations passed/],
  ['indexed', 'tools/kernel-inductive-indexed-admission-differential-tests.ts', /INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6/],
  ['mutual-direct', 'tools/kernel-mutual-inductives-tests.ts', /direct mutual inductives.*exact Lean observations passed with exact Lean differential/],
  ['mutual-higher-order', 'tools/kernel-mutual-higher-order-tests.ts', /higher-order positive mutual recursion.*exact Lean observations passed with exact Lean differential/],
  ['nested-direct', 'tools/kernel-nested-inductives-tests.ts', /nested preprocessing.*exact Lean observations passed with exact Lean differential/],
  ['nested-indexed-containers', 'tools/kernel-nested-indexed-containers-tests.ts', /indexed nested-container preprocessing.*exact Lean observations passed with exact Lean differential/],
];
const freshLogs = [];
for (const [label, script, regex] of positivitySuites) {
  console.log(`POSITIVITY_BOUNDARY_PHASE=suite ${label}`);
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-positivity-boundary-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} positivity exact Lean differential`);
  freshLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
  console.log(`POSITIVITY_BOUNDARY_SUITE_PASS=${label}`);
}

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_POSITIVITY_COMPLETENESS_BOUNDARY1',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressOverall,
    previousPercent: 80,
    label: 'v71 K3-track conservative engineering progress',
    note: 'Progress is a project ledger, not a probability and not a formal K3 theorem.',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    logSha256: sha256File(formalLog),
    targetTheorems: 8,
    reportedSorryAx: 0,
    effectiveFormalStackFiles: formalStackFiles.length,
  },
  executable: {
    sourceAudit,
    suiteCount: freshLogs.length,
    failures: 0,
    exactLeanSuites: freshLogs,
  },
  inherited: {
    fullLeanGate: { status: finalGate.status, partCount: finalGate.partCount },
    tsNestedPreprocessorRefinement: { status: tsNested.status, progress: tsNested.progress.percent },
    nestedPreprocessingBoundary: { status: nestedBoundary.status, progress: nestedBoundary.progress.percent },
    mutualAdmissionBoundary: { status: mutualAdmission.status, progress: mutualAdmission.progress.percent },
  },
  completedSlices: [
    'direct non-mutual positivity translation theorem',
    'indexed non-mutual positivity translation theorem',
    'direct TypeScript positivity classifier source audit',
    'mutual TypeScript positivity classifier source audit',
    'mutual higher-order positivity exact Lean suites',
    'nested preprocessing positivity-using exact Lean suites',
    'inherited TS nested-preprocessor refinement boundary',
  ],
  outstandingK3Obligations: [
    'mechanized KernelTS semantics for line-by-line TypeScript positivity execution',
    'arbitrary Lean positivity acceptance iff ProofScript acceptance',
    'exhaustive positivity completeness for every Lean expression form and reduction path',
    'arbitrary stored RecursorRule.rhs reconstruction',
    'final whole-kernel K3 equivalence theorem',
  ],
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');
fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 Positivity Completeness Boundary 1\n\nStatus: PASS\n\nOverall v71 K3-track progress recorded by this checkpoint: **${progressOverall}%**.\n\nThis is a conservative progress ledger, not a probability and not a full K3 theorem.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Newly bound evidence\n\n1. Direct non-mutual strict-positivity translation theorem is imported and re-exposed.\n2. Indexed strict-positivity translation theorem is imported and re-exposed.\n3. The actual TypeScript direct and mutual positivity classifier source slices are statically audited.\n4. Six exact-Lean positivity-related suites were freshly rerun with Lean 4.33.1.\n5. The inherited TypeScript nested-preprocessor refinement boundary remains linked.\n6. The progress ledger advances the v71 K3 track from 80% to 85%.\n\n## Still not proved\n\n1. Mechanized KernelTS semantics for line-by-line TypeScript positivity execution.\n2. Arbitrary Lean positivity acceptance iff ProofScript acceptance.\n3. Exhaustive positivity completeness for every Lean expression form and reduction path.\n4. Arbitrary stored RecursorRule.rhs reconstruction.\n5. Final whole-kernel K3 equivalence theorem.\n`);
fs.writeFileSync(path.join(root, 'V71_POSITIVITY_COMPLETENESS_BOUNDARY1_SHA256.json'), JSON.stringify({
  schema: 'proofscript.release.sha256/v1',
  artifact: 'proofscript-kernel-v71-positivity-completeness-boundary1.zip',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: checkpoint.formal.targetSourceSha256,
  generatedAt: new Date().toISOString(),
}, null, 2) + '\n');

console.log(`POSITIVITY_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=${checkpoint.formal.targetTheorems} SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`POSITIVITY_BOUNDARY_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.totalObligations} MISSING=${sourceAudit.missing}`);
console.log(`POSITIVITY_BOUNDARY_EXACT_LEAN_SUITES=${checkpoint.executable.suiteCount} FAILURES=${checkpoint.executable.failures}`);
console.log(`POSITIVITY_BOUNDARY_PROGRESS_OVERALL=${progressOverall}%`);
console.log('POSITIVITY_BOUNDARY_STATUS=PARTIAL_COMPLETENESS_NOT_FULL_K3');
console.log('PASS KERNEL-v71-positivity-completeness-boundary');
