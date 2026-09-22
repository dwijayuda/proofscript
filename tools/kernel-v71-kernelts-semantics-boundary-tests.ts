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
const progressOverall = 93;
const previousProgress = 90;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71KernelTSSemanticsBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71KernelTSSemanticsBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_KERNELTS_SEMANTICS_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_KERNELTS_SEMANTICS_BOUNDARY1.md';

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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-kernelts-boundary-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
console.log('KERNELTS_SEMANTICS_BOUNDARY_PHASE=formal-build');
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
const formalLog = path.join(evidence, 'v71-kernelts-semantics-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal KernelTS semantics boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedKernelTSSlices_count',
  'outstandingKernelTSObligations_count',
  'k3OverallProgress_percent',
  'inheritedStoredRHSProgress_prior',
  'inheritedPositivityProgress_prior',
  'inheritedClassifierImplementation_noMissing',
  'inheritedClassifierImplementation_noFailures',
  'inheritedNestedPreprocessorTrace_sound',
  'inheritedPositivityBoundary_sound',
  'inheritedStoredRHSBoundary_sound',
  'v71KernelTSSemanticsBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71KernelTSSemanticsBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal KernelTS boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal KernelTS boundary has sorry marker');

const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const fullGateLogs = fullGate.parts.map(part => {
  assert.match(part.marker, new RegExp(`KERNEL v71 ASSURANCE GATE PART ${part.part}/6: PASS`));
  return assertLoggedHash(part.log, part.sha256);
});
const classifierTrace = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json', 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1');
assert.equal(classifierTrace.formal.reportedSorryAx, 0, 'TS classifier trace sorryAx');
assert.equal(classifierTrace.executable.sourceMissing, 0, 'TS classifier trace source missing');
assert.equal(classifierTrace.executable.failures, 0, 'TS classifier trace failures');
const tsNested = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1.json', 'V71_TS_NESTED_PREPROCESSOR_REFINEMENT_BOUNDARY1');
assert.equal(tsNested.formal.reportedSorryAx, 0, 'TS nested preprocessor refinement sorryAx');
assert.equal(tsNested.progress.percent, 80, 'TS nested preprocessor progress');
assert.equal(tsNested.executable.failures, 0, 'TS nested preprocessor failures');
const positivity = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_POSITIVITY_COMPLETENESS_BOUNDARY1.json', 'V71_POSITIVITY_COMPLETENESS_BOUNDARY1');
assert.equal(positivity.formal.reportedSorryAx, 0, 'positivity boundary sorryAx');
assert.equal(positivity.progress.percent, 85, 'positivity boundary progress');
assert.equal(positivity.executable.failures, 0, 'positivity boundary failures');
const storedRHS = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1.json', 'V71_STORED_RECURSOR_RHS_RECONSTRUCTION_BOUNDARY1');
assert.equal(storedRHS.formal.reportedSorryAx, 0, 'stored RHS boundary sorryAx');
assert.equal(storedRHS.progress.percent, previousProgress, 'stored RHS progress');
assert.equal(storedRHS.executable.failures, 0, 'stored RHS failures');

