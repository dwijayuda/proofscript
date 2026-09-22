#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka43-theory-wide-refinement-map0';
const VERSION = '1.0.0-pskernel.46';
const BASELINE = 'proofscript-v1-ka42-resource-error-conservativity-bridge0';
const FORMAL_OBLIGATIONS = 128;
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });

function walkSourceFiles() {
  const skip = new Set(['node_modules', 'dist', '.git', 'tmp', '.lake']);
  const roots = ['tools', 'assurance', 'packages', 'plugins', 'tests'];
  const out: { path: string; lines: number; ext: string }[] = [];
  function walk(dir: string) {
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!skip.has(ent.name)) walk(rel); continue; }
      if (!ent.isFile() || !/\.(ts|lean)$/.test(ent.name)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      out.push({ path: rel.replaceAll('\\', '/'), lines: text.split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  }
  for (const r of roots) if (exists(r)) walk(r);
  return out.sort((a, b) => b.lines - a.lines);
}
function architectureHealth(policy: any) {
  const files = walkSourceFiles();
  const largeFiles = files.filter(f => f.lines > policy.thresholds.reportLargeFileThresholdLines).slice(0, 25);
  const ka43Files = files.filter(f => f.path.includes('ka43'));
  const newKa43OversizedSourceFiles = ka43Files.filter(f => f.lines > policy.thresholds.newKa43SourceMaxLines);
  const semanticPackageTouched = ka43Files.some(f => policy.thresholds.forbiddenGeneratedSemanticPackagePrefixes.some((p: string) => f.path.startsWith(p)));
  const packageBuckets = files.reduce((m: Record<string, number>, f) => {
    const k = f.path.split('/').slice(0, 3).join('/');
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  return {
    antiSpaghettiGatePassed: newKa43OversizedSourceFiles.length === 0 && !semanticPackageTouched,
    sourceFileCount: files.length,
    largeFileThresholdLines: policy.thresholds.reportLargeFileThresholdLines,
    preexistingLargeSourceFilesInventoried: largeFiles,
    ka43SourceFiles: ka43Files,
    newKa43OversizedSourceFiles,
    semanticPackageTouched,
    packageBuckets,
    note: 'Existing large files are recorded as technical-debt hotspots. KA-43 fails only on new KA-43 oversized files or generated semantic-package changes.'
  };
}
function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-43\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}% for completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka43');
  writeJson('assurance/ka43/KA43_THEORY_WIDE_REFINEMENT_MAP_RELEASE_GATE.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: result.kernel,
    theoryWideRefinementMap: result.refinementMap,
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  });
  writeJson('assurance/ka43/KA43_THEORY_WIDE_REFINEMENT_MAP_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    requiredCommands: result.requiredCommands ?? [],
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
  });
  fs.writeFileSync(path.join(root, 'assurance/ka43/KA43_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-43 Theory-Wide Refinement Map and Anti-Spaghetti Gate\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\nKA-43 adds a theory-wide refinement map and an anti-spaghetti architecture gate. It does not change PSKernel trusted semantics, Core artifact format, or codec behavior.\n\n` +
    `## Architecture health\n\n- Anti-spaghetti gate passed: **${result.architectureHealth.antiSpaghettiGatePassed}**\n` +
    `- Source files scanned: **${result.architectureHealth.sourceFileCount}**\n` +
    `- New KA-43 oversized files: **${result.architectureHealth.newKa43OversizedSourceFiles.length}**\n` +
    `- Semantic packages touched by KA-43 generated files: **${result.architectureHealth.semanticPackageTouched}**\n\n` +
    `## Progress\n\n- Feature-surface bridge progress: **${result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Theory-wide refinement complete: **no**\n\n` +
    `## Next milestones\n\n` + result.refinementMap.nextMilestones.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka43/KA43_THEORY_WIDE_REFINEMENT_MAP_REPORT.md'), report);
}

export function runKA43TheoryWideRefinementMapGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka43/theory-wide-refinement-map.json',
    'assurance/ka43/architecture-health-policy.json',
    'assurance/ka43/obligation-delta.json',
    'assurance/ka43/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const refinementMap = readJson('assurance/ka43/theory-wide-refinement-map.json');
  const policy = readJson('assurance/ka43/architecture-health-policy.json');
  const progress = readJson('assurance/ka43/kernel-feature-equivalence-progress.json');
  const delta = readJson('assurance/ka43/obligation-delta.json');
  assert.equal(pkg.version, VERSION);
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAdded, 0);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 65);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 31);
  const arch = architectureHealth(policy);
  if (options.strict) assert.equal(arch.antiSpaghettiGatePassed, true, 'KA-43 anti-spaghetti gate failed');
  const claimBoundary = {
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    executablePSKernelRefinementProof: false,
    theoryWideRefinementComplete: false,
    formalLean4EquivalenceProvenObligations: FORMAL_OBLIGATIONS,
  };
  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    refinementMap,
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
  try { console.log(JSON.stringify(runKA43TheoryWideRefinementMapGate({ strict, soft }), null, 2)); }
  catch (err) { if (soft) console.log(JSON.stringify({ checkpoint: CHECKPOINT, status: 'blocked', error: String(err) }, null, 2)); else throw err; }
}
