#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';
import { runKA8Gate } from './pskernel-ka8-source-intake.ts';

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

function matchesLean4LeanArchive(name: string) {
  return /^lean4lean.*\.(zip|tar|tgz|tar\.gz)$/i.test(name);
}

function findUploadedArchives() {
  const dirs = ['/mnt/data', path.join(root, 'vendor'), path.join(root, 'external')];
  const found: any[] = [];
  for (const dir of dirs) {
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!matchesLean4LeanArchive(name)) continue;
      const resolved = path.join(dir, name);
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) continue;
      found.push({ name, resolved, sizeBytes: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256(resolved) });
    }
  }
  found.sort((a, b) => b.mtimeMs - a.mtimeMs || b.sizeBytes - a.sizeBytes);
  return found;
}

function missingRequired(sourceRoot: string, required: string[]) {
  return required.filter((rel) => !exists(path.join(sourceRoot, rel)));
}

function findSourceRoot(base: string, required: string[]) {
  const q: Array<{ dir: string; depth: number }> = [{ dir: base, depth: 0 }];
  while (q.length) {
    const { dir, depth } = q.shift()!;
    if (exists(dir) && missingRequired(dir, required).length === 0) return dir;
    if (depth >= 4) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) q.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }
  return null;
}

function copyDir(src: string, dest: string) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function extractArchive(archive: any, manifest: any) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pskernel-ka9-lean4lean-'));
  const lower = archive.resolved.toLowerCase();
  let extract: { status: number; stdout: string; stderr: string };
  if (lower.endsWith('.zip')) extract = run('unzip', ['-q', archive.resolved, '-d', tmp]);
  else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) extract = run('tar', ['-xzf', archive.resolved, '-C', tmp]);
  else if (lower.endsWith('.tar')) extract = run('tar', ['-xf', archive.resolved, '-C', tmp]);
  else return { status: 'unsupported_archive_format', archive, extract: null, sourceRoot: null };
  if (extract.status !== 0) return { status: 'archive_extract_failed', archive, extract, sourceRoot: null };
  const found = findSourceRoot(tmp, manifest.requiredSourceFiles);
  if (!found) return { status: 'archive_missing_required_source_files', archive, extract, sourceRoot: null };
  const stable = manifest.stableSourceRoot;
  copyDir(found, stable);
  return { status: 'extracted', archive, extract, sourceRoot: stable };
}

function parseLakefile(sourceRoot: string) {
  const lakefile = path.join(sourceRoot, 'lakefile.toml');
  const text = exists(lakefile) ? read(lakefile) : '';
  const requires: any[] = [];
  const blocks = text.split(/\n\s*\[\[require\]\]\s*\n/g).slice(1);
  for (const block of blocks) {
    const name = block.match(/name\s*=\s*"([^"]+)"/)?.[1] ?? null;
    const git = block.match(/git\s*=\s*"([^"]+)"/)?.[1] ?? null;
    const rev = block.match(/rev\s*=\s*"([^"]+)"/)?.[1] ?? null;
    requires.push({ name, git, rev });
  }
  return { lakefilePresent: exists(lakefile), requires };
}

function summarizeSource(sourceRoot: string | null, manifest: any) {
  if (!sourceRoot) return { sourceRoot: null, exists: false, missingRequired: manifest.requiredSourceFiles, leanToolchain: null, toolchainMatchesTarget: false, lake: { lakefilePresent: false, requires: [] } };
  const toolchainPath = path.join(sourceRoot, 'lean-toolchain');
  const leanToolchain = exists(toolchainPath) ? read(toolchainPath).trim() : null;
  return {
    sourceRoot,
    exists: exists(sourceRoot),
    missingRequired: missingRequired(sourceRoot, manifest.requiredSourceFiles),
    leanToolchain,
    expectedToolchain: `leanprover/lean4:v${manifest.targetLeanVersion}`,
    toolchainMatchesTarget: leanToolchain === `leanprover/lean4:v${manifest.targetLeanVersion}`,
    lake: parseLakefile(sourceRoot),
  };
}

