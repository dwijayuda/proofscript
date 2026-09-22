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
const previousProgressBasisPoints = 9900;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71TrustedBoundaryK3Decision';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71TrustedBoundaryK3Decision.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_TRUSTED_BOUNDARY_K3_DECISION1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_TRUSTED_BOUNDARY_K3_DECISION1.md';
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

console.log('TRUSTED_BOUNDARY_K3_DECISION_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-trusted-boundary-k3-decision-formal-'));
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
const formalLog = path.join(evidence, 'v71-trusted-boundary-k3-decision-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal trusted-boundary K3 decision target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedTrustedBoundarySlices_count',
  'trustedInfrastructureAssumptions_count',
  'fullyFormalK3RemainingObligations_count',
  'k3EngineeringProgress_basisPoints',
  'selectedEngineeringRoute_isTrustedBoundary',
  'v71TrustedBoundaryK3Decision_sound',
  'v71TrustedBoundaryDecision_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71TrustedBoundaryK3Decision.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal trusted-boundary K3 decision unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal trusted-boundary K3 decision has sorry marker');

console.log('TRUSTED_BOUNDARY_K3_DECISION_PHASE=inherited-checkpoints');
const inherited = [];
let failures = 0;
for (const relPath of inheritedCheckpointRels) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const checkpoint = readJson(relPath);
  const status = checkpoint.status;
  if (status !== 'PASS') failures += 1;
  assert.equal(status, 'PASS', `${relPath} status`);
  assert.equal(checkpoint.formal?.reportedSorryAx ?? 0, 0, `${relPath} formal reportedSorryAx`);
  inherited.push({
    path: relPath,
    checkpoint: checkpoint.checkpoint ?? path.basename(relPath, '.json'),
    status,
    progress: checkpoint.progress?.percent ?? null,
    sha256: sha256File(path.join(root, relPath)),
  });
}
assert.equal(inherited.length, 18, 'inherited checkpoint count');
assert.equal(failures, 0, 'inherited checkpoint failures');
const conditional = readJson('assurance/lean4331/CHECKPOINT_V71_CONDITIONAL_K3_THEOREM_SCAFFOLD1.json');
assert.equal(conditional.progress.percent, 99, 'conditional K3 scaffold previous progress');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');

console.log('TRUSTED_BOUNDARY_K3_DECISION_PHASE=decision-ledger');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 49, `expected at least 49 formal files, got ${formalFiles.length}`);
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
  'trusted-boundary K3 decision certificate',
];
const trustedInfrastructureAssumptions = [
  'Lean 4.33.1 kernel is the pinned reference implementation',
  'Node v22 runtime correctly executes audited JavaScript for the kernel subset',
  'vendored TypeScript 5.8.3 compiler preserves the audited KernelTS subset',
  'offline npm dependency set is fixed and unchanged during certification',
  'host filesystem/process environment is benign for gate execution',
];
const fullyFormalRemainingObligations = [
  'verified TypeScript compiler or Lean extraction path',
  'full ECMAScript or Node runtime semantics',
  'arbitrary Lean acceptance completeness iff ProofScript acceptance',
  'exhaustive Lean reduction-path completeness',
  'instantiate conditional K3 theorem without trusted runtime assumptions',
];
assert.equal(completedSlices.length, 19, 'completed trusted-boundary slice count');
assert.equal(trustedInfrastructureAssumptions.length, 5, 'trusted infrastructure assumption count');
assert.equal(fullyFormalRemainingObligations.length, 5, 'fully formal obligation count');

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_TRUSTED_BOUNDARY_K3_DECISION1',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    previousPercent: 99,
    previousBasisPoints: previousProgressBasisPoints,
    label: 'v71 K3-track conservative engineering progress',
    note: '99.5% is engineering-track progress under explicit trusted infrastructure assumptions; it is not fully formal K3.',
  },
  decision: {
    selectedEngineeringRoute: 'TRUSTED_INFRASTRUCTURE_RELEASE_CANDIDATE',
    fullyFormalRouteStatus: 'OPEN_LAST_MILE_RESEARCH_AND_VERIFICATION',
    recommendedNextStep: 'ship as trusted-boundary release candidate only if SECURITY/README clearly list Node, ECMAScript, TypeScript compiler, npm, host OS, and Lean reference assumptions',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    logSha256: sha256File(formalLog),
    targetTheorems: 7,
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
  trustedInfrastructureAssumptions,
  fullyFormalRemainingObligations,
  boundary: 'TRUSTED_INFRASTRUCTURE_DECISION_NOT_FULLY_FORMAL_K3',
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);

