#!/usr/bin/env node
import './register-local-workspace.cts';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_TREE_SCHEMA = 'proofscript-pskernel-ts-kernel-source-tree/v1';
export const TRUST_LABEL = 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet';
export const SEMANTIC_BASELINE = 'Lean 4.33.1';
export const PINNED_LEAN_REVISION = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

export function stableStringify(value) { return JSON.stringify(canonicalize(value)); }
export function sha256(value) { return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex'); }
function sha256File(absPath) { return createHash('sha256').update(readFileSync(absPath)).digest('hex'); }

const EXACT_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'README.md',
  'ARCHITECTURE.md',
  'MISSION.md',
  'ROADMAP.md',
  'SECURITY.md',
  'docs/TRUST_BOUNDARY.md',
  'docs/PROOF_OBLIGATIONS.md',
  'docs/PSKERNEL_TS_PORTING_MAP.md',
  'docs/PSKERNEL_TS_PHASE_PLAN.md',
]);

const INCLUDE_PREFIXES = [
  'packages/',
  'tools/',
  'examples/standalone-small/',
  'specs/',
  'tests/',
  'types/',
];

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.ts', '.cts', '.json', '.md', '.ps', '.pscore', '.lean', '.txt'
]);

const EXCLUDED_PARTS = new Set([
  '.git', 'node_modules', 'dist', 'coverage', '.turbo', '.cache', '.npm', '__pycache__'
]);

const EXCLUDED_PREFIXES = [
  'artifacts/',
  'vendor/npm/',
  'legacy/',
];

const EXCLUDED_SUFFIXES = [
  '.zip', '.tgz', '.tar', '.tar.gz', '.7z', '.log', '.tsbuildinfo', '.map'
];

function normalizeRel(absPath) { return relative(repoRoot, absPath).split(sep).join('/'); }
function extensionOf(relPath) {
  for (const suffix of ['.tar.gz', '.tsbuildinfo']) if (relPath.endsWith(suffix)) return suffix;
  const idx = relPath.lastIndexOf('.');
  return idx >= 0 ? relPath.slice(idx) : '';
}
function hasExcludedPart(relPath) { return relPath.split('/').some(part => EXCLUDED_PARTS.has(part)); }
function shouldInclude(relPath) {
  if (!relPath || relPath.startsWith('..')) return false;
  if (hasExcludedPart(relPath)) return false;
  if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return false;
  if (EXCLUDED_SUFFIXES.some(suffix => relPath.endsWith(suffix))) return false;
  if (EXACT_FILES.has(relPath)) return true;
  if (!INCLUDE_PREFIXES.some(prefix => relPath.startsWith(prefix))) return false;
  return SOURCE_EXTENSIONS.has(extensionOf(relPath));
}

function walk(absDir, out = []) {
  const entries = readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const abs = resolve(absDir, entry.name);
    const rel = normalizeRel(abs);
    if (entry.isDirectory()) {
      if (hasExcludedPart(rel) || EXCLUDED_PREFIXES.some(prefix => `${rel}/`.startsWith(prefix))) continue;
      walk(abs, out);
    } else if (entry.isFile() && shouldInclude(rel)) {
      out.push(rel);
    }
  }
  return out;
}

export function snapshotProofScriptSourceTree(options = {}) {
  const files = walk(repoRoot).sort();
  const fileEntries = files.map((path) => {
    const abs = resolve(repoRoot, path);
    const stat = statSync(abs);
    return { path, bytes: stat.size, sha256: sha256File(abs) };
  });
  const payload = {
    schema: SOURCE_TREE_SCHEMA,
    status: 'accepted',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    pinnedLeanRevision: PINNED_LEAN_REVISION,
    generatedAt: new Date(0).toISOString(),
    profile: 'release-critical-source-tree',
    includeRules: {
      exactFiles: [...EXACT_FILES].sort(),
      includePrefixes: [...INCLUDE_PREFIXES],
      sourceExtensions: [...SOURCE_EXTENSIONS].sort(),
      excludedParts: [...EXCLUDED_PARTS].sort(),
      excludedPrefixes: [...EXCLUDED_PREFIXES],
      excludedSuffixes: [...EXCLUDED_SUFFIXES].sort(),
    },
    fileCount: fileEntries.length,
    totalBytes: fileEntries.reduce((sum, file) => sum + file.bytes, 0),
    files: fileEntries,
  };
  const snapshot = { ...payload, sourceTreeSha256: sha256(payload) };
  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_SOURCE_TREE.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  return snapshot;
}

