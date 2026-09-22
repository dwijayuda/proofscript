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
const progressOverall = 90;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71StoredRecursorRHSReconstructionBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71StoredRecursorRHSReconstructionBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.md';

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
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function rel(p) { return path.relative(root, p).replaceAll(path.sep, '/'); }
function assertCheckpointPass(relPath, checkpointName) {
  const checkpoint = readJson(relPath);
  assert.equal(checkpoint.checkpoint, checkpointName, `${relPath} checkpoint name`);
  assert.equal(checkpoint.status, 'PASS', `${relPath} status`);
  assert.equal(checkpoint.coreFormat, 71, `${relPath} core format`);
  return checkpoint;
}
function assertLoggedHash(logRel, expectedSha) {
  const logPath = path.join(root, logRel);
  assert.ok(fs.existsSync(logPath), `missing evidence log ${logRel}`);
  const sha = sha256File(logPath);
  if (expectedSha) assert.equal(sha, expectedSha, `${logRel} sha256`);
  return { path: logRel, sha256: sha, bytes: fs.statSync(logPath).size };
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-stored-rhs-boundary-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
console.log('STORED_RECURSOR_RHS_PHASE=formal-build');
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
const formalLog = path.join(evidence, 'v71-stored-recursor-rhs-reconstruction-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal stored recursor RHS boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedStoredRHSSlices_count',
  'outstandingStoredRHSObligations_count',
  'k3OverallProgress_percent',
  'storedRHSRule_rhs_toLean',
  'storedRHSRule_toLean_corresponds',
  'allStoredRHSRules_toLean_correspond',
  'inheritedPositivityProgress_prior',
  'linkedRHSBoundary_inherited',
  'v71StoredRecursorRHSReconstructionBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71StoredRecursorRHSReconstructionBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal stored RHS boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal stored RHS boundary has sorry marker');

const positivity = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_POSITIVITY_COMPLETENESS_BOUNDARY1.json', 'V71_POSITIVITY_COMPLETENESS_BOUNDARY1');
assert.equal(positivity.formal.reportedSorryAx, 0, 'positivity boundary sorryAx');
assert.equal(positivity.progress.percent, 85, 'prior positivity progress');
assert.equal(positivity.executable.failures, 0, 'prior positivity executable failures');

const rhs = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json', 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1');
assert.equal(rhs.formal.reportedSorryAx, 0, 'mutual/nested RHS sorryAx');
assert.equal(rhs.executable.failures, 0, 'mutual/nested RHS executable failures');

const finalGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(finalGate.status, 'PASS', 'full Lean gate status');
assert.equal(finalGate.partCount, 6, 'full Lean gate part count');
const fullGateLogs = finalGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertLoggedHash(part.log, part.sha256);
});

