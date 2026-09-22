#!/usr/bin/env node
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
const targetModule = 'ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71K3TBPracticalRelease.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_K3TB_PRACTICAL_RELEASE1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_K3TB_PRACTICAL_RELEASE1.md';
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
  'assurance/lean4331/CHECKPOINT_V71_K3TB_VERIFICATION_BUNDLE1.json',
  'assurance/lean4331/CHECKPOINT_V71_K3TB_INDEPENDENT_AUDIT_PACK1.json',
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 120_000,
    maxBuffer: 256 * 1024 * 1024,
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

function countStatusFailures(checkpoint) {
  return String(checkpoint.status ?? '') === 'PASS' ? 0 : 1;
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
assert.ok(pkg.scripts['verify:k3tb:release'].includes('node tools/kernel-v71-k3tb-release-verify.ts'), 'verify:k3tb:release script');
assert.ok(pkg.scripts['test:v71:k3tb-practical-release'].includes('node tools/kernel-v71-k3tb-practical-release-tests.ts'), 'practical release script');

console.log('K3TB_PRACTICAL_RELEASE_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-k3tb-practical-formal-'));
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
const formalLog = path.join(evidence, 'v71-k3tb-practical-release-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal practical-release target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'practicalReleaseAssets_count',
  'allowedClaims_count',
  'forbiddenClaims_count',
  'trustedInfrastructure_count',
  'practicalReleaseProgress_basisPoints',
  'practicalReleaseLabel_isK3TB',
  'v71K3TBPracticalRelease_sound',
  'v71K3TBPracticalRelease_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal practical-release target unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal practical-release target has sorry marker');

console.log('K3TB_PRACTICAL_RELEASE_PHASE=inherited-checkpoints');
const inherited = [];
let failures = 0;
for (const relPath of inheritedCheckpointRels) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const checkpoint = readJson(relPath);
  failures += countStatusFailures(checkpoint);
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
assert.equal(inherited.length, 22, 'inherited checkpoint count');
assert.equal(failures, 0, 'inherited checkpoint failures');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const auditPack = readJson('assurance/lean4331/CHECKPOINT_V71_K3TB_INDEPENDENT_AUDIT_PACK1.json');
assert.equal(auditPack.progress.basisPoints, progressBasisPoints, 'audit pack progress');

console.log('K3TB_PRACTICAL_RELEASE_PHASE=docs');
const releaseDocs = [
  expectText('PRACTICAL_RELEASE_K3TB.md', ['K3-TB practical release', '99.5%', 'not fully formal K3', 'npm run verify:k3tb:release']),
  expectText('RELEASE_NOTES_V71_K3TB.md', ['K3-TB practical release candidate', '99.5% engineering track', 'Non-goals']),
  expectText('TRUSTED_INFRASTRUCTURE_K3TB.md', ['Trusted components', 'Node.js', 'TypeScript compiler', 'not prove a full semantics']),
  expectText('FINAL_RELEASE_MANIFEST_K3TB.json', ['PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3', 'inheritedCheckpointsExpected', 'remainingFullFormalK3Obligations']),
  expectText('AUDIT_K3TB.md', ['K3-TB', 'not fully formal K3', 'npm run verify:k3tb:audit']),
  expectText('VERIFY_K3TB.md', ['npm run verify:k3tb', 'does not mean fully formal K3', '99.5%']),
  expectText('RELEASE_CANDIDATE_K3TB.md', ['K3-TB', 'not a fully formal K3 proof', 'Remaining full-formal K3 work']),
  expectText('SECURITY_TRUST_BOUNDARY_K3TB.md', ['K3-TB', 'trusted', 'not fully formal K3']),
];
const manifest = readJson('FINAL_RELEASE_MANIFEST_K3TB.json');
assert.equal(manifest.label, 'K3-TB', 'release manifest label');
assert.equal(manifest.status, 'PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3', 'release manifest status');
assert.equal(manifest.progress.basisPoints, progressBasisPoints, 'release manifest progress');
assert.equal(manifest.inheritedCheckpointsExpected, 22, 'release manifest checkpoint count');
assert.equal(manifest.fullLeanGatePartsExpected, 6, 'release manifest full gate count');
assert.equal(manifest.trustedInfrastructure.length, 6, 'release manifest trusted infrastructure count');
assert.equal(manifest.allowedClaims.length, 3, 'release manifest allowed claim count');
assert.equal(manifest.forbiddenClaims.length, 4, 'release manifest forbidden claim count');
assert.equal(manifest.remainingFullFormalK3Obligations.length, 5, 'release manifest remaining obligations');

console.log('K3TB_PRACTICAL_RELEASE_PHASE=overclaim-guard');
const overclaim = readJson('AUDIT_OVERCLAIM_GUARD_K3TB.json');
assert.equal(overclaim.status, 'OVERCLAIM_GUARD_ACTIVE_NOT_FULLY_FORMAL_K3', 'overclaim status');
for (const relPath of ['README.md', 'SECURITY.md', 'RELEASE_CANDIDATE_K3TB.md', 'VERIFY_K3TB.md', 'SECURITY_TRUST_BOUNDARY_K3TB.md', 'PRACTICAL_RELEASE_K3TB.md', 'RELEASE_NOTES_V71_K3TB.md', 'TRUSTED_INFRASTRUCTURE_K3TB.md']) {
  const s = fs.readFileSync(path.join(root, relPath), 'utf8');
  assert.match(s, /not (?:a )?(?:fully formal|full formal) K3|does not mean (?:fully formal|full formal) K3|not fully formal K3|does not claim fully formal K3/i, `${relPath} lacks non-full-K3 caveat`);
}