export function validateSourceTreeEvidenceShape(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return 'source tree evidence must be an object';
  if (evidence.schema !== SOURCE_TREE_SCHEMA) return 'source tree evidence schema mismatch';
  if (evidence.status !== 'accepted') return 'source tree evidence status must be accepted';
  if (evidence.proofStatus !== 'not-proven') return 'source tree evidence proofStatus must be not-proven';
  if (evidence.trustLabel !== TRUST_LABEL) return 'source tree evidence trust label mismatch';
  if (evidence.semanticBaseline !== SEMANTIC_BASELINE) return 'source tree evidence semantic baseline mismatch';
  if (evidence.pinnedLeanRevision !== PINNED_LEAN_REVISION) return 'source tree evidence pinned Lean revision mismatch';
  if (!Number.isSafeInteger(evidence.fileCount) || evidence.fileCount <= 0) return 'source tree evidence fileCount must be positive safe integer';
  if (!Number.isSafeInteger(evidence.totalBytes) || evidence.totalBytes <= 0) return 'source tree evidence totalBytes must be positive safe integer';
  if (!Array.isArray(evidence.files) || evidence.files.length !== evidence.fileCount) return 'source tree evidence files must match fileCount';
  if (typeof evidence.sourceTreeSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(evidence.sourceTreeSha256)) return 'source tree evidence sourceTreeSha256 must be a sha256';
  for (let i = 0; i < evidence.files.length; i++) {
    const file = evidence.files[i];
    if (!file || typeof file !== 'object' || Array.isArray(file)) return `source tree evidence files[${i}] must be an object`;
    if (typeof file.path !== 'string' || file.path.length === 0 || file.path.startsWith('/') || file.path.includes('..')) return `source tree evidence files[${i}].path must be safe relative path`;
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) return `source tree evidence files[${i}].bytes must be nonnegative safe integer`;
    if (typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) return `source tree evidence files[${i}].sha256 must be a sha256`;
    if (i > 0 && evidence.files[i - 1].path >= file.path) return 'source tree evidence files must be sorted by unique path';
  }
  const withoutHash = { ...evidence };
  delete withoutHash.sourceTreeSha256;
  if (sha256(withoutHash) !== evidence.sourceTreeSha256) return 'source tree evidence hash does not match canonical payload';
  return undefined;
}

export function verifyProofScriptSourceTreeEvidence(evidence) {
  const shapeError = validateSourceTreeEvidenceShape(evidence);
  if (shapeError) {
    return { status: 'rejected', proofStatus: 'not-proven', trustLabel: TRUST_LABEL, semanticBaseline: SEMANTIC_BASELINE, message: shapeError };
  }
  const actual = snapshotProofScriptSourceTree();
  const checks = [];
  const add = (status, id, message, details = {}) => checks.push({ id, status, message, details });
  add(actual.sourceTreeSha256 === evidence.sourceTreeSha256 ? 'accepted' : 'rejected', 'source-tree.sha256', 'source tree hash matches fresh workspace', { supplied: evidence.sourceTreeSha256, expected: actual.sourceTreeSha256 });
  add(actual.fileCount === evidence.fileCount ? 'accepted' : 'rejected', 'source-tree.file-count', 'source tree file count matches fresh workspace', { supplied: evidence.fileCount, expected: actual.fileCount });
  add(actual.totalBytes === evidence.totalBytes ? 'accepted' : 'rejected', 'source-tree.total-bytes', 'source tree byte count matches fresh workspace', { supplied: evidence.totalBytes, expected: actual.totalBytes });
  if (actual.sourceTreeSha256 !== evidence.sourceTreeSha256) {
    const supplied = new Map(evidence.files.map(file => [file.path, file]));
    const expected = new Map(actual.files.map(file => [file.path, file]));
    const firstMismatch = [...new Set([...supplied.keys(), ...expected.keys()])].sort().find(path => {
      const a = supplied.get(path), b = expected.get(path);
      return !a || !b || a.bytes !== b.bytes || a.sha256 !== b.sha256;
    });
    if (firstMismatch) add('rejected', 'source-tree.first-mismatch', 'source tree first mismatching path', { path: firstMismatch, supplied: supplied.get(firstMismatch), expected: expected.get(firstMismatch) });
  }
  const rejected = checks.filter(check => check.status === 'rejected');
  return {
    status: rejected.length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    sourceTreeSha256: evidence.sourceTreeSha256,
    expectedSourceTreeSha256: actual.sourceTreeSha256,
    fileCount: evidence.fileCount,
    expectedFileCount: actual.fileCount,
    requiredFailureCount: rejected.length,
    checks,
    ...(rejected.length > 0 ? { message: 'source tree evidence does not match fresh workspace' } : {}),
  };
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? 'snapshot';
  if (cmd === 'snapshot' || cmd === '--json' || cmd === '--write-docs') {
    const snapshot = snapshotProofScriptSourceTree({ writeDocs: args.includes('--write-docs') || cmd === '--write-docs' });
    if (args.includes('--json') || cmd === '--json' || args.includes('--write-docs') || cmd === '--write-docs') printJson(snapshot);
    else {
      process.stdout.write(`PROOFSCRIPT_SOURCE_TREE=PASS\n`);
      process.stdout.write(`files=${snapshot.fileCount} bytes=${snapshot.totalBytes}\n`);
      process.stdout.write(`sourceTreeSha256=${snapshot.sourceTreeSha256}\n`);
    }
    return;
  }
  if (cmd === 'verify') {
    const file = args[1];
    if (!file) throw new Error('usage: pskernel-kernel-source-tree.ts verify <source-tree.json> [--json]');
    const result = verifyProofScriptSourceTreeEvidence(readJson(resolve(file)));
    if (args.includes('--json')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_VERIFY_SOURCE_TREE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
      process.stdout.write(`sourceTreeSha256=${result.sourceTreeSha256 ?? ''}\n`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    return;
  }
  throw new Error(`unknown source-tree command: ${cmd}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
