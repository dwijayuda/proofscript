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
const targetModule = 'ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/RecursorMutualNestedRHSCorrespondence.lean';
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const lean = process.env.PROOFSCRIPT_LEAN_BIN;

if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 mutual+nested recursor RHS certificate tests');
  process.exit(1);
}

fs.mkdirSync(evidence, { recursive: true });

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function sha256Text(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function rel(p) {
  return path.relative(root, p).replaceAll(path.sep, '/');
}
function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 300_000,
    maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}
function text(r) {
  return `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
}
function assertCleanRun(r, label) {
  assert.equal(r.status, 0, `${label} failed\n${text(r)}`);
  return text(r);
}
function expect(haystack, needle, label) {
  assert.match(haystack, needle, `${label}: missing ${needle}`);
}
function assertCheckpointPass(relPath, expectedCheckpoint) {
  const checkpoint = readJson(relPath);
  assert.equal(checkpoint.status, 'PASS', `${relPath} status`);
  if (expectedCheckpoint) assert.equal(checkpoint.checkpoint, expectedCheckpoint, `${relPath} checkpoint`);
  assert.equal(checkpoint.coreFormat, 71, `${relPath} coreFormat`);
  if (checkpoint.lean) {
    assert.equal(checkpoint.lean.version, expectedLeanVersion, `${relPath} Lean version`);
    assert.equal(checkpoint.lean.commit, expectedLeanCommit, `${relPath} Lean commit`);
  }
  return checkpoint;
}
function assertLoggedHash(logRel, expectedSha) {
  const logPath = path.join(root, logRel);
  assert.ok(fs.existsSync(logPath), `missing evidence log ${logRel}`);
  if (expectedSha) assert.equal(sha256File(logPath), expectedSha, `${logRel} sha256`);
  return { path: logRel, sha256: sha256File(logPath), bytes: fs.statSync(logPath).size };
}

assert.ok(fs.existsSync(path.join(root, targetRel)), `missing ${targetRel}`);

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
expect(versionOut, /version 4\.33\.1/, 'Lean version');
expect(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const versions = readJson('versions.json');
assert.equal(versions.kernelArtifactFormat, 71);
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion);
assert.equal(versions.leanReleaseCommit, expectedLeanCommit);

// Compile the formal RHS correspondence target in a fresh Lake project, so no
// stale .olean from the working tree can satisfy this certificate.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-mutual-nested-rhs-formal-'));
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
const formalLog = path.join(evidence, 'v71-mutual-nested-recursor-rhs-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal mutual+nested recursor RHS target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'rhsStep_toLean',
  'rhsTrace_toLean',
  'rhsTrace_eval_toLean',
  'linkedRHS_toLean',
  'mutualRHSBoundary_sound',
  'nestedRHSBoundary_sound',
  'mixedRHSBoundary_sound',
  'allMixedRHSBoundaries_sound',
  'formedEnvironmentWithRHS_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal mutual+nested recursor RHS unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal mutual+nested recursor RHS has sorry marker');

// Static audit of the actual reduction slice that builds mutual/nested RHS/IH
// applications. This is intentionally lexical: it detects accidental removal
// of the trusted branches that the formal trace abstracts.
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
const helperStart = kernelSource.indexOf('function buildPointwiseRecursiveIH(');
const reducerEnd = kernelSource.indexOf('function reduceQuotientRecursor(', helperStart);
assert.ok(helperStart >= 0 && reducerEnd > helperStart, 'could not locate recursor RHS implementation slice');
const rhsSlice = kernelSource.slice(helperStart, reducerEnd);
const obligations = [
  ['direct pointwise IH builder', /function buildPointwiseRecursiveIH/],
  ['indexed pointwise IH builder', /function buildPointwiseIndexedRecursiveIH/],
  ['mutual pointwise IH builder', /function buildPointwiseMutualRecursiveIH/],
  ['linked indexed helper IH builder', /function buildPointwiseLinkedIndexedRecursiveIH/],
  ['linked helper IH builder', /function buildPointwiseLinkedRecursiveIH/],
  ['recursive prefix reuses params motives minors', /const recursivePrefix = args\.slice\(0, indicesStart\)/],
  ['explicit nested target recursor branch', /const explicitTargetRecursor=rule\.recursiveRecursors\?\.\[i\]\?\?null/],
  ['nested helper metadata lookup', /targetEntry\.declaration\.metadata\.numIndices/],
  ['linked indexed recursive IH call', /buildPointwiseLinkedIndexedRecursiveIH/],
  ['linked non-indexed recursive IH call', /buildPointwiseLinkedRecursiveIH/],
  ['mutual target branch', /if\(metadata\.mutual&&mutualTarget\)/],
  ['mutual recursor name lookup', /metadata\.mutual\.recursors\[targetRecIndex\]/],
  ['mutual index count lookup', /metadata\.mutual\.indexCounts\?\.\[targetRecIndex\]\?\?0/],
  ['fields-first minor order flag', /const fieldsFirst=env\.allowLeanRecursorMinorOrder/],
  ['minor receives fields before IHs', /if\(fieldsFirst\)minorArgs\.push\(\.\.\.fields\)/],
  ['IHs appended after fields', /if\(fieldsFirst\)minorArgs\.push\(\.\.\.recursiveIHArgs\)/],
  ['selected global minor index', /const minorIndex = rule\.minorIndex \?\? ruleIndex/],
  ['reduction appends rest arguments', /const rest = args\.slice\(majorPos \+ 1\)/],
  ['reduced term is minor application', /const reduced = mkApps\(minor, minorArgs\)/],
];
const missingObligations = obligations.filter(([, re]) => !re.test(rhsSlice));
assert.deepEqual(missingObligations, [], `missing recursor RHS source obligations: ${missingObligations.map(([x]) => x).join(', ')}`);
const sourceAudit = {
  path: 'packages/kernel/src/kernel.ts#buildPointwise*RecursiveIH+reduceSimpleRecursor',
  sha256: sha256Text(rhsSlice),
  obligations: obligations.length,
  missing: missingObligations.length,
};

const suites = [
  ['minor-order', 'tools/kernel-recursor-minor-order-tests.ts', /fields-first recursive minor ordering.*exact Lean observations passed.*exact Lean differential/],
  ['mutual-nested-generalization', 'tools/kernel-mutual-nested-generalization-tests.ts', /bounded mutual\+nested preprocessing.*linked helper recursors\/iota.*exact Lean observations passed.*exact Lean differential/],
  ['mutual-nested-deeper', 'tools/kernel-mutual-nested-deeper-tests.ts', /bounded arbitrary-depth mutual\+nested helper chains.*linked iota.*exact Lean observations passed.*exact Lean differential/],
  ['mutual-nested-deeper-indexed-containers', 'tools/kernel-mutual-nested-deeper-indexed-containers-tests.ts', /deep indexed Prop containers.*linked iota.*exact Lean observations passed.*exact Lean differential/],
  ['mutual-nested-final-generalization-audit', 'tools/kernel-mutual-nested-final-generalization-audit-tests.ts', /final mutual\/nested .*linked Type iota.*exact Lean observations passed.*exact Lean differential/],
];
const suiteLogs = [];
for (const [label, script, regex] of suites) {
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-mutual-nested-recursor-rhs-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} exact Lean RHS evidence`);
  suiteLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
  console.log(`RECURSOR_RHS_SUITE_DONE ${label}`);
}

