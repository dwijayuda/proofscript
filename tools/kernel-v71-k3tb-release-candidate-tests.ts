import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const progressPercent = 99.5;
const progressBasisPoints = 9950;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71K3TBReleaseCandidate';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71K3TBReleaseCandidate.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_K3TB_RELEASE_CANDIDATE1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_K3TB_RELEASE_CANDIDATE1.md';
const evidence = path.join(root, 'assurance/lean4331/evidence');
const formalRoot = path.join(root, 'assurance/lean4331/formal');

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
  'assurance/lean4331/CHECKPOINT_V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1.json',
  'assurance/lean4331/CHECKPOINT_V71_TRUSTED_BOUNDARY_K3_DECISION1.json',
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

function expectText(relPath, needles) {
  const abs = path.join(root, relPath);
  assert.ok(fs.existsSync(abs), `missing release document ${relPath}`);
  const s = fs.readFileSync(abs, 'utf8');
  for (const needle of needles) {
    assert.ok(s.includes(needle), `${relPath} missing required text: ${needle}`);
  }
  assert.doesNotMatch(s, /fully formal K3 equivalence proof\s*$/i, `${relPath} has ambiguous full-K3 wording`);
  return { path: relPath, sha256: sha256File(abs), bytes: Buffer.byteLength(s) };
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
assert.match(versionOut, /version 4\.33\.1/, 'Lean version');
assert.match(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const versions = readJson('versions.json');
assert.equal(versions.kernelArtifactFormat, 71, 'kernel artifact format');
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion, 'Lean semantic baseline');
assert.equal(versions.leanReleaseCommit, expectedLeanCommit, 'Lean release commit');

console.log('K3TB_RELEASE_CANDIDATE_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-k3tb-release-candidate-formal-'));
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
const formalLog = path.join(evidence, 'v71-k3tb-release-candidate-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal K3-TB release candidate target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'releaseLabel_isK3TrustedBoundary',
  'completedReleaseSlices_count',
  'requiredReleaseDocuments_count',
  'trustedAssumptions_count',
  'remainingFullFormalObligations_count',
  'k3TBEngineeringProgress_basisPoints',
  'progress_notInflatedBeyondTrustedBoundaryDecision',
  'v71K3TBReleaseCandidate_sound',
  'v71K3TBReleaseCandidate_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71K3TBReleaseCandidate.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal K3-TB release candidate unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal K3-TB release candidate has sorry marker');

console.log('K3TB_RELEASE_CANDIDATE_PHASE=inherited-checkpoints');
const inherited = [];
let failures = 0;
for (const relPath of inheritedCheckpointRels) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const checkpoint = readJson(relPath);
  if (checkpoint.status !== 'PASS') failures += 1;
  assert.equal(checkpoint.status, 'PASS', `${relPath} status`);
  assert.equal(checkpoint.formal?.reportedSorryAx ?? 0, 0, `${relPath} formal reportedSorryAx`);
  inherited.push({
    path: relPath,
    checkpoint: checkpoint.checkpoint ?? path.basename(relPath, '.json'),
    status: checkpoint.status,
    progress: checkpoint.progress?.percent ?? null,
    sha256: sha256File(path.join(root, relPath)),
  });
}
assert.equal(inherited.length, 19, 'inherited checkpoint count');
assert.equal(failures, 0, 'inherited checkpoint failures');
const trustedDecision = readJson('assurance/lean4331/CHECKPOINT_V71_TRUSTED_BOUNDARY_K3_DECISION1.json');
assert.equal(trustedDecision.progress.basisPoints, 9950, 'previous trusted-boundary progress');
assert.equal(trustedDecision.decision.selectedEngineeringRoute, 'TRUSTED_INFRASTRUCTURE_RELEASE_CANDIDATE', 'previous route');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');

console.log('K3TB_RELEASE_CANDIDATE_PHASE=release-docs');
const releaseDocs = [
  expectText('RELEASE_CANDIDATE_K3TB.md', ['K3-TB', '99.5%', 'not a fully formal K3 proof', 'Remaining full-formal K3 work']),
  expectText('SECURITY_TRUST_BOUNDARY_K3TB.md', ['K3-TB', 'trusted-boundary K3 candidate', 'does not mean full formal K3', 'Node.js runtime']),
  expectText('README.md', ['v71 K3-TB Release Candidate', '99.5%', 'not a fully formal K3 equivalence proof']),
  expectText('SECURITY.md', ['v71 K3-TB Trust Boundary', 'does not mean full formal K3', 'vendored TypeScript compiler']),
];
const manifest = readJson('RELEASE_MANIFEST_K3TB.json');
assert.equal(manifest.label, 'K3-TB', 'manifest label');
assert.equal(manifest.status, 'TRUSTED_BOUNDARY_RELEASE_CANDIDATE_NOT_FULLY_FORMAL_K3', 'manifest status');
assert.equal(manifest.progress.basisPoints, progressBasisPoints, 'manifest progress bp');
assert.equal(manifest.progress.percent, progressPercent, 'manifest progress percent');
assert.equal(manifest.lean.semanticBaseline, expectedLeanVersion, 'manifest Lean baseline');
assert.equal(manifest.lean.releaseCommit, expectedLeanCommit, 'manifest Lean commit');
assert.equal(manifest.trustedInfrastructureAssumptions.length, 5, 'manifest trusted assumptions');
assert.equal(manifest.fullyFormalRemainingObligations.length, 5, 'manifest remaining obligations');
releaseDocs.push({ path: 'RELEASE_MANIFEST_K3TB.json', sha256: sha256File(path.join(root, 'RELEASE_MANIFEST_K3TB.json')), bytes: fs.statSync(path.join(root, 'RELEASE_MANIFEST_K3TB.json')).size });

