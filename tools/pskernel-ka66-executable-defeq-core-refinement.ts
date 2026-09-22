#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka66-executable-defeq-core-refinement0';
const VERSION = '1.0.0-pskernel.69';
const BASELINE = 'proofscript-v1-ka65-executable-whnf-refinement0';
const CORE_FORMAT = 71, CERT_FORMAT = 2;
const BASELINE_OBLIGATIONS = 196, NEW_OBLIGATIONS = 4, TOTAL_OBLIGATIONS = 200;
const FEATURE_PROGRESS = 87, EXECUTABLE_PROGRESS = 53;
const KNOWN_BASELINE_REGRESSION = { test: 'tools/kernel-indexed-recursors-tests.ts', assertion: 'multi-index/multi-recursive iota mismatch', baselineKA65Reproduced: true, ka66Reproduced: true, introducedByKA66: false };
const RELEASE_TOOLING_FIX = { test: 'tools/test-runner-child-runtime-tests.ts', issue: 'test-runner child .ts processes omitted parent Node strip-types flags', fixed: true };
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const leanPath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const lakePath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';
const relLean = 'assurance/ka66/executable-defeq-core-refinement-bridge.lean';
const destLean = 'PSKernelKA66ExecutableDefEqCoreRefinementBridge.lean';
const counted = [
  'translated_isDefEqCore_wf',
  'translated_isDefEqCore_prime_wf',
  'translated_quickIsDefEq_wf',
  'translated_isDefEqArgs_wf'
];

const abs = (p: string) => path.isAbsolute(p) ? p : path.join(root, p);
const exists = (p: string) => fs.existsSync(abs(p));
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const writeJson = (rel: string, v: unknown) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), JSON.stringify(v, null, 2) + '\n'); };
const run = (cmd: string, args: string[], cwd = root) => spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, PATH: `${path.dirname(lakePath)}:${process.env.PATH ?? ''}`, TERM: process.env.TERM ?? 'xterm' } });

