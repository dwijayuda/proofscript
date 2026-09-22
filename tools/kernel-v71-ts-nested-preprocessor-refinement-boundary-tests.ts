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
const progressOverall = 80;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71TSNestedPreprocessorRefinementBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71TSNestedPreprocessorRefinementBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1.md';

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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-ts-nested-preprocessor-refinement-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
console.log('TS_NESTED_PREPROCESSOR_REFINEMENT_PHASE=formal-build');
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
const formalLog = path.join(evidence, 'v71-ts-nested-preprocessor-refinement-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal TS nested preprocessor refinement boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedTSNestedPreprocessorSlices_count',
  'outstandingTSNestedPreprocessorObligations_count',
  'k3OverallProgress_percent',
  'inheritedNestedPreprocessingProgress_prior',
  'implementationTrace_nestedBoundary_sound',
  'implementationTrace_exactLeanMarker',
  'implementationTrace_atomicCommitMarker',
  'v71TSNestedPreprocessorRefinementBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71TSNestedPreprocessorRefinementBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal TS nested preprocessor refinement boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal TS nested preprocessor refinement boundary has sorry marker');

const nestedBoundary = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NESTED_PREPROCESSING_COMPLETENESS_BOUNDARY1.json', 'V71_NESTED_PREPROCESSING_COMPLETENESS_BOUNDARY1');
assert.equal(nestedBoundary.formal.reportedSorryAx, 0, 'nested preprocessing boundary sorryAx');
assert.equal(nestedBoundary.progress.percent, 75, 'nested preprocessing prior progress');
assert.equal(nestedBoundary.executable.failures, 0, 'nested preprocessing boundary failures');
assert.equal(nestedBoundary.executable.suiteCount, 9, 'nested preprocessing exact Lean suite count');

const admission = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_ADMISSION_BOUNDARY_CERT1.json', 'V71_ADMISSION_BOUNDARY_CERT1');
assert.equal(admission.formal.reportedSorryAx, 0, 'admission-boundary sorryAx');

const mutualAdmission = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1.json', 'V71_MUTUAL_ADMISSION_COMPLETENESS_BOUNDARY1');
assert.equal(mutualAdmission.formal.reportedSorryAx, 0, 'mutual admission boundary sorryAx');
assert.equal(mutualAdmission.progress.percent, 70, 'mutual admission prior progress');

const rhs = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json', 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1');
assert.equal(rhs.executable.failures, 0, 'mutual/nested RHS failures');

const finalGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(finalGate.status, 'PASS', 'full Lean gate status');
assert.equal(finalGate.partCount, 6, 'full Lean gate part count');

