#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';
import { acceptsLean433xOrLater } from './pskernel-ka10-target-policy.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dataDir = '/mnt/data';
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

function rmrf(p: string) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p: string) { fs.mkdirSync(p, { recursive: true }); }

function findArchive(candidates: string[], prefix: string) {
  const expanded: string[] = [];
  for (const c of candidates) expanded.push(path.isAbsolute(c) ? c : path.join(root, c));
  if (exists(dataDir)) {
    for (const name of fs.readdirSync(dataDir)) {
      if (new RegExp(`^${prefix}.*\\.(zip|tar|tgz|tar\\.gz)$`, 'i').test(name)) expanded.push(path.join(dataDir, name));
    }
  }
  const unique = [...new Set(expanded)].filter((p) => exists(p) && fs.statSync(p).isFile()).map((p) => ({
    path: p,
    name: path.basename(p),
    sizeBytes: fs.statSync(p).size,
    mtimeMs: fs.statSync(p).mtimeMs,
    sha256: sha256(p),
  }));
  unique.sort((a, b) => {
    const exactA = a.name.includes('4.33.0-rc2') ? 1 : 0;
    const exactB = b.name.includes('4.33.0-rc2') ? 1 : 0;
    if (exactA !== exactB) return exactB - exactA;
    return b.mtimeMs - a.mtimeMs || b.sizeBytes - a.sizeBytes;
  });
  return unique[0] ?? null;
}

function extractArchive(archive: any, dest: string) {
  rmrf(dest); mkdirp(dest);
  const lower = archive.path.toLowerCase();
  if (lower.endsWith('.zip')) return run('unzip', ['-q', archive.path, '-d', dest]);
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return run('tar', ['-xzf', archive.path, '-C', dest]);
  if (lower.endsWith('.tar')) return run('tar', ['-xf', archive.path, '-C', dest]);
  return { status: 99, stdout: '', stderr: `unsupported archive ${archive.path}` };
}

function findRoot(base: string, requiredFiles: string[]) {
  const q: Array<{ dir: string; depth: number }> = [{ dir: base, depth: 0 }];
  while (q.length) {
    const { dir, depth } = q.shift()!;
    if (requiredFiles.every((rel) => exists(path.join(dir, rel)))) return dir;
    if (depth >= 5) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith('.')) q.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }
  return null;
}

function readToolchain(sourceRoot: string | null) {
  if (!sourceRoot) return null;
  const p = path.join(sourceRoot, 'lean-toolchain');
  return exists(p) ? read(p).trim() : null;
}

function patchLean4LeanLakefile(lean4leanRoot: string, batteriesRoot: string) {
  const lakefile = path.join(lean4leanRoot, 'lakefile.toml');
  let text = read(lakefile);
  const rel = path.relative(lean4leanRoot, batteriesRoot).split(path.sep).join('/');
  const patchedBlock = `[[require]]\nname = "batteries"\npath = "${rel}"`;
  const gitBlock = /\[\[require\]\]\s*\nname\s*=\s*"batteries"\s*\ngit\s*=\s*"https:\/\/github\.com\/leanprover-community\/batteries"\s*\nrev\s*=\s*"v4\.33\.0-rc2"/m;
  if (gitBlock.test(text)) text = text.replace(gitBlock, patchedBlock);
  else if (!text.includes('name = "batteries"')) text = `${patchedBlock}\n\n${text}`;
  fs.writeFileSync(lakefile, text);
  const manifest = path.join(lean4leanRoot, 'lake-manifest.json');
  if (exists(manifest)) fs.rmSync(manifest);
}

function classifyBuildFailure(build: any) {
  const combined = `${build?.stdout ?? ''}\n${build?.stderr ?? ''}`;
  if (build?.status === 0) return null;
  if (/Could not resolve host|unable to access .*github\.com|git.*exited with code 128/i.test(combined)) return 'external_dependency_fetch_failed_or_dependency_unavailable';
  if (/unknown package|missing manifest|no such file|object file.*does not exist/i.test(combined)) return 'lake_dependency_or_source_layout_error';
  if (/toolchain|manually restart Lake|Elan/i.test(combined)) return 'toolchain_or_dependency_toolchain_mismatch';
  return 'lean4lean_lake_build_failed';
}

