#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka44-end-to-end-checker-refinement-plan0';
const VERSION = '1.0.0-pskernel.47';
const BASELINE = 'proofscript-v1-ka43-theory-wide-refinement-map0';
const FORMAL_OBLIGATIONS = 128;
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });

function walkSourceFiles() {
  const skip = new Set(['node_modules', 'dist', '.git', 'tmp', '.lake']);
  const roots = ['tools', 'assurance', 'packages', 'plugins', 'tests', 'docs'];
  const out: { path: string; lines: number; ext: string }[] = [];
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

function architectureHealth(policy: any, boundaries: any) {
  const files = walkSourceFiles();
  const largeFiles = files.filter(f => f.lines > policy.thresholds.reportLargeFileThresholdLines).slice(0, 25);
  const ka44Files = files.filter(f => f.path.includes('ka44') || f.path.includes('KA44'));
  const ka44ToolFiles = ka44Files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const newKa44OversizedSourceFiles = ka44Files.filter(f => f.lines > policy.thresholds.newKa44SourceMaxLines);
  const forbidden = policy.thresholds.forbiddenGeneratedSemanticPackagePrefixes;
  const semanticPackageTouched = ka44Files.some(f => forbidden.some((p: string) => f.path.startsWith(p)));
  const boundaryCount = boundaries.moduleBoundaries.length;
  return {
    antiSpaghettiGatePassed: newKa44OversizedSourceFiles.length === 0 && !semanticPackageTouched && ka44ToolFiles.length <= policy.thresholds.maxNewKa44ToolFiles && boundaryCount >= 4,
    sourceFileCount: files.length,
    largeFileThresholdLines: policy.thresholds.reportLargeFileThresholdLines,
    preexistingLargeSourceFilesInventoried: largeFiles,
    ka44SourceFiles: ka44Files,
    ka44ToolFiles,
    newKa44OversizedSourceFiles,
    semanticPackageTouched,
    moduleBoundaryCount: boundaryCount,
    note: 'KA-44 fails on new oversized KA-44 files, generated semantic-package edits, too many gate tools, or missing module boundaries.'
  };
}

function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-44\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}% for completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n`;
}

function writeReports(result: any) {
  ensureDir('assurance/ka44');
  writeJson('assurance/ka44/KA44_END_TO_END_CHECKER_REFINEMENT_PLAN_RELEASE_GATE.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: result.kernel,
    refinementPlan: result.refinementPlan,
    moduleBoundaries: result.moduleBoundaries,
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
  });
  writeJson('assurance/ka44/KA44_END_TO_END_CHECKER_REFINEMENT_PLAN_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    requiredCommands: result.requiredCommands ?? [],
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
  });
  fs.writeFileSync(path.join(root, 'assurance/ka44/KA44_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-44 End-to-End Checker Refinement Plan and No-Spaghetti Gate\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\nKA-44 adds an end-to-end checker refinement spine, explicit module boundaries, and a stricter no-spaghetti ratchet. It does not change PSKernel trusted semantics, Core artifact format, or codec behavior.\n\n` +
    `## Architecture health\n\n- Anti-spaghetti gate passed: **${result.architectureHealth.antiSpaghettiGatePassed}**\n` +
    `- Source files scanned: **${result.architectureHealth.sourceFileCount}**\n` +
    `- KA-44 tool files: **${result.architectureHealth.ka44ToolFiles.length}**\n` +
    `- New KA-44 oversized files: **${result.architectureHealth.newKa44OversizedSourceFiles.length}**\n` +
    `- Semantic packages touched by KA-44 generated files: **${result.architectureHealth.semanticPackageTouched}**\n` +
    `- Module boundaries recorded: **${result.architectureHealth.moduleBoundaryCount}**\n\n` +
    `## Progress\n\n- Feature-surface bridge progress: **${result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- End-to-end checker refinement theorem: **no**\n\n` +
    `## Next milestones\n\n` + result.refinementPlan.nextMilestones.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka44/KA44_END_TO_END_CHECKER_REFINEMENT_PLAN_REPORT.md'), report);
}

export function runKA44EndToEndCheckerRefinementPlanGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka44/end-to-end-checker-refinement-plan.json',
    'assurance/ka44/architecture-no-spaghetti-policy.json',
    'assurance/ka44/refinement-module-boundaries.json',
    'assurance/ka44/kernel-feature-equivalence-progress.json',
    'docs/architecture/KA44_END_TO_END_CHECKER_REFINEMENT_PLAN.md',
  ]) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const plan = readJson('assurance/ka44/end-to-end-checker-refinement-plan.json');
  const policy = readJson('assurance/ka44/architecture-no-spaghetti-policy.json');
  const boundaries = readJson('assurance/ka44/refinement-module-boundaries.json');
  const progress = readJson('assurance/ka44/kernel-feature-equivalence-progress.json');
  const delta = readJson('assurance/ka44/obligation-delta.json');
  assert.equal(pkg.version, VERSION);
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAdded, 0);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 66);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 33);
  assert.equal(plan.phases[0].id, 'KA44-refinement-spine');
  assert.ok(plan.nextMilestones.includes('KA45-inductive-recursor-refinement-bridge'));
  const arch = architectureHealth(policy, boundaries);
  if (options.strict) assert.equal(arch.antiSpaghettiGatePassed, true, 'KA-44 anti-spaghetti gate failed');
  const claimBoundary = {
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    executablePSKernelRefinementProof: false,
    endToEndCheckerRefinementTheorem: false,
    formalLean4EquivalenceProvenObligations: FORMAL_OBLIGATIONS,
  };
  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    refinementPlan: plan,
    moduleBoundaries: boundaries,
    architectureHealth: arch,
    featureEquivalenceProgress: progress,
    formalLean4LeanBridgeObligations: FORMAL_OBLIGATIONS,
    claimBoundary,
    blockedReasons: [] as string[],
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  try { console.log(JSON.stringify(runKA44EndToEndCheckerRefinementPlanGate({ strict, soft }), null, 2)); }
  catch (err) { if (soft) console.log(JSON.stringify({ checkpoint: CHECKPOINT, status: 'blocked', error: String(err) }, null, 2)); else throw err; }
}
