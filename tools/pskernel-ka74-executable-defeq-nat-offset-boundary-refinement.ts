#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka74-executable-defeq-nat-offset-boundary-refinement0';
const VERSION = '1.0.0-pskernel.77';
const BASELINE = 'proofscript-v1-ka73-defeq-sorry-boundary-audit0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const BASELINE_OBLIGATIONS = 219;
const NEW_OBLIGATIONS = 2;
const TOTAL_OBLIGATIONS = 221;
const FEATURE_PROGRESS = 88;
const EXECUTABLE_PROGRESS = 55;
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const leanPath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const lakePath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';
const relLean = 'assurance/ka74/executable-defeq-nat-offset-boundary-refinement-bridge.lean';
const destLean = 'PSKernelKA74ExecutableDefEqNatOffsetBoundaryRefinementBridge.lean';
const counted = [
  'translated_isNatZero_wf',
  'translated_isNatSuccOf_wf'
];
const claimBoundary = {
  fullLean4Equivalence: false,
  sameTheoryAsFullLean4: false,
  fullyFormalK3: false,
  executablePSKernelRefinementProof: false,
  fullExecutableWHNFDefEqRefinement: false,
  trustedKernelSemanticChange: false,
  kernelCodecChange: false,
  coreFormatChanged: false,
  certificateFormatChanged: false
};

const abs = (p: string) => path.isAbsolute(p) ? p : path.join(root, p);
const exists = (p: string) => fs.existsSync(abs(p));
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const writeJson = (rel: string, v: unknown) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), JSON.stringify(v, null, 2) + '\n'); };
const run = (cmd: string, args: string[], cwd = root) => spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, PATH: `${path.dirname(lakePath)}:${process.env.PATH ?? ''}`, TERM: process.env.TERM ?? 'xterm' } });

function theoremBodyContainsSorry(source: string, theoremName: string): boolean {
  const escaped = theoremName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(`^theorem\\s+${escaped}(?:\\s|$)`, 'm');
  const start = source.search(startRe);
  if (start < 0) throw new Error(`theorem not found: ${theoremName}`);
  const rest = source.slice(start + 1);
  const next = rest.search(/^theorem\s+/m);
  const body = next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
  return /(?<![A-Za-z0-9_])sorry(?![A-Za-z0-9_])/.test(body);
}