export function runKA11Gate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka11/lean4lean-offline-dependency-plan.json',
    'assurance/ka11/obligation-delta.json',
    'assurance/ka11/lean4lean-real-import-check.lean',
    'assurance/ka11/KA11_RELEASE_GATE.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const plan = readJson('assurance/ka11/lean4lean-offline-dependency-plan.json');
  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka11TrustedSemanticChange, false);
  assert.equal(versions.ka11KernelCodecChange, false);
  assert.equal(versions.ka11NewTrustedComputationRule, false);
  assert.equal(versions.ka11FormalLean4EquivalenceProvenObligations, 0);

  const lean4leanArchive = findArchive(plan.lean4leanArchiveCandidates, 'lean4lean');
  const batteriesArchive = findArchive(plan.batteriesArchiveCandidates, 'batteries');
  const work = path.join(dataDir, 'pskernel-ka11-offline-lean4lean-build');
  const l4lExtract = path.join(work, 'lean4lean-src');
  const battExtract = path.join(work, 'batteries-src');
  const blockedReasons = new Set<string>();

  if (!lean4leanArchive) blockedReasons.add('lean4lean_source_missing');
  if (!batteriesArchive) blockedReasons.add('batteries_4_33_0_rc2_archive_missing');
  let lean4leanRoot: string | null = null;
  let batteriesRoot: string | null = null;
  let lean4leanExtract: any = null;
  let batteriesExtract: any = null;
  if (lean4leanArchive) {
    lean4leanExtract = extractArchive(lean4leanArchive, l4lExtract);
    if (lean4leanExtract.status !== 0) blockedReasons.add('lean4lean_extract_failed');
    else lean4leanRoot = findRoot(l4lExtract, ['lean-toolchain', 'lakefile.toml', 'Lean4Lean.lean', 'Lean4Lean/Environment.lean']);
    if (!lean4leanRoot) blockedReasons.add('lean4lean_required_files_missing');
  }
  if (batteriesArchive) {
    batteriesExtract = extractArchive(batteriesArchive, battExtract);
    if (batteriesExtract.status !== 0) blockedReasons.add('batteries_extract_failed');
    else batteriesRoot = findRoot(battExtract, ['lean-toolchain', 'lakefile.toml', 'Batteries.lean']);
    if (!batteriesRoot) blockedReasons.add('batteries_required_files_missing');
  }

  const lean4leanToolchain = readToolchain(lean4leanRoot);
  const batteriesToolchain = readToolchain(batteriesRoot);
  const lean4leanToolchainAccepted = acceptsLean433xOrLater(lean4leanToolchain);
  const batteriesExactRev = batteriesToolchain === 'leanprover/lean4:v4.33.0-rc2';
  if (lean4leanRoot && !lean4leanToolchainAccepted) blockedReasons.add('lean4lean_toolchain_outside_policy');
  if (batteriesRoot && !batteriesExactRev) blockedReasons.add('batteries_required_rev_unavailable');

  let build: any = null;
  let importCheck: any = null;
  let materialized: any = null;
  if (lean4leanRoot && batteriesRoot && lean4leanToolchainAccepted && batteriesExactRev) {
    patchLean4LeanLakefile(lean4leanRoot, batteriesRoot);
    materialized = materializeLean4331();
    const env = { ...process.env, PATH: `${path.dirname(materialized.leanPath)}:${process.env.PATH ?? ''}` };
    build = run(materialized.lakePath, ['build', 'Lean4Lean'], { cwd: lean4leanRoot, env });
    const buildReason = classifyBuildFailure(build);
    if (buildReason) blockedReasons.add(buildReason);
    const checkSrc = path.join(lean4leanRoot, 'PSKernelKA11ImportCheck.lean');
    fs.copyFileSync(path.join(root, 'assurance/ka11/lean4lean-real-import-check.lean'), checkSrc);
    importCheck = run(materialized.lakePath, ['env', materialized.leanPath, checkSrc], { cwd: lean4leanRoot, env });
    if (importCheck.status !== 0) blockedReasons.add('lean4lean_import_check_failed');
  }

  const strictActualImportPassed = Boolean(
    lean4leanRoot && batteriesRoot && lean4leanToolchainAccepted && batteriesExactRev && build?.status === 0 && importCheck?.status === 0
  );

  const result = {
    checkpoint: 'proofscript-v1-ka11-offline-lean4lean-deps0',
    publicVersion: pkg.version,
    coreFormat: 71,
    lean4leanArchive,
    batteriesArchive,
    lean4leanRoot,
    batteriesRoot,
    lean4leanToolchain,
    batteriesToolchain,
    lean4leanToolchainAccepted,
    batteriesExactRev,
    materializedLean: materialized ? { leanPath: materialized.leanPath, lakePath: materialized.lakePath } : null,
    build: build ? { status: build.status, stdoutTail: String(build.stdout ?? '').slice(-3000), stderrTail: String(build.stderr ?? '').slice(-3000) } : null,
    importCheck: importCheck ? { status: importCheck.status, stdoutTail: String(importCheck.stdout ?? '').slice(-2000), stderrTail: String(importCheck.stderr ?? '').slice(-2000) } : null,
    actualLean4LeanSourcePresent: Boolean(lean4leanRoot),
    exactBatteriesDependencyPresent: Boolean(batteriesRoot && batteriesExactRev),
    actualLean4LeanImportBound: strictActualImportPassed,
    strictActualImportPassed,
    blockedReasons: Array.from(blockedReasons),
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };

  if (options.strict && !strictActualImportPassed) {
    throw new Error(`KA-11 strict real Lean4Lean import did not pass: ${result.blockedReasons.join(',')}; ${JSON.stringify({ lean4leanToolchain, batteriesToolchain, build: result.build, importCheck: result.importCheck }).slice(0, 3000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA11Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
