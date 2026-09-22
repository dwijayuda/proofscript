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
const targetModule = 'ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71K3TBIndependentAuditPack.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_K3TB_INDEPENDENT_AUDIT_PACK1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_K3TB_INDEPENDENT_AUDIT_PACK1.md';
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
  assert.ok(fs.existsSync(abs), `missing audit document ${relPath}`);
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
  const status = String(checkpoint.status ?? '');
  if (status !== 'PASS') return 1;
  return 0;
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
assert.ok(pkg.scripts['verify:k3tb:audit'].includes('node tools/kernel-v71-k3tb-audit-verify.ts'), 'verify:k3tb:audit script');
assert.ok(pkg.scripts['test:v71:k3tb-independent-audit-pack'].includes('node tools/kernel-v71-k3tb-independent-audit-pack-tests.ts'), 'audit pack script');

console.log('K3TB_AUDIT_PACK_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-k3tb-audit-pack-formal-'));
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
const formalLog = path.join(evidence, 'v71-k3tb-independent-audit-pack-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal K3-TB audit-pack target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'auditAssets_count',
  'auditQuestions_count',
  'claimClasses_count',
  'auditPackProgress_basisPoints',
  'auditPackReleaseLabel_isK3TB',
  'v71K3TBIndependentAuditPack_sound',
  'v71K3TBIndependentAuditPack_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal K3-TB audit pack unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal K3-TB audit pack has sorry marker');

console.log('K3TB_AUDIT_PACK_PHASE=inherited-checkpoints');
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
assert.equal(inherited.length, 21, 'inherited checkpoint count');
assert.equal(failures, 0, 'inherited checkpoint failures');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const verificationBundle = readJson('assurance/lean4331/CHECKPOINT_V71_K3TB_VERIFICATION_BUNDLE1.json');
assert.equal(verificationBundle.progress.basisPoints, progressBasisPoints, 'verification bundle progress');

console.log('K3TB_AUDIT_PACK_PHASE=docs');
const auditDocs = [
  expectText('AUDIT_K3TB.md', ['K3-TB', '99.5%', 'not fully formal K3', 'npm run verify:k3tb:audit']),
  expectText('AUDIT_TRUST_BOUNDARY_MATRIX_K3TB.md', ['trusted-boundary K3 candidate', 'Unsafe labels', 'verified Node/TypeScript runtime semantics']),
  expectText('REVIEWER_CHECKLIST_K3TB.md', ['21 inherited checkpoints', 'not fully formal K3', 'AUDIT_EVIDENCE_INDEX_K3TB.json']),
  expectText('AUDIT_OVERCLAIM_GUARD_K3TB.json', ['OVERCLAIM_GUARD_ACTIVE_NOT_FULLY_FORMAL_K3', 'forbiddenClaims', 'fully formal K3']),
];
const evidenceIndex = readJson('AUDIT_EVIDENCE_INDEX_K3TB.json');
assert.equal(evidenceIndex.label, 'K3-TB', 'audit evidence label');
assert.equal(evidenceIndex.status, 'INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3', 'audit evidence status');
assert.equal(evidenceIndex.progress.basisPoints, progressBasisPoints, 'audit evidence progress basis points');
assert.equal(evidenceIndex.inheritedCheckpointsExpected, 21, 'audit evidence checkpoint count');
assert.equal(evidenceIndex.fullLeanGatePartsExpected, 6, 'audit evidence full gate count');
assert.equal(evidenceIndex.requiredDocuments.length, 4, 'audit evidence required docs');
assert.equal(evidenceIndex.remainingFullFormalK3Obligations.length, 5, 'audit evidence remaining obligations');
auditDocs.push({ path: 'AUDIT_EVIDENCE_INDEX_K3TB.json', sha256: sha256File(path.join(root, 'AUDIT_EVIDENCE_INDEX_K3TB.json')), bytes: fs.statSync(path.join(root, 'AUDIT_EVIDENCE_INDEX_K3TB.json')).size });

console.log('K3TB_AUDIT_PACK_PHASE=overclaim-guard');
const overclaim = readJson('AUDIT_OVERCLAIM_GUARD_K3TB.json');
assert.equal(overclaim.label, 'K3-TB', 'overclaim label');
assert.equal(overclaim.status, 'OVERCLAIM_GUARD_ACTIVE_NOT_FULLY_FORMAL_K3', 'overclaim status');
assert.equal(overclaim.allowedClaims.length, 3, 'allowed claim count');
assert.equal(overclaim.forbiddenClaims.length, 3, 'forbidden claim count');
for (const c of overclaim.allowedClaims) assert.equal(c.allowed, true, `allowed claim ${c.claim}`);
for (const c of overclaim.forbiddenClaims) assert.equal(c.allowed, false, `forbidden claim ${c.claim}`);
assert.ok(overclaim.requiredCaveat.includes('not fully formal K3'), 'required caveat');
for (const relPath of ['README.md', 'SECURITY.md', 'RELEASE_CANDIDATE_K3TB.md', 'VERIFY_K3TB.md', 'SECURITY_TRUST_BOUNDARY_K3TB.md']) {
  const s = fs.readFileSync(path.join(root, relPath), 'utf8');
  assert.match(s, /not (?:a )?(?:fully formal|full formal) K3|does not mean (?:fully formal|full formal) K3|not fully formal K3/i, `${relPath} lacks non-full-K3 caveat`);
}