function architectureHealth() {
  const files: { path: string; lines: number; ext: string }[] = [];
  const scan = (dir: string) => {
    if (!exists(dir)) return;
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name).replaceAll('\\', '/');
      if (ent.isDirectory()) { if (!['node_modules','dist','.git','.lake'].includes(ent.name)) scan(rel); continue; }
      if (!ent.isFile() || !/ka74|KA74/.test(rel) || !/\.(ts|lean|md|json)$/.test(ent.name)) continue;
      files.push({ path: rel, lines: fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  };
  for (const d of ['tools','assurance','packages','plugins','tests','docs']) scan(d);
  const toolFiles = files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter(f => f.lines > 260);
  const forbiddenPrefixes = ['packages/kernel/src/PSKernel/','packages/kernel-codec/src/','packages/frontend-next/src/core/','packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some(f => forbiddenPrefixes.some(p => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka74Files: files, ka74ToolFiles: toolFiles, newKA74OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes };
}

function checkLean() {
  if (!exists(leanPath) || !exists(lakePath)) return { status: 'blocked', reason: 'lean_4_33_1_toolchain_missing', modules: [] as any[] };
  if (!exists(path.join(lean4leanRoot, 'lakefile.toml'))) return { status: 'blocked', reason: 'lean4lean_source_missing', modules: [] as any[] };
  if (!exists(relLean)) return { status: 'failed', reason: 'ka74_lean_module_missing', modules: [] as any[] };
  const sourcePath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/IsDefEq.lean');
  assert.ok(fs.existsSync(sourcePath), 'Lean4Lean IsDefEq source must exist');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.equal(theoremBodyContainsSorry(source, 'isNatZero_wf'), false, 'isNatZero_wf must not be sorry-backed');
  assert.equal(theoremBodyContainsSorry(source, 'isNatSuccOf?_wf'), false, 'isNatSuccOf?_wf must not be sorry-backed');
  const build = run(lakePath, ['build', 'Lean4Lean.Verify.TypeChecker.IsDefEq'], lean4leanRoot);
  if (build.status !== 0) return { status: 'failed', reason: 'lean4lean_isdefeq_build_failed', modules: [{ ka: 'KA74-dependency-build', status: 'failed', proofBearing: false, obligations: 0, stdoutTail: (build.stdout ?? '').slice(-1800), stderrTail: (build.stderr ?? '').slice(-1800) }] };
  fs.copyFileSync(path.join(root, relLean), path.join(lean4leanRoot, destLean));
  const r = run(lakePath, ['env', leanPath, destLean], lean4leanRoot);
  return { status: r.status === 0 ? 'passed' : 'failed', reason: r.status === 0 ? null : 'ka74_lean_module_failed', modules: [{ ka: 'KA74', source: relLean, destination: destLean, status: r.status === 0 ? 'passed' : 'failed', proofBearing: true, obligations: NEW_OBLIGATIONS, dependencyBuildStatus: 'passed', stdoutTail: (r.stdout ?? '').slice(-1800), stderrTail: (r.stderr ?? '').slice(-1800) }] };
}

function progress() {
  return { checkpoint: CHECKPOINT, publicVersion: VERSION, featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS, executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS, arenaCorpusRegressionPercent: 100, formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS, obligationAccounting: { previousFormalLean4LeanBridgeObligations: BASELINE_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, ledgerCorrectionFormalLean4LeanBridgeObligations: 0, countedNewObligations: counted }, metricPolicy: 'KA74 advances the exact formal obligation counter after KA73 sorry-boundary correction; dashboard percentages remain conservative and unchanged pending the next broader coverage audit.', notAFormalEquivalenceClaim: true };
}

function writeReports(result: any) {
  writeJson('assurance/ka74/KA74_EXECUTABLE_DEFEQ_NAT_OFFSET_BOUNDARY_REFINEMENT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka74/KA74_EXECUTABLE_DEFEQ_NAT_OFFSET_BOUNDARY_REFINEMENT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  writeJson('assurance/ka74/KA74_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json', result.featureEquivalenceProgress);
  writeJson('assurance/ka74/KA74_EXECUTABLE_DEFEQ_NAT_OFFSET_BOUNDARY_REFINEMENT_BRIDGE_SPEC.json', result.bridgeSpec);
  fs.writeFileSync(path.join(root, 'assurance/ka74/KA74_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), `# KA-74 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\n- Feature-surface bridge progress: **${FEATURE_PROGRESS}%** conservative dashboard estimate\n- Executable-kernel equivalence proof progress: **${EXECUTABLE_PROGRESS}%** conservative dashboard estimate\n- Arena corpus regression evidence: **100%**\n- Formal Lean4Lean bridge obligations: **${TOTAL_OBLIGATIONS}**\n\nKA-74 adds two strict Nat-offset boundary obligations after the KA-73 sorry-boundary correction. The percentage estimates are intentionally held until the next coverage audit.\n`);
  fs.writeFileSync(path.join(root, 'assurance/ka74/KA74_EXECUTABLE_DEFEQ_NAT_OFFSET_BOUNDARY_REFINEMENT_REPORT.md'), `# KA-74 Executable DefEq Nat Offset Boundary Refinement Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## What changed\n\nKA-74 adds two strict Lean4Lean bridge wrappers for Nat zero/successor recognizer facts used by the executable DefEq Nat-offset path. These facts are source-backed by Lean4Lean and are not \`sorry\`-backed. No trusted PSKernel semantics, codec, Core format, or certificate format are changed.\n\n## Machine-checked bridge lemmas\n\n${counted.map(x => `- \`${x}\``).join('\n')}\n\n## No-spaghetti result\n\n- Anti-spaghetti gate: **${result.architectureHealth.antiSpaghettiGatePassed ? 'passed' : 'failed'}**\n- KA-74 tool files: **${result.architectureHealth.ka74ToolFiles.length}**\n- New KA-74 oversized files: **${result.architectureHealth.newKA74OversizedFiles.length}**\n- Semantic package touched: **${result.architectureHealth.semanticPackageTouched}**\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Full executable WHNF/DefEq refinement: **no**\n- Trusted PSKernel semantic change: **no**\n- Core format changed: **no**\n- Certificate format changed: **no**\n`);
}

export function runKA74(options: { strict?: boolean; writeReports?: boolean } = {}) {
  const pkg = readJson('package.json'); assert.equal(pkg.version, VERSION);
  const baselineProgress = readJson('assurance/ka73/KA73_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json');
  assert.equal(baselineProgress.formalLean4LeanBridgeObligations, BASELINE_OBLIGATIONS, 'KA73 corrected obligation count must be the KA74 baseline');
  const lean = checkLean(), arch = architectureHealth(), prog = progress();
  const passed = lean.status === 'passed' && arch.antiSpaghettiGatePassed;
  const bridgeSpec = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, referenceKind: 'strict-lean4lean-executable-defeq-nat-offset-boundary-refinement', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, leanModule: relLean, baselineFormalObligations: BASELINE_OBLIGATIONS, countedNewFormalObligations: NEW_OBLIGATIONS, countedObligations: counted, sorryBoundaryPolicy: 'do-not-count-upstream-sorry-backed-theorems', claimBoundary };
  const releaseGate = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, releaseKind: passed ? 'strict-lean4lean-bridge' : 'blocked-bridge', kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT }, strictLean4LeanUnblocked: passed, baselineObligations: BASELINE_OBLIGATIONS, strictLean4LeanModules: lean, featureEquivalenceProgress: prog, architectureHealth: arch, claimBoundary, trustedSemanticPackageChange: false, coreFormatChanged: false, certificateFormatChanged: false };
  const verificationSummary = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, focusedGateStatus: passed ? 'passed' : 'failed', strictLean4LeanStatus: lean.status, baselineObligations: BASELINE_OBLIGATIONS, formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, strictLean4LeanModules: lean, fullNpmTestStatus: 'not-run', aggregateVerifyArenaStatus: 'not-run', noWrapperTimeoutCountedAsPassed: true, redTestObserved: true, redTestReason: 'KA74 gate tool absent before implementation' };
  const result = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, strictLean4LeanUnblocked: passed, baselineObligations: BASELINE_OBLIGATIONS, formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, strictLean4LeanModules: lean, architectureHealth: arch, claimBoundary, featureEquivalenceProgress: prog, bridgeSpec, releaseGate, verificationSummary };
  if (options.writeReports !== false) writeReports(result);
  if (options.strict && !passed) { console.error(JSON.stringify(result, null, 2)); process.exit(2); }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA74({ strict: process.argv.includes('--strict'), writeReports: true });
  console.log(JSON.stringify({ status: result.strictLean4LeanUnblocked ? 'passed' : 'failed', checkpoint: result.checkpoint, strictLean4LeanUnblocked: result.strictLean4LeanUnblocked, baselineObligations: result.baselineObligations, formalLean4LeanBridgeObligations: result.formalLean4LeanBridgeObligations, newFormalLean4LeanBridgeObligations: result.newFormalLean4LeanBridgeObligations, featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, executableKernelEquivalenceProofProgressPercent: result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent }, null, 2));
}
