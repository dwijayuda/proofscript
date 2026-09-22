#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';
import { runKA9Gate } from './pskernel-ka9-lean4lean-compat.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));

function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

function sha256(file: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function parseLeanToolchain(toolchain: string | null) {
  if (!toolchain) return null;
  const trimmed = toolchain.trim();
  const m = trimmed.match(/^leanprover\/lean4:v(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9_.-]+))?$/);
  if (!m) return null;
  return {
    raw: trimmed,
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  };
}

export function acceptsLean433xOrLater(toolchain: string | null) {
  const parsed = parseLeanToolchain(toolchain);
  if (!parsed) return false;
  if (parsed.major > 4) return true;
  if (parsed.major < 4) return false;
  return parsed.minor >= 33;
}

function matchesArchive(name: string, prefix: string) {
  return new RegExp(`^${prefix}.*\\.(zip|tar|tgz|tar\\.gz)$`, 'i').test(name);
}

function listArchives(prefix: string) {
  const dirs = ['/mnt/data', path.join(root, 'vendor'), path.join(root, 'external')];
  const found: any[] = [];
  for (const dir of dirs) {
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!matchesArchive(name, prefix)) continue;
      const resolved = path.join(dir, name);
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) continue;
      found.push({ name, resolved, sizeBytes: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256(resolved) });
    }
  }
  found.sort((a, b) => b.mtimeMs - a.mtimeMs || b.sizeBytes - a.sizeBytes);
  return found;
}

function extractArchive(archive: any, requiredFiles: string[]) {
  if (!archive) return { status: 'archive_missing', archive: null, sourceRoot: null, extract: null };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pskernel-ka10-archive-'));
  const lower = archive.resolved.toLowerCase();
  let extract: { status: number; stdout: string; stderr: string };
  if (lower.endsWith('.zip')) extract = run('unzip', ['-q', archive.resolved, '-d', tmp]);
  else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) extract = run('tar', ['-xzf', archive.resolved, '-C', tmp]);
  else if (lower.endsWith('.tar')) extract = run('tar', ['-xf', archive.resolved, '-C', tmp]);
  else return { status: 'unsupported_archive_format', archive, sourceRoot: null, extract: null };
  if (extract.status !== 0) return { status: 'archive_extract_failed', archive, sourceRoot: null, extract };
  const found = findSourceRoot(tmp, requiredFiles);
  return found ? { status: 'extracted', archive, sourceRoot: found, extract } : { status: 'archive_missing_required_files', archive, sourceRoot: null, extract };
}

function findSourceRoot(base: string, requiredFiles: string[]) {
  const queue: Array<{ dir: string; depth: number }> = [{ dir: base, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift()!;
    if (requiredFiles.every((rel) => exists(path.join(dir, rel)))) return dir;
    if (depth >= 4) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) queue.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }
  return null;
}

function parseLakeRequires(sourceRoot: string | null) {
  if (!sourceRoot) return [];
  const lakefile = path.join(sourceRoot, 'lakefile.toml');
  if (!exists(lakefile)) return [];
  const text = read(lakefile);
  return text.split(/\n\s*\[\[require\]\]\s*\n/g).slice(1).map((block) => ({
    name: block.match(/name\s*=\s*"([^"]+)"/)?.[1] ?? null,
    git: block.match(/git\s*=\s*"([^"]+)"/)?.[1] ?? null,
    rev: block.match(/rev\s*=\s*"([^"]+)"/)?.[1] ?? null,
    path: block.match(/path\s*=\s*"([^"]+)"/)?.[1] ?? null,
  }));
}

function summarizeSource(sourceRoot: string | null, requiredFiles: string[]) {
  if (!sourceRoot) return { sourceRoot: null, exists: false, missingRequired: requiredFiles, leanToolchain: null, toolchainParsed: null, toolchainAcceptedByPolicy: false, lakeRequires: [] };
  const missingRequired = requiredFiles.filter((rel) => !exists(path.join(sourceRoot, rel)));
  const toolchainPath = path.join(sourceRoot, 'lean-toolchain');
  const leanToolchain = exists(toolchainPath) ? read(toolchainPath).trim() : null;
  return {
    sourceRoot,
    exists: exists(sourceRoot),
    missingRequired,
    leanToolchain,
    toolchainParsed: parseLeanToolchain(leanToolchain),
    toolchainAcceptedByPolicy: acceptsLean433xOrLater(leanToolchain),
    lakeRequires: parseLakeRequires(sourceRoot),
  };
}

function summarizeBatteries(requiredRev: string | null) {
  const archives = listArchives('batteries');
  const selectedArchive = archives[0] ?? null;
  const extraction = extractArchive(selectedArchive, ['Batteries.lean', 'lean-toolchain', 'lakefile.toml']);
  const source = summarizeSource(extraction.sourceRoot, ['Batteries.lean', 'lean-toolchain', 'lakefile.toml']);
  const sourceTag = source.leanToolchain ? source.leanToolchain.replace(/^leanprover\/lean4:/, '') : null;
  const exactRequiredRevMaterialized = Boolean(requiredRev && sourceTag === requiredRev);
  return {
    archives,
    selectedArchive,
    extraction: { status: extraction.status, archive: extraction.archive, sourceRoot: extraction.sourceRoot },
    source,
    requiredRev,
    exactRequiredRevMaterialized,
    acceptedByLeanPolicy: source.toolchainAcceptedByPolicy,
  };
}

