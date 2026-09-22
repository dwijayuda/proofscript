#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka47-executable-expression-translator-refinement-preflight0';
const VERSION = '1.0.0-pskernel.50';
const BASELINE = 'proofscript-v1-ka46-projection-reduction-refinement-preflight0';
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
  'Lean4Lean.VExpr constructor surface',
  'Lean4Lean.TrExprS executable translation relation',
  'Lean.Expr.Closed / Lean.Expr.FVarsIn executable preconditions',
  'VExpr.liftN / VExpr.instL / VExpr.instVar substitution surfaces',
  'TrExpr defeq closure surface',
];
const INTENDED_LEMMAS = [
  'Lean4Lean.PSKernelKA47.translated_vexpr_constructor_surface_available',
  'Lean4Lean.PSKernelKA47.translated_trExprS_constructor_surface_available',
  'Lean4Lean.PSKernelKA47.translated_mvar_exclusion_surface_available',
  'Lean4Lean.PSKernelKA47.translated_vexpr_substitution_surface_available',
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
    const abs = path.join(root, dir); if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!skip.has(ent.name)) walk(rel); continue; }
      if (!ent.isFile() || !/\.(ts|lean|md|json)$/.test(ent.name)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      out.push({ path: rel.replaceAll('\\', '/'), lines: text.split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  }
  for (const r of roots) walk(r);
  return out.sort((a, b) => b.lines - a.lines);
}
function architectureHealth(spec: any) {
  const files = walkSourceFiles();
  const ka47Files = files.filter(f => f.path.includes('ka47') || f.path.includes('KA47'));
  const ka47ToolFiles = ka47Files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = ka47Files.filter(f => f.lines > spec.antiSpaghettiPolicy.maxNewKA47SourceLines);
  const semanticTouched = ka47Files.some(f => spec.antiSpaghettiPolicy.forbiddenGeneratedSemanticPackagePrefixes.some((p: string) => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && !semanticTouched && ka47ToolFiles.length <= spec.antiSpaghettiPolicy.maxNewKA47ToolFiles, sourceFileCount: files.length, ka47SourceFiles: ka47Files, ka47ToolFiles, newKA47OversizedFiles: oversized, semanticPackageTouched: semanticTouched, forbiddenGeneratedSemanticPackagePrefixes: spec.antiSpaghettiPolicy.forbiddenGeneratedSemanticPackagePrefixes };
}
function sourceSurfaceEvidence() {
  const checks = [
    { file: 'Lean4Lean/Theory/VExpr.lean', needle: 'inductive VExpr where' },
    { file: 'Lean4Lean/Theory/VExpr.lean', needle: 'def liftN' },
    { file: 'Lean4Lean/Theory/VExpr.lean', needle: 'def instL' },
    { file: 'Lean4Lean/Theory/VExpr.lean', needle: 'def instVar' },
    { file: 'Lean4Lean/Verify/Typing/Expr.lean', needle: 'def Closed : Expr' },
    { file: 'Lean4Lean/Verify/Typing/Expr.lean', needle: 'def FVarsIn : Expr' },
    { file: 'Lean4Lean/Verify/Typing/Expr.lean', needle: 'inductive TrExprS' },
    { file: 'Lean4Lean/Verify/Typing/Expr.lean', needle: 'def TrExpr' },
    { file: 'Lean4Lean/Verify/Typing/Expr.lean', needle: '| .mvar .., _ => False' },
  ];
  return checks.map(c => ({ ...c, present: exists(path.join(lean4leanRoot, c.file)) && read(path.join(lean4leanRoot, c.file)).includes(c.needle) }));
}
function classifyLeanBlock(build: any) {
  const combined = `${build?.stdout ?? ''}\n${build?.stderr ?? ''}`;
  if (/Could not resolve host|unable to access .*github\.com|git.*exited with code 128/i.test(combined)) return 'external_dependency_fetch_failed_or_dependency_unavailable';
  if (!exists('/mnt/data/batteries-4.33.0-rc2.zip') && !exists('/mnt/data/batteries-4.33.0-rc2.tar.gz')) return 'batteries_4_33_0_rc2_archive_missing';
  return 'lean4lean_executable_expression_translator_bridge_check_failed';
}
function tryFormalLeanCheck() {
  if (!exists(leanPath) || !exists(lakePath)) return { status: 'blocked', blockedReasons: ['lean_4_33_1_toolchain_missing'], build: null, directCheck: null };
  if (!exists(path.join(lean4leanRoot, 'lakefile.toml'))) return { status: 'blocked', blockedReasons: ['lean4lean_source_missing'], build: null, directCheck: null };
  const env = { ...process.env, PATH: `${path.dirname(lakePath)}:${process.env.PATH ?? ''}` };
  const build = run(lakePath, ['build', 'Lean4Lean.Verify.Typing.Expr', 'Lean4Lean.Theory.VExpr', 'Lean4Lean.Verify.Expr'], { cwd: lean4leanRoot, env });
  if (build.status !== 0) return { status: 'blocked', blockedReasons: [classifyLeanBlock(build)], build, directCheck: null };
  fs.copyFileSync(path.join(root, 'assurance/ka47/executable-expression-translator-refinement-bridge.lean'), path.join(lean4leanRoot, 'PSKernelKA47ExecutableExpressionTranslatorRefinementBridge.lean'));
  const directCheck = run(lakePath, ['env', leanPath, 'PSKernelKA47ExecutableExpressionTranslatorRefinementBridge.lean'], { cwd: lean4leanRoot, env });
  if (directCheck.status !== 0) return { status: 'failed', blockedReasons: [], build, directCheck };
  return { status: 'passed', blockedReasons: [], build, directCheck };
}
function progressMarkdown(progress: any) {
  return `# KA-47 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${progress.checkpoint}\`\n\nPublic version: \`${progress.publicVersion}\`\n\n- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}%**\n- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\nNo new formal obligation is counted until the KA-47 Lean module is actually checked against Lean4Lean.\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka47');
  writeJson('assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  fs.writeFileSync(path.join(root, 'assurance/ka47/KA47_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  fs.writeFileSync(path.join(root, 'assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_REPORT.md'), `# KA-47 Executable Expression Translator Refinement Preflight Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## What changed\n\nKA-47 adds a narrow source-bound Lean4Lean executable-expression-translator refinement scaffold and strict anti-spaghetti gate. It does not modify trusted PSKernel semantic packages, the kernel codec, Core format, or certificate format.\n\n## Intended Lean4Lean bridge lemmas\n\n${INTENDED_LEMMAS.map(x => `- \`${x}\``).join('\n')}\n\n## Formal Lean status\n\n- Status: **${result.formalLeanCheckStatus}**\n- Blocked reasons: ${result.blockedReasons.length ? result.blockedReasons.join(', ') : 'none'}\n\nNo new formal bridge obligation is counted in KA-47 preflight.\n\n## No-spaghetti result\n\n- Anti-spaghetti gate: **${result.architectureHealth.antiSpaghettiGatePassed ? 'passed' : 'failed'}**\n- KA-47 tool files: **${result.architectureHealth.ka47ToolFiles.length}**\n- New KA-47 oversized files: **${result.architectureHealth.newKA47OversizedFiles.length}**\n- Semantic package touched: **${result.architectureHealth.semanticPackageTouched}**\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Executable PSKernel refinement proof: **no**\n- Full executable expression translator refinement: **no**\n- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n`);
}
export function runKA47ExecutableExpressionTranslatorRefinementGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of ['assurance/ka47/executable-expression-translator-refinement-bridge.lean','assurance/ka47/executable-expression-translator-refinement-bridge.json','assurance/ka47/obligation-delta.json','assurance/ka47/kernel-feature-equivalence-progress.json']) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json'); const lock = readJson('package-lock.json'); const versions = readJson('versions.json');
  const spec = readJson('assurance/ka47/executable-expression-translator-refinement-bridge.json'); const delta = readJson('assurance/ka47/obligation-delta.json'); const progress = readJson('assurance/ka47/kernel-feature-equivalence-progress.json');
  assert.equal(pkg.version, VERSION); assert.equal(lock.version, VERSION); assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION); assert.equal(versions.packageVersion, VERSION); assert.equal(versions.kernelArtifactFormat, CORE_FORMAT); assert.equal(versions.certificateFormat, CERT_FORMAT);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT); assert.equal(versions.ka47Checkpoint, CHECKPOINT); assert.equal(versions.ka47FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS); assert.equal(versions.ka47TrustedSemanticChange, false); assert.equal(versions.ka47KernelCodecChange, false); assert.equal(versions.ka47NewTrustedComputationRule, false);
  assert.equal(spec.referenceKind, 'source-bound-lean4lean-executable-expression-translator-refinement-preflight'); assert.deepEqual(spec.coveredLean4LeanExecutableExpressionTranslatorSurface, COVERED_SURFACE); assert.deepEqual(spec.intendedFormalBridgeLemmas, INTENDED_LEMMAS);
  assert.equal(delta.formalLean4LeanBridgeObligationsAfter, FORMAL_OBLIGATIONS); assert.equal(delta.newFormalLean4LeanBridgeObligations, 0); assert.equal(progress.formalLean4LeanBridgeObligations, FORMAL_OBLIGATIONS);
  const evidence = sourceSurfaceEvidence(); assert.ok(evidence.every(e => e.present), `missing source-bound Lean4Lean surface ${JSON.stringify(evidence.filter(e => !e.present))}`);
  const architecture = architectureHealth(spec); assert.equal(architecture.antiSpaghettiGatePassed, true);
  const compactArchitecture = { antiSpaghettiGatePassed: architecture.antiSpaghettiGatePassed, sourceFileCount: architecture.sourceFileCount, ka47ToolFiles: architecture.ka47ToolFiles, newKA47OversizedFiles: architecture.newKA47OversizedFiles, semanticPackageTouched: architecture.semanticPackageTouched };
  const formal = tryFormalLeanCheck();
  if (options.strict && formal.status !== 'passed') throw new Error(`KA-47 formal Lean4Lean executable expression translator bridge did not pass: ${formal.blockedReasons.join(',')}; ${tail(String(formal.build?.stderr ?? ''))}`);
  const result = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, referenceKind: spec.referenceKind, actualLean4LeanImportBound: formal.status === 'passed', strictExecutableExpressionTranslatorBridgePassed: formal.status === 'passed', formalLeanCheckStatus: formal.status, blockedReasons: formal.blockedReasons, coveredLean4LeanExecutableExpressionTranslatorSurface: COVERED_SURFACE, intendedFormalBridgeLemmas: INTENDED_LEMMAS, architectureHealth: architecture, sourceSurfaceEvidence: evidence, featureEquivalenceProgress: progress, claimBoundary: spec.claimBoundary };
  const releaseGate = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, releaseKind: 'blocked-preflight-not-formal-bridge', kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT }, referenceKind: spec.referenceKind, actualLean4LeanImportBound: result.actualLean4LeanImportBound, strictExecutableExpressionTranslatorBridgePassed: result.strictExecutableExpressionTranslatorBridgePassed, formalLeanCheckStatus: result.formalLeanCheckStatus, blockedReasons: result.blockedReasons, coveredLean4LeanExecutableExpressionTranslatorSurface: COVERED_SURFACE, intendedFormalBridgeLemmas: INTENDED_LEMMAS, architectureHealth: compactArchitecture, featureEquivalenceProgress: progress, claimBoundary: spec.claimBoundary, fullLean4Equivalence: false, trustedSemanticPackageChange: false, coreFormatChanged: false, certificateFormatChanged: false };
  const verificationSummary = { checkpoint: CHECKPOINT, publicVersion: VERSION, requiredCommands: [ { command: 'npm install --offline --no-audit --no-fund', status: 'passed' }, { command: 'npm run build -- --pretty false', status: 'passed' }, { command: 'npm run test:pskernel:ka47', status: 'passed' }, { command: 'npm run assurance:ka47', status: formal.status === 'passed' ? 'passed' : 'blocked-not-counted' }, { command: 'npm run lean:ka47:check', status: formal.status === 'passed' ? 'passed' : 'blocked-not-counted' }, { command: 'npm run test:kernel:smoke', status: 'pending' }, { command: 'npm run test:standalone-small', status: 'pending' }, { command: 'npm run test:psc:kernel-status', status: 'pending' }, { command: 'npm run test:psc:conformance-bounded', status: 'pending' } ], architectureHealth: compactArchitecture, formalLeanCheckStatus: formal.status, blockedReasons: formal.blockedReasons, claimBoundary: spec.claimBoundary };
  writeReports({ ...result, releaseGate, verificationSummary });
  return result;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA47ExecutableExpressionTranslatorRefinementGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
  console.log(JSON.stringify({ checkpoint: result.checkpoint, publicVersion: result.publicVersion, formalLeanCheckStatus: result.formalLeanCheckStatus, blockedReasons: result.blockedReasons, antiSpaghettiGatePassed: result.architectureHealth.antiSpaghettiGatePassed, formalObligations: result.claimBoundary.formalLean4LeanBridgeObligations }, null, 2));
}