console.log('K3TB_AUDIT_PACK_PHASE=checkpoint');
const formalFiles = findFormalFiles(path.join(formalRoot, 'ProofScriptKernelEquivalence'));
assert.ok(formalFiles.length >= 52, `expected at least 52 formal files, got ${formalFiles.length}`);
const formalStackHash = sha256Text(formalFiles.map(file => `${rel(file)}:${sha256File(file)}`).join('\n'));
const checkpointLedgerHash = sha256Text(inherited.map(c => `${c.path}:${c.sha256}`).join('\n'));
const auditDocsHash = sha256Text(auditDocs.map(d => `${d.path}:${d.sha256}:${d.bytes}`).join('\n'));

const checkpoint = {
  checkpoint: 'V71_K3TB_INDEPENDENT_AUDIT_PACK1',
  status: 'PASS',
  label: 'K3-TB',
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    kind: 'engineering-track',
    note: 'Independent audit packaging does not inflate the trusted-boundary K3 progress value.',
  },
  lean: {
    semanticBaseline: expectedLeanVersion,
    releaseCommit: expectedLeanCommit,
    versionOutput: versionOut.trim(),
  },
  formal: {
    targetModule,
    targetPath: targetRel,
    evidenceLog: rel(formalLog),
    fileCount: formalFiles.length,
    formalStackHash,
    targetSha256: sha256File(path.join(root, targetRel)),
    reportedSorryAx: 0,
    theoremCount: 7,
  },
  inherited: {
    checkpointCount: inherited.length,
    checkpointFailures: failures,
    checkpointLedgerHash,
    checkpoints: inherited,
    fullLeanGateParts: fullGate.partCount,
    fullLeanGateStatus: fullGate.status,
  },
  audit: {
    docs: auditDocs,
    auditDocsHash,
    requiredDocumentCount: 4,
    allowedClaimCount: overclaim.allowedClaims.length,
    forbiddenClaimCount: overclaim.forbiddenClaims.length,
    overclaimGuardStatus: overclaim.status,
    evidenceIndexStatus: evidenceIndex.status,
  },
  boundary: {
    status: 'INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3',
    safeReleaseClaim: 'K3-TB trusted-boundary release candidate with independent audit pack',
    forbiddenReleaseClaims: overclaim.forbiddenClaims.map(c => c.claim),
    remainingFullFormalK3Obligations: evidenceIndex.remainingFullFormalK3Obligations,
  },
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);

const md = `# ProofScript Kernel v71 K3-TB Independent Audit Pack\n\nStatus: **PASS**.\n\nProgress: **99.5% engineering track**.\n\nBoundary: **INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3**.\n\nThis checkpoint adds independent-auditor-facing evidence organization and an overclaim guard. It does not convert K3-TB into fully formal K3.\n\n## Fresh checks\n\n- Formal target: \`${targetModule}\`\n- Formal files: ${formalFiles.length}\n- Reported sorryAx: 0\n- Inherited checkpoints: ${inherited.length}\n- Inherited failures: ${failures}\n- Full Lean gate parts: ${fullGate.partCount}\n- Audit documents: ${auditDocs.length}\n- Allowed claim classes: ${overclaim.allowedClaims.length}\n- Forbidden claim classes: ${overclaim.forbiddenClaims.length}\n\n## Safe claim\n\nProofScript v71 is a K3-TB trusted-boundary release candidate with independent audit evidence.\n\n## Forbidden claims\n\n- fully formal K3\n- complete Lean kernel equivalence\n- verified Node/TypeScript runtime semantics\n\n## Remaining full-formal K3 obligations\n\n${evidenceIndex.remainingFullFormalK3Obligations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n`;
fs.writeFileSync(path.join(root, mdRel), md);

const digest = {
  checkpoint: checkpoint.checkpoint,
  status: checkpoint.status,
  progress: checkpoint.progress,
  boundary: checkpoint.boundary.status,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  checkpointMarkdownSha256: sha256File(path.join(root, mdRel)),
  auditDocsHash,
  checkpointLedgerHash,
  formalStackHash,
};
fs.writeFileSync(path.join(root, 'V71_K3TB_INDEPENDENT_AUDIT_PACK1_SHA256.json'), `${JSON.stringify(digest, null, 2)}\n`);

console.log(`K3TB_AUDIT_PACK_FORMAL_TARGET=PASS THEOREMS=7 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`K3TB_AUDIT_PACK_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=${failures}`);
console.log(`K3TB_AUDIT_PACK_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_${fullGate.status}`);
console.log(`K3TB_AUDIT_PACK_DOCS=${auditDocs.length} OVERCLAIM_FORBIDDEN=${overclaim.forbiddenClaims.length}`);
console.log('K3TB_AUDIT_PACK_PROGRESS_OVERALL=99.5%');
console.log('K3TB_AUDIT_PACK_BOUNDARY=INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3');
console.log('K3TB_AUDIT_PACK_STATUS=PASS');
console.log('PASS KERNEL-v71-k3tb-independent-audit-pack');
