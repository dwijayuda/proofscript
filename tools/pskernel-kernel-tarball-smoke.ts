#!/usr/bin/env node
import './register-local-workspace.cts';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}
function stableStringify(value) { return JSON.stringify(canonicalize(value)); }
function sha256(value) { return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex'); }
function sha256File(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }

function parsePackJson(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('npm pack --json did not return exactly one package entry');
  return parsed[0];
}

function writeInstallSmokeScript(path) {
  writeFileSync(path, `
const assert = require('node:assert/strict');
const kernel = require('@proofscript/kernel');
const LevelZero = { tag: 'zero' };
const Type0 = { tag: 'sort', level: { tag: 'succ', of: LevelZero } };
const Nat = { tag: 'const', name: 'Nat', levels: [] };
const status = kernel.pskernelStatusReport();
assert.equal(status.status, 'trusted-boundary');
assert.equal(status.proofStatus, 'not-proven');
assert.ok(status.supportedSlices.some((slice) => /replay certificates/.test(slice)), 'status should expose certificate support');
const artifact = {
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'ProofScript v0.2.1 tarball install smoke',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'tarball-install-smoke',
  prelude: 'core',
  declarations: [
    { kind: 'definition', name: 'tarballNatOne', levelParams: [], type: Nat, value: { tag: 'lit', literal: { tag: 'nat', value: 1 } }, reducibility: 'regular' }
  ],
  typeclasses: { classes: [], instances: [] }
};
const replay = kernel.replayCoreArtifact(artifact);
assert.equal(replay.status, 'accepted', replay.message);
assert.match(replay.semanticSha256, /^[0-9a-f]{64}$/);
const certified = kernel.certifyCoreArtifact(artifact);
assert.equal(certified.status, 'accepted', certified.message);
assert.match(certified.certificate.semanticSha256, /^[0-9a-f]{64}$/);
const verification = kernel.verifyCoreReplayCertificate(artifact, certified.certificate);
assert.equal(verification.status, 'accepted', verification.message);
const direct = kernel.checkCoreDeclarations([
  { kind: 'axiom', name: 'TarballA', levelParams: [], type: Type0 }
], 'tarball-direct-check');
assert.equal(direct.status, 'accepted', direct.message);
const obligations = kernel.pskernelProofObligations();
assert.equal(obligations.proofStatus, 'not-proven');
assert.ok(obligations.total >= 39, 'installed package should expose proof obligations');
process.stdout.write(JSON.stringify({
  status: 'accepted',
  proofStatus: status.proofStatus,
  semanticSha256: replay.semanticSha256,
  certificateSemanticSha256: certified.certificate.semanticSha256,
  obligations: obligations.total,
  exportedKeys: Object.keys(kernel).sort().length
}));
`);
}

export function runPSKernelKernelTarballSmoke(options = {}) {
  const checks = [];
  const add = (check) => checks.push(check);
  const failures = () => checks.filter((check) => check.status === 'rejected');
  const keepTemp = Boolean(options.keepTemp);
  const packDestination = resolve(repoRoot, options.packDestination ?? 'artifacts/tarball-smoke');
  const installRoot = mkdtempSync(resolve(tmpdir(), 'proofscript-kernel-tarball-smoke-'));
  let packed = { status: 'not-run' };
  let install = { status: 'not-run', path: installRoot };
  let runtime = { status: 'not-run' };

  try {
    add(existsSync(resolve(repoRoot, 'packages/kernel/dist/index.js'))
      ? ok('local.dist.index-js', 'Built JS entrypoint exists before packing')
      : reject('local.dist.index-js', 'Built JS entrypoint is missing before packing'));
    add(existsSync(resolve(repoRoot, 'packages/kernel/dist/index.d.ts'))
      ? ok('local.dist.index-dts', 'Built declaration entrypoint exists before packing')
      : reject('local.dist.index-dts', 'Built declaration entrypoint is missing before packing'));

    mkdirSync(packDestination, { recursive: true });
    const stdout = execFileSync('npm', ['pack', '--workspace', '@proofscript/kernel', '--json', '--pack-destination', packDestination], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const pack = parsePackJson(stdout);
    const tarballPath = resolve(packDestination, pack.filename);
    const files = Array.isArray(pack.files) ? pack.files.map((file) => file.path).sort() : [];
    packed = {
      status: 'accepted',
      id: pack.id,
      filename: pack.filename,
      tarballPath: relative(repoRoot, tarballPath),
      tarballFilename: basename(tarballPath),
      tarballSha256: existsSync(tarballPath) ? sha256File(tarballPath) : undefined,
      fileCount: files.length,
      filesSha256: sha256(files),
      size: pack.size,
      unpackedSize: pack.unpackedSize,
    };
    add(existsSync(tarballPath)
      ? ok('pack.tarball.exists', 'npm pack produced an installable tarball', { filename: pack.filename, bytes: pack.size })
      : reject('pack.tarball.exists', 'npm pack did not produce the expected tarball', { filename: pack.filename }));
    add(files.includes('dist/index.js') && files.includes('dist/index.d.ts')
      ? ok('pack.entrypoints', 'Tarball manifest includes dist entrypoints')
      : reject('pack.entrypoints', 'Tarball manifest is missing dist entrypoints'));
    add(files.includes('docs/TRUST_BOUNDARY.md') && files.includes('docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json') && files.includes('docs/PSKERNEL_TS_RELEASE_ARCHIVE.json') && files.includes('docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json') && files.includes('docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json')
      ? ok('pack.evidence-docs', 'Tarball manifest includes trust-boundary, proof-obligation, release-archive, delivery-bootstrap, and delivery-archive evidence')
      : reject('pack.evidence-docs', 'Tarball manifest is missing required trust/proof evidence docs'));

    writeFileSync(resolve(installRoot, 'package.json'), JSON.stringify({ name: 'proofscript-kernel-install-smoke', private: true, type: 'commonjs' }, null, 2));
    const installLog = execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], {
      cwd: installRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    install = {
      status: 'accepted',
      path: '<temporary-install-root>',
      nodeModulesEntrypoint: 'node_modules/@proofscript/kernel/dist/index.js',
      installCommand: 'npm install --ignore-scripts --no-audit --no-fund ' + basename(tarballPath),
      installOutput: 'redacted-for-determinism',
    };
    add(existsSync(resolve(installRoot, 'node_modules/@proofscript/kernel/dist/index.js'))
      ? ok('install.entrypoint.exists', 'Fresh install exposes dist/index.js')
      : reject('install.entrypoint.exists', 'Fresh install is missing dist/index.js'));
    add(existsSync(resolve(installRoot, 'node_modules/@proofscript/kernel/docs/TRUST_BOUNDARY.md'))
      ? ok('install.docs.exists', 'Fresh install exposes package trust-boundary docs')
      : reject('install.docs.exists', 'Fresh install is missing trust-boundary docs'));

    const scriptPath = resolve(installRoot, 'smoke.cts');
    writeInstallSmokeScript(scriptPath);
    const runtimeStdout = execFileSync(process.execPath, [scriptPath], {
      cwd: installRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const runtimeJson = JSON.parse(runtimeStdout);
    runtime = { ...runtimeJson, status: 'accepted' };
    add(runtimeJson.status === 'accepted'
      ? ok('runtime.api-smoke', 'Installed tarball runtime API smoke accepted', runtimeJson)
      : reject('runtime.api-smoke', 'Installed tarball runtime API smoke rejected', runtimeJson));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (packed.status === 'not-run') packed = { status: 'rejected', message };
    else if (install.status === 'not-run') install = { status: 'rejected', path: '<temporary-install-root>', message };
    else runtime = { status: 'rejected', message };
    add(reject('tarball-smoke.exception', 'Install-from-tarball smoke failed', { message }));
  } finally {
    if (!keepTemp) {
      try { rmSync(installRoot, { recursive: true, force: true }); } catch {}
    }
  }

  const manifest = {
    schema: 'proofscript-pskernel-ts-kernel-tarball-smoke/v1',
    status: failures().length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet',
    semanticBaseline: 'Lean 4.33.1',
    pinnedLeanRevision: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
    generatedAt: new Date(0).toISOString(),
    checkCount: checks.length,
    requiredFailureCount: failures().length,
    checks,
    packed,
    install,
    runtime,
  };
  const manifestWithHash = { ...manifest, tarballSmokeSha256: sha256(manifest), ...(keepTemp ? { keptTempPath: installRoot } : {}) };

  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_TARBALL_SMOKE.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifestWithHash, null, 2)}\n`);
  }

  return manifestWithHash;
}

function main() {
  const args = process.argv.slice(2);
  const writeDocs = args.includes('--write-docs');
  const keepTemp = args.includes('--keep-temp');
  const packIndex = args.indexOf('--pack-destination');
  const packDestination = packIndex >= 0 ? args[packIndex + 1] : undefined;
  const json = args.includes('--json') || writeDocs;
  const result = runPSKernelKernelTarballSmoke({ writeDocs, keepTemp, packDestination });
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`PSKERNEL_TS_KERNEL_TARBALL_SMOKE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`tarballSmokeSha256=${result.tarballSmokeSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
