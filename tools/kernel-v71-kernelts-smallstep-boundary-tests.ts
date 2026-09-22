import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const progressOverall = 95;
const previousProgress = 93;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71KernelTSSmallStepExecutionBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71KernelTSSmallStepExecutionBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1.md';
const evidence = path.join(root, 'assurance/lean4331/evidence');
const formalRoot = path.join(root, 'assurance/lean4331/formal');
fs.mkdirSync(evidence, { recursive: true });

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 120_000,
    maxBuffer: 64 * 1024 * 1024,
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

function assertCheckpointPass(relPath, checkpointName) {
  assert.ok(fs.existsSync(path.join(root, relPath)), `missing inherited checkpoint ${relPath}`);
  const c = readJson(relPath);
  assert.equal(c.status, 'PASS', `${checkpointName} status`);
  return c;
}

function assertLoggedHash(logRel, expectedSha) {
  const logAbs = path.join(root, logRel);
  assert.ok(fs.existsSync(logAbs), `missing inherited evidence log ${logRel}`);
  const actual = sha256File(logAbs);
  assert.equal(actual, expectedSha, `hash mismatch for ${logRel}`);
  return { log: logRel, sha256: actual };
}

function stripCommentsForAudit(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-kernelts-smallstep-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
console.log('KERNELTS_SMALLSTEP_BOUNDARY_PHASE=formal-build');
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
const formalLog = path.join(evidence, 'v71-kernelts-smallstep-execution-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal KernelTS small-step boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedKernelTSSmallStepSlices_count',
  'outstandingKernelTSSmallStepObligations_count',
  'k3OverallProgress_percent',
  'inheritedKernelTSSemanticsProgress_prior',
  'smallStep_toLean',
  'smallSteps_toLean',
  'inheritedKernelTSSemanticsBoundary_sound',
  'v71KernelTSSmallStepExecutionBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71KernelTSSmallStepExecutionBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal KernelTS small-step boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal KernelTS small-step boundary has sorry marker');

const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const fullGateLogs = fullGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertLoggedHash(part.log, part.sha256);
});
const kernelTS = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_KERNELTS_SEMANTICS_BOUNDARY1.json', 'V71_KERNELTS_SEMANTICS_BOUNDARY1');
assert.equal(kernelTS.formal.reportedSorryAx, 0, 'KernelTS semantics boundary sorryAx');
assert.equal(kernelTS.progress.percent, previousProgress, 'KernelTS semantics prior progress');
assert.equal(kernelTS.executable.failures, 0, 'KernelTS semantics executable failures');
const storedRHS = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.json', 'V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1');
assert.equal(storedRHS.progress.percent, 90, 'stored RHS prior progress');