const md = `# Kernel v71 Trusted-Boundary K3 Decision Certificate 1\n\nStatus: **PASS**\n\nOverall v71 K3-track engineering progress: **99.5%**.\n\nThis checkpoint deliberately does **not** claim fully formal K3. It records the decision point between two routes:\n\n1. **Trusted-boundary release candidate** — acceptable as an engineering assurance release if Node/ECMAScript, the vendored TypeScript compiler, npm/offline dependencies, host process/filesystem behavior, and pinned Lean 4.33.1 are explicitly trusted.\n2. **Fully formal K3** — still requires verified extraction/runtime semantics and arbitrary Lean acceptance/reduction completeness.\n\n## Formal Target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Lean: ${versionOut.trim()}\n- Formal files: ${formalFiles.length}\n- Reported sorryAx: 0\n\n## Trusted Infrastructure Assumptions\n\n${trustedInfrastructureAssumptions.map(x => `- ${x}`).join('\n')}\n\n## Fully Formal Route Still Requires\n\n${fullyFormalRemainingObligations.map(x => `- ${x}`).join('\n')}\n\n## Fresh Gate Output\n\n\`\`\`text\nTRUSTED_BOUNDARY_K3_DECISION_FORMAL_TARGET=PASS THEOREMS=7 SORRYAX=0 FORMAL_FILES=${formalFiles.length}\nTRUSTED_BOUNDARY_K3_DECISION_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}\nTRUSTED_BOUNDARY_K3_DECISION_FULL_LEAN_GATE=6_PARTS_PASS\nTRUSTED_BOUNDARY_K3_DECISION_PROGRESS_OVERALL=99.5%\nTRUSTED_BOUNDARY_K3_DECISION_STATUS=TRUSTED_INFRASTRUCTURE_RELEASE_CANDIDATE_NOT_FULLY_FORMAL_K3\nPASS KERNEL-v71-trusted-boundary-k3-decision\n\`\`\`\n`;
fs.writeFileSync(path.join(root, mdRel), md);

const digest = {
  artifact: 'V71_TRUSTED_BOUNDARY_K3_DECISION1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalLog: rel(formalLog),
  formalLogSha256: sha256File(formalLog),
  formalStackHash,
  checkpointLedgerHash,
};
fs.writeFileSync(path.join(root, 'V71_TRUSTED_BOUNDARY_K3_DECISION1_SHA256.json'), `${JSON.stringify(digest, null, 2)}\n`);

console.log(`TRUSTED_BOUNDARY_K3_DECISION_FORMAL_TARGET=PASS THEOREMS=7 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`TRUSTED_BOUNDARY_K3_DECISION_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log('TRUSTED_BOUNDARY_K3_DECISION_FULL_LEAN_GATE=6_PARTS_PASS');
console.log('TRUSTED_BOUNDARY_K3_DECISION_PROGRESS_OVERALL=99.5%');
console.log('TRUSTED_BOUNDARY_K3_DECISION_STATUS=TRUSTED_INFRASTRUCTURE_RELEASE_CANDIDATE_NOT_FULLY_FORMAL_K3');
console.log('PASS KERNEL-v71-trusted-boundary-k3-decision');
