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
const targetModule = 'ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveFormedEnvironmentGeneralization.lean';
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const lean = process.env.PROOFSCRIPT_LEAN_BIN;

if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 formed environment generalization certificate tests');
  process.exit(1);
}

fs.mkdirSync(evidence, { recursive: true });

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
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
  assert.ok(fs.existsSync(logPath), `missing inherited evidence log ${logRel}`);
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

// Compile the combined formal target in a fresh Lake project, so stale .olean
// artifacts in the repository cannot mask import or axiom-report failures.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-formed-env-generalization-formal-'));
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
const formalLog = path.join(evidence, 'v71-formed-env-generalization-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal formed-env generalization target did not compile; see ${rel(formalLog)}\n${formalText}`);
expect(formalText, /Build completed successfully \((\d+) jobs\)/, 'formal formed-env generalization build');
for (const name of [
  'PSFormedInductivePackage.install_preserves',
  'PSFormedInductivePackage.recursorBoundary_sound',
  'installFormedPackages_preserves',
  'directEnvSound_afterFormedPackages',
  'deltaEnvExact_afterFormedPackages',
  'typeLookup_afterFormedPackages_exact',
  'unfoldLookup_afterFormedPackages_exact',
  'recursorBoundary_afterFormedPackages',
  'formedInductiveWholeEnvironment_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal formed-env generalization unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal formed-env generalization has sorry marker');

const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.leanSemanticBaseline, expectedLeanVersion, 'full Lean gate version');
assert.equal(fullGate.leanReleaseCommit, expectedLeanCommit, 'full Lean gate commit');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const fullGateLogs = fullGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertLoggedHash(part.log, part.sha256);
});

const nonMutual = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NONMUTUAL_DECL_ENV_CERT1.json', 'V71_NONMUTUAL_DECL_ENV_CERT1');
assert.equal(nonMutual.formal.reportedSorryAx, 0, 'non-mutual sorryAx');
assert.equal(nonMutual.executable.fullLeanGateParts, 6, 'non-mutual inherited full Lean gate parts');
assert.equal(nonMutual.executable.localMergedComponents, 2, 'non-mutual local merged components');
for (const logRel of nonMutual.formal.sourceEvidence) assertLoggedHash(logRel, undefined);
for (const logRel of nonMutual.executable.sourceEvidence.filter(x => x.endsWith('.out'))) assertLoggedHash(logRel, undefined);

const trace = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json', 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1');
assert.equal(trace.formal.reportedSorryAx, 0, 'TS classifier trace sorryAx');
assert.equal(trace.executable.failures, 0, 'TS classifier trace failures');
assertLoggedHash(trace.formal.log, undefined);
assertLoggedHash(trace.executable.log, undefined);

const mutual = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json', 'V71_MUTUAL_FORMED_ENV_CERT1');
assert.equal(mutual.formal.reportedSorryAx, 0, 'mutual sorryAx');
assert.equal(mutual.executable.failures, 0, 'mutual executable failures');
assert.equal(mutual.executable.suiteCount, 5, 'mutual suite count');
assertLoggedHash(mutual.formal.log, undefined);
const mutualLogs = mutual.executable.exactLeanMutualSuites.map(s => assertLoggedHash(s.log, s.sha256));