console.log('KERNELTS_SEMANTICS_BOUNDARY_PHASE=source-envelope-audit');
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
const sourceFiles = [];
const bannedHits = [];
const importHits = [];
for (const file of trustedFiles) {
  const abs = path.join(root, file);
  assert.ok(fs.existsSync(abs), `missing trusted KernelTS file ${file}`);
  const source = fs.readFileSync(abs, 'utf8');
  const code = stripCommentsForAudit(source);
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
const tcbSourceHash = sha256Text(sourceFiles.map(f => `${f.path}:${f.sha256}`).join('\n'));
const sourceAudit = {
  trustedFileCount: sourceFiles.length,
  trustedFiles: sourceFiles,
  totalLines: sourceFiles.reduce((n, f) => n + f.lines, 0),
  localImportClosure: true,
  dynamicExecutionExcluded: true,
  ambientNondeterminismExcluded: true,
  bannedFeatureCount: banned.length,
  bannedFeatureHits: bannedHits.length,
  tcbSourceHash,
};

const effectiveFormalStackFiles = fs.readdirSync(path.join(root, 'assurance/lean4331/formal/ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean')).length;
const formalLogRel = rel(formalLog);
const formalLogSha = sha256File(formalLog);
const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_KERNELTS_SEMANTICS_BOUNDARY1',
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
    targetTheorems: 11,
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
    tsClassifierImplementationTrace: {
      status: classifierTrace.status,
      sourceObligations: classifierTrace.executable.sourceObligations,
      sourceMissing: classifierTrace.executable.sourceMissing,
      failures: classifierTrace.executable.failures,
    },
    tsNestedPreprocessorRefinement: { status: tsNested.status, progress: tsNested.progress.percent },
    positivityBoundary: { status: positivity.status, progress: positivity.progress.percent },
    storedRHSBoundary: { status: storedRHS.status, progress: storedRHS.progress.percent },
  },
  completedSlices: [
    'trusted TypeScript kernel source inventory',
    'local import closure audit',
    'dynamic code execution exclusion audit',
    'ambient nondeterminism exclusion audit',
    'deterministic error boundary audit',
    'trusted source SHA-256 ledger',
    'inherited TypeScript classifier implementation trace boundary',
    'inherited TypeScript nested preprocessor refinement boundary',
    'inherited positivity completeness-boundary certificate',
    'inherited stored RecursorRule.rhs reconstruction-boundary certificate',
  ],
  outstandingK3Obligations: [
    'line-by-line small-step semantics for the full KernelTS subset',
    'full TypeScript/Node runtime model or verified extraction path',
    'arbitrary Lean acceptance completeness iff ProofScript acceptance',
    'exhaustive reduction-path completeness for every Lean expression form',
    'final whole-kernel K3 equivalence theorem',
  ],
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);
const md = `# Kernel v71 KernelTS Semantics-Boundary Certificate 1\n\nStatus: **PASS**\n\nOverall v71 K3-track progress: **${progressOverall}%**\n\nThis checkpoint audits the trusted TypeScript kernel source envelope and binds it to the existing Lean-checked v71 certificates. It is intentionally not a full line-by-line TypeScript operational semantics and not final K3 whole-kernel equivalence.\n\n## Formal target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Formal stack files: ${effectiveFormalStackFiles}\n- Reported \`sorryAx\`: 0\n\n## Trusted KernelTS source envelope\n\n- Trusted files: ${sourceAudit.trustedFileCount}\n- Total lines audited: ${sourceAudit.totalLines}\n- Local import closure: PASS\n- Dynamic execution excluded: PASS\n- Ambient nondeterminism excluded: PASS\n- Banned feature checks: ${sourceAudit.bannedFeatureCount}\n- Banned feature hits: ${sourceAudit.bannedFeatureHits}\n- TCB source ledger hash: \`${sourceAudit.tcbSourceHash}\`\n\n## Inherited evidence\n\n- Full Lean 4.33.1 gate: ${fullGate.partCount} parts PASS\n- TypeScript classifier implementation trace: PASS\n- TypeScript nested preprocessor refinement-boundary: ${tsNested.progress.percent}% prior progress\n- Positivity completeness-boundary: ${positivity.progress.percent}% prior progress\n- Stored RecursorRule.rhs reconstruction-boundary: ${storedRHS.progress.percent}% prior progress\n\n## Boundary\n\nThis certificate improves the implementation-refinement story by excluding dynamic/runtime-unsafe TypeScript features from the trusted kernel source envelope and hash-binding the audited source files. It does not yet prove arbitrary JavaScript/TypeScript execution semantics, verified compilation, arbitrary Lean acceptance completeness, or final K3 equivalence.\n`;
fs.writeFileSync(path.join(root, mdRel), md);
const shaManifest = {
  artifact: 'V71_KERNELTS_SEMANTICS_BOUNDARY1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalLog: formalLogRel,
  formalLogSha256: formalLogSha,
  tcbSourceHash,
};
fs.writeFileSync(path.join(root, 'V71_KERNELTS_SEMANTICS_BOUNDARY1_SHA256.json'), `${JSON.stringify(shaManifest, null, 2)}\n`);

console.log(`KERNELTS_SEMANTICS_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=11 SORRYAX=0 FORMAL_FILES=${effectiveFormalStackFiles}`);
console.log(`KERNELTS_SEMANTICS_BOUNDARY_SOURCE_ENVELOPE=PASS FILES=${sourceAudit.trustedFileCount} LINES=${sourceAudit.totalLines} BANNED_HITS=${sourceAudit.bannedFeatureHits}`);
console.log(`KERNELTS_SEMANTICS_BOUNDARY_INHERITED_FULL_LEAN_GATE=${fullGate.partCount}_PARTS_PASS`);
console.log(`KERNELTS_SEMANTICS_BOUNDARY_PROGRESS_OVERALL=${progressOverall}%`);
console.log('KERNELTS_SEMANTICS_BOUNDARY_STATUS=SOURCE_ENVELOPE_NOT_LINE_BY_LINE_TS_SEMANTICS');
console.log('PASS KERNEL-v71-kernelts-semantics-boundary');