function classifyBuildFailure(build: any) {
  const combined = `${build?.stdout ?? ''}\n${build?.stderr ?? ''}`;
  if (/Could not resolve host|unable to access .*github\.com|git.*exited with code 128/i.test(combined)) return 'external_dependency_fetch_failed_or_dependency_unavailable';
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

export function runKA9Gate(options: { strict?: boolean; soft?: boolean } = {}) {
  const required = [
    'assurance/ka9/lean4lean-compat-audit.json',
    'assurance/ka9/obligation-delta.json',
    'assurance/ka9/KA9_REPORT.md',
    'assurance/ka9/KA9_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const manifest = readJson('assurance/ka9/lean4lean-compat-audit.json');
  const delta = readJson('assurance/ka9/obligation-delta.json');
  const release = readJson('assurance/ka9/KA9_RELEASE_GATE.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka9TrustedSemanticChange, false);
  assert.equal(versions.ka9KernelCodecChange, false);
  assert.equal(versions.ka9NewTrustedComputationRule, false);
  assert.equal(versions.ka9FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(manifest.schema, 'proofscript.assurance.ka9.lean4lean-compat-audit/v1');
  assert.equal(manifest.targetLeanVersion, '4.33.1');
  assert.equal(release.kernel.trustedSemanticChange, false);
  assert.equal(release.kernel.coreArtifactFormat, 71);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 0);

  const archives = findUploadedArchives();
  const selectedArchive = archives[0] ?? null;
  const extraction = selectedArchive ? extractArchive(selectedArchive, manifest) : { status: 'archive_missing', archive: null, extract: null, sourceRoot: null };
  const source = summarizeSource(extraction.sourceRoot, manifest);
  const sourcePresent = Boolean(source.exists && source.missingRequired.length === 0);
  const buildAttempt = attemptBuild(sourcePresent ? source.sourceRoot : null);
  const ka8 = runKA8Gate({ soft: true });

  const blockedReasons = new Set<string>();
  if (!sourcePresent) blockedReasons.add('lean4lean_source_missing');
  if (sourcePresent && !source.toolchainMatchesTarget) blockedReasons.add('lean4lean_toolchain_mismatch');
  if (buildAttempt.blockedReason) blockedReasons.add(buildAttempt.blockedReason);
  const strictActualImportPassed = sourcePresent && source.toolchainMatchesTarget && buildAttempt.build?.status === 0 && ka8.strictActualImportPassed;
  if (!strictActualImportPassed && ka8.blockedReason) blockedReasons.add(ka8.blockedReason);

  const result = {
    checkpoint: 'proofscript-v1-ka9-lean4lean-compat0',
    publicVersion: pkg.version,
    targetLeanVersion: manifest.targetLeanVersion,
    coreFormat: 71,
    archives,
    selectedArchive,
    extraction,
    source,
    buildAttempt,
    ka8Bridge: {
      checkpoint: ka8.checkpoint,
      actualLean4LeanSourcePresent: ka8.actualLean4LeanSourcePresent,
      actualLean4LeanImportBound: ka8.actualLean4LeanImportBound,
      strictActualImportPassed: ka8.strictActualImportPassed,
      blockedReason: ka8.blockedReason,
    },
    actualLean4LeanSourcePresent: sourcePresent,
    actualLean4LeanImportBound: strictActualImportPassed,
    strictActualImportPassed,
    blockedReasons: Array.from(blockedReasons),
    closedByKA9: delta.closedByKA9.length,
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
    throw new Error(`KA-9 strict Lean4Lean import did not pass: ${result.blockedReasons.join(',')}; ${JSON.stringify({ selectedArchive, source, buildAttempt: { attempted: buildAttempt.attempted, blockedReason: buildAttempt.blockedReason, status: buildAttempt.build?.status, stderrTail: String(buildAttempt.build?.stderr ?? '').slice(-1200) }, ka8Bridge: result.ka8Bridge }).slice(0, 3000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA9Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
