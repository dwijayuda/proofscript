#!/usr/bin/env node
import './register-local-workspace.cts';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkLocalWorkspaces } from './link-local-workspaces.cts';
import { snapshotProofScriptSourceTree, verifyProofScriptSourceTreeEvidence } from './pskernel-kernel-source-tree.ts';
import { createProofScriptReleaseArchive, verifyProofScriptReleaseArchiveEvidence } from './pskernel-kernel-release-archive.ts';
import { runPSKernelKernelReleaseManifest, verifyPSKernelKernelReleaseManifest } from './pskernel-kernel-release-manifest.ts';
import { runPSKernelKernelPackageAudit } from './pskernel-kernel-package-audit.ts';
import { runPSKernelKernelTarballSmoke } from './pskernel-kernel-tarball-smoke.ts';
import { loadKernel } from './local-kernel-loader.ts';
import { runProofScriptDeliveryBootstrapVerification } from './pskernel-kernel-delivery-bootstrap.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'proofscript-pskernel-ts-kernel-delivery-verification/v1';
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

export function runProofScriptDeliveryVerification(options = {}) {
  const checks = [];
  const add = check => checks.push(check);
  const failures = () => checks.filter(check => check.status === 'rejected');

  const deliveryBootstrap = runProofScriptDeliveryBootstrapVerification({ archiveOutputPath: options.bootstrapArchiveOutputPath ?? 'artifacts/delivery-verify-bootstrap-source-archive.zip' });
  add(deliveryBootstrap.status === 'accepted'
    ? ok('delivery.bootstrap', 'Manifestless delivery bootstrap evidence accepts', { deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256 })
    : reject('delivery.bootstrap', 'Manifestless delivery bootstrap evidence rejected', deliveryBootstrap));

  const workspaceLinks = linkLocalWorkspaces();
  add(workspaceLinks.status === 'accepted' && workspaceLinks.packageCount > 0
    ? ok('delivery.workspace-links', 'Local workspace packages are symlinked for fresh-extract builds', { packageCount: workspaceLinks.packageCount, workspaceLinksSha256: workspaceLinks.workspaceLinksSha256 })
    : reject('delivery.workspace-links', 'Local workspace package symlink bootstrap failed', workspaceLinks));

  const kernel = loadKernel();
  const statusReport = kernel.pskernelStatusReport();
  add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
    ? ok('delivery.status', 'Kernel status remains trusted-boundary / not-proven', { status: statusReport.status, proofStatus: statusReport.proofStatus })
    : reject('delivery.status', 'Kernel status overclaims beyond trusted-boundary', statusReport));

  const sourceTree = snapshotProofScriptSourceTree();
  const sourceTreeVerification = verifyProofScriptSourceTreeEvidence(sourceTree);
  add(sourceTree.status === 'accepted' && sourceTreeVerification.status === 'accepted'
    ? ok('delivery.source-tree', 'Fresh source tree evidence verifies', { sourceTreeSha256: sourceTree.sourceTreeSha256, fileCount: sourceTree.fileCount })
    : reject('delivery.source-tree', 'Fresh source tree evidence rejected', { sourceTree, sourceTreeVerification }));

  const releaseArchive = createProofScriptReleaseArchive({ outputPath: options.archiveOutputPath ?? 'artifacts/delivery-verify-source-archive.zip' });
  const releaseArchiveVerification = verifyProofScriptReleaseArchiveEvidence(releaseArchive);
  add(releaseArchive.status === 'accepted' && releaseArchiveVerification.status === 'accepted'
    ? ok('delivery.source-archive', 'Fresh source archive evidence verifies', { releaseArchiveSha256: releaseArchive.releaseArchiveSha256, archiveSha256: releaseArchive.archive.sha256 })
    : reject('delivery.source-archive', 'Fresh source archive evidence rejected', { releaseArchive, releaseArchiveVerification }));

  const packageAudit = runPSKernelKernelPackageAudit({ packDestination: options.packDestination ?? 'artifacts/delivery-verify-package-audit' });
  add(packageAudit.status === 'accepted'
    ? ok('delivery.package-audit', 'Package audit accepts from delivered tree', { packageAuditSha256: packageAudit.packageAuditSha256, failures: packageAudit.requiredFailureCount })
    : reject('delivery.package-audit', 'Package audit rejected from delivered tree', packageAudit));

  const tarballSmoke = runPSKernelKernelTarballSmoke({ packDestination: options.tarballDestination ?? 'artifacts/delivery-verify-tarball-smoke' });
  add(tarballSmoke.status === 'accepted'
    ? ok('delivery.tarball-smoke', 'Tarball smoke accepts from delivered tree', { tarballSmokeSha256: tarballSmoke.tarballSmokeSha256, runtime: tarballSmoke.runtime?.status })
    : reject('delivery.tarball-smoke', 'Tarball smoke rejected from delivered tree', tarballSmoke));

  const releaseManifest = runPSKernelKernelReleaseManifest({ packDestination: options.manifestPackDestination ?? 'artifacts/delivery-verify-release-manifest-tarball' });
  const releaseManifestVerification = verifyPSKernelKernelReleaseManifest(releaseManifest, {
    fresh: true,
    packDestination: options.freshPackDestination ?? 'artifacts/delivery-verify-release-manifest-fresh-tarball',
  });
  add(releaseManifest.status === 'accepted' && releaseManifestVerification.status === 'accepted'
    ? ok('delivery.release-manifest-fresh', 'Release manifest regenerates and verifies in fresh-bound mode', { releaseManifestSha256: releaseManifest.releaseManifestSha256, verificationSha256: releaseManifestVerification.verificationSha256 })
    : reject('delivery.release-manifest-fresh', 'Release manifest fresh-bound verification rejected', { releaseManifest, releaseManifestVerification }));

  const payload = {
    schema: SCHEMA,
    status: failures().length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: TRUST_LABEL,
    semanticBaseline: SEMANTIC_BASELINE,
    pinnedLeanRevision: PINNED_LEAN_REVISION,
    generatedAt: new Date(0).toISOString(),
    mode: 'fresh-extract-delivery-bound',
    checkCount: checks.length,
    requiredFailureCount: failures().length,
    checks,
    componentHashes: {
      deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256,
      workspaceLinksSha256: workspaceLinks.workspaceLinksSha256,
      sourceTreeSha256: sourceTree.sourceTreeSha256,
      releaseArchiveSha256: releaseArchive.releaseArchiveSha256,
      releaseArchiveZipSha256: releaseArchive.archive?.sha256,
      packageAuditSha256: packageAudit.packageAuditSha256,
      tarballSmokeSha256: tarballSmoke.tarballSmokeSha256,
      releaseManifestSha256: releaseManifest.releaseManifestSha256,
      releaseManifestVerificationSha256: releaseManifestVerification.verificationSha256,
    },
  };
  const result = { ...payload, deliveryVerificationSha256: sha256(payload) };
  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_DELIVERY_VERIFICATION.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const writeDocs = args.includes('--write-docs');
  const result = runProofScriptDeliveryVerification({ writeDocs });
  if (json || writeDocs) printJson(result);
  else {
    process.stdout.write(`PROOFSCRIPT_DELIVERY_VERIFY=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`deliveryVerificationSha256=${result.deliveryVerificationSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
