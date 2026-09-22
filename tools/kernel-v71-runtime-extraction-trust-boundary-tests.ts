import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const progressOverall = 97;
const previousProgress = 95;
const targetModule = 'ProofScriptKernelEquivalence.KernelV71RuntimeExtractionTrustBoundary';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71RuntimeExtractionTrustBoundary.lean';
const checkpointRel = 'assurance/lean4331/CHECKPOINT_V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1.json';
const mdRel = 'assurance/lean4331/KERNEL_V71_ASSURANCE_CHECKPOINT_RUNTIME_EXTRACTION_TRUST_BOUNDARY1.md';
const evidence = path.join(root, 'assurance/lean4331/evidence');
const formalRoot = path.join(root, 'assurance/lean4331/formal');
fs.mkdirSync(evidence, { recursive: true });

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 120_000,
    maxBuffer: 96 * 1024 * 1024,
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

const rootPkg = readJson('package.json');
assert.equal(rootPkg.packageManager, 'npm@10', 'root packageManager');
assert.equal(rootPkg.devDependencies?.typescript, 'file:vendor/npm/typescript-5.8.3.tgz', 'vendored TypeScript package');
assert.equal(rootPkg.devDependencies?.['@types/node'], 'file:vendor/npm/types-node-22.19.7.tgz', 'vendored Node types package');
const tsBase = readJson('tsconfig.base.json');
assert.equal(tsBase.compilerOptions.target, 'ES2022', 'TypeScript target');
assert.equal(tsBase.compilerOptions.module, 'CommonJS', 'TypeScript module kind');
assert.equal(tsBase.compilerOptions.strict, true, 'TypeScript strict mode');
const kernelTsconfig = readJson('packages/kernel/tsconfig.json');
assert.equal(kernelTsconfig.compilerOptions.rootDir, 'src', 'kernel rootDir');
assert.equal(kernelTsconfig.compilerOptions.outDir, 'dist', 'kernel outDir');

console.log('RUNTIME_EXTRACTION_BOUNDARY_PHASE=typescript-build');
const buildRun = run('npm', ['run', 'build'], { timeoutMs: 10 * 60 * 1000 });
const buildOut = text(buildRun);
const buildLog = path.join(evidence, 'v71-runtime-extraction-build1.out');
fs.writeFileSync(buildLog, buildOut);
assert.equal(buildRun.status, 0, `npm run build failed; see ${rel(buildLog)}\n${buildOut}`);