function architectureHealth() {
  const files: { path: string; lines: number; ext: string }[] = [];
  const scan = (dir: string) => {
    if (!exists(dir)) return;
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name).replaceAll('\\', '/');
      if (ent.isDirectory()) { if (!['node_modules','dist','.git','.lake'].includes(ent.name)) scan(rel); continue; }
      if (!ent.isFile() || !/ka66|KA66/.test(rel) || !/\.(ts|lean|md|json)$/.test(ent.name)) continue;
      files.push({ path: rel, lines: fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  };
  for (const d of ['tools','assurance','packages','plugins','tests','docs']) scan(d);
  const toolFiles = files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter(f => f.lines > 260);
  const forbiddenPrefixes = ['packages/kernel/src/PSKernel/','packages/kernel-codec/src/','packages/frontend-next/src/core/','packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some(f => forbiddenPrefixes.some(p => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka66Files: files, ka66ToolFiles: toolFiles, newKA66OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes };
}

function checkLean() {
  if (!exists(leanPath) || !exists(lakePath)) return { status: 'blocked', reason: 'lean_4_33_1_toolchain_missing', modules: [] as any[] };
  if (!exists(path.join(lean4leanRoot, 'lakefile.toml'))) return { status: 'blocked', reason: 'lean4lean_source_missing', modules: [] as any[] };
  if (!exists(relLean)) return { status: 'failed', reason: 'ka66_lean_module_missing', modules: [] as any[] };
  const build = run(lakePath, ['build', 'Lean4Lean.Verify.TypeChecker.IsDefEq'], lean4leanRoot);
  if (build.status !== 0) return { status: 'failed', reason: 'lean4lean_isdefeq_build_failed', modules: [{ ka: 'KA66-dependency-build', source: 'Lean4Lean.Verify.TypeChecker.IsDefEq', status: 'failed', proofBearing: false, obligations: 0, stdoutTail: (build.stdout ?? '').slice(-1800), stderrTail: (build.stderr ?? '').slice(-1800) }] };
  fs.copyFileSync(path.join(root, relLean), path.join(lean4leanRoot, destLean));
  const r = run(lakePath, ['env', leanPath, destLean], lean4leanRoot);
  return { status: r.status === 0 ? 'passed' : 'failed', reason: r.status === 0 ? null : 'ka66_lean_module_failed', modules: [{ ka: 'KA66', source: relLean, destination: destLean, status: r.status === 0 ? 'passed' : 'failed', proofBearing: true, obligations: NEW_OBLIGATIONS, dependencyBuildStatus: 'passed', stdoutTail: (r.stdout ?? '').slice(-1800), stderrTail: (r.stderr ?? '').slice(-1800) }] };
}

function progress() {
  return {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS,
    executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS,
    arenaCorpusRegressionPercent: 100,
    formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS,
    obligationAccounting: { previousFormalLean4LeanBridgeObligations: BASELINE_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, countedNewObligations: counted },
    metricPolicy: 'KA66 advances the exact formal obligation counter only; percentage estimates are held at the latest audited KA65 values pending a separate coverage audit.',
    notAFormalEquivalenceClaim: true
  };
}

function writeReports(result: any) {
  writeJson('assurance/ka66/KA66_EXECUTABLE_DEFEQ_CORE_REFINEMENT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka66/KA66_EXECUTABLE_DEFEQ_CORE_REFINEMENT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  writeJson('assurance/ka66/KA66_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json', result.featureEquivalenceProgress);
  writeJson('assurance/ka66/executable-defeq-core-refinement-bridge-spec.json', result.bridgeSpec);
  fs.writeFileSync(path.join(root, 'assurance/ka66/KA66_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), `# KA-66 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\n- Feature-surface bridge progress: **${FEATURE_PROGRESS}%** (held pending audit)\n- Executable-kernel equivalence proof progress: **${EXECUTABLE_PROGRESS}%** (held pending audit)\n- Arena corpus regression evidence: **100%**\n- Formal Lean4Lean bridge obligations: **${TOTAL_OBLIGATIONS}**\n\nKA-66 adds four strict DefEq-core bridge obligations. Percentage estimates are intentionally not increased without a separate coverage audit.\n`);
  fs.writeFileSync(path.join(root, 'assurance/ka66/KA66_EXECUTABLE_DEFEQ_CORE_REFINEMENT_REPORT.md'), `# KA-66 Executable DefEq Core Refinement Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## What changed\n\nKA-66 promotes four direct Lean4Lean DefEq proof surfaces into strict counted bridge obligations: top-level \`isDefEqCore\`, recursive \`isDefEqCore'\`, \`quickIsDefEq\`, and application-argument DefEq. No trusted PSKernel semantics, codec, Core format, or certificate format are changed. KA-66 also fixes the release test runner so child TypeScript tools inherit the parent Node strip-types flags; the full suite then exposes a pre-existing indexed-recursor iota regression reproduced unchanged on the untouched KA-65 baseline.\n\n## Machine-checked bridge lemmas\n\n${counted.map(x => `- \`${x}\``).join('\n')}\n\n## No-spaghetti result\n\n- Anti-spaghetti gate: **${result.architectureHealth.antiSpaghettiGatePassed ? 'passed' : 'failed'}**\n- KA-66 tool files: **${result.architectureHealth.ka66ToolFiles.length}**\n- New KA-66 oversized files: **${result.architectureHealth.newKA66OversizedFiles.length}**\n- Semantic package touched: **${result.architectureHealth.semanticPackageTouched}**\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Full executable WHNF/DefEq refinement: **no**\n- Trusted PSKernel semantic change: **no**\n- Core format changed: **no**\n- Certificate format changed: **no**\n`);
}

export function runKA66(options: { strict?: boolean; writeReports?: boolean } = {}) {
  const pkg = readJson('package.json'); assert.equal(pkg.version, VERSION);
  const ka65 = readJson('assurance/ka65/KA65_EXECUTABLE_WHNF_REFINEMENT_RELEASE_GATE.json');
  assert.equal(ka65.featureEquivalenceProgress.formalLean4LeanBridgeObligations, BASELINE_OBLIGATIONS, 'KA65 release gate must support the baseline');
  const lean = checkLean(), arch = architectureHealth(), prog = progress();
  const claimBoundary = { fullLean4Equivalence: false, sameTheoryAsFullLean4: false, fullyFormalK3: false, executablePSKernelRefinementProof: false, fullExecutableWHNFDefEqRefinement: false, trustedKernelSemanticChange: false, kernelCodecChange: false, coreFormatChanged: false, certificateFormatChanged: false };
  const passed = lean.status === 'passed' && arch.antiSpaghettiGatePassed;
  const bridgeSpec = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, referenceKind: 'strict-lean4lean-executable-defeq-core-refinement', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, leanModule: relLean, baselineFormalObligations: BASELINE_OBLIGATIONS, countedNewFormalObligations: NEW_OBLIGATIONS, countedNewObligationNames: counted, metricPolicy: prog.metricPolicy, claimBoundary };
  const releaseGate = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, releaseKind: passed ? 'strict-lean4lean-bridge-known-baseline-regression' : 'blocked-bridge', kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT }, strictLean4LeanUnblocked: passed, baselineObligations: BASELINE_OBLIGATIONS, strictLean4LeanModules: lean, featureEquivalenceProgress: prog, architectureHealth: arch, claimBoundary, trustedSemanticPackageChange: false, coreFormatChanged: false, certificateFormatChanged: false, fullSuiteGreen: false, knownBaselineRegression: KNOWN_BASELINE_REGRESSION, releaseToolingFix: RELEASE_TOOLING_FIX };
  const verificationSummary = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, focusedGateStatus: passed ? 'passed' : 'failed', strictLean4LeanStatus: lean.status, baselineObligations: BASELINE_OBLIGATIONS, strictLean4LeanModules: lean, fullNpmTestStatus: 'failed-known-baseline-regression', knownBaselineRegression: KNOWN_BASELINE_REGRESSION, releaseToolingFix: RELEASE_TOOLING_FIX, noWrapperTimeoutCountedAsPassed: true, redTestObserved: true, redTestReason: 'KA66 gate tool absent before implementation' };
  const result = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, strictLean4LeanUnblocked: passed, baselineObligations: BASELINE_OBLIGATIONS, formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, strictLean4LeanModules: lean, architectureHealth: arch, claimBoundary, featureEquivalenceProgress: prog, bridgeSpec, releaseGate, verificationSummary };
  if (options.writeReports !== false) writeReports(result);
  if (options.strict && !passed) { console.error(JSON.stringify(result, null, 2)); process.exit(2); }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA66({ strict: process.argv.includes('--strict'), writeReports: true });
  console.log(JSON.stringify({ status: result.strictLean4LeanUnblocked ? 'passed' : 'failed', checkpoint: result.checkpoint, strictLean4LeanUnblocked: result.strictLean4LeanUnblocked, baselineObligations: result.baselineObligations, formalLean4LeanBridgeObligations: result.formalLean4LeanBridgeObligations, newFormalLean4LeanBridgeObligations: result.newFormalLean4LeanBridgeObligations }, null, 2));
}