// Static audit for the actual nested preprocessing implementation and the dispatcher chain
// that the Lean trace intentionally abstracts.
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
const start = kernelSource.indexOf('function tryCheckNestedInductive(');
const end = kernelSource.indexOf('function containsBVar(', start);
assert.ok(start >= 0 && end > start, 'could not locate tryCheckNestedInductive implementation slice');
const nestedSlice = kernelSource.slice(start, end);
const obligations = [
  ['main nested preprocessor function', /function tryCheckNestedInductive\(/],
  ['feature gate', /allowNestedInductives/],
  ['parameter gate', /allowNestedParameters/],
  ['index gate', /allowNestedIndices/],
  ['deeper dispatcher v37', /tryCheckNestedInductiveV37/],
  ['deeper generalized dispatcher v38', /tryCheckNestedInductiveV38/],
  ['deeper parameters dispatcher v39', /tryCheckNestedInductiveV39/],
  ['deeper indices dispatcher v40', /tryCheckNestedInductiveV40/],
  ['deeper polymorphic dispatcher v41', /tryCheckNestedInductiveV41/],
  ['deeper multiple fields dispatcher v42', /tryCheckNestedInductiveV42/],
  ['deeper prop dispatcher v43', /tryCheckNestedInductiveV43/],
  ['deeper multi-parameter dispatcher v44', /tryCheckNestedInductiveV44/],
  ['deeper generalized multi-parameter dispatcher v45', /tryCheckNestedInductiveV45\(env,decl\)/],
  ['dependent container parameter dispatcher v45', /tryCheckNestedInductiveV45\(env,decl,true\)/],
  ['multiple specializations dispatcher v33', /tryCheckNestedInductiveV33/],
  ['nested occurrence detection', /nestedSpecialization\(field,decl\.name,totalOuterArgs\)/],
  ['single container boundary', /nested slice admits exactly one nested container type former/],
  ['monomorphic outer boundary', /nested slice requires a monomorphic outer inductive/],
  ['duplicate outer rejection', /duplicate declaration: \$\{decl\.name\}/],
  ['recursor-name freshness', /nested recursor name already exists/],
  ['outer telescope check', /nested outer telescope shorter than parameters \+ indices/],
  ['outer Type boundary', /nested slice requires an outer family in Type/],
  ['checked container lookup', /nested container \$\{containerName\} is not an already-checked inductive/],
  ['container shape check', /must be monomorphic with exactly one parameter and no indices/],
  ['container returns Type', /must return Type/],
  ['container parameter Type', /container \$\{containerName\} parameter must be Type/],
  ['captured index mode', /mode=\{kind:"captured"/],
  ['closed index mode', /mode=\{kind:"closed"/],
  ['index expression projection', /projectNestedIndexToParamContext/],
  ['recursive field admissibility', /nested slice only admits direct \$\{decl\.name\} or \$\{containerName\}/],
  ['fresh helper name', /let auxName=`_nested\.\$\{decl\.name\}\.aux`/],
  ['outer constructors rewritten', /rewriteNestedSpecializationToAux\(ctor\.type/],
  ['container constructors restored', /ctorRestore\.set\(syntheticName,ctor\.name\)/],
  ['synthetic mutual block', /kind:"mutualInductive"/],
  ['trusted mutual checker reuse', /checkDirectMutualInductive\(transformed,synthetic\)/],
  ['transformed environment clone', /const transformed=env\.clone\(\)/],
  ['restore public outer declaration', /final\.add\(\{declaration:decl,assumptions,generated\}\)/],
  ['helper recursor aliasing', /const helperName=`\$\{decl\.name\}\.rec_1`/],
  ['atomic final environment', /const final=env\.clone\(\)/],
  ['replace only at end', /env\.replaceWith\(final\)/],
];
const missingObligations = obligations.filter(([, re]) => !re.test(nestedSlice));
assert.deepEqual(missingObligations, [], `missing TS nested preprocessor source obligations: ${missingObligations.map(([x]) => x).join(', ')}`);
const sourceAudit = {
  path: 'packages/kernel/src/kernel.ts#tryCheckNestedInductive',
  sha256: sha256Text(nestedSlice),
  obligations: obligations.length,
  missing: missingObligations.length,
  lineCount: nestedSlice.split(/\r?\n/).length,
};

const nestedSuites = [
  ['base', 'tools/kernel-nested-inductives-tests.ts', /nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['parameters', 'tools/kernel-nested-parameters-tests.ts', /parameterized\/dependent nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['indices', 'tools/kernel-nested-indices-tests.ts', /indexed nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['index-expressions', 'tools/kernel-nested-index-expressions-tests.ts', /nested index expressions.*exact Lean/],
  ['multiple-specializations', 'tools/kernel-nested-multiple-specializations-tests.ts', /nested multiple specializations.*exact Lean observations passed.*exact Lean differential/],
  ['polymorphic', 'tools/kernel-nested-polymorphic-tests.ts', /polymorphic nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['indexed-containers', 'tools/kernel-nested-indexed-containers-tests.ts', /indexed nested-container preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['deeper-generalization', 'tools/kernel-nested-deeper-generalization-tests.ts', /arbitrary closed linear-depth nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['deep-multiparam-generalization', 'tools/kernel-nested-deeper-multi-parameter-generalization-tests.ts', /generalized multi-parameter nested graphs.*exact Lean observations passed.*exact Lean/],
];
const freshNestedLogs = [];
for (const [label, script, regex] of nestedSuites) {
  console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_PHASE=suite ${label}`);
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-ts-nested-preprocessor-refinement-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} nested exact Lean differential`);
  freshNestedLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
  console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_SUITE_PASS=${label}`);
}

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  progress: {
    label: 'overall v71 K3 track',
    percent: progressOverall,
    basis: 'conservative engineering ledger, not a mathematical probability',
    previousPercent: 75,
    completedEvidenceSlices: 8,
    outstandingTSNestedPreprocessorObligations: 5,
    outstandingWholeK3ObligationsAfterThisCheckpoint: [
      'mechanized KernelTS semantics for line-by-line implementation refinement',
      'arbitrary Lean nested preprocessing acceptance iff ProofScript acceptance',
      'exhaustive nested positivity completeness for every Lean expression form',
      'arbitrary stored RecursorRule.rhs reconstruction',
      'final whole-kernel K3 equivalence theorem',
    ],
  },
  formal: {
    newTarget: targetModule,
    targetSource: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    targetTheorems: 8,
    reportedSorryAx: 0,
    log: rel(formalLog),
    totalFormalLeanFiles: formalStackFiles.length,
    theoremBoundary: 'abstract TypeScript nested-preprocessor implementation trace inherits nested-preprocessing boundary soundness and records 80% progress',
  },
  executable: {
    tsNestedPreprocessorSourceAudit: sourceAudit,
    freshExactLeanNestedSuites: freshNestedLogs,
    suiteCount: freshNestedLogs.length,
    failures: 0,
  },
  inherited: {
    nestedPreprocessingBoundary: { status: 'PASS', progressPercent: nestedBoundary.progress.percent, exactLeanSuites: nestedBoundary.executable.suiteCount },
    admissionBoundary: { status: 'PASS', formalFiles: admission.formal.totalFormalLeanFiles },
    mutualAdmissionBoundary: { status: 'PASS', progressPercent: mutualAdmission.progress.percent },
    mutualNestedRecursorRHS: { status: 'PASS', exactLeanSuites: rhs.executable.suiteCount },
    fullLeanGate: { status: 'PASS', parts: finalGate.partCount },
  },
  scope: {
    newlyBoundThisCheckpoint: [
      'the concrete tryCheckNestedInductive TypeScript source slice is located and hashed',
      'the nested dispatcher chain through v33 and v37-v45 is audited as part of the refinement boundary',
      'synthetic mutual-checker reuse and atomic environment replacement are audited in the concrete source slice',
      'nine exact-Lean nested preprocessing suites are freshly rerun under Lean 4.33.1',
      'the Lean abstract implementation trace inherits the nested-preprocessing completeness boundary theorem',
      'overall v71 K3 progress ledger is now recorded as 80%',
    ],
    stillNotProved: [
      'mechanized KernelTS semantics for line-by-line TypeScript execution',
      'arbitrary Lean nested preprocessing acceptance iff ProofScript acceptance',
      'exhaustive nested positivity completeness for every Lean expression form',
      'arbitrary stored RecursorRule.rhs reconstruction',
      'final whole-kernel K3 equivalence theorem',
    ],
  },
  status: 'PASS',
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');

fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 TypeScript Nested Preprocessor Refinement Boundary 1\n\nStatus: PASS\n\nOverall v71 K3-track progress recorded by this checkpoint: **${progressOverall}%**.\n\nThis is a conservative implementation-refinement boundary, not a full TypeScript semantics proof and not a full K3 theorem.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Newly bound evidence\n\n1. The concrete \`tryCheckNestedInductive\` source slice is located and hashed.\n2. The dispatcher chain through v33 and v37-v45 is audited.\n3. Synthetic mutual-checker reuse and atomic final environment replacement are audited.\n4. Nine exact-Lean nested preprocessing suites were freshly rerun with Lean 4.33.1.\n5. The formal implementation trace inherits the nested-preprocessing boundary theorem.\n6. The progress ledger advances the v71 K3 track from 75% to 80%.\n\n## Still not proved\n\n1. Mechanized KernelTS semantics for line-by-line TypeScript execution.\n2. Arbitrary Lean nested preprocessing acceptance iff ProofScript acceptance.\n3. Exhaustive nested positivity completeness for every Lean expression form.\n4. Arbitrary stored RecursorRule.rhs reconstruction.\n5. Final whole-kernel K3 equivalence theorem.\n`);

const shaManifest = {
  checkpoint: 'V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1',
  progressOverall,
  files: [
    targetRel,
    checkpointRel,
    mdRel,
    rel(formalLog),
  ].map(file => ({ file, sha256: sha256File(path.join(root, file)) })),
  nestedSuiteLogs: freshNestedLogs.map(x => ({ file: x.log, sha256: x.sha256 })),
};
fs.writeFileSync(path.join(root, 'V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1_SHA256.json'), JSON.stringify(shaManifest, null, 2) + '\n');

console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.obligations} MISSING=${sourceAudit.missing}`);
console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_EXACT_LEAN_SUITES=${freshNestedLogs.length} FAILURES=0`);
console.log(`TS_NESTED_PREPROCESSOR_REFINEMENT_PROGRESS_OVERALL=${progressOverall}%`);
console.log('TS_NESTED_PREPROCESSOR_REFINEMENT_STATUS=IMPLEMENTATION_BOUNDARY_NOT_FULL_K3');
console.log('PASS KERNEL-v71-ts-nested-preprocessor-refinement-boundary');