console.log('K3TB_RELEASE_CANDIDATE_PHASE=checkpoint');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 50, `expected at least 50 formal files, got ${formalFiles.length}`);
const formalStackHash = sha256Text(formalFiles.map(file => `${rel(file)}:${sha256File(file)}`).join('\n'));
const checkpointLedgerHash = sha256Text(inherited.map(c => `${c.path}:${c.sha256}`).join('\n'));
const releaseDocsHash = sha256Text(releaseDocs.map(d => `${d.path}:${d.sha256}:${d.bytes}`).join('\n'));

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
  'trusted-boundary K3 decision certificate',
  'K3-TB release-candidate package',
];
const trustedInfrastructureAssumptions = manifest.trustedInfrastructureAssumptions;
const fullyFormalRemainingObligations = manifest.fullyFormalRemainingObligations;

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_K3TB_RELEASE_CANDIDATE1',
  release: 'proofscript-kernel-v71-k3tb-release-candidate1',
  label: 'K3-TB',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    previousPercent: 99.5,
    previousBasisPoints: 9950,
    label: 'v71 K3 trusted-boundary engineering progress',
    note: 'K3-TB is a trusted-boundary release candidate; this is not fully formal K3 and intentionally remains below 100%.',
  },
  releaseCandidate: {
    route: 'K3_TB_TRUSTED_BOUNDARY_RELEASE_CANDIDATE',
    canShipAs: ['trusted-boundary K3 release candidate', 'Lean 4.33.1-backed assurance release candidate'],
    mustNotShipAs: ['fully formal K3', 'complete Lean kernel equivalence', 'verified TypeScript/Node runtime semantics'],
    isItStillFar: 'Engineering release candidate is very close; fully formal K3 remains difficult because trusted infrastructure assumptions must be removed or proved.',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    logSha256: sha256File(formalLog),
    targetTheorems: 9,
    reportedSorryAx: 0,
    effectiveFormalStackFiles: formalFiles.length,
    formalStackHash,
  },
  executable: {
    inheritedCheckpointCount: inherited.length,
    inheritedCheckpointFailures: failures,
    finalLeanGatePartCount: fullGate.partCount,
    finalLeanGateFailures: fullGate.failures ?? 0,
    checkpointLedgerHash,
    releaseDocsHash,
  },
  inherited,
  releaseDocuments: releaseDocs,
  completedSlices,
  trustedInfrastructureAssumptions,
  fullyFormalRemainingObligations,
  boundary: 'K3_TB_RELEASE_CANDIDATE_NOT_FULLY_FORMAL_K3',
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');

const md = `# Kernel v71 K3-TB Release Candidate 1\n\nStatus: PASS\n\nProgress: ${progressPercent}% engineering track (${progressBasisPoints} basis points).\n\nThis checkpoint packages v71 as a **K3-TB trusted-boundary release candidate**. It is not full formal K3.\n\n## Evidence\n\n- Formal target: \`${targetModule}\`\n- Formal files: ${formalFiles.length}\n- Reported sorryAx: 0\n- Inherited PASS checkpoints: ${inherited.length}\n- Full Lean gate parts: ${fullGate.partCount}\n- Release docs hash: \`${releaseDocsHash}\`\n- Checkpoint ledger hash: \`${checkpointLedgerHash}\`\n\n## Release label\n\nUse: \`K3-TB\` / trusted-boundary K3 release candidate.\n\nDo not use: full formal K3, complete Lean kernel equivalence, verified TypeScript/Node runtime semantics.\n\n## Remaining full-formal K3 obligations\n\n${fullyFormalRemainingObligations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n`;
fs.writeFileSync(path.join(root, mdRel), md);
const certHash = sha256Text([
  sha256File(path.join(root, checkpointRel)),
  sha256File(path.join(root, mdRel)),
  formalStackHash,
  checkpointLedgerHash,
  releaseDocsHash,
].join('\n'));
fs.writeFileSync(path.join(root, 'V71_K3TB_RELEASE_CANDIDATE1_SHA256.json'), JSON.stringify({
  artifact: 'V71_K3TB_RELEASE_CANDIDATE1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalStackHash,
  checkpointLedgerHash,
  releaseDocsHash,
  combinedSha256: certHash,
}, null, 2) + '\n');

console.log(`K3TB_RELEASE_CANDIDATE_FORMAL_TARGET=PASS THEOREMS=9 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`K3TB_RELEASE_CANDIDATE_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`K3TB_RELEASE_CANDIDATE_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`K3TB_RELEASE_CANDIDATE_RELEASE_DOCS=${releaseDocs.length} HASH=${releaseDocsHash}`);
console.log(`K3TB_RELEASE_CANDIDATE_PROGRESS_OVERALL=${progressPercent}%`);
console.log('K3TB_RELEASE_CANDIDATE_STATUS=TRUSTED_BOUNDARY_RC_NOT_FULLY_FORMAL_K3');
console.log('PASS KERNEL-v71-k3tb-release-candidate');