const generalization = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_FORMED_ENV_GENERALIZATION_CERT1.json', 'V71_FORMED_ENV_GENERALIZATION_CERT1');
assert.equal(generalization.formal.reportedSorryAx, 0, 'formed-env generalization sorryAx');
assert.equal(generalization.inherited.fullLeanGate.status, 'PASS', 'inherited full Lean gate status');
assertLoggedHash(generalization.formal.log, undefined);

const mutual = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json', 'V71_MUTUAL_FORMED_ENV_CERT1');
assert.equal(mutual.executable.failures, 0, 'mutual formed-env executable failures');
const nested = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NESTED_FORMED_ENV_CERT1.json', 'V71_NESTED_FORMED_ENV_CERT1');
assert.equal(nested.executable.failures, 0, 'nested formed-env executable failures');

const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
assert.equal(fullGate.leanSemanticBaseline, expectedLeanVersion, 'full Lean gate version');
assert.equal(fullGate.leanReleaseCommit, expectedLeanCommit, 'full Lean gate commit');
const fullGateLogs = fullGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertLoggedHash(part.log, part.sha256);
});

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  formal: {
    newTarget: targetModule,
    targetSource: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    targetTheorems: 9,
    reportedSorryAx: 0,
    log: rel(formalLog),
    totalFormalLeanFiles: formalStackFiles.length,
    theoremBoundary: 'linked mutual/nested recursor RHS traces preserve Core→Lean endpoints across direct and indexed iota steps; not full arbitrary Lean stored RecursorRule.rhs reconstruction',
  },
  executable: {
    sourceAudit,
    exactLeanSuites: suiteLogs,
    suiteCount: suiteLogs.length,
    failures: 0,
  },
  inherited: {
    formedEnvironmentGeneralization: { status: 'PASS', log: generalization.formal.log, totalFormalLeanFiles: generalization.formal.totalFormalLeanFiles },
    mutualFormedEnvironment: { status: 'PASS', suites: mutual.executable.suiteCount },
    nestedFormedEnvironment: { status: 'PASS', suites: nested.executable.suiteCount },
    fullLeanGate: { status: 'PASS', parts: fullGate.partCount, logs: fullGateLogs },
  },
  scope: {
    proves: [
      'Core→Lean translation of direct/indexed RHS iota steps',
      'Core→Lean translation of linked RHS traces used by mutual/nested helper recursor paths',
      'binding of RHS trace evidence to the mixed formed-inductive environment certificate',
      'fresh exact-Lean executable evidence for fields-first, mutual+nested, deeper, indexed-container, and final-generalization linked iota paths',
    ],
    doesNotProveYet: [
      'full K3 whole-kernel equivalence',
      'complete arbitrary mutual/nested admission and positivity completeness',
      'full reconstruction of every Lean stored RecursorRule.rhs object',
      'unbounded mutual+nested recursor RHS correspondence outside the declared v71 supported slices',
    ],
  },
  status: 'PASS',
};