const nested = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_NESTED_FORMED_ENV_CERT1.json', 'V71_NESTED_FORMED_ENV_CERT1');
assert.equal(nested.formal.reportedSorryAx, 0, 'nested sorryAx');
assert.equal(nested.executable.failures, 0, 'nested executable failures');
assert.equal(nested.executable.suiteCount, 9, 'nested suite count');
assertLoggedHash(nested.formal.log, undefined);
const nestedLogs = nested.executable.exactLeanNestedSuites.map(s => assertLoggedHash(s.log, s.sha256));

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_FORMED_ENV_GENERALIZATION_CERT1',
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
    theoremBoundary: 'mixed formed non-mutual/mutual/nested package installation preserves Core→Lean environment translation, direct-typing lookup, ordinary-delta lookup, and in-scope non-mutual generated-recursors boundary',
  },
  inherited: {
    fullLeanGate: { status: 'PASS', parts: fullGate.partCount, logs: fullGateLogs },
    nonMutualDeclarationEnvironment: { status: 'PASS', inheritedModules: nonMutual.formal.inheritedModules, fullLeanGateParts: nonMutual.executable.fullLeanGateParts, localMergedComponents: nonMutual.executable.localMergedComponents },
    tsClassifierImplementationTrace: { status: 'PASS', effectiveStack: trace.formal.effectiveModulesOrContractsAfterTrace },
    mutualFormedEnvironment: { status: 'PASS', suites: mutual.executable.suiteCount, logs: mutualLogs },
    nestedFormedEnvironment: { status: 'PASS', suites: nested.executable.suiteCount, logs: nestedLogs },
  },
  scope: {
    claim: 'single mixed formed-inductive environment preservation theorem plus durable inherited exact Lean-backed evidence for non-mutual, mutual and nested formed packages',
    notClaimed: {
      fullMutualAdmissionCompleteness: true,
      fullNestedPreprocessingCompleteness: true,
      fullMutualNestedPositivityTheorem: true,
      formalMutualNestedRecursorRhsCorrespondence: true,
      fullK3WholeKernelEquivalence: true,
    },
  },
  status: 'PASS',
};
const checkpointPath = path.join(assurance, 'CHECKPOINT_V71_FORMED_ENV_GENERALIZATION_CERT1.json');
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdPath = path.join(assurance, 'KERNEL_V71_ASSURANCE_CHECKPOINT_FORMED_ENV_GENERALIZATION_CERT1.md');
fs.writeFileSync(mdPath, `# ProofScript Kernel v71 Formed-Inductive Environment Generalization Certificate\n\n` +
  `Status: **PASS**\n\n` +
  `Lean: \`${versionOut.trim()}\`\n\n` +
  `This checkpoint adds \`${targetRel}\`, a mixed formed-inductive package theorem.  It generalizes the previous non-mutual, mutual and nested formed-environment certificates into one ordered package installer and proves that mixed installation commutes with Core→Lean environment translation.\n\n` +
  `## Formal boundary\n\n` +
  `The theorem preserves direct constant-typing lookup, ordinary-delta lookup and the in-scope non-mutual generated-recursor boundary.  Mutual and nested positivity/admission completeness and mutual/nested recursor RHS correspondence remain later K3 obligations.\n\n` +
  `## Evidence\n\n` +
  `- Formal Lean target: \`${rel(formalLog)}\`\n` +
  `- Full v71 Lean gate parts: ${fullGate.partCount}/6 pass\n` +
  `- Mutual exact-Lean suites inherited: ${mutual.executable.suiteCount}\n` +
  `- Nested exact-Lean suites inherited: ${nested.executable.suiteCount}\n` +
  `- Checkpoint JSON: \`${rel(checkpointPath)}\`\n\n` +
  `## Claim boundary\n\n` +
  `This is not a final K3 whole-kernel equivalence theorem.  It closes the mixed formed O-DECL environment-preservation layer before the remaining recursor RHS and full admission/completeness work.\n`);

const shaRecord = {
  schema: 'proofscript.artifact.sha256/v1',
  artifact: 'V71_FORMED_ENV_GENERALIZATION_CERT1',
  generatedAtUtc: new Date().toISOString(),
  files: {
    [targetRel]: sha256File(path.join(root, targetRel)),
    [rel(formalLog)]: sha256File(formalLog),
    [rel(checkpointPath)]: sha256File(checkpointPath),
    [rel(mdPath)]: sha256File(mdPath),
    'docs/superpowers/plans/2026-09-10-formed-inductive-environment-generalization.md': sha256File(path.join(root, 'docs/superpowers/plans/2026-09-10-formed-inductive-environment-generalization.md')),
    ...Object.fromEntries(fullGateLogs.map(x => [x.path, x.sha256])),
    ...Object.fromEntries(mutualLogs.map(x => [x.path, x.sha256])),
    ...Object.fromEntries(nestedLogs.map(x => [x.path, x.sha256])),
  },
};
const shaPath = path.join(root, 'V71_FORMED_ENV_GENERALIZATION_CERT1_SHA256.json');
fs.writeFileSync(shaPath, JSON.stringify(shaRecord, null, 2) + '\n');

console.log(`FORMED_ENV_GENERALIZATION_FORMAL_TARGET=PASS THEOREMS=9 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`FORMED_ENV_GENERALIZATION_INHERITED_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`FORMED_ENV_GENERALIZATION_INHERITED_MUTUAL_SUITES=${mutual.executable.suiteCount}`);
console.log(`FORMED_ENV_GENERALIZATION_INHERITED_NESTED_SUITES=${nested.executable.suiteCount}`);
console.log('FORMED_ENV_GENERALIZATION_BOUNDARY=MIXED_FORMED_O_DECL_NOT_FULL_K3');
console.log('PASS KERNEL-v71-formed-env-generalization-certificate');