function classifyBuildFailure(build: any) {
  const combined = `${build?.stdout ?? ''}\n${build?.stderr ?? ''}`;
  if (/Could not resolve host|unable to access .*github\.com|git.*exited with code 128/i.test(combined)) return 'external_dependency_fetch_failed_or_dependency_unavailable';
  if (/toolchain|no Elan detected|manually restart Lake/i.test(combined)) return 'toolchain_or_dependency_toolchain_mismatch';
  if (/unknown package|missing manifest|no such file/i.test(combined)) return 'lake_dependency_or_source_layout_error';
  if (build?.status === 0) return null;
  return 'lean4lean_lake_build_failed';
}

function attemptBuild(sourceRoot: string | null) {
  if (!sourceRoot) return { attempted: false, build: null, blockedReason: 'lean4lean_source_missing' };
  const materialized = materializeLean4331();
  const env = { ...process.env, PATH: `${path.dirname(materialized.leanPath)}:${process.env.PATH ?? ''}` };
  const build = run(materialized.lakePath, ['build', 'Lean4Lean'], { cwd: sourceRoot, env });
  return { attempted: true, materializedLeanPath: materialized.leanPath, materializedLakePath: materialized.lakePath, build, blockedReason: classifyBuildFailure(build) };
}

export function runKA10Gate(options: { strict?: boolean; soft?: boolean } = {}) {
  const required = [
    'assurance/ka10/lean-target-policy.json',
    'assurance/ka10/obligation-delta.json',
    'assurance/ka10/KA10_REPORT.md',
    'assurance/ka10/KA10_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const policy = readJson('assurance/ka10/lean-target-policy.json');
  const delta = readJson('assurance/ka10/obligation-delta.json');
  const release = readJson('assurance/ka10/KA10_RELEASE_GATE.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka10TrustedSemanticChange, false);
  assert.equal(versions.ka10KernelCodecChange, false);
  assert.equal(versions.ka10NewTrustedComputationRule, false);
  assert.equal(versions.ka10FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(policy.schema, 'proofscript.assurance.ka10.lean-target-policy/v1');
  assert.equal(policy.sourceToolchainPolicy.id, 'leanprover/lean4:v4.33.x-or-later');
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 0);
  assert.equal(release.kernel.coreArtifactFormat, 71);

  const lean4leanArchives = listArchives('lean4lean');
  const lean4leanExtraction = extractArchive(lean4leanArchives[0] ?? null, ['lean-toolchain', 'lakefile.toml', 'Lean4Lean.lean', 'Lean4Lean/Environment.lean']);
  const source = summarizeSource(lean4leanExtraction.sourceRoot, ['lean-toolchain', 'lakefile.toml', 'Lean4Lean.lean', 'Lean4Lean/Environment.lean']);
  const sourcePresent = Boolean(source.exists && source.missingRequired.length === 0);
  const batteriesRequire = source.lakeRequires.find((r: any) => r.name === 'batteries') ?? null;
  const batteries = summarizeBatteries(batteriesRequire?.rev ?? null);
  const buildAttempt = attemptBuild(sourcePresent ? source.sourceRoot : null);
  const ka9 = runKA9Gate({ soft: true });

  const blockedReasons = new Set<string>();
  if (!sourcePresent) blockedReasons.add('lean4lean_source_missing');
  if (sourcePresent && !source.toolchainAcceptedByPolicy) blockedReasons.add('lean4lean_toolchain_outside_policy');
  if (batteriesRequire && !batteries.exactRequiredRevMaterialized) blockedReasons.add('lean4lean_dependency_batteries_required_rev_unavailable');
  if (buildAttempt.blockedReason) blockedReasons.add(buildAttempt.blockedReason);

  const strictActualImportPassed = sourcePresent && source.toolchainAcceptedByPolicy && batteries.exactRequiredRevMaterialized && buildAttempt.build?.status === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka10-lean-target-policy0',
    publicVersion: pkg.version,
    targetPolicy: policy.sourceToolchainPolicy.id,
    previousExactTarget: 'leanprover/lean4:v4.33.1',
    coreFormat: 71,
    lean4leanArchives,
    lean4leanExtraction: { status: lean4leanExtraction.status, archive: lean4leanExtraction.archive, sourceRoot: lean4leanExtraction.sourceRoot },
    source,
    sourcePresent,
    sourceToolchainAcceptedByPolicy: source.toolchainAcceptedByPolicy,
    sourceToolchainWouldHaveFailedOldExactPolicy: source.leanToolchain !== 'leanprover/lean4:v4.33.1',
    batteriesRequire,
    batteries,
    buildAttempt,
    ka9Bridge: {
      checkpoint: ka9.checkpoint,
      oldTargetLeanVersion: ka9.targetLeanVersion,
      oldBlockedReasons: ka9.blockedReasons,
      oldStrictActualImportPassed: ka9.strictActualImportPassed,
    },
    actualLean4LeanSourcePresent: sourcePresent,
    actualLean4LeanImportBound: strictActualImportPassed,
    strictActualImportPassed,
    blockedReasons: Array.from(blockedReasons),
    closedByKA10: delta.closedByKA10.length,
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
    throw new Error(`KA-10 strict Lean4Lean import did not pass: ${result.blockedReasons.join(',')}; ${JSON.stringify({ source: { leanToolchain: source.leanToolchain, accepted: source.toolchainAcceptedByPolicy }, batteries: { requiredRev: batteries.requiredRev, selected: batteries.selectedArchive, sourceToolchain: batteries.source.leanToolchain, exactRequiredRevMaterialized: batteries.exactRequiredRevMaterialized }, buildAttempt: { attempted: buildAttempt.attempted, blockedReason: buildAttempt.blockedReason, status: buildAttempt.build?.status, stderrTail: String(buildAttempt.build?.stderr ?? '').slice(-1200) } }).slice(0, 3000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA10Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