console.log('RUNTIME_EXTRACTION_BOUNDARY_PHASE=formal-build');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-runtime-extraction-formal-'));
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
const formalLog = path.join(evidence, 'v71-runtime-extraction-trust-boundary-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal runtime/extraction trust-boundary target did not compile; see ${rel(formalLog)}\n${formalText}`);
for (const name of [
  'completedRuntimeExtractionSlices_count',
  'outstandingRuntimeExtractionObligations_count',
  'k3OverallProgress_percent',
  'inheritedKernelTSSmallStepProgress_prior',
  'inheritedKernelTSSmallStepBoundary_sound',
  'v71RuntimeExtractionTrustBoundary_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.KernelV71RuntimeExtractionTrustBoundary.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal runtime/extraction trust-boundary unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal runtime/extraction trust-boundary has sorry marker');

console.log('RUNTIME_EXTRACTION_BOUNDARY_PHASE=inherited-checkpoints');
const fullGate = readJson('assurance/lean4331/FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
assert.equal(fullGate.status, 'PASS', 'full Lean gate status');
assert.equal(fullGate.partCount, 6, 'full Lean gate part count');
const smallStep = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1.json', 'V71_KERNELTS_SMALLSTEP_EXECUTION_BOUNDARY1');
assert.equal(smallStep.formal.reportedSorryAx, 0, 'KernelTS small-step boundary sorryAx');
assert.equal(smallStep.progress.percent, previousProgress, 'KernelTS small-step prior progress');
assert.equal(smallStep.executable.failures, 0, 'KernelTS small-step executable failures');
const kernelTSSemantics = assertCheckpointPass('assurance/lean4331/CHECKPOINT_V71_KERNELTS_SEMANTICS_BOUNDARY1.json', 'V71_KERNELTS_SEMANTICS_BOUNDARY1');
assert.equal(kernelTSSemantics.progress.percent, 93, 'KernelTS semantics inherited progress');

console.log('RUNTIME_EXTRACTION_BOUNDARY_PHASE=dist-audit');
const srcDir = path.join(root, 'packages/kernel/src');
const distDir = path.join(root, 'packages/kernel/dist');
const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts')).sort();
assert.ok(srcFiles.length >= 5, 'expected kernel source files');
const missingEmitted = [];
const emittedFiles = [];
for (const src of srcFiles) {
  const base = src.replace(/\.ts$/, '');
  for (const ext of ['.js', '.d.ts', '.js.map', '.d.ts.map']) {
    const relPath = `packages/kernel/dist/${base}${ext}`;
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) missingEmitted.push(relPath);
    else emittedFiles.push(relPath);
  }
}
assert.deepEqual(missingEmitted, [], `missing emitted artifacts: ${JSON.stringify(missingEmitted, null, 2)}`);
const jsFiles = srcFiles.map(f => `packages/kernel/dist/${f.replace(/\.ts$/, '.js')}`);
const dtsFiles = srcFiles.map(f => `packages/kernel/dist/${f.replace(/\.ts$/, '.d.ts')}`);
const mapFiles = srcFiles.flatMap(f => [`packages/kernel/dist/${f.replace(/\.ts$/, '.js.map')}`, `packages/kernel/dist/${f.replace(/\.ts$/, '.d.ts.map')}`]);

const dynamicBans = [
  ['eval', /\beval\s*\(/],
  ['Function constructor', /\bnew\s+Function\b|\bFunction\s*\(/],
  ['Proxy metaprogramming', /\bProxy\b/],
  ['dynamic import', /\bimport\s*\(/],
  ['timer API', /\bsetTimeout\s*\(|\bsetInterval\s*\(/],
  ['Date ambient time', /\bDate\b/],
  ['Math.random ambient randomness', /\bMath\.random\b/],
  ['process ambient access', /\bprocess\s*\./],
  ['globalThis ambient access', /\bglobalThis\b/],
  ['filesystem require', /require\(['"](?:fs|node:fs)['"]\)/],
  ['network require', /require\(['"](?:net|http|https|node:net|node:http|node:https)['"]\)/],
  ['child_process require', /require\(['"](?:child_process|node:child_process)['"]\)/],
  ['prototype mutation', /Object\.setPrototypeOf|__proto__|\.prototype\s*=/],
];
const nonLocalDistRequires = [];
const bannedDynamicHits = [];
const distAuditFiles = [];
for (const relPath of jsFiles) {
  const abs = path.join(root, relPath);
  const source = fs.readFileSync(abs, 'utf8');
  const code = stripCommentsForAudit(source);
  const requires = [...code.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  for (const req of requires) {
    if (!req.startsWith('./')) {
      nonLocalDistRequires.push({ file: relPath, require: req });
      continue;
    }
    const resolved = path.join(path.dirname(abs), `${req}.js`);
    assert.ok(fs.existsSync(resolved), `local emitted require target missing: ${relPath} -> ${req}`);
  }
  for (const [label, re] of dynamicBans) {
    if (re.test(code)) bannedDynamicHits.push({ file: relPath, label, regex: String(re) });
  }
  distAuditFiles.push({
    path: relPath,
    sha256: sha256File(abs),
    lines: source.split(/\r?\n/).length,
    requireCount: requires.length,
  });
}
assert.deepEqual(nonLocalDistRequires, [], `non-local emitted dist requires found: ${JSON.stringify(nonLocalDistRequires, null, 2)}`);
assert.deepEqual(bannedDynamicHits, [], `banned emitted runtime features found: ${JSON.stringify(bannedDynamicHits, null, 2)}`);

console.log('RUNTIME_EXTRACTION_BOUNDARY_PHASE=dist-runtime-vectors');
const requireFromRoot = createRequire(path.join(root, 'runtime-extraction-boundary.cts'));
const kernel = requireFromRoot('./packages/kernel/dist/index.js');
const runtimeVectors = [];
function vector(name, fn) {
  try {
    const result = fn();
    runtimeVectors.push({ name, status: result === true ? 'PASS' : 'FAIL', result });
  } catch (error) {
    runtimeVectors.push({ name, status: 'THREW', error: `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}` });
  }
}
vector('pretty Prop from emitted JS', () => kernel.pretty(kernel.Prop) === 'Prop');
vector('level zero defeq emitted JS', () => kernel.levelDefEq(kernel.LevelZero, kernel.levelOfNat(0)) === true);
vector('sameTerm reflexive emitted JS', () => kernel.sameTerm(kernel.Prop, kernel.Prop) === true);
vector('axiom declaration accepted emitted JS', () => {
  const result = kernel.checkCoreDeclarations([{ kind: 'axiom', name: 'A_runtime', levelParams: [], type: kernel.Prop }], 'KERNEL-level-instantiation-conformance1');
  return result.status === 'accepted' && result.assumptions.includes('A_runtime');
});
vector('bad definition rejected emitted JS', () => {
  try {
    kernel.checkCoreDeclarations([{ kind: 'definition', name: 'bad_runtime', levelParams: [], type: kernel.Prop, value: kernel.Type, reducibility: 'regular' }], 'KERNEL-level-instantiation-conformance1');
    return false;
  } catch (error) {
    return /type mismatch/.test(error?.message ?? '');
  }
});
vector('quotient primitives emitted JS', () => {
  const q = kernel.generateQuotientPrimitives();
  return Array.isArray(q) && q.length === 4 && q.map(x => x.name).join(',') === 'Quot,Quot.mk,Quot.lift,Quot.ind';
});
const runtimeVectorFailures = runtimeVectors.filter(v => v.status !== 'PASS');
assert.deepEqual(runtimeVectorFailures, [], `runtime vector failures: ${JSON.stringify(runtimeVectorFailures, null, 2)}`);

const sourceLedger = srcFiles.map(f => {
  const relPath = `packages/kernel/src/${f}`;
  return { path: relPath, sha256: sha256File(path.join(root, relPath)) };
});
const distLedger = [...jsFiles, ...dtsFiles, ...mapFiles].sort().map(relPath => ({
  path: relPath,
  sha256: sha256File(path.join(root, relPath)),
  bytes: fs.statSync(path.join(root, relPath)).size,
}));
const sourceHash = sha256Text(sourceLedger.map(f => `${f.path}:${f.sha256}`).join('\n'));
const distHash = sha256Text(distLedger.map(f => `${f.path}:${f.sha256}`).join('\n'));
const extractionPairHash = sha256Text(`${sourceHash}\n${distHash}\n${tsBase.compilerOptions.target}\n${tsBase.compilerOptions.module}`);
const buildLogRel = rel(buildLog);
const formalLogRel = rel(formalLog);
const formalLogSha = sha256File(formalLog);
const effectiveFormalStackFiles = fs.readdirSync(path.join(root, 'assurance/lean4331/formal/ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean')).length;

const extractionAudit = {
  nodeVersion: process.version,
  npmVersion: assertCleanRun(run('npm', ['--version']), 'npm --version').trim(),
  packageManager: rootPkg.packageManager,
  typeScriptPackage: rootPkg.devDependencies?.typescript,
  typeScriptTarget: tsBase.compilerOptions.target,
  typeScriptModule: tsBase.compilerOptions.module,
  kernelSourceFileCount: srcFiles.length,
  emittedJsFileCount: jsFiles.length,
  emittedDtsFileCount: dtsFiles.length,
  emittedSourceMapFileCount: mapFiles.length,
  missingEmittedArtifacts: missingEmitted.length,
  nonLocalDistRequires: nonLocalDistRequires.length,
  bannedDynamicRuntimeHits: bannedDynamicHits.length,
  runtimeVectorCount: runtimeVectors.length,
  runtimeVectorFailures: runtimeVectorFailures.length,
  sourceLedger,
  distAuditFiles,
  distLedger,
  sourceHash,
  distHash,
  extractionPairHash,
  buildLog: buildLogRel,
  buildLogSha256: sha256File(buildLog),
};

const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1',
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
    targetTheorems: 6,
    reportedSorryAx: 0,
    effectiveFormalStackFiles,
  },
  executable: {
    extractionAudit,
    runtimeVectors,
    failures: 0,
  },
  inherited: {
    fullLeanGate: { status: fullGate.status, partCount: fullGate.partCount },
    kernelTSSmallStepBoundary: { status: smallStep.status, progress: smallStep.progress.percent },
    kernelTSSemanticsBoundary: { status: kernelTSSemantics.status, progress: kernelTSSemantics.progress.percent },
  },
  completedSlices: [
    'pinned Node/npm runtime ledger',
    'pinned vendored TypeScript package ledger',
    'composite TypeScript build gate',
    'emitted kernel dist completeness audit',
    'local CommonJS emitted closure audit',
    'emitted runtime dynamic-feature exclusion audit',
    'emitted declaration and source-map ledger',
    'emitted dist runtime smoke vectors',
    'inherited KernelTS small-step execution-boundary certificate',
    'inherited full Lean 4.33.1 gate evidence',
  ],
  outstandingK3Obligations: [
    'full ECMAScript or Node runtime model',
    'verified TypeScript compiler or extraction path',
    'arbitrary Lean acceptance completeness iff ProofScript acceptance',
    'exhaustive all-Lean reduction-path completeness',
    'final whole-kernel K3 equivalence theorem',
  ],
};
fs.writeFileSync(path.join(root, checkpointRel), `${JSON.stringify(checkpoint, null, 2)}\n`);

const md = `# Kernel v71 Runtime/Extraction Trust-Boundary Certificate 1\n\nStatus: **PASS**\n\nOverall v71 K3-track progress: **${progressOverall}%**\n\nThis checkpoint records the current runtime/extraction trust boundary. It adds a reproducible TypeScript build gate, emitted kernel package completeness audit, local CommonJS closure audit, dynamic-runtime exclusion audit over emitted JavaScript, runtime smoke vectors over \`packages/kernel/dist/index.js\`, and a source/dist hash ledger.\n\n## Formal target\n\n- Target: \`${targetModule}\`\n- Source: \`${targetRel}\`\n- Formal stack files: ${effectiveFormalStackFiles}\n- Reported \`sorryAx\`: 0\n\n## Runtime/extraction audit\n\n- Node: \`${extractionAudit.nodeVersion}\`\n- npm: \`${extractionAudit.npmVersion}\`\n- TypeScript package: \`${extractionAudit.typeScriptPackage}\`\n- TypeScript target/module: \`${extractionAudit.typeScriptTarget}\` / \`${extractionAudit.typeScriptModule}\`\n- Kernel source files: ${extractionAudit.kernelSourceFileCount}\n- Emitted JS files: ${extractionAudit.emittedJsFileCount}\n- Emitted declaration files: ${extractionAudit.emittedDtsFileCount}\n- Emitted map files: ${extractionAudit.emittedSourceMapFileCount}\n- Missing emitted artifacts: ${extractionAudit.missingEmittedArtifacts}\n- Non-local emitted requires: ${extractionAudit.nonLocalDistRequires}\n- Banned emitted dynamic-runtime hits: ${extractionAudit.bannedDynamicRuntimeHits}\n- Runtime vectors: ${extractionAudit.runtimeVectorCount}\n- Runtime-vector failures: ${extractionAudit.runtimeVectorFailures}\n- Source ledger hash: \`${extractionAudit.sourceHash}\`\n- Dist ledger hash: \`${extractionAudit.distHash}\`\n- Extraction pair hash: \`${extractionAudit.extractionPairHash}\`\n\n## Boundary\n\nThis is still not final K3. Node, ECMAScript, npm, and the TypeScript compiler remain trusted infrastructure. This certificate does not prove a full JavaScript runtime semantics, verified TypeScript compiler, arbitrary Lean acceptance completeness, or the final whole-kernel K3 theorem.\n`;
fs.writeFileSync(path.join(root, mdRel), md);

const shaManifest = {
  artifact: 'V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1',
  checkpoint: checkpointRel,
  checkpointSha256: sha256File(path.join(root, checkpointRel)),
  markdown: mdRel,
  markdownSha256: sha256File(path.join(root, mdRel)),
  formalSource: targetRel,
  formalSourceSha256: sha256File(path.join(root, targetRel)),
  formalLog: formalLogRel,
  formalLogSha256: formalLogSha,
  buildLog: buildLogRel,
  buildLogSha256: sha256File(buildLog),
  sourceHash,
  distHash,
  extractionPairHash,
};
fs.writeFileSync(path.join(root, 'V71_RUNTIME_EXTRACTION_TRUST_BOUNDARY1_SHA256.json'), `${JSON.stringify(shaManifest, null, 2)}\n`);

console.log(`RUNTIME_EXTRACTION_BOUNDARY_FORMAL_TARGET=PASS THEOREMS=6 SORRYAX=0 FORMAL_FILES=${effectiveFormalStackFiles}`);
console.log(`RUNTIME_EXTRACTION_BOUNDARY_BUILD=PASS NODE=${process.version} NPM=${extractionAudit.npmVersion} TS=${extractionAudit.typeScriptPackage}`);
console.log(`RUNTIME_EXTRACTION_BOUNDARY_DIST_AUDIT=PASS SRC_TS=${srcFiles.length} JS=${jsFiles.length} DTS=${dtsFiles.length} MAPS=${mapFiles.length} MISSING=${missingEmitted.length} NONLOCAL_REQUIRES=${nonLocalDistRequires.length} BANNED_HITS=${bannedDynamicHits.length}`);
console.log(`RUNTIME_EXTRACTION_BOUNDARY_RUNTIME_VECTORS=PASS COUNT=${runtimeVectors.length} FAILURES=${runtimeVectorFailures.length}`);
console.log(`RUNTIME_EXTRACTION_BOUNDARY_INHERITED_SMALLSTEP_PROGRESS=${smallStep.progress.percent}%`);
console.log(`RUNTIME_EXTRACTION_BOUNDARY_PROGRESS_OVERALL=${progressOverall}%`);
console.log('RUNTIME_EXTRACTION_BOUNDARY_STATUS=TRUST_BOUNDARY_NOT_VERIFIED_TS_COMPILER_OR_NODE_MODEL');
console.log('PASS KERNEL-v71-runtime-extraction-trust-boundary');
