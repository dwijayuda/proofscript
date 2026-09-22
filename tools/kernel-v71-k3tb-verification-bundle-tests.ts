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
const targetModule = 'ProofScriptKernelEquivalence.KernelV71K3TBVerificationBundle';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71K3TBVerificationBundle.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_K3TB_VERIFICATION_BUNDLE1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_K3TB_VERIFICATION_BUNDLE1.md';
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
  'assurance/lean4331/CHECKPOINT_V71_K3TB_RELEASE_CANDIDATE1.json',
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
  assert.ok(fs.existsSync(abs), `missing verification document ${relPath}`);
  const s = fs.readFileSync(abs, 'utf8');
  for (const needle of needles) {
    assert.ok(s.includes(needle), `${relPath} missing required text: ${needle}`);
  }
  assert.doesNotMatch(s, /fully formal K3\s*$/i, `${relPath} has ambiguous full-K3 wording`);
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

const pkg = readJson('package.json');
assert.ok(pkg.scripts['verify:k3tb'].includes('node tools/kernel-v71-k3tb-one-command-verify.ts'), 'verify:k3tb script');
assert.ok(pkg.scripts['test:v71:k3tb-verification-bundle'].includes('node tools/kernel-v71-k3tb-verification-bundle-tests.ts'), 'verification bundle script');

console.log('K3TB_VERIFICATION_BUNDLE_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-k3tb-verification-bundle-formal-'));
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
const formalLog = path.join(evidence, 'v71-k3tb-verification-bundle-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal K3-TB verification bundle target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'verificationBundleAssets_count',
  'verificationPhases_count',
  'verificationTrustedBoundary_count',
  'verificationRemainingFullFormalObligations_count',
  'k3TBVerificationProgress_basisPoints',
  'verificationBundleReleaseLabel_isK3TB',
  'v71K3TBVerificationBundle_sound',
  'v71K3TBVerificationBundle_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71K3TBVerificationBundle.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal K3-TB verification bundle unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal K3-TB verification bundle has sorry marker');

console.log('K3TB_VERIFICATION_BUNDLE_PHASE=inherited-checkpoints');
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
assert.equal(inherited.length, 20, 'inherited checkpoint count');
assert.equal(failures, 0, 'inherited checkpoint failures');
const previous = readJson('assurance/lean4331/CHECKPOINT_V71_K3TB_RELEASE_CANDIDATE1.json');
assert.equal(previous.progress.basisPoints, progressBasisPoints, 'previous release progress');
assert.equal(previous.label, 'K3-TB', 'previous release label');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');

console.log('K3TB_VERIFICATION_BUNDLE_PHASE=docs-and-verifier');
const verificationDocs = [
  expectText('VERIFY_K3TB.md', ['One-command verification', '99.5%', 'does not mean fully formal K3', 'PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb']),
  expectText('RELEASE_VERIFICATION_K3TB.json', ['REPRODUCIBLE_VERIFICATION_BUNDLE_NOT_FULLY_FORMAL_K3', 'k3TBReleaseCandidateGate', 'verificationBundleGate']),
  expectText('RELEASE_CANDIDATE_K3TB.md', ['K3-TB', '99.5%', 'not a fully formal K3 proof']),
  expectText('SECURITY_TRUST_BOUNDARY_K3TB.md', ['trusted-boundary K3 candidate', 'Node.js runtime']),
];
const verificationManifest = readJson('RELEASE_VERIFICATION_K3TB.json');
assert.equal(verificationManifest.label, 'K3-TB', 'verification manifest label');
assert.equal(verificationManifest.status, 'REPRODUCIBLE_VERIFICATION_BUNDLE_NOT_FULLY_FORMAL_K3', 'verification manifest status');
assert.equal(verificationManifest.progress.basisPoints, progressBasisPoints, 'verification manifest progress bp');
assert.equal(verificationManifest.progress.percent, progressPercent, 'verification manifest progress percent');
assert.equal(verificationManifest.verificationPhases.length, 5, 'verification phase count');
assert.equal(verificationManifest.trustedBoundaryPreserved, true, 'trusted boundary preserved');
assert.equal(verificationManifest.notFullyFormalK3, true, 'not full formal K3 flag');

const verifierRel = 'tools/kernel-v71-k3tb-one-command-verify.ts';
const verifierAbs = path.join(root, verifierRel);
assert.ok(fs.existsSync(verifierAbs), 'missing one-command verifier');
const verifierSrc = fs.readFileSync(verifierAbs, 'utf8');
for (const needle of [
  'K3TB_ONE_COMMAND_VERIFY_STATUS=PASS',
  "run('build', 'npm', ['run', 'build'])",
  "run('local-merged', 'npm', ['run', 'test:v71:local-merged'])",
  "run('lean-gate-finalize', 'npm', ['run', 'test:v71:lean-gate:finalize']",
  "run('k3tb-release-candidate', 'npm', ['run', 'test:v71:k3tb-release-candidate']",
  "run('k3tb-verification-bundle', 'npm', ['run', 'test:v71:k3tb-verification-bundle']",
  'TRUSTED_BOUNDARY_RC_NOT_FULLY_FORMAL_K3',
]) {
  assert.ok(verifierSrc.includes(needle), `one-command verifier missing ${needle}`);
}
verificationDocs.push({ path: verifierRel, sha256: sha256File(verifierAbs), bytes: fs.statSync(verifierAbs).size });

