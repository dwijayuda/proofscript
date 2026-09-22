#!/usr/bin/env node
import './register-local-workspace.cts';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkLocalWorkspaces } from './link-local-workspaces.cts';
import { snapshotProofScriptSourceTree, verifyProofScriptSourceTreeEvidence } from './pskernel-kernel-source-tree.ts';
import { createProofScriptReleaseArchive, verifyProofScriptReleaseArchiveEvidence } from './pskernel-kernel-release-archive.ts';
import { loadKernel } from './local-kernel-loader.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'proofscript-pskernel-ts-kernel-delivery-bootstrap/v1';
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
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }

export function runProofScriptDeliveryBootstrapVerification(options = {}) {
  const checks = [];
  const add = check => checks.push(check);
  const failures = () => checks.filter(check => check.status === 'rejected');

  const workspaceLinks = linkLocalWorkspaces();
  add(workspaceLinks.status === 'accepted' && workspaceLinks.packageCount > 0
    ? ok('delivery-bootstrap.workspace-links', 'Local workspace package links are available for fresh-extract execution', { packageCount: workspaceLinks.packageCount, workspaceLinksSha256: workspaceLinks.workspaceLinksSha256 })
    : reject('delivery-bootstrap.workspace-links', 'Local workspace package link bootstrap failed', workspaceLinks));

  const kernel = loadKernel();
  const statusReport = kernel.pskernelStatusReport();
  add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
    ? ok('delivery-bootstrap.status', 'Kernel status remains trusted-boundary / not-proven', { statusReportSha256: sha256(statusReport) })
    : reject('delivery-bootstrap.status', 'Kernel status overclaims beyond trusted-boundary', statusReport));

  const sourceTree = snapshotProofScriptSourceTree();
  const sourceTreeVerification = verifyProofScriptSourceTreeEvidence(sourceTree);
  add(sourceTree.status === 'accepted' && sourceTreeVerification.status === 'accepted'
    ? ok('delivery-bootstrap.source-tree', 'Fresh source tree evidence verifies', { sourceTreeSha256: sourceTree.sourceTreeSha256, fileCount: sourceTree.fileCount })
    : reject('delivery-bootstrap.source-tree', 'Fresh source tree evidence rejected', { sourceTree, sourceTreeVerification }));

  const releaseArchive = createProofScriptReleaseArchive({ outputPath: options.archiveOutputPath ?? 'artifacts/delivery-bootstrap-source-archive.zip' });
  const releaseArchiveVerification = verifyProofScriptReleaseArchiveEvidence(releaseArchive);
  add(releaseArchive.status === 'accepted' && releaseArchiveVerification.status === 'accepted'
    ? ok('delivery-bootstrap.source-archive', 'Fresh source archive evidence verifies', { releaseArchiveSha256: releaseArchive.releaseArchiveSha256, archiveSha256: releaseArchive.archive.sha256 })
    : reject('delivery-bootstrap.source-archive', 'Fresh source archive evidence rejected', { releaseArchive, releaseArchiveVerification }));

  const payload = {
    schema: SCHEMA,
    status: failures().length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    pinnedLeanRevision: PINNED_LEAN_REVISION,
    generatedAt: new Date(0).toISOString(),
    mode: 'manifestless-delivery-bootstrap',
    checkCount: checks.length,
    requiredFailureCount: failures().length,
    checks,
    componentHashes: {
      workspaceLinksSha256: workspaceLinks.workspaceLinksSha256,
      statusReportSha256: sha256(statusReport),
      sourceTreeSha256: sourceTree.sourceTreeSha256,
      releaseArchiveSha256: releaseArchive.releaseArchiveSha256,
      releaseArchiveZipSha256: releaseArchive.archive?.sha256,
      releaseArchivePayloadSha256: releaseArchive.archivePayloadSha256,
    },
  };
  const result = { ...payload, deliveryBootstrapSha256: sha256(payload) };
  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const writeDocs = args.includes('--write-docs');
  const outputIndex = args.indexOf('--output');
  const archiveOutputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  const result = runProofScriptDeliveryBootstrapVerification({ writeDocs, archiveOutputPath });
  if (json || writeDocs) printJson(result);
  else {
    process.stdout.write(`PROOFSCRIPT_DELIVERY_BOOTSTRAP=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`deliveryBootstrapSha256=${result.deliveryBootstrapSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