console.log('KERNELTS_SMALLSTEP_BOUNDARY_PHASE=source-branch-audit');
const trustedFiles = [
  'packages/kernel/src/core.ts',
  'packages/kernel/src/level.ts',
  'packages/kernel/src/inductive.ts',
  'packages/kernel/src/kernel.ts',
  'packages/kernel/src/quotient.ts',
];
const banned = [
  ['eval', /\beval\s*\(/],
  ['Function constructor', /\bnew\s+Function\b|\bFunction\s*\(/],
  ['Proxy metaprogramming', /\bProxy\b/],
  ['dynamic import', /\bimport\s*\(/],
  ['CommonJS require', /\brequire\s*\(/],
  ['async keyword', /\basync\b/],
  ['await keyword', /\bawait\b/],
  ['timer API', /\bsetTimeout\s*\(|\bsetInterval\s*\(/],
  ['Date ambient time', /\bDate\b/],
  ['Math.random ambient randomness', /\bMath\.random\b/],
  ['process ambient access', /\bprocess\s*\./],
  ['globalThis ambient access', /\bglobalThis\b/],
  ['Node builtin imports', /from\s+['"]node:/],
  ['filesystem import', /from\s+['"]fs['"]|from\s+['"]node:fs['"]/],
  ['network import', /from\s+['"](?:net|http|https)['"]|from\s+['"]node:(?:net|http|https)['"]/],
  ['child_process import', /from\s+['"]child_process['"]|from\s+['"]node:child_process['"]/],
  ['prototype mutation', /Object\.setPrototypeOf|__proto__|\.prototype\s*=/],
];
const branchObligations = [
  ['core.ts', 'de Bruijn shift', /export function shift\s*\(/],
  ['core.ts', 'substitution engine', /function subst\s*\(/],
  ['core.ts', 'beta/zeta instantiate', /export function instantiate\s*\(/],
  ['core.ts', 'term structural equality', /export function sameTerm\s*\(/],
  ['level.ts', 'level normalization', /export function normalizeLevel\s*\(/],
  ['level.ts', 'level definitional equality', /export function levelDefEq\s*\(/],
  ['kernel.ts', 'kernel weak-head reduction', /export function kernelWhnf\s*\(/],
  ['kernel.ts', 'projection reduction', /function reduceProjection\s*\(/],
  ['kernel.ts', 'simple recursor reduction', /function reduceSimpleRecursor\s*\(/],
  ['kernel.ts', 'quotient recursor reduction', /function reduceQuotientRecursor\s*\(/],
  ['kernel.ts', 'type inference', /export function infer\s*\(/],
  ['kernel.ts', 'definitional equality', /export function defEq\s*\(/],
  ['kernel.ts', 'checking boundary', /export function check\s*\(/],
  ['inductive.ts', 'simple recursor generator', /export function generateSimpleRecursor\s*\(/],
  ['inductive.ts', 'parameterized recursor generator', /export function generateParameterizedSimpleRecursor\s*\(/],
  ['inductive.ts', 'indexed recursive recursor generator', /export function generateIndexedRecursiveRecursor\s*\(/],
  ['inductive.ts', 'direct mutual recursor generator', /export function generateDirectMutualRecursors\s*\(/],
  ['quotient.ts', 'quotient primitive generator', /export function generateQuotientPrimitives\s*\(/],
  ['quotient.ts', 'quotient sound axiom generator', /export function quotientSoundAxiom\s*\(/],
];
const byBase = new Map();
const sourceFiles = [];
const bannedHits = [];
const importHits = [];
for (const file of trustedFiles) {
  const abs = path.join(root, file);
  assert.ok(fs.existsSync(abs), `missing trusted KernelTS file ${file}`);
  const source = fs.readFileSync(abs, 'utf8');
  const code = stripCommentsForAudit(source);
  byBase.set(path.basename(file), code);
  const imports = [...code.matchAll(/^\s*import\s+[^;]+;?/gm)].map(m => m[0]);
  const nonLocalImports = imports.filter(line => !/from\s+['"]\.\/?[^'"]+['"]/.test(line));
  if (nonLocalImports.length) importHits.push({ file, nonLocalImports });
  for (const [label, re] of banned) {
    if (re.test(code)) bannedHits.push({ file, label, regex: String(re) });
  }
  sourceFiles.push({
    path: file,
    sha256: sha256File(abs),
    lines: source.split(/\r?\n/).length,
    importCount: imports.length,
    nonLocalImports: nonLocalImports.length,
    bannedFeatureHits: banned.filter(([, re]) => re.test(code)).length,
  });
}
assert.deepEqual(importHits, [], `trusted source non-local imports found: ${JSON.stringify(importHits, null, 2)}`);
assert.deepEqual(bannedHits, [], `trusted source banned KernelTS envelope features found: ${JSON.stringify(bannedHits, null, 2)}`);
const missingBranchObligations = [];
for (const [base, label, re] of branchObligations) {
  const code = byBase.get(base);
  if (!code || !re.test(code)) missingBranchObligations.push({ file: base, label, regex: String(re) });
}
assert.deepEqual(missingBranchObligations, [], `missing KernelTS small-step branch obligations: ${JSON.stringify(missingBranchObligations, null, 2)}`);
const tcbSourceHash = sha256Text(sourceFiles.map(f => `${f.path}:${f.sha256}`).join('\n'));
const branchInventoryHash = sha256Text(branchObligations.map(([file, label]) => `${file}:${label}`).join('\n'));
const sourceAudit = {
  trustedFileCount: sourceFiles.length,
  trustedFiles: sourceFiles,
  totalLines: sourceFiles.reduce((n, f) => n + f.lines, 0),
  branchObligations: branchObligations.length,
  missingBranchObligations: missingBranchObligations.length,
  bannedFeatureCount: banned.length,
  bannedFeatureHits: bannedHits.length,
  localImportClosure: true,
  deterministicEnvelope: true,
  tcbSourceHash,
  branchInventoryHash,
};

const effectiveFormalStackFiles = fs.readdirSync(path.join(root, 'assurance/lean4331/formal/ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean')).length;
const formalLogRel = rel(formalLog);
const formalLogSha = sha256File(formalLog);
const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1',
  coreFormat: 71,
  status: 'PASS',
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  progress: {
    percent: progressOverall,
    previousPercent: previousProgress,
    label: 'v71 K3-track conservative engineering progress',
    note: 'Progress is a project ledger, not a probability and not a formal K3 theorem.',
  },
  formal: {
    target: targetModule,
    source: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    log: formalLogRel,
    logSha256: formalLogSha,
    targetTheorems: 8,
    reportedSorryAx: 0,
    effectiveFormalStackFiles,
  },
  executable: {
    sourceAudit,
    failures: 0,
    fullLeanGateLogCount: fullGateLogs.length,
  },
  inherited: {
    fullLeanGate: { status: fullGate.status, partCount: fullGate.partCount },
    kernelTSSemanticsBoundary: { status: kernelTS.status, progress: kernelTS.progress.percent },
    storedRHSBoundary: { status: storedRHS.status, progress: storedRHS.progress.percent },
  },
  completedSlices: [
    'ordinary beta/zeta/delta/app-head step image theorem',
    'ordinary multi-step trace image theorem',
    'linked recursor RHS/iota step image theorem',
    'mixed KernelTS small-step image theorem',
    'mixed KernelTS multi-step trace image theorem',
    'trusted source branch inventory audit',
    'deterministic source-envelope audit',
    'inherited KernelTS semantics-boundary certificate',
    'inherited full Lean 4.33.1 gate evidence',
    'source SHA-256 ledger',
  ],
  outstandingK3Obligations: [
    'full ECMAScript or Node runtime model',
    'verified TypeScript compilation or extraction path',
    'arbitrary Lean acceptance completeness iff ProofScript acceptance',
    'exhaustive all-Lean reduction-path completeness',
    'final whole-kernel K3 equivalence theorem',
  ],
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);
const md = `# Kernel v71 KernelTS Small-Step Execution-Boundary Certificate 1\n\nStatus: **PASS**\n\nOverall v71 K3-track progress: **${progressOverall}%**\n\nThis checkpoint adds a Lean-checked kernel-level small-step image theorem for the trusted KernelTS execution boundary. It covers ordinary beta/zeta/delta/app-head reductions plus linked recursor RHS/iota endpoint steps, and binds the theorem to a static branch inventory over the trusted TypeScript source files.\n\n## Formal target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Formal stack files: ${effectiveFormalStackFiles}\n- Reported \`sorryAx\`: 0\n\n## Trusted KernelTS branch audit\n\n- Trusted files: ${sourceAudit.trustedFileCount}\n- Total lines audited: ${sourceAudit.totalLines}\n- Branch obligations: ${sourceAudit.branchObligations}\n- Missing branch obligations: ${sourceAudit.missingBranchObligations}\n- Banned feature checks: ${sourceAudit.bannedFeatureCount}\n- Banned feature hits: ${sourceAudit.bannedFeatureHits}\n- TCB source ledger hash: \`${sourceAudit.tcbSourceHash}\`\n- Branch inventory hash: \`${sourceAudit.branchInventoryHash}\`\n\n## Boundary\n\nThis is still not final K3. It does not prove a full ECMAScript/Node runtime model, verified TypeScript compilation, arbitrary Lean acceptance completeness, or exhaustive all-Lean reduction-path completeness.\n`;
fs.writeFileSync(path.join(root, mdRel), md);
const shaManifest = {
  artifact: 'V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalLog: formalLogRel,
  formalLogSha256: formalLogSha,
  tcbSourceHash,
  branchInventoryHash,
};
fs.writeFileSync(path.join(root, 'V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1_SHA256.json'), `${JSON.stringify(shaManifest, null, 2)}\n`);

console.log(`KERNELTS_SMALLSTEP_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${effectiveFormalStackFiles}`);
console.log(`KERNELTS_SMALLSTEP_BOUNDARY_SOURCE_AUDIT=PASS FILES=${sourceAudit.trustedFileCount} LINES=${sourceAudit.totalLines} BRANCH_OBLIGATIONS=${sourceAudit.branchObligations} MISSING=${sourceAudit.missingBranchObligations} BANNED_HITS=${sourceAudit.bannedFeatureHits}`);
console.log(`KERNELTS_SMALLSTEP_BOUNDARY_INHERITED_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`KERNELTS_SMALLSTEP_BOUNDARY_PROGRESS_OVERALL=${progressOverall}%`);
console.log('KERNELTS_SMALLSTEP_BOUNDARY_STATUS=SMALLSTEP_BOUNDARY_NOT_FULL_TS_RUNTIME_MODEL');
console.log('PASS KERNEL-v71-kernelts-smallstep-execution-boundary');
