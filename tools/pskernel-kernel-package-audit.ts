#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }

function parsePackJson(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('npm pack --json did not return exactly one package entry');
  return parsed[0];
}

function includesPath(files, path) { return files.some(file => file.path === path); }
function hasPathPrefix(files, prefix) { return files.some(file => file.path.startsWith(prefix)); }

export function runPSKernelKernelPackageAudit(options = {}) {
  const checks = [];
  const add = check => checks.push(check);
  const failures = () => checks.filter(check => check.status === 'rejected');

  const packageJsonPath = resolve(repoRoot, 'packages/kernel/package.json');
  const packageDocs = [
    'TRUST_BOUNDARY.md',
    'PROOF_OBLIGATIONS.md',
    'PSKERNEL_TS_PORTING_MAP.md',
    'PSKERNEL_TS_PHASE_PLAN.md',
    'PSKERNEL_TS_RELEASE_PREFLIGHT.json',
    'PSKERNEL_TS_PROOF_OBLIGATIONS.json',
    'PSKERNEL_TS_PACKAGE_AUDIT.json',
    'PSKERNEL_TS_TARBALL_SMOKE.json',
    'PSKERNEL_TS_RELEASE_ARCHIVE.json',
    'PSKERNEL_TS_DELIVERY_BOOTSTRAP.json',
    'PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json',
  ];

  if (!existsSync(packageJsonPath)) {
    add(reject('package.exists', 'packages/kernel/package.json is missing'));
  } else {
    const pkg = readJson(packageJsonPath);
    add(pkg.name === '@proofscript/kernel'
      ? ok('package.name', 'Active package name is @proofscript/kernel')
      : reject('package.name', 'Active package name changed unexpectedly', { name: pkg.name }));
    add(pkg.main === 'dist/index.js' && pkg.types === 'dist/index.d.ts'
      ? ok('package.entrypoints', 'Package entrypoints point at built dist output')
      : reject('package.entrypoints', 'Package entrypoints must be dist/index.js and dist/index.d.ts', { main: pkg.main, types: pkg.types }));
    add(Array.isArray(pkg.files) && pkg.files.includes('dist') && pkg.files.includes('README.md') && pkg.files.includes('docs')
      ? ok('package.files.allowlist', 'Package files allowlist includes dist, README.md, and docs')
      : reject('package.files.allowlist', 'Package files allowlist must include dist, README.md, and docs', { files: pkg.files }));
  }

  for (const rel of ['packages/kernel/dist/index.js', 'packages/kernel/dist/index.d.ts', 'packages/kernel/README.md']) {
    const path = resolve(repoRoot, rel);
    add(existsSync(path)
      ? ok(`local.${rel}`, `${rel} exists`, { sha256: sha256File(path), bytes: statSync(path).size })
      : reject(`local.${rel}`, `${rel} is missing`));
  }

  for (const doc of packageDocs) {
    const path = resolve(repoRoot, 'packages/kernel/docs', doc);
    add(existsSync(path)
      ? ok(`package-doc.${doc}`, `packages/kernel/docs/${doc} exists`, { sha256: sha256File(path), bytes: statSync(path).size })
      : reject(`package-doc.${doc}`, `packages/kernel/docs/${doc} is missing`));
  }

  const packed = { status: 'not-run' };
  try {
    const packArgs = ['pack', '--workspace', '@proofscript/kernel', '--json'];
    if (options.packDestination) {
      mkdirSync(resolve(repoRoot, options.packDestination), { recursive: true });
      packArgs.push('--pack-destination', options.packDestination);
    } else {
      packArgs.push('--dry-run');
    }
    const stdout = execFileSync('npm', packArgs, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const pack = parsePackJson(stdout);
    packed.status = 'accepted';
    packed.id = pack.id;
    packed.filename = pack.filename;
    packed.size = pack.size;
    packed.unpackedSize = pack.unpackedSize;
    packed.fileCount = pack.files?.length ?? 0;
    packed.shasum = pack.shasum;
    packed.integrity = pack.integrity;
    packed.filesSha256 = sha256(pack.files ?? []);

    const files = Array.isArray(pack.files) ? pack.files : [];
    add(includesPath(files, 'dist/index.js') && includesPath(files, 'dist/index.d.ts')
      ? ok('pack.entrypoints', 'Packed package includes JS and declaration entrypoints')
      : reject('pack.entrypoints', 'Packed package is missing built JS or declaration entrypoints'));
    add(hasPathPrefix(files, 'dist/PSKernel/')
      ? ok('pack.pskernel-dist', 'Packed package includes pskernel-derived dist tree')
      : reject('pack.pskernel-dist', 'Packed package is missing dist/PSKernel tree'));
    add(includesPath(files, 'README.md')
      ? ok('pack.readme', 'Packed package includes README.md')
      : reject('pack.readme', 'Packed package is missing README.md'));
    for (const doc of packageDocs) {
      add(includesPath(files, `docs/${doc}`)
        ? ok(`pack.doc.${doc}`, `Packed package includes docs/${doc}`)
        : reject(`pack.doc.${doc}`, `Packed package is missing docs/${doc}`));
    }
    const legacyFiles = files.filter(file => /(^|\/)legacy\//.test(file.path) || /^dist\/(core|kernel|level|runner)\.(js|d\.ts)$/.test(file.path));
    add(legacyFiles.length === 0
      ? ok('pack.no-legacy', 'Packed package excludes legacy compact-kernel files')
      : reject('pack.no-legacy', 'Packed package includes legacy compact-kernel files', { legacyFiles }));
  } catch (error) {
    packed.status = 'rejected';
    packed.message = error instanceof Error ? error.message : String(error);
    add(reject('pack.npm-pack', 'npm pack audit failed', { message: packed.message }));
  }

  const manifest = {
    schema: 'proofscript-pskernel-ts-kernel-package-audit/v1',
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
  };
  const manifestWithHash = { ...manifest, packageAuditSha256: sha256(manifest) };

  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_PACKAGE_AUDIT.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifestWithHash, null, 2)}\n`);
  }

  return manifestWithHash;
}

function main() {
  const args = process.argv.slice(2);
  const writeDocs = args.includes('--write-docs');
  const packIndex = args.indexOf('--pack-destination');
  const packDestination = packIndex >= 0 ? args[packIndex + 1] : undefined;
  const json = args.includes('--json') || writeDocs;
  const result = runPSKernelKernelPackageAudit({ writeDocs, packDestination });
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`PSKERNEL_TS_KERNEL_PACKAGE_AUDIT=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`packageAuditSha256=${result.packageAuditSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