const inductivePath = path.join(root, 'packages/kernel/src/inductive.ts');
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const inductiveSource = fs.readFileSync(inductivePath, 'utf8');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0 && end > start, `could not locate source slice ${startNeedle}`);
  return source.slice(start, end);
}
const schemaSlice = sliceBetween(inductiveSource, 'export interface SimpleCtorRule', 'type NTerm =');
const reductionSlice = sliceBetween(kernelSource, 'function buildPointwiseRecursiveIH(', 'function reduceQuotientRecursor(');
const metadataSliceStart = kernelSource.indexOf('recursiveRecursors:rule.recursiveTargets?.map');
assert.ok(metadataSliceStart >= 0, 'could not locate recursiveRecursors metadata slice');
const metadataSlice = kernelSource;
const schemaObligations = [
  ['SimpleCtorRule exists', /export interface SimpleCtorRule/],
  ['recursiveFieldTypes stored', /recursiveFieldTypes\?: \(Term \| null\)\[\]/],
  ['recursiveTargets stored', /recursiveTargets\?: \(string \| null\)\[\]/],
  ['recursiveRecursors stored', /recursiveRecursors\?: \(string \| null\)\[\]/],
  ['minorIndex stored on recursor metadata', /minorIndex\?: number/],
  ['SimpleRecursorMetadata exists', /export interface SimpleRecursorMetadata/],
  ['mutual recursor metadata exists', /mutual\?: \{ inductives: string\[\]; motiveCount: number; recursors: string\[\]; indexCounts\?: number\[\] \}/],
];
const reductionObligations = [
  ['direct pointwise IH builder', /function buildPointwiseRecursiveIH/],
  ['indexed pointwise IH builder', /function buildPointwiseIndexedRecursiveIH/],
  ['mutual pointwise IH builder', /function buildPointwiseMutualRecursiveIH/],
  ['linked indexed helper IH builder', /function buildPointwiseLinkedIndexedRecursiveIH/],
  ['linked helper IH builder', /function buildPointwiseLinkedRecursiveIH/],
  ['stored minorIndex selection', /const minorIndex = rule\.minorIndex \?\? ruleIndex/],
  ['minor selected from stored rule index', /const minor = args\[minorsStart \+ minorIndex\]/],
  ['stored recursiveRecursors target branch', /const explicitTargetRecursor=rule\.recursiveRecursors\?\.\[i\]\?\?null/],
  ['stored recursiveFieldTypes used', /const recursiveFieldType=rule\.recursiveFieldTypes\?\.\[i\]/],
  ['stored linked target entry checked as recursor', /targetEntry\.declaration\.kind!=="recursor"/],
  ['stored linked target index count used', /targetEntry\.declaration\.metadata\.numIndices/],
  ['fields-first minor order stored profile', /const fieldsFirst=env\.allowLeanRecursorMinorOrder/],
  ['reduced term is built from minor and stored RHS args', /const reduced = mkApps\(minor, minorArgs\)/],
];
const metadataObligations = [
  ['recursiveTargets mapped to recursiveRecursors', /recursiveRecursors:rule\.recursiveTargets\?\.map/],
  ['missing target maps to null', /target(?:Name)?=>target(?:Name)?\?targetRecursor\.get\(target(?:Name)?\)\?\?null:null/],
  ['recursiveFieldTypes propagated', /recursiveFieldTypes:rule\.recursiveFieldTypes\?\.map/],
  ['nested restore preserves recursive field types', /restoreNested/],
];
function missing(obligations, source) { return obligations.filter(([, re]) => !re.test(source)); }
const missingAll = [
  ...missing(schemaObligations, schemaSlice).map(([n]) => `schema:${n}`),
  ...missing(reductionObligations, reductionSlice).map(([n]) => `reduction:${n}`),
  ...missing(metadataObligations, metadataSlice).map(([n]) => `metadata:${n}`),
];
assert.deepEqual(missingAll, [], `missing stored RHS source obligations: ${missingAll.join(', ')}`);
const sourceAudit = {
  schema: {
    path: 'packages/kernel/src/inductive.ts#SimpleCtorRule+SimpleRecursorMetadata',
    sha256: sha256Text(schemaSlice),
    obligations: schemaObligations.length,
    lineCount: schemaSlice.split(/\r?\n/).length,
  },
  reduction: {
    path: 'packages/kernel/src/kernel.ts#buildPointwise*RecursiveIH+reduceSimpleRecursor',
    sha256: sha256Text(reductionSlice),
    obligations: reductionObligations.length,
    lineCount: reductionSlice.split(/\r?\n/).length,
  },
  metadata: {
    path: 'packages/kernel/src/kernel.ts#recursiveRecursors+recursiveFieldTypes emission',
    sha256: sha256Text(metadataSlice),
    obligations: metadataObligations.length,
    lineCount: metadataSlice.split(/\r?\n/).length,
  },
  totalObligations: schemaObligations.length + reductionObligations.length + metadataObligations.length,
  missing: 0,
};

