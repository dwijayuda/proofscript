#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA7Gate } from './pskernel-ka7-real-import.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');

function resolveCandidate(candidate: string): string {
  return path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
}

function run(cmd: string, args: string[], cwd = root) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

function missingRequired(sourceRoot: string, required: string[]): string[] {
  return required.filter((rel) => !exists(path.join(sourceRoot, rel)));
}

function sourceSummary(sourceRoot: string, required: string[], targetLeanVersion: string) {
  const missing = missingRequired(sourceRoot, required);
  const toolchainPath = path.join(sourceRoot, 'lean-toolchain');
  const leanToolchain = exists(toolchainPath) ? read(toolchainPath).trim() : null;
  return {
    sourceRoot,
    exists: exists(sourceRoot),
    missingRequired: missing,
    leanToolchain,
    toolchainMatchesTarget: leanToolchain === `leanprover/lean4:v${targetLeanVersion}`,
    usableShape: exists(sourceRoot) && missing.length === 0,
  };
}

function findSourceRoot(base: string, required: string[]): string | null {
  const direct = sourceSummary(base, required, '4.33.1');
  if (direct.usableShape) return base;
  const queue: Array<{ dir: string; depth: number }> = [{ dir: base, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift()!;
    if (sourceSummary(dir, required, '4.33.1').usableShape) return dir;
    if (depth >= 3) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) queue.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }
  return null;
}

function copyDir(src: string, dest: string) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function extractArchive(archivePath: string, manifest: any) {
  const stableRoot = manifest.stableIntakeRoot;
  fs.mkdirSync(stableRoot, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pskernel-ka8-lean4lean-'));
  const lower = archivePath.toLowerCase();
  let extract: { status: number; stdout: string; stderr: string };
  if (lower.endsWith('.zip')) {
    extract = run('unzip', ['-q', archivePath, '-d', tmp]);
  } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    extract = run('tar', ['-xzf', archivePath, '-C', tmp]);
  } else if (lower.endsWith('.tar')) {
    extract = run('tar', ['-xf', archivePath, '-C', tmp]);
  } else {
    return { status: 'unsupported_archive_format', archivePath, extract: null, extractedSourceRoot: null };
  }
  if (extract.status !== 0) return { status: 'archive_extract_failed', archivePath, extract, extractedSourceRoot: null };
  const found = findSourceRoot(tmp, manifest.requiredSourceFiles);
  if (!found) return { status: 'archive_missing_required_source_files', archivePath, extract, extractedSourceRoot: null };
  const stable = path.join(stableRoot, 'lean4lean');
  copyDir(found, stable);
  return { status: 'extracted', archivePath, extract, extractedSourceRoot: stable };
}

function discoverExistingSources(manifest: any) {
  return manifest.stableCandidatePaths.map((candidate: string) => sourceSummary(candidate, manifest.requiredSourceFiles, manifest.targetLeanVersion));
}

function findArchives(manifest: any) {
  return manifest.archiveDiscoveryCandidates.map((candidate: string) => {
    const resolved = resolveCandidate(candidate);
    return { candidate, resolved, exists: exists(resolved) };
  });
}

export function runKA8Gate(options: { strict?: boolean; soft?: boolean } = {}) {
  const required = [
    'assurance/ka8/lean4lean-source-intake.json',
    'assurance/ka8/obligation-delta.json',
    'assurance/ka8/KA8_REPORT.md',
    'assurance/ka8/KA8_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const manifest = readJson('assurance/ka8/lean4lean-source-intake.json');
  const delta = readJson('assurance/ka8/obligation-delta.json');
  const release = readJson('assurance/ka8/KA8_RELEASE_GATE.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka8TrustedSemanticChange, false);
  assert.equal(versions.ka8KernelCodecChange, false);
  assert.equal(versions.ka8NewTrustedComputationRule, false);
  assert.equal(versions.ka8FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(manifest.schema, 'proofscript.assurance.ka8.lean4lean-source-intake/v1');
  assert.equal(manifest.targetLeanVersion, '4.33.1');
  assert.equal(release.kernel.trustedSemanticChange, false);
  assert.equal(release.kernel.coreArtifactFormat, 71);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 0);

  let existingSources = discoverExistingSources(manifest);
  const alreadyUsable = existingSources.find((s: any) => s.usableShape);
  const archiveDiscovery = findArchives(manifest);
  let archiveIntake: any = null;

  if (!alreadyUsable) {
    const archive = archiveDiscovery.find((a: any) => a.exists);
    if (archive) {
      archiveIntake = extractArchive(archive.resolved, manifest);
      existingSources = discoverExistingSources(manifest);
    }
  }

  const ka7 = runKA7Gate({ soft: true });
  const actualLean4LeanSourcePresent = Boolean(ka7.actualLean4LeanSourcePresent);
  const strictActualImportPassed = Boolean(ka7.strictActualImportPassed);
  const blockedReason = strictActualImportPassed ? null : ka7.blockedReason ?? 'lean4lean_import_not_checked';

  const result = {
    checkpoint: 'proofscript-v1-ka8-lean4lean-source-intake0',
    publicVersion: pkg.version,
    targetLeanVersion: manifest.targetLeanVersion,
    coreFormat: 71,
    stableIntakeRoot: manifest.stableIntakeRoot,
    archiveDiscovery,
    archiveIntake,
    existingSources,
    ka7Bridge: {
      checkpoint: ka7.checkpoint,
      actualLean4LeanSourcePresent: ka7.actualLean4LeanSourcePresent,
      actualLean4LeanImportBound: ka7.actualLean4LeanImportBound,
      strictActualImportPassed: ka7.strictActualImportPassed,
      blockedReason: ka7.blockedReason,
    },
    actualLean4LeanSourcePresent,
    actualLean4LeanImportBound: strictActualImportPassed,
    strictActualImportPassed,
    blockedReason,
    archiveIntakeSupported: true,
    closedByKA8: delta.closedByKA8.length,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };

  if (options.strict && !strictActualImportPassed) {
    throw new Error(`KA-8 strict intake/import did not pass: ${blockedReason}; ${JSON.stringify({ archiveDiscovery, archiveIntake, existingSources: existingSources.slice(0, 5), ka7Bridge: result.ka7Bridge }).slice(0, 2500)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA8Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
