#!/usr/bin/env node
import './register-local-workspace.cts';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'proofscript-pskernel-ts-kernel-delivery-archive-verification/v1';
const TRUST_LABEL = 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet';
const SEMANTIC_BASELINE = 'Lean 4.33.1';
const PINNED_LEAN_REVISION = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';

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
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function normalizeRel(absPath, root = repoRoot) { return relative(root, absPath).split(sep).join('/'); }
function safeJsonParse(text) { try { return JSON.parse(text); } catch { return undefined; } }
function trimOutput(text, max = 2400) {
  if (!text) return '';
  const clean = String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  return clean.length > max ? `${clean.slice(0, max)}\n...<truncated ${clean.length - max} chars>` : clean;
}
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }

function walkFiles(absDir, out = []) {
  for (const entry of readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = resolve(absDir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function findProjectRoot(extractRoot) {
  const candidates = [];
  for (const file of walkFiles(extractRoot)) {
    if (basename(file) !== 'package.json') continue;
    let pkg;
    try { pkg = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const dir = dirname(file);
    if (pkg?.name === 'proofscript-monorepo' && existsSync(resolve(dir, 'tools/pskernel.ts'))) candidates.push(dir);
  }
  candidates.sort((a, b) => normalizeRel(a, extractRoot).localeCompare(normalizeRel(b, extractRoot)));
  return candidates[0];
}

function runCommand(cwd, command, args, options = {}) {
  const startedAt = Date.now();
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      timeout: options.timeoutMs ?? 120_000,
      env: { ...process.env, TERM: 'dumb', NO_COLOR: '1', ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsedJson = options.json ? safeJsonParse(stdout) : undefined;
    return {
      status: 'accepted',
      command: [command, ...args].join(' '),
      durationMs: Date.now() - startedAt,
      stdoutSha256: sha256(stdout),
      stdoutPreview: trimOutput(stdout),
      ...(parsedJson !== undefined ? { parsedJson } : {}),
    };
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? '';
    const stderr = error?.stderr?.toString?.() ?? '';
    const parsedJson = options.json ? safeJsonParse(stdout) : undefined;
    return {
      status: 'rejected',
      command: [command, ...args].join(' '),
      durationMs: Date.now() - startedAt,
      exitCode: error?.status ?? null,
      signal: error?.signal ?? null,
      stdoutSha256: sha256(stdout),
      stderrSha256: sha256(stderr),
      stdoutPreview: trimOutput(stdout),
      stderrPreview: trimOutput(stderr),
      ...(parsedJson !== undefined ? { parsedJson } : {}),
    };
  }
}

function summarizeCommand(run) {
  return {
    status: run.status,
    command: run.command,
    durationMs: run.durationMs,
    stdoutSha256: run.stdoutSha256,
    ...(run.stderrSha256 ? { stderrSha256: run.stderrSha256 } : {}),
    ...(run.exitCode !== undefined ? { exitCode: run.exitCode } : {}),
    ...(run.signal ? { signal: run.signal } : {}),
    ...(run.parsedJson?.status ? { parsedStatus: run.parsedJson.status } : {}),
    ...(run.parsedJson?.proofStatus ? { parsedProofStatus: run.parsedJson.proofStatus } : {}),
    ...(run.parsedJson?.deliveryBootstrapSha256 ? { deliveryBootstrapSha256: run.parsedJson.deliveryBootstrapSha256 } : {}),
    ...(run.parsedJson?.deliveryVerificationSha256 ? { deliveryVerificationSha256: run.parsedJson.deliveryVerificationSha256 } : {}),
    ...(run.parsedJson?.sourceTreeSha256 ? { sourceTreeSha256: run.parsedJson.sourceTreeSha256 } : {}),
  };
}

export function verifyProofScriptDeliveryArchive(archivePathInput, options = {}) {
  const checks = [];
  const archivePath = resolve(repoRoot, archivePathInput ?? '');
  const archive = {
    path: archivePathInput ?? '',
    filename: archivePathInput ? basename(archivePathInput) : '',
    exists: Boolean(archivePathInput) && existsSync(archivePath),
  };
  if (!archivePathInput) {
    checks.push(reject('delivery-archive.input', 'delivery archive path is required'));
    const payload = basePayload(archive, checks, options);
    return finalize(payload);
  }
  if (!archive.exists) {
    checks.push(reject('delivery-archive.exists', 'delivery archive zip file is missing', { path: archivePathInput }));
    const payload = basePayload(archive, checks, options);
    return finalize(payload);
  }
  const stat = statSync(archivePath);
  archive.bytes = stat.size;
  archive.sha256 = sha256File(archivePath);
  checks.push(ok('delivery-archive.exists', 'delivery archive zip exists', { bytes: archive.bytes, sha256: archive.sha256 }));

  const tempRoot = mkdtempSync(resolve(tmpdir(), 'proofscript-delivery-archive-'));
  let projectRoot;
  try {
    const unzip = runCommand(repoRoot, 'unzip', ['-q', archivePath, '-d', tempRoot], { timeoutMs: options.timeoutMs ?? 120_000 });
    checks.push(unzip.status === 'accepted'
      ? ok('delivery-archive.extract', 'delivery archive extracts successfully', summarizeCommand(unzip))
      : reject('delivery-archive.extract', 'delivery archive extraction failed', summarizeCommand(unzip)));
    if (unzip.status !== 'accepted') {
      const payload = basePayload(archive, checks, options);
      return finalize(payload);
    }

    projectRoot = findProjectRoot(tempRoot);
    if (!projectRoot) {
      checks.push(reject('delivery-archive.project-root', 'no proofscript-monorepo project root with tools/pskernel.ts found'));
      const payload = basePayload(archive, checks, options, { extractedRoot: normalizeRel(tempRoot, dirname(tempRoot)) });
      return finalize(payload);
    }
    const projectRootRel = normalizeRel(projectRoot, tempRoot);
    checks.push(ok('delivery-archive.project-root', 'extracted ProofScript project root found', { projectRoot: projectRootRel }));

    const bootstrap = runCommand(projectRoot, process.execPath, ['tools/link-local-workspaces.cts', '--json'], { json: true, timeoutMs: 120_000 });
    checks.push(bootstrap.status === 'accepted' && bootstrap.parsedJson?.status === 'accepted'
      ? ok('delivery-archive.bootstrap-local-workspaces', 'extracted workspace local package links accept', summarizeCommand(bootstrap))
      : reject('delivery-archive.bootstrap-local-workspaces', 'extracted workspace local package links rejected', summarizeCommand(bootstrap)));

    const build = runCommand(projectRoot, 'npm', ['run', 'build', '--', '--pretty', 'false'], { timeoutMs: options.buildTimeoutMs ?? 180_000 });
    checks.push(build.status === 'accepted'
      ? ok('delivery-archive.build', 'extracted delivery builds successfully', summarizeCommand(build))
      : reject('delivery-archive.build', 'extracted delivery build failed', summarizeCommand(build)));

    const status = runCommand(projectRoot, process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status', '--json'], { json: true, timeoutMs: 60_000 });
    checks.push(status.status === 'accepted' && status.parsedJson?.status === 'trusted-boundary' && status.parsedJson?.proofStatus === 'not-proven'
      ? ok('delivery-archive.status', 'extracted kernel status remains trusted-boundary/not-proven', summarizeCommand(status))
      : reject('delivery-archive.status', 'extracted kernel status overclaims or fails', summarizeCommand(status)));

    const standalone = runCommand(projectRoot, 'npm', ['run', 'test:standalone-small'], { timeoutMs: options.smokeTimeoutMs ?? 180_000 });
    checks.push(standalone.status === 'accepted'
      ? ok('delivery-archive.standalone-small', 'extracted standalone-small smoke accepts', summarizeCommand(standalone))
      : reject('delivery-archive.standalone-small', 'extracted standalone-small smoke rejected', summarizeCommand(standalone)));

    const deliveryBootstrap = runCommand(projectRoot, process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'delivery-bootstrap', '--json'], { json: true, timeoutMs: options.smokeTimeoutMs ?? 180_000 });
    checks.push(deliveryBootstrap.status === 'accepted' && deliveryBootstrap.parsedJson?.status === 'accepted'
      ? ok('delivery-archive.delivery-bootstrap', 'extracted manifestless delivery bootstrap accepts', summarizeCommand(deliveryBootstrap))
      : reject('delivery-archive.delivery-bootstrap', 'extracted manifestless delivery bootstrap rejected', summarizeCommand(deliveryBootstrap)));

    const sourceTree = runCommand(projectRoot, process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'source-tree', '--json'], { json: true, timeoutMs: 120_000 });
    checks.push(sourceTree.status === 'accepted' && sourceTree.parsedJson?.status === 'accepted'
      ? ok('delivery-archive.source-tree', 'extracted source tree evidence accepts', summarizeCommand(sourceTree))
      : reject('delivery-archive.source-tree', 'extracted source tree evidence rejected', summarizeCommand(sourceTree)));

    let fullDelivery;
    if (options.full) {
      fullDelivery = runCommand(projectRoot, process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-delivery', '--json'], { json: true, timeoutMs: options.fullTimeoutMs ?? 300_000 });
      checks.push(fullDelivery.status === 'accepted' && fullDelivery.parsedJson?.status === 'accepted'
        ? ok('delivery-archive.full-delivery', 'full delivery verification accepts inside extracted archive', summarizeCommand(fullDelivery))
        : reject('delivery-archive.full-delivery', 'full delivery verification rejected inside extracted archive', summarizeCommand(fullDelivery)));
    }

    const payload = basePayload(archive, checks, options, {
      extractedProjectRoot: projectRootRel,
      componentHashes: {
        workspaceLinksSha256: bootstrap.parsedJson?.workspaceLinksSha256,
        sourceTreeSha256: sourceTree.parsedJson?.sourceTreeSha256,
        deliveryBootstrapSha256: deliveryBootstrap.parsedJson?.deliveryBootstrapSha256,
        deliveryVerificationSha256: fullDelivery?.parsedJson?.deliveryVerificationSha256,
      },
    });
    return finalize(payload);
  } finally {
    if (!options.keepTemp) rmSync(tempRoot, { recursive: true, force: true });
  }
}

function basePayload(archive, checks, options, extra = {}) {
  const rejected = checks.filter(check => check.status === 'rejected');
  return {
    schema: SCHEMA,
    status: rejected.length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    pinnedLeanRevision: PINNED_LEAN_REVISION,
    generatedAt: new Date(0).toISOString(),
    mode: options.full ? 'fresh-extract-delivery-archive-full' : 'fresh-extract-delivery-archive-bounded',
    archive,
    checkCount: checks.length,
    requiredFailureCount: rejected.length,
    checks,
    ...extra,
  };
}

function finalize(payload) {
  return { ...payload, deliveryArchiveVerificationSha256: sha256(payload) };
}

function main() {
  const args = process.argv.slice(2);
  const archivePath = args.find(arg => !arg.startsWith('--'));
  const json = args.includes('--json');
  const writeDocs = args.includes('--write-docs');
  const full = args.includes('--full');
  const keepTemp = args.includes('--keep-temp');
  const result = verifyProofScriptDeliveryArchive(archivePath, { full, keepTemp });
  if (writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (json || writeDocs) printJson(result);
  else {
    process.stdout.write(`PROOFSCRIPT_VERIFY_DELIVERY_ARCHIVE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`deliveryArchiveVerificationSha256=${result.deliveryArchiveVerificationSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