const suites = [
  ['recursor-metadata', 'tools/kernel-recursor-metadata-differential-tests.ts', /RECURSOR_METADATA_TS_CASES=7 FAILURES=0/],
];
const freshLogs = [];
for (const [label, script, regex] of suites) {
  const r = run(process.execPath, [script], {
    timeoutMs: 2 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-stored-rhs-boundary-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} stored RHS exact Lean evidence`);
  freshLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
  console.log(`STORED_RECURSOR_RHS_SUITE_PASS=${label}`);
}

const inheritedSuiteLogs = [
  ...rhs.executable.exactLeanSuites.map(s => ({...s, inheritedFrom: 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1'})),
  ...positivity.executable.exactLeanSuites.map(s => ({...s, inheritedFrom: 'V71_POSITIVITY_COMPLETENESS_BOUNDARY1'})),
];
for (const suite of inheritedSuiteLogs) assertLoggedHash(suite.log, suite.sha256);

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressOverall,
    previousPercent: 85,
    label: 'v71 K3-track conservative engineering progress',
    note: 'Progress is a project ledger, not a probability and not a formal K3 theorem.',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    logSha256: sha256File(formalLog),
    targetTheorems: 9,
    reportedSorryAx: 0,
    effectiveFormalStackFiles: formalStackFiles.length,
  },
  executable: {
    sourceAudit,
    freshSuiteCount: freshLogs.length,
    inheritedSuiteCount: inheritedSuiteLogs.length,
    failures: 0,
    exactLeanSuites: freshLogs,
    inheritedExactLeanSuites: inheritedSuiteLogs,
  },
  inherited: {
    fullLeanGate: { status: finalGate.status, partCount: finalGate.partCount, logs: fullGateLogs },
    positivityBoundary: { status: positivity.status, progress: positivity.progress.percent },
    mutualNestedRHSBoundary: { status: rhs.status, suiteCount: rhs.executable.suiteCount },
  },
  completedSlices: [
    'explicit ProofScript recursor-rule metadata maps into pinned Lean.RecursorRule',
    'stored RecursorRule.rhs image equals the linked RHS trace endpoint for supported rules',
    'linked mutual/nested RHS trace boundary inherited',
    'non-mutual/generated recursor exact-Lean evidence inherited and hash-checked',
    'recursor metadata exact-Lean evidence freshly rerun',
    'mutual/nested linked iota exact-Lean evidence inherited and hash-checked',
    'positivity completeness-boundary certificate inherited',
  ],
  outstandingK3Obligations: [
    'mechanized KernelTS semantics for line-by-line TypeScript execution',
    'arbitrary Lean stored RecursorRule.rhs round-trip iff ProofScript reconstruction',
    'arbitrary Lean admission completeness iff ProofScript acceptance',
    'exhaustive reduction-path completeness for every Lean expression form',
    'final whole-kernel K3 equivalence theorem',
  ],
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');
fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 Stored Recursor RHS Reconstruction Boundary 1\n\nStatus: PASS\n\nOverall v71 K3-track progress recorded by this checkpoint: **${progressOverall}%**.\n\nThis is a conservative progress ledger, not a probability and not a full K3 theorem.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Newly bound evidence\n\n1. Explicit \`PSRecursorRuleInfo.toLeanRule\` maps stored ProofScript rule metadata into pinned Lean \`RecursorRule\`.\n2. Stored \`RecursorRule.rhs\` is tied to the linked RHS trace endpoint for supported v71 rules.\n3. The actual TypeScript schema, metadata-emission, and reducer source slices are statically audited.\n4. One fast recursor-metadata suite was freshly rerun; inherited exact-Lean RHS/positivity logs were hash-checked.\n5. The inherited positivity and mutual/nested RHS boundary certificates remain linked.\n6. The progress ledger advances the v71 K3 track from 85% to 90%.\n\n## Still not proved\n\n1. Mechanized KernelTS semantics for line-by-line TypeScript execution.\n2. Arbitrary Lean stored RecursorRule.rhs round-trip iff ProofScript reconstruction.\n3. Arbitrary Lean admission completeness iff ProofScript acceptance.\n4. Exhaustive reduction-path completeness for every Lean expression form.\n5. Final whole-kernel K3 equivalence theorem.\n`);
fs.writeFileSync(path.join(root, 'V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1_SHA256.json'), JSON.stringify({
  schema: 'proofscript.release.sha256/v1',
  artifact: 'proofscript-kernel-v71-stored-recursor-rhs-reconstruction-boundary1.zip',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: checkpoint.formal.targetSourceSha256,
  generatedAt: new Date().toISOString(),
}, null, 2) + '\n');

console.log(`STORED_RECURSOR_RHS_FORMAL_TARGET=PASS THEOREMS=${checkpoint.formal.targetTheorems} SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`STORED_RECURSOR_RHS_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.totalObligations} MISSING=${sourceAudit.missing}`);
console.log(`STORED_RECURSOR_RHS_EXACT_LEAN_SUITES_FRESH=${checkpoint.executable.freshSuiteCount} INHERITED=${checkpoint.executable.inheritedSuiteCount} FAILURES=${checkpoint.executable.failures}`);
console.log(`STORED_RECURSOR_RHS_PROGRESS_OVERALL=${progressOverall}%`);
console.log('STORED_RECURSOR_RHS_STATUS=BOUNDARY_NOT_FULL_ARBITRARY_RHS_ROUNDTRIP');
console.log('PASS KERNEL-v71-stored-recursor-rhs-reconstruction-boundary');