console.log('K3TB_VERIFICATION_BUNDLE_PHASE=checkpoint');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 51, `expected at least 51 formal files, got ${formalFiles.length}`);
const formalStackHash = sha256Text(formalFiles.map(file => `${rel(file)}:${sha256File(file)}`).join('\n'));
const inheritedLedgerHash = sha256Text(inherited.map(c => `${c.path}:${c.sha256}`).join('\n'));
const verificationDocsHash = sha256Text(verificationDocs.map(d => `${d.path}:${d.sha256}:${d.bytes}`).join('\n'));

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_K3TB_VERIFICATION_BUNDLE1',
  release: 'proofscript-kernel-v71-k3tb-verification-bundle1',
  inherits: 'proofscript-kernel-v71-k3tb-release-candidate1',
  label: 'K3-TB',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    note: 'Progress intentionally unchanged from K3-TB RC1; this is reproducibility packaging, not final formal K3.',
  },
  formal: {
    targetModule,
    targetSource: targetRel,
    evidenceLog: rel(formalLog),
    theoremCount: 8,
    reportedSorryAx: 0,
    formalFileCount: formalFiles.length,
    formalStackSha256: formalStackHash,
  },
  inherited: {
    checkpointCount: inherited.length,
    failures,
    fullLeanGateParts: fullGate.partCount,
    fullLeanGateFailures: fullGate.failures ?? 0,
    checkpoints: inherited,
    inheritedLedgerSha256: inheritedLedgerHash,
  },
  verification: {
    oneCommandVerifier: verifierRel,
    scripts: {
      verify: 'verify:k3tb',
      gate: 'test:v71:k3tb-verification-bundle',
    },
    phaseCount: verificationManifest.verificationPhases.length,
    docs: verificationDocs,
    docsSha256: verificationDocsHash,
  },
  trustBoundary: {
    preserved: true,
    notFullyFormalK3: true,
    status: 'REPRODUCIBLE_VERIFICATION_BUNDLE_NOT_FULLY_FORMAL_K3',
    remainingObligations: verificationManifest.requiredCommands ? [
      'verified TypeScript compiler or Lean extraction path',
      'full ECMAScript or Node runtime semantics',
      'arbitrary Lean acceptance completeness iff ProofScript acceptance',
      'exhaustive all-Lean reduction-path completeness',
      'instantiate conditional K3 theorem without trusted runtime assumptions',
    ] : [],
  },
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'V71_K3TB_VERIFICATION_BUNDLE1_SHA256.json'), JSON.stringify({
  schema: 'proofscript.sha256/v1',
  checkpoint: checkpoint.checkpoint,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalStackSha256: formalStackHash,
  inheritedLedgerSha256: inheritedLedgerHash,
  verificationDocsSha256: verificationDocsHash,
}, null, 2) + '\n');

const md = `# Kernel v71 K3-TB Verification Bundle Checkpoint 1\n\n` +
  `**Status:** PASS  \n` +
  `**Progress:** 99.5% engineering track, unchanged from K3-TB RC1  \n` +
  `**Boundary:** reproducible verification bundle, not fully formal K3  \n\n` +
  `## What this adds\n\n` +
  `- One-command verifier: \`npm run verify:k3tb\`.\n` +
  `- Reviewer guide: \`VERIFY_K3TB.md\`.\n` +
  `- Verification manifest: \`RELEASE_VERIFICATION_K3TB.json\`.\n` +
  `- Lean-checked verification-bundle envelope with no \`sorryAx\`.\n` +
  `- 20 inherited PASS checkpoints, including the K3-TB release candidate.\n\n` +
  `## Verification result\n\n` +
  `\`\`\`text\n` +
  `K3TB_VERIFICATION_BUNDLE_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalFiles.length}\n` +
  `K3TB_VERIFICATION_BUNDLE_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}\n` +
  `K3TB_VERIFICATION_BUNDLE_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS\n` +
  `K3TB_VERIFICATION_BUNDLE_PROGRESS_OVERALL=99.5%\n` +
  `K3TB_VERIFICATION_BUNDLE_STATUS=REPRODUCIBLE_VERIFICATION_BUNDLE_NOT_FULLY_FORMAL_K3\n` +
  `PASS KERNEL-v71-k3tb-verification-bundle\n` +
  `\`\`\`\n\n` +
  `## Full-formal K3 still remains\n\n` +
  `This package improves reproducibility. It does not verify Node, ECMAScript, the TypeScript compiler, arbitrary Lean admission completeness, or exhaustive reduction-path completeness.\n`;
fs.writeFileSync(path.join(root, mdRel), md);

console.log(`K3TB_VERIFICATION_BUNDLE_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`K3TB_VERIFICATION_BUNDLE_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`K3TB_VERIFICATION_BUNDLE_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`K3TB_VERIFICATION_BUNDLE_PROGRESS_OVERALL=99.5%`);
console.log(`K3TB_VERIFICATION_BUNDLE_STATUS=REPRODUCIBLE_VERIFICATION_BUNDLE_NOT_FULLY_FORMAL_K3`);
console.log('PASS KERNEL-v71-k3tb-verification-bundle');
