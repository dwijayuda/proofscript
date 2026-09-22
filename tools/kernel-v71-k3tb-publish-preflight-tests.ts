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
const targetModule = 'ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71K3TBPublishPreflight.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_K3TB_PUBLISH_PREFLIGHT1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_K3TB_PUBLISH_PREFLIGHT1.md';
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
  'assurance/lean4331/CHECKPOINT_V71_K3TB_PRACTICAL_RELEASE1.json',
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

fs.mkdirSync(evidence, { recursive: true });
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
assert.ok(lean, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1');
assert.ok(fs.existsSync(lean), `PROOFSCRIPT_LEAN_BIN does not exist: ${lean}`);
assert.ok(fs.existsSync(path.join(root, targetRel)), `missing ${targetRel}`);

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
assert.match(versionOut, /version 4\.33\.1/, 'Lean version');
assert.match(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const pkg = readJson('package.json');
assert.equal(pkg.private, true, 'publish-preflight release must remain private for npm');
assert.ok(pkg.scripts['verify:k3tb:publish'].includes('node tools/kernel-v71-k3tb-publish-verify.ts'), 'verify:k3tb:publish script');
assert.ok(pkg.scripts['test:v71:k3tb-publish-preflight'].includes('node tools/kernel-v71-k3tb-publish-preflight-tests.ts'), 'publish-preflight script');

console.log('K3TB_PUBLISH_PREFLIGHT_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-k3tb-publish-formal-'));
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
const formalLog = path.join(evidence, 'v71-k3tb-publish-preflight-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal publish-preflight target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'publishPreflightAssets_count',
  'allowedPublishChannels_count',
  'forbiddenPublishActions_count',
  'publishPreflightProgress_basisPoints',
  'publishPreflightLabel_isK3TB',
  'v71K3TBPublishPreflight_sound',
  'v71K3TBPublishPreflight_notFullyFormalK3',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.${name}`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal publish-preflight target unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal publish-preflight target has sorry marker');

console.log('K3TB_PUBLISH_PREFLIGHT_PHASE=inherited-checkpoints');
const inherited = [];
for (const relPath of inheritedCheckpointRels) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const checkpoint = readJson(relPath);
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
assert.equal(inherited.length, 23, 'inherited checkpoint count');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const practical = readJson('assurance/lean4331/CHECKPOINT_V71_K3TB_PRACTICAL_RELEASE1.json');
assert.equal(practical.progress.basisPoints, progressBasisPoints, 'practical release progress');

console.log('K3TB_PUBLISH_PREFLIGHT_PHASE=release-docs-and-manifests');
const releaseDocs = [
  expectText('PUBLISH_PREFLIGHT_K3TB.md', ['publish-preflight layer', 'not fully formal K3', 'npm run verify:k3tb:publish']),
  expectText('PRACTICAL_RELEASE_K3TB.md', ['K3-TB practical release', '99.5%', 'not fully formal K3']),
  expectText('RELEASE_NOTES_V71_K3TB.md', ['K3-TB practical release candidate', '99.5% engineering track', 'Non-goals']),
  expectText('TRUSTED_INFRASTRUCTURE_K3TB.md', ['Trusted components', 'Node.js', 'TypeScript compiler']),
  expectText('FINAL_RELEASE_MANIFEST_K3TB.json', ['PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3', 'remainingFullFormalK3Obligations']),
  expectText('RELEASE_PROVENANCE_K3TB.json', ['PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3', 'parentReleaseId', 'forbiddenPublicationClaims']),
  expectText('SBOM_K3TB.json', ['SBOM_STYLE_MANIFEST_NOT_A_SECURITY_AUDIT', 'typescript-5.8.3.tgz']),
  expectText('PUBLISH_OVERCLAIM_GUARD_K3TB.json', ['PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3', 'releaseShouldRemainPrivateNpmPackage']),
];
const provenance = readJson('RELEASE_PROVENANCE_K3TB.json');
assert.equal(provenance.label, 'K3-TB', 'provenance label');
assert.equal(provenance.status, 'PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3', 'provenance status');
assert.equal(provenance.progress.basisPoints, progressBasisPoints, 'provenance progress');
assert.equal(provenance.package.private, true, 'provenance private package');
const sbom = readJson('SBOM_K3TB.json');
assert.equal(sbom.packages.length, 3, 'vendored package count');
for (const dep of sbom.packages) {
  assert.ok(fs.existsSync(path.join(root, dep.path)), `missing vendored dependency ${dep.path}`);
  assert.equal(dep.sha256, sha256File(path.join(root, dep.path)), `${dep.path} sha256`);
}
const overclaim = readJson('PUBLISH_OVERCLAIM_GUARD_K3TB.json');
assert.equal(overclaim.status, 'ACTIVE', 'overclaim guard status');
assert.equal(overclaim.boundary, 'PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3', 'overclaim boundary');
assert.equal(overclaim.releaseShouldRemainPrivateNpmPackage, true, 'private npm guard');
assert.ok(overclaim.requiredCaveatPhrases.includes('not fully formal K3'), 'required caveat');

console.log('K3TB_PUBLISH_PREFLIGHT_PHASE=source-envelope');
const releaseVerifier = fs.readFileSync(path.join(root, 'tools/kernel-v71-k3tb-publish-verify.ts'), 'utf8');
assert.ok(releaseVerifier.includes("npm", "publish verifier must call npm"));
assert.ok(releaseVerifier.includes('verify:k3tb:release'), 'publish verifier must run release verifier first');
assert.ok(releaseVerifier.includes('test:v71:k3tb-publish-preflight'), 'publish verifier must run preflight gate');
assert.ok(!releaseVerifier.includes('npm publish'), 'publish verifier must not publish to npm');
assert.ok(!releaseVerifier.includes('--access public'), 'publish verifier must not publish public package');

const formalFiles = findFormalFiles(formalRoot);
const checkpoint = {
  checkpoint: 'V71_K3TB_PUBLISH_PREFLIGHT1',
  status: 'PASS',
  release: 'ProofScript Kernel v71 K3-TB Publish Preflight 1',
  boundary: 'PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3',
  progress: {
    percent: progressPercent,
    basisPoints: progressBasisPoints,
    kind: 'engineering-track',
    note: 'Publish-preflight readiness under explicit trusted-boundary assumptions; not fully formal K3.',
  },
  lean: {
    semanticBaseline: expectedLeanVersion,
    releaseCommit: expectedLeanCommit,
    observedVersion: versionOut.trim(),
  },
  formal: {
    target: targetModule,
    source: targetRel,
    sourceSha256: sha256File(path.join(root, targetRel)),
    log: rel(formalLog),
    theoremCount: 7,
    reportedSorryAx: 0,
    formalFileCount: formalFiles.length,
  },
  inherited: {
    checkpointCount: inherited.length,
    failures: 0,
    fullLeanGateParts: fullGate.partCount,
    checkpoints: inherited,
  },
  release: {
    docCount: releaseDocs.length,
    docs: releaseDocs,
    provenanceManifest: { path: 'RELEASE_PROVENANCE_K3TB.json', sha256: sha256File(path.join(root, 'RELEASE_PROVENANCE_K3TB.json')) },
    sbomManifest: { path: 'SBOM_K3TB.json', packageCount: sbom.packages.length, sha256: sha256File(path.join(root, 'SBOM_K3TB.json')) },
    overclaimGuard: { path: 'PUBLISH_OVERCLAIM_GUARD_K3TB.json', status: overclaim.status, sha256: sha256File(path.join(root, 'PUBLISH_OVERCLAIM_GUARD_K3TB.json')) },
    packagePrivate: pkg.private,
  },
  allowedClaims: provenance.forbiddenPublicationClaims.map(claim => `Do not claim ${claim}`),
  next: 'Publish as K3-TB trusted-boundary source/reviewer archive, not full formal K3.',
};

fs.writeFileSync(path.join(root, checkpointRel), JSON.stringify(checkpoint, null, 2) + '\n');
fs.writeFileSync(path.join(root, mdRel), `# Kernel v71 K3-TB Publish Preflight Checkpoint 1\n\nStatus: **PASS**\n\nProgress: **99.5% engineering track**\n\nBoundary: **PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3**\n\nThis checkpoint verifies publication readiness for the practical K3-TB release path. It does not upgrade v71 to fully formal K3.\n\n## Evidence\n\n- Formal target: \`${targetModule}\`\n- Formal files: ${formalFiles.length}\n- New target theorems: 7\n- Reported sorryAx: 0\n- Inherited checkpoints: ${inherited.length}\n- Full Lean gate: ${fullGate.partCount} parts PASS\n- Release docs/manifests checked: ${releaseDocs.length}\n- Vendored npm packages checked: ${sbom.packages.length}\n\n## Reviewer command\n\n\`\`\`bash\nnpm install --offline --ignore-scripts\nPROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:publish\n\`\`\`\n\n## Remaining full formal K3 work\n\n- Verified TypeScript compiler or Lean extraction path.\n- Full ECMAScript/Node runtime semantics or removal from trusted checker path.\n- Arbitrary Lean acceptance completeness iff ProofScript acceptance.\n- Exhaustive all-Lean reduction-path completeness.\n- Unconditional final K3 theorem instantiation.\n`);
fs.writeFileSync(path.join(root, 'V71_K3TB_PUBLISH_PREFLIGHT1_SHA256.json'), JSON.stringify({
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formal: targetRel,
  formalSha256: sha256File(path.join(root, targetRel)),
  provenance: 'RELEASE_PROVENANCE_K3TB.json',
  provenanceSha256: sha256File(path.join(root, 'RELEASE_PROVENANCE_K3TB.json')),
  sbom: 'SBOM_K3TB.json',
  sbomSha256: sha256File(path.join(root, 'SBOM_K3TB.json')),
  overclaimGuard: 'PUBLISH_OVERCLAIM_GUARD_K3TB.json',
  overclaimGuardSha256: sha256File(path.join(root, 'PUBLISH_OVERCLAIM_GUARD_K3TB.json')),
}, null, 2) + '\n');

console.log(`K3TB_PUBLISH_PREFLIGHT_FORMAL_TARGET=PASS THEOREMS=7 SORRYAX=0 FORMAL_FILES=${formalFiles.length}`);
console.log(`K3TB_PUBLISH_PREFLIGHT_INHERITED_CHECKPOINTS=${inherited.length} FAILURES=0`);
console.log(`K3TB_PUBLISH_PREFLIGHT_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`K3TB_PUBLISH_PREFLIGHT_DOCS=${releaseDocs.length} SBOM_PACKAGES=${sbom.packages.length}`);
console.log('K3TB_PUBLISH_PREFLIGHT_PROGRESS_OVERALL=99.5%');
console.log('K3TB_PUBLISH_PREFLIGHT_STATUS=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3');
console.log('PASS KERNEL-v71-k3tb-publish-preflight');
