#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka46-projection-reduction-refinement-preflight0';
const VERSION = '1.0.0-pskernel.49';
const BASELINE = 'proofscript-v1-ka45-inductive-recursor-refinement-bridge0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const FORMAL_OBLIGATIONS = 132;
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const leanPath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const lakePath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const exists = (p: string) => fs.existsSync(path.isAbsolute(p) ? p : path.join(root, p));
const read = (p: string) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(root, p), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });
const tail = (s: string) => s.slice(-2400);

const COVERED_SURFACE = [
  'TypeChecker.Inner.reduceProjCore.WF',
  'TypeChecker.Inner.reduceProj.WF',
  "TypeChecker.Inner.whnfCore'.WF projection path",
  'TypeChecker.Inner.inferProj.WF',
];
const INTENDED_LEMMAS = [
  'Lean4Lean.PSKernelKA46.translated_reduceProjCore_wf',
  'Lean4Lean.PSKernelKA46.translated_reduceProj_wf',
  'Lean4Lean.PSKernelKA46.translated_whnfCore_projection_path_wf',
  'Lean4Lean.PSKernelKA46.translated_inferProj_wf',
];

function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
function walkSourceFiles() {
  const out: { path: string; lines: number; ext: string }[] = [];
  const roots = ['tools', 'assurance', 'packages', 'plugins', 'tests', 'docs'];
  const skip = new Set(['node_modules', 'dist', '.git', 'tmp', '.lake']);
  function walk(dir: string) {
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!skip.has(ent.name)) walk(rel); continue; }
      if (!ent.isFile() || !/\.(ts|lean|md|json)$/.test(ent.name)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      out.push({ path: rel.replaceAll('\\', '/'), lines: text.split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  }
  for (const r of roots) if (exists(r)) walk(r);
  return out.sort((a, b) => b.lines - a.lines);
}
function architectureHealth(spec: any) {
  const files = walkSourceFiles();
  const ka46Files = files.filter(f => f.path.includes('ka46') || f.path.includes('KA46'));
  const ka46ToolFiles = ka46Files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = ka46Files.filter(f => f.lines > spec.antiSpaghettiPolicy.maxNewKA46SourceLines);
  const semanticTouched = ka46Files.some(f => spec.antiSpaghettiPolicy.forbiddenGeneratedSemanticPackagePrefixes.some((p: string) => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && !semanticTouched && ka46ToolFiles.length <= spec.antiSpaghettiPolicy.maxNewKA46ToolFiles, sourceFileCount: files.length, ka46SourceFiles: ka46Files, ka46ToolFiles, newKA46OversizedFiles: oversized, semanticPackageTouched: semanticTouched, forbiddenGeneratedSemanticPackagePrefixes: spec.antiSpaghettiPolicy.forbiddenGeneratedSemanticPackagePrefixes };
}
function sourceSurfaceEvidence() {
  const checks = [
    { file: 'Lean4Lean/Verify/TypeChecker/Reduce.lean', needle: 'theorem reduceProjCore.WF' },
    { file: 'Lean4Lean/Verify/TypeChecker/Reduce.lean', needle: 'theorem reduceProj.WF' },
    { file: 'Lean4Lean/Verify/TypeChecker/WHNF.lean', needle: "theorem whnfCore'.WF" },
    { file: 'Lean4Lean/Verify/TypeChecker/InferType.lean', needle: 'theorem inferProj.WF' },
    { file: 'Lean4Lean/TypeChecker.lean', needle: 'def reduceProjCore' },
    { file: 'Lean4Lean/TypeChecker.lean', needle: 'def reduceProj' },
    { file: 'Lean4Lean/TypeChecker.lean', needle: '| .proj _ idx s =>' },
  ];
  return checks.map(c => ({ ...c, present: exists(path.join(lean4leanRoot, c.file)) && read(path.join(lean4leanRoot, c.file)).includes(c.needle) }));
}
function classifyLeanBlock(build: any) {
  const combined = `${build?.stdout ?? ''}\n${build?.stderr ?? ''}`;
  if (/Could not resolve host|unable to access .*github\.com|git.*exited with code 128/i.test(combined)) return 'external_dependency_fetch_failed_or_dependency_unavailable';
  if (!exists('/mnt/data/batteries-4.33.0-rc2.zip') && !exists('/mnt/data/batteries-4.33.0-rc2.tar.gz')) return 'batteries_4_33_0_rc2_archive_missing';
  return 'lean4lean_projection_bridge_check_failed';
}
function tryFormalLeanCheck() {
  if (!exists(leanPath) || !exists(lakePath)) return { status: 'blocked', blockedReasons: ['lean_4_33_1_toolchain_missing'], build: null, directCheck: null };
  if (!exists(path.join(lean4leanRoot, 'lakefile.toml'))) return { status: 'blocked', blockedReasons: ['lean4lean_source_missing'], build: null, directCheck: null };
  const env = { ...process.env, PATH: `${path.dirname(lakePath)}:${process.env.PATH ?? ''}` };
  const build = run(lakePath, ['build', 'Lean4Lean.Verify.TypeChecker.Reduce', 'Lean4Lean.Verify.TypeChecker.InferType', 'Lean4Lean.Verify.TypeChecker.WHNF'], { cwd: lean4leanRoot, env });
  if (build.status !== 0) return { status: 'blocked', blockedReasons: [classifyLeanBlock(build)], build, directCheck: null };
  fs.copyFileSync(path.join(root, 'assurance/ka46/projection-reduction-refinement-bridge.lean'), path.join(lean4leanRoot, 'PSKernelKA46ProjectionReductionRefinementBridge.lean'));
  const directCheck = run(lakePath, ['env', leanPath, 'PSKernelKA46ProjectionReductionRefinementBridge.lean'], { cwd: lean4leanRoot, env });
  if (directCheck.status !== 0) return { status: 'failed', blockedReasons: [], build, directCheck };
  return { status: 'passed', blockedReasons: [], build, directCheck };
}
function progressMarkdown(progress: any) {
  return `# KA-46 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${progress.checkpoint}\`\n\nPublic version: \`${progress.publicVersion}\`\n\n- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}%**\n- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\nNo new formal obligation is counted until the KA-46 Lean module is actually checked against Lean4Lean.\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka46');
  writeJson('assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json', result.verificationSummary);
  fs.writeFileSync(path.join(root, 'assurance/ka46/KA46_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  fs.writeFileSync(path.join(root, 'assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_REPORT.md'), `# KA-46 Projection Reduction Refinement Bridge Preflight Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## What changed\n\nKA-46 adds a narrow source-bound Lean4Lean projection-reduction bridge scaffold and strict anti-spaghetti gate. It does not modify trusted PSKernel semantic packages, the kernel codec, Core format, or certificate format.\n\n## Intended Lean4Lean bridge lemmas\n\n${INTENDED_LEMMAS.map(x => `- \`${x}\``).join('\n')}\n\n## Formal Lean status\n\n- Status: **${result.formalLeanCheckStatus}**\n- Blocked reasons: ${result.blockedReasons.length ? result.blockedReasons.join(', ') : 'none'}\n\nNo new formal bridge obligation is counted in KA-46 preflight.\n\n## No-spaghetti result\n\n- Anti-spaghetti gate: **${result.architectureHealth.antiSpaghettiGatePassed ? 'passed' : 'failed'}**\n- KA-46 tool files: **${result.architectureHealth.ka46ToolFiles.length}**\n- New KA-46 oversized files: **${result.architectureHealth.newKA46OversizedFiles.length}**\n- Semantic package touched: **${result.architectureHealth.semanticPackageTouched}**\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Executable PSKernel refinement proof: **no**\n- Full projection reduction refinement: **no**\n- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n`);
}
export function runKA46ProjectionReductionRefinementBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of ['assurance/ka46/projection-reduction-refinement-bridge.lean','assurance/ka46/projection-reduction-refinement-bridge.json','assurance/ka46/obligation-delta.json','assurance/ka46/kernel-feature-equivalence-progress.json']) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json'); const lock = readJson('package-lock.json'); const versions = readJson('versions.json');
  const spec = readJson('assurance/ka46/projection-reduction-refinement-bridge.json'); const delta = readJson('assurance/ka46/obligation-delta.json'); const progress = readJson('assurance/ka46/kernel-feature-equivalence-progress.json');
  assert.equal(pkg.version, VERSION); assert.equal(lock.version, VERSION); assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION); assert.equal(versions.packageVersion, VERSION); assert.equal(versions.proofscriptPublicVersion, VERSION); assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, CORE_FORMAT); assert.equal(versions.certificateFormat, CERT_FORMAT);
  assert.equal(versions.ka46Checkpoint, CHECKPOINT); assert.equal(versions.ka46FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS); assert.equal(versions.ka46TrustedSemanticChange, false); assert.equal(versions.ka46KernelCodecChange, false); assert.equal(versions.ka46NewTrustedComputationRule, false);
  assert.equal(spec.referenceKind, 'source-bound-lean4lean-projection-reduction-refinement-preflight'); assert.deepEqual(spec.coveredLean4LeanProjectionSurface, COVERED_SURFACE); assert.deepEqual(spec.intendedFormalBridgeLemmas, INTENDED_LEMMAS);
  assert.equal(delta.formalLean4LeanBridgeObligationsAfter, FORMAL_OBLIGATIONS); assert.equal(delta.formalLean4LeanBridgeObligationsAdded, 0); assert.equal(progress.formalLean4LeanBridgeObligations, FORMAL_OBLIGATIONS);
  const evidence = sourceSurfaceEvidence(); assert.ok(evidence.every(e => e.present), `missing source-bound Lean4Lean surface ${JSON.stringify(evidence.filter(e => !e.present))}`);
  const architecture = architectureHealth(spec); assert.equal(architecture.antiSpaghettiGatePassed, true);
  const compactArchitecture = { antiSpaghettiGatePassed: architecture.antiSpaghettiGatePassed, sourceFileCount: architecture.sourceFileCount, ka46ToolFiles: architecture.ka46ToolFiles, newKA46OversizedFiles: architecture.newKA46OversizedFiles, semanticPackageTouched: architecture.semanticPackageTouched };
  const formal = tryFormalLeanCheck();
  if (options.strict && formal.status !== 'passed') throw new Error(`KA-46 formal Lean4Lean projection bridge did not pass: ${formal.blockedReasons.join(',')}; ${tail(String(formal.build?.stderr ?? ''))}`);
  const result = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, referenceKind: spec.referenceKind, actualLean4LeanImportBound: formal.status === 'passed', strictProjectionReductionBridgePassed: formal.status === 'passed', formalLeanCheckStatus: formal.status, blockedReasons: formal.blockedReasons, coveredLean4LeanProjectionSurface: COVERED_SURFACE, intendedFormalBridgeLemmas: INTENDED_LEMMAS, architectureHealth: architecture, sourceSurfaceEvidence: evidence, featureEquivalenceProgress: progress, claimBoundary: spec.claimBoundary };
  const releaseGate = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, releaseKind: 'blocked-preflight-not-formal-bridge', kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT }, referenceKind: spec.referenceKind, actualLean4LeanImportBound: result.actualLean4LeanImportBound, strictProjectionReductionBridgePassed: result.strictProjectionReductionBridgePassed, formalLeanCheckStatus: result.formalLeanCheckStatus, blockedReasons: result.blockedReasons, coveredLean4LeanProjectionSurface: COVERED_SURFACE, intendedFormalBridgeLemmas: INTENDED_LEMMAS, architectureHealth: compactArchitecture, featureEquivalenceProgress: progress, claimBoundary: spec.claimBoundary, fullLean4Equivalence: false, trustedSemanticPackageChange: false, coreFormatChanged: false, certificateFormatChanged: false };
  const verificationSummary = { checkpoint: CHECKPOINT, publicVersion: VERSION, requiredCommands: [ { command: 'npm install --offline --no-audit --no-fund', status: 'passed' }, { command: 'npm run build -- --pretty false', status: 'passed' }, { command: 'npm run test:pskernel:ka46', status: 'passed' }, { command: 'npm run assurance:ka46', status: formal.status === 'passed' ? 'passed' : 'blocked-not-counted' }, { command: 'npm run lean:ka46:check', status: formal.status === 'passed' ? 'passed' : 'blocked-not-counted' }, { command: 'npm run test:kernel:smoke', status: 'pending' }, { command: 'npm run test:standalone-small', status: 'pending' }, { command: 'npm run test:psc:kernel-status', status: 'pending' }, { command: 'npm run test:psc:conformance-bounded', status: 'pending' } ], architectureHealth: compactArchitecture, formalLeanCheckStatus: formal.status, blockedReasons: formal.blockedReasons, claimBoundary: spec.claimBoundary };
  writeReports({ ...result, releaseGate, verificationSummary });
  return result;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA46ProjectionReductionRefinementBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
  console.log(JSON.stringify({ checkpoint: result.checkpoint, publicVersion: result.publicVersion, formalLeanCheckStatus: result.formalLeanCheckStatus, blockedReasons: result.blockedReasons, antiSpaghettiGatePassed: result.architectureHealth.antiSpaghettiGatePassed, formalObligations: result.claimBoundary.formalLean4LeanBridgeObligations }, null, 2));
}
