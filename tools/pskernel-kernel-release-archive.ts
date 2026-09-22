#!/usr/bin/env node
import './register-local-workspace.cts';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotProofScriptSourceTree } from './pskernel-kernel-source-tree.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'proofscript-pskernel-ts-kernel-release-archive/v1';
const TRUST_LABEL = 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet';
const SEMANTIC_BASELINE = 'Lean 4.33.1';
const PINNED_LEAN_REVISION = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const FIXED_DATE = new Date('1980-01-01T00:00:00.000Z');
const ROOT_DIR = 'proofscript-standalone-release';

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
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function normalizeRel(absPath) { return relative(repoRoot, absPath).split(sep).join('/'); }
function normalizeArchivePath(path) { return path.startsWith(repoRoot + sep) ? normalizeRel(path) : path; }
function resolveEvidenceArchivePath(path) { return path.startsWith('/') ? path : resolve(repoRoot, path); }
function ensureParent(path) { mkdirSync(dirname(path), { recursive: true }); }

function walkFiles(absDir, out = []) {
  for (const entry of readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = resolve(absDir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function stageSourceTree(sourceTree, tempRoot) {
  const stageRoot = resolve(tempRoot, ROOT_DIR);
  mkdirSync(stageRoot, { recursive: true });
  for (const file of sourceTree.files) {
    const from = resolve(repoRoot, file.path);
    const to = resolve(stageRoot, file.path);
    ensureParent(to);
    copyFileSync(from, to);
    try { utimesSync(to, FIXED_DATE, FIXED_DATE); } catch {}
  }
  return stageRoot;
}

function zipStagedTree(tempRoot, outputPath, files) {
  rmSync(outputPath, { force: true });
  ensureParent(outputPath);
  const zipInput = files.map(file => `${ROOT_DIR}/${file.path}`).join('\n') + '\n';
  execFileSync('zip', ['-X', '-q', outputPath, '-@'], {
    cwd: tempRoot,
    input: zipInput,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function createProofScriptReleaseArchive(options = {}) {
  const outputPath = resolve(repoRoot, options.outputPath ?? 'artifacts/proofscript-standalone-release-source.zip');
  const sourceTree = snapshotProofScriptSourceTree();
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'proofscript-release-archive-'));
  try {
    stageSourceTree(sourceTree, tempRoot);
    zipStagedTree(tempRoot, outputPath, sourceTree.files);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  const archive = {
    path: normalizeArchivePath(outputPath),
    filename: basename(outputPath),
    bytes: statSync(outputPath).size,
    sha256: sha256File(outputPath),
  };
  const payload = {
    schema: SCHEMA,
    status: 'accepted',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    pinnedLeanRevision: PINNED_LEAN_REVISION,
    generatedAt: new Date(0).toISOString(),
    profile: 'release-critical-source-tree-zip',
    zipTool: 'zip -X -q -@ over fixed-mtime staged files',
    fixedTimestamp: FIXED_DATE.toISOString(),
    rootDirectory: ROOT_DIR,
    sourceTreeSha256: sourceTree.sourceTreeSha256,
    sourceTreeFileCount: sourceTree.fileCount,
    sourceTreeTotalBytes: sourceTree.totalBytes,
    archivePayloadSha256: sha256(sourceTree.files.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 }))),
    archive,
  };
  const evidence = { ...payload, releaseArchiveSha256: sha256(payload) };
  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_RELEASE_ARCHIVE.json');
    ensureParent(outPath);
    writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return evidence;
}

function validateEvidenceShape(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return 'release archive evidence must be an object';
  if (evidence.schema !== SCHEMA) return 'release archive evidence schema mismatch';
  if (evidence.status !== 'accepted') return 'release archive evidence status must be accepted';
  if (evidence.proofStatus !== 'not-proven') return 'release archive evidence proofStatus must be not-proven';
  if (evidence.trustLabel !== TRUST_LABEL) return 'release archive evidence trust label mismatch';
  if (evidence.semanticBaseline !== SEMANTIC_BASELINE) return 'release archive evidence semantic baseline mismatch';
  if (evidence.pinnedLeanRevision !== PINNED_LEAN_REVISION) return 'release archive evidence pinned Lean revision mismatch';
  for (const field of ['sourceTreeSha256', 'archivePayloadSha256', 'releaseArchiveSha256']) {
    if (typeof evidence[field] !== 'string' || !/^[0-9a-f]{64}$/.test(evidence[field])) return `release archive evidence ${field} must be a sha256`;
  }
  if (!Number.isSafeInteger(evidence.sourceTreeFileCount) || evidence.sourceTreeFileCount <= 0) return 'release archive evidence sourceTreeFileCount must be positive';
  if (!Number.isSafeInteger(evidence.sourceTreeTotalBytes) || evidence.sourceTreeTotalBytes <= 0) return 'release archive evidence sourceTreeTotalBytes must be positive';
  if (!evidence.archive || typeof evidence.archive !== 'object' || Array.isArray(evidence.archive)) return 'release archive evidence archive must be an object';
  if (typeof evidence.archive.path !== 'string' || evidence.archive.path.length === 0) return 'release archive evidence archive.path must be nonempty';
  if (typeof evidence.archive.filename !== 'string' || !evidence.archive.filename.endsWith('.zip')) return 'release archive evidence archive.filename must be a zip filename';
  if (!Number.isSafeInteger(evidence.archive.bytes) || evidence.archive.bytes <= 0) return 'release archive evidence archive.bytes must be positive';
  if (typeof evidence.archive.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(evidence.archive.sha256)) return 'release archive evidence archive.sha256 must be a sha256';
  const withoutHash = { ...evidence };
  delete withoutHash.releaseArchiveSha256;
  if (sha256(withoutHash) !== evidence.releaseArchiveSha256) return 'release archive evidence hash does not match canonical payload';
  return undefined;
}

function snapshotExtractedArchive(archivePath) {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'proofscript-release-archive-verify-'));
  try {
    execFileSync('unzip', ['-q', archivePath, '-d', tempRoot], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const root = resolve(tempRoot, ROOT_DIR);
    if (!existsSync(root)) return { status: 'rejected', message: `archive root ${ROOT_DIR} missing`, files: [] };
    const files = walkFiles(root).map(abs => {
      const rel = relative(root, abs).split(sep).join('/');
      const st = statSync(abs);
      return { path: rel, bytes: st.size, sha256: sha256File(abs) };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return { status: 'accepted', files, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), payloadSha256: sha256(files) };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export function verifyProofScriptReleaseArchiveEvidence(evidence) {
  const shapeError = validateEvidenceShape(evidence);
  if (shapeError) return { status: 'rejected', proofStatus: 'not-proven', trustLabel: TRUST_LABEL, semanticBaseline: SEMANTIC_BASELINE, message: shapeError };
  const checks = [];
  const ok = (id, message, details = {}) => checks.push({ id, status: 'accepted', message, details });
  const reject = (id, message, details = {}) => checks.push({ id, status: 'rejected', message, details });
  const archivePath = resolveEvidenceArchivePath(evidence.archive.path);
  const actualSourceTree = snapshotProofScriptSourceTree();
  if (!existsSync(archivePath)) {
    reject('archive.exists', 'release archive zip file is missing', { path: evidence.archive.path });
  } else {
    const actualArchive = { bytes: statSync(archivePath).size, sha256: sha256File(archivePath) };
    actualArchive.bytes === evidence.archive.bytes && actualArchive.sha256 === evidence.archive.sha256
      ? ok('archive.hash', 'release archive bytes/hash match evidence', actualArchive)
      : reject('archive.hash', 'release archive bytes/hash mismatch', { supplied: evidence.archive, expected: actualArchive });
    const extracted = snapshotExtractedArchive(archivePath);
    if (extracted.status !== 'accepted') reject('archive.extract', 'release archive extraction failed', extracted);
    else {
      const expectedFiles = actualSourceTree.files.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 }));
      extracted.fileCount === actualSourceTree.fileCount && extracted.totalBytes === actualSourceTree.totalBytes
        ? ok('archive.payload.counts', 'release archive extracted payload counts match fresh source tree', { fileCount: extracted.fileCount, totalBytes: extracted.totalBytes })
        : reject('archive.payload.counts', 'release archive extracted payload counts mismatch fresh source tree', { supplied: { fileCount: extracted.fileCount, totalBytes: extracted.totalBytes }, expected: { fileCount: actualSourceTree.fileCount, totalBytes: actualSourceTree.totalBytes } });
      const expectedPayload = sha256(expectedFiles);
      extracted.payloadSha256 === expectedPayload && extracted.payloadSha256 === evidence.archivePayloadSha256
        ? ok('archive.payload.hash', 'release archive extracted payload hash matches fresh source tree and evidence', { archivePayloadSha256: extracted.payloadSha256 })
        : reject('archive.payload.hash', 'release archive extracted payload hash mismatch', { supplied: evidence.archivePayloadSha256, extracted: extracted.payloadSha256, expected: expectedPayload });
      if (extracted.payloadSha256 !== expectedPayload) {
        const supplied = new Map(extracted.files.map(file => [file.path, file]));
        const expected = new Map(expectedFiles.map(file => [file.path, file]));
        const firstMismatch = [...new Set([...supplied.keys(), ...expected.keys()])].sort().find(path => {
          const a = supplied.get(path), b = expected.get(path);
          return !a || !b || a.bytes !== b.bytes || a.sha256 !== b.sha256;
        });
        if (firstMismatch) reject('archive.payload.first-mismatch', 'first mismatching archive payload file', { path: firstMismatch, archive: supplied.get(firstMismatch), expected: expected.get(firstMismatch) });
      }
    }
  }
  actualSourceTree.sourceTreeSha256 === evidence.sourceTreeSha256
    ? ok('source-tree.hash', 'release archive evidence binds fresh source tree hash', { sourceTreeSha256: actualSourceTree.sourceTreeSha256 })
    : reject('source-tree.hash', 'release archive evidence source tree hash mismatch', { supplied: evidence.sourceTreeSha256, expected: actualSourceTree.sourceTreeSha256 });
  const rejected = checks.filter(check => check.status === 'rejected');
  return {
    status: rejected.length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    releaseArchiveSha256: evidence.releaseArchiveSha256,
    sourceTreeSha256: evidence.sourceTreeSha256,
    archiveSha256: evidence.archive.sha256,
    archivePayloadSha256: evidence.archivePayloadSha256,
    checkCount: checks.length,
    requiredFailureCount: rejected.length,
    checks,
    ...(rejected.length > 0 ? { message: 'release archive evidence does not match fresh workspace/archive' } : {}),
  };
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? 'create';
  const json = args.includes('--json');
  const writeDocs = args.includes('--write-docs');
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  if (cmd === 'create' || cmd === '--json' || cmd === '--write-docs') {
    const result = createProofScriptReleaseArchive({ outputPath, writeDocs });
    if (json || writeDocs || cmd === '--json' || cmd === '--write-docs') printJson(result);
    else {
      process.stdout.write('PROOFSCRIPT_RELEASE_ARCHIVE=PASS\n');
      process.stdout.write(`archiveSha256=${result.archive.sha256}\n`);
      process.stdout.write(`releaseArchiveSha256=${result.releaseArchiveSha256}\n`);
    }
    return;
  }
  if (cmd === 'verify') {
    const file = args[1];
    if (!file) throw new Error('usage: pskernel-kernel-release-archive.ts verify <archive-evidence.json> [--json]');
    const result = verifyProofScriptReleaseArchiveEvidence(readJson(resolve(file)));
    if (json) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_VERIFY_RELEASE_ARCHIVE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
      process.stdout.write(`releaseArchiveSha256=${result.releaseArchiveSha256 ?? ''}\n`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    return;
  }
  throw new Error(`unknown release archive command: ${cmd}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