console.log('K3TB_PRACTICAL_RELEASE_PHASE=checkpoint');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 53, `expected at least 53 formal files, got ${formalFiles.length}`);
const formalStackHash = sha256Text(formalFiles.map(file => `${rel(file)}:${sha256File(file)}`).join('\n'));
const checkpointLedgerHash = sha256Text(inherited.map(c => `${c.path}:${c.sha256}`).join('\n'));
const releaseDocsHash = sha256Text(releaseDocs.map(d => `${d.path}:${d.sha256}:${d.bytes}`).join('\n'));

const checkpoint = {
  checkpoint: 'V71_K3TB_PRACTICAL_RELEASE1',
  status: 'PASS',
  label: 'K3-TB',
  release: 'ProofScript Kernel v71 K3-TB Practical Release Candidate 1',
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    kind: 'engineering-track',
    note: 'Practical release readiness under explicit trusted-boundary assumptions; not fully formal K3.',
  },
  lean: {
    semanticBaseline: expectedLeanVersion,
    releaseCommit: expectedLeanCommit,
    versionOutput: versionOut.trim(),
  },
  formal: {
    targetModule,
    targetPath: targetRel,
    targetSha256: sha256File(path.join(root, targetRel)),
    evidenceLog: rel(formalLog),
    formalFileCount: formalFiles.length,
    formalStackSha256: formalStackHash,
    targetTheoremCount: 8,
    reportedSorryAx: 0,
  },
  inherited: {
    checkpoints: inherited,
    checkpointCount: inherited.length,
    checkpointFailures: failures,
    checkpointLedgerSha256: checkpointLedgerHash,
    fullLeanGate: {
      status: fullGate.status,
      partCount: fullGate.partCount,
      sha256: sha256File(path.join(root, 'assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json')),
    },
  },
  releaseDocs: {
    count: releaseDocs.length,
    documents: releaseDocs,
    sha256: releaseDocsHash,
  },
  trustBoundary: {
    status: 'PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3',
    trustedInfrastructure: manifest.trustedInfrastructure,
    remainingFullFormalK3Obligations: manifest.remainingFullFormalK3Obligations,
    allowedClaims: manifest.allowedClaims,
    forbiddenClaims: manifest.forbiddenClaims,
  },
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);
fs.writeFileSync(path.join(root, mdRel), `# KERNEL v71 K3-TB Practical Release Checkpoint 1\n\nStatus: **PASS**\n\nLabel: \`K3-TB practical release candidate\`\n\nProgress: **99.5% engineering track**\n\nBoundary: **PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3**\n\nThis checkpoint finalizes the practical release path for v71 under explicit trusted infrastructure assumptions. It is not fully formal K3 and must not be marketed as complete Lean kernel equivalence.\n\n## Verified facts\n\n- Lean baseline: \`${expectedLeanVersion}\` / \`${expectedLeanCommit}\`\n- Formal target: \`${targetModule}\`\n- Formal Lean files: ${formalFiles.length}\n- New target theorems printed: 8\n- Reported sorryAx: 0\n- Inherited checkpoints: ${inherited.length}\n- Inherited failures: ${failures}\n- Full Lean gate parts: ${fullGate.partCount}\n- Release docs checked: ${releaseDocs.length}\n\n## Reviewer command\n\n\`\`\`bash\nnpm install --offline --ignore-scripts\nPROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:release\n\`\`\`\n\n## Remaining full formal K3 obligations\n\n${manifest.remainingFullFormalK3Obligations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n`);
const shaManifestRel = 'V71_K3TB_PRACTICAL_RELEASE1_SHA256.json';
fs.writeFileSync(path.join(root, shaManifestRel), `${JSON.stringify({
  checkpoint: checkpoint.checkpoint,
  status: checkpoint.status,
  label: checkpoint.label,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  checkpointMarkdownSha256: sha256File(path.join(root, mdRel)),
  formalTargetSha256: sha256File(path.join(root, targetRel)),
  formalEvidenceSha256: sha256File(formalLog),
  releaseDocsSha256: releaseDocsHash,
  inheritedCheckpointLedgerSha256: checkpointLedgerHash,
}, null, 2)}\n`);

console.log(`K3TB_PRACTICAL_RELEASE_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`K3TB_PRACTICAL_RELEASE_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`K3TB_PRACTICAL_RELEASE_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`K3TB_PRACTICAL_RELEASE_DOCS=${releaseDocs.length}`);
console.log(`K3TB_PRACTICAL_RELEASE_PROGRESS_OVERALL=${progressPercent}%`);
console.log('K3TB_PRACTICAL_RELEASE_STATUS=PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3');
console.log('PASS KERNEL-v71-k3tb-practical-release');