const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1.json';
const checkpointPath = path.join(root, checkpointRel);
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_MUTUAL_NESTED_RECURSOR_RHS_CERT1.md';
fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 Mutual/Nested Recursor RHS Certificate 1\n\nStatus: PASS\n\nThis checkpoint adds a conservative linked-RHS correspondence layer for mutual and nested recursor paths.\n\n## Formal target\n\n- ${targetModule}\n- Source: ${targetRel}\n- Source SHA-256: ${checkpoint.formal.targetSourceSha256}\n- Theorems checked: ${checkpoint.formal.targetTheorems}\n- sorryAx count: 0\n\n## Executable evidence\n\n- Source audit obligations: ${sourceAudit.obligations}\n- Source audit missing obligations: ${sourceAudit.missing}\n- Exact Lean suites: ${suiteLogs.length}\n\n## Boundary\n\nThis proves linked direct/indexed RHS trace translation for the current v71 supported mutual/nested slices. It does not yet prove full K3 whole-kernel equivalence or arbitrary Lean RecursorRule.rhs reconstruction.\n`);

const shaManifest = {
  checkpoint: 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1',
  files: [
    targetRel,
    checkpointRel,
    mdRel,
    rel(formalLog),
    ...suiteLogs.map(s => s.log),
  ].map(file => ({ file, sha256: sha256File(path.join(root, file)) })),
};
fs.writeFileSync(path.join(root, 'V71_MUTUAL_NESTED_RECURSOR_RHS_CERT1_SHA256.json'), JSON.stringify(shaManifest, null, 2) + '\n');

console.log(`MUTUAL_NESTED_RHS_FORMAL_TARGET=PASS THEOREMS=9 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`MUTUAL_NESTED_RHS_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.obligations} MISSING=0`);
console.log(`MUTUAL_NESTED_RHS_EXACT_LEAN_SUITES=${suiteLogs.length} FAILURES=0`);
console.log('MUTUAL_NESTED_RHS_BOUNDARY=LINKED_TRACE_NOT_FULL_STORED_RHS_RECONSTRUCTION');
console.log('PASS KERNEL-v71-mutual-nested-recursor-rhs-certificate');
