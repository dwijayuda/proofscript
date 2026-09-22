#!/usr/bin/env node
import './register-local-workspace.cts';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPSKernelKernelPreflight } from './pskernel-kernel-preflight.ts';
import { runPSKernelKernelPackageAudit } from './pskernel-kernel-package-audit.ts';
import { runPSKernelKernelTarballSmoke } from './pskernel-kernel-tarball-smoke.ts';
import { loadKernel } from './local-kernel-loader.ts';
import { snapshotProofScriptSourceTree, verifyProofScriptSourceTreeEvidence } from './pskernel-kernel-source-tree.ts';
import { createProofScriptReleaseArchive, verifyProofScriptReleaseArchiveEvidence } from './pskernel-kernel-release-archive.ts';
import { runProofScriptDeliveryBootstrapVerification } from './pskernel-kernel-delivery-bootstrap.ts';
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

function fileEvidence(relPath) {
  const path = resolve(repoRoot, relPath);
  if (!existsSync(path)) return { path: relPath, exists: false };
  return { path: relPath, exists: true, bytes: statSync(path).size, sha256: sha256File(path) };
}

function runBoundedReleasePreflight({ kernel, packageJson, statusReport, obligations, obligationCatalogCheck }) {
  const checks = [];
  const add = (check) => checks.push(check);
  const failures = () => checks.filter((check) => check.status === 'rejected');
  add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
    ? ok('bounded.status.trust-boundary', 'Bounded release preflight confirms trusted-boundary / not-proven status')
    : reject('bounded.status.trust-boundary', 'Bounded release preflight found status overclaim', statusReport));
  add(packageJson.name === '@proofscript/kernel' && packageJson.main === 'dist/index.js' && packageJson.types === 'dist/index.d.ts'
    ? ok('bounded.package.entrypoints', 'Bounded release preflight confirms package entrypoints')
    : reject('bounded.package.entrypoints', 'Bounded release preflight found package entrypoint mismatch', { name: packageJson.name, main: packageJson.main, types: packageJson.types }));
  add(obligationCatalogCheck.status === 'accepted' && obligations.proofStatus === 'not-proven' && obligations.byProofStatus['not-proven'] === obligations.total
    ? ok('bounded.obligations.not-proven', 'Bounded release preflight confirms obligation catalog is valid and not-proven')
    : reject('bounded.obligations.not-proven', 'Bounded release preflight found invalid or overclaiming obligations', { obligationCatalogCheck, byProofStatus: obligations.byProofStatus }));
  add(typeof kernel.pskernelStatus === 'function' && /trusted-boundary/.test(kernel.pskernelStatus())
    ? ok('bounded.main.status-entry', 'Bounded release preflight confirms Main status entry is available')
    : reject('bounded.main.status-entry', 'Bounded release preflight could not call Main status entry'));
  const manifest = {
    schema: 'proofscript-pskernel-ts-kernel-bounded-release-preflight/v1',
    status: failures().length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet',
    semanticBaseline: 'Lean 4.33.1',
    pinnedLeanRevision: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
    generatedAt: new Date(0).toISOString(),
    checkCount: checks.length,
    warningCount: 0,
    requiredFailureCount: failures().length,
    mode: 'bounded',
    checks,
  };
  return { ...manifest, preflightSha256: sha256(manifest) };
}

export function runPSKernelKernelReleaseManifest(options = {}) {
  const checks = [];
  const add = (check) => checks.push(check);
  const failures = () => checks.filter((check) => check.status === 'rejected');
  const kernel = loadKernel();
  const packageJson = readJson(resolve(repoRoot, 'packages/kernel/package.json'));
  const statusReport = kernel.pskernelStatusReport();
  const obligations = kernel.pskernelProofObligations();
  const obligationCatalogCheck = kernel.verifyProofObligationCatalog(obligations.obligations);
  const sourceTree = snapshotProofScriptSourceTree();
  const sourceTreeVerification = verifyProofScriptSourceTreeEvidence(sourceTree);
  const releaseArchive = createProofScriptReleaseArchive({ outputPath: options.archiveOutputPath ?? 'artifacts/release-manifest-source-archive/proofscript-standalone-release-source.zip', writeDocs: true });
  const releaseArchiveVerification = verifyProofScriptReleaseArchiveEvidence(releaseArchive);
  const deliveryBootstrap = runProofScriptDeliveryBootstrapVerification({ archiveOutputPath: options.deliveryBootstrapArchiveOutputPath ?? 'artifacts/release-manifest-delivery-bootstrap-source-archive.zip' });

  add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
    ? ok('status.trust-boundary', 'Kernel status keeps trusted-boundary / not-proven wording')
    : reject('status.trust-boundary', 'Kernel status overclaims beyond trusted-boundary', statusReport));
  add(packageJson.name === '@proofscript/kernel' && packageJson.main === 'dist/index.js' && packageJson.types === 'dist/index.d.ts'
    ? ok('package.entrypoints', 'Package entrypoints are release-manifest compatible')
    : reject('package.entrypoints', 'Package entrypoints changed unexpectedly', { name: packageJson.name, main: packageJson.main, types: packageJson.types }));
  add(obligationCatalogCheck.status === 'accepted' && obligations.proofStatus === 'not-proven' && obligations.byProofStatus['not-proven'] === obligations.total
    ? ok('obligations.not-proven', 'Proof obligations validate and do not claim proven status')
    : reject('obligations.not-proven', 'Proof obligations are invalid or overclaim proven status', { obligationCatalogCheck, byProofStatus: obligations.byProofStatus }));
  add(sourceTree.status === 'accepted' && sourceTreeVerification.status === 'accepted'
    ? ok('source-tree.evidence', 'Release source tree inventory is deterministic and verifies against the workspace', { sourceTreeSha256: sourceTree.sourceTreeSha256, fileCount: sourceTree.fileCount })
    : reject('source-tree.evidence', 'Release source tree inventory failed verification', { sourceTree, sourceTreeVerification }));
  add(releaseArchive.status === 'accepted' && releaseArchiveVerification.status === 'accepted' && releaseArchive.sourceTreeSha256 === sourceTree.sourceTreeSha256
    ? ok('source-archive.evidence', 'Release source archive is deterministic and verifies against the workspace', { releaseArchiveSha256: releaseArchive.releaseArchiveSha256, archiveSha256: releaseArchive.archive.sha256 })
    : reject('source-archive.evidence', 'Release source archive evidence failed verification', { releaseArchive, releaseArchiveVerification }));
  add(deliveryBootstrap.status === 'accepted'
    ? ok('component.delivery-bootstrap', 'Manifestless delivery bootstrap evidence accepts', { deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256 })
    : reject('component.delivery-bootstrap', 'Manifestless delivery bootstrap evidence rejected', deliveryBootstrap));

  const preflight = options.heavyPreflight === true
    ? runPSKernelKernelPreflight()
    : runBoundedReleasePreflight({ kernel, packageJson, statusReport, obligations, obligationCatalogCheck });
  add(preflight.status === 'accepted'
    ? ok('component.preflight', 'Release preflight accepts', { preflightSha256: preflight.preflightSha256, checkCount: preflight.checkCount })
    : reject('component.preflight', 'Release preflight rejected', { preflightSha256: preflight.preflightSha256, failures: preflight.requiredFailureCount }));

  const packageAudit = runPSKernelKernelPackageAudit();
  add(packageAudit.status === 'accepted'
    ? ok('component.package-audit', 'Package audit accepts', { packageAuditSha256: packageAudit.packageAuditSha256, checkCount: packageAudit.checkCount })
    : reject('component.package-audit', 'Package audit rejected', { packageAuditSha256: packageAudit.packageAuditSha256, failures: packageAudit.requiredFailureCount }));

  const tarballPackDestination = options.packDestination ?? 'artifacts/release-manifest-tarball-smoke';
  const tarballSmoke1 = runPSKernelKernelTarballSmoke({ packDestination: tarballPackDestination });
  const tarballSmoke2 = options.repeatTarballSmoke ? runPSKernelKernelTarballSmoke({ packDestination: tarballPackDestination }) : undefined;
  add(tarballSmoke1.status === 'accepted'
    ? ok('component.tarball-smoke', 'Install-from-tarball smoke accepts', { tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256, checkCount: tarballSmoke1.checkCount })
    : reject('component.tarball-smoke', 'Install-from-tarball smoke rejected', { first: tarballSmoke1.status }));
  if (options.repeatTarballSmoke) {
    add(tarballSmoke1.status === 'accepted' && tarballSmoke2?.status === 'accepted' && tarballSmoke1.tarballSmokeSha256 === tarballSmoke2.tarballSmokeSha256
      ? ok('component.tarball-smoke.deterministic', 'Tarball smoke manifest hash is deterministic across repeated runs', { tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256 })
      : reject('component.tarball-smoke.deterministic', 'Tarball smoke manifest hash changed across repeated runs', { first: tarballSmoke1.tarballSmokeSha256, second: tarballSmoke2?.tarballSmokeSha256 }));
  }

  const smokeArtifactPath = resolve(repoRoot, 'artifacts/pskernel-cli-certify-smoke.json');
  let auditBundle = { status: 'not-run' };
  let certificateBundle = { status: 'not-run' };
  let certificateBundleVerification = { status: 'not-run' };
  let certificateBundle2 = { status: 'not-run' };
  if (existsSync(smokeArtifactPath)) {
    const smokeArtifact = readJson(smokeArtifactPath);
    auditBundle = kernel.pskernelAuditCoreArtifact(smokeArtifact);
    add(auditBundle.status === 'accepted' && auditBundle.certificateVerification?.status === 'accepted'
      ? ok('component.audit-bundle', 'Standalone audit bundle accepts and verifies its certificate', { auditSha256: auditBundle.auditSha256 })
      : reject('component.audit-bundle', 'Standalone audit bundle rejected or certificate verification failed', auditBundle));

    certificateBundle = kernel.pskernelCreateCoreCertificateBundle(smokeArtifact);
    certificateBundle2 = kernel.pskernelCreateCoreCertificateBundle(smokeArtifact);
    certificateBundleVerification = kernel.pskernelVerifyCoreCertificateBundle(certificateBundle);
    add(certificateBundle.status === 'accepted' && certificateBundleVerification.status === 'accepted'
      ? ok('component.certificate-bundle', 'Certificate bundle accepts and verifies by fresh replay', {
          bundleSha256: certificateBundle.bundleSha256,
          auditSha256: certificateBundle.auditSha256,
          obligationsSha256: certificateBundle.obligationsSha256,
          environmentSha256: certificateBundle.environmentSnapshot?.environmentSha256,
        })
      : reject('component.certificate-bundle', 'Certificate bundle rejected or verification failed', { certificateBundle, certificateBundleVerification }));
    add(certificateBundle.status === 'accepted' && certificateBundle2.status === 'accepted' && certificateBundle.bundleSha256 === certificateBundle2.bundleSha256
      ? ok('component.certificate-bundle.deterministic', 'Certificate bundle hash is deterministic across repeated fresh replay', { bundleSha256: certificateBundle.bundleSha256 })
      : reject('component.certificate-bundle.deterministic', 'Certificate bundle hash changed across repeated fresh replay', { first: certificateBundle.bundleSha256, second: certificateBundle2.bundleSha256 }));
    add(certificateBundle.status === 'accepted' && auditBundle.status === 'accepted' && certificateBundle.auditSha256 === auditBundle.auditSha256
      ? ok('component.certificate-bundle.audit-binding', 'Certificate bundle audit hash matches standalone audit bundle hash', { auditSha256: certificateBundle.auditSha256 })
      : reject('component.certificate-bundle.audit-binding', 'Certificate bundle audit hash does not match standalone audit hash', { certificateBundleAuditSha256: certificateBundle.auditSha256, auditSha256: auditBundle.auditSha256 }));
    add(certificateBundle.status === 'accepted' && obligations.status === 'trusted-boundary' && certificateBundle.obligationsSha256 === sha256(obligations)
      ? ok('component.certificate-bundle.obligation-binding', 'Certificate bundle obligation hash matches release obligation catalog hash', { obligationsSha256: certificateBundle.obligationsSha256 })
      : reject('component.certificate-bundle.obligation-binding', 'Certificate bundle obligation hash does not match release obligation catalog hash', { certificateBundleObligationsSha256: certificateBundle.obligationsSha256, obligationsSha256: sha256(obligations) }));
  } else {
    add(reject('component.audit-bundle', 'Smoke artifact required for release manifest is missing'));
    add(reject('component.certificate-bundle', 'Smoke artifact required for certificate bundle is missing'));
  }

  const evidenceFiles = [
    'packages/kernel/package.json',
    'packages/kernel/dist/index.js',
    'packages/kernel/dist/index.d.ts',
    'docs/TRUST_BOUNDARY.md',
    'docs/PROOF_OBLIGATIONS.md',
    'docs/PSKERNEL_TS_PORTING_MAP.md',
    'docs/PSKERNEL_TS_PHASE_PLAN.md',
    'docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json',
    'docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json',
    'docs/PSKERNEL_TS_PACKAGE_AUDIT.json',
    'docs/PSKERNEL_TS_TARBALL_SMOKE.json',
    'docs/PSKERNEL_TS_RELEASE_ARCHIVE.json',
  ].map(fileEvidence);
  const missingEvidenceFiles = evidenceFiles.filter((file) => !file.exists);
  add(missingEvidenceFiles.length === 0
    ? ok('evidence.files', 'Release evidence files exist and are hashable', { count: evidenceFiles.length })
    : reject('evidence.files', 'Some release evidence files are missing', { missing: missingEvidenceFiles.map((file) => file.path) }));

  const manifest = {
    schema: 'proofscript-pskernel-ts-kernel-release-manifest/v1',
    status: failures().length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet',
    semanticBaseline: 'Lean 4.33.1',
    pinnedLeanRevision: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
    generatedAt: new Date(0).toISOString(),
    package: {
      name: packageJson.name,
      version: packageJson.version,
      main: packageJson.main,
      types: packageJson.types,
    },
    checkCount: checks.length,
    requiredFailureCount: failures().length,
    checks,
    componentHashes: {
      statusReportSha256: sha256(statusReport),
      proofObligationsSha256: sha256(obligations),
      sourceTreeSha256: sourceTree.sourceTreeSha256,
      releaseArchiveSha256: releaseArchive.releaseArchiveSha256,
      releaseArchiveZipSha256: releaseArchive.archive.sha256,
      releaseArchivePayloadSha256: releaseArchive.archivePayloadSha256,
      releaseArchiveSourceTreeSha256: releaseArchive.sourceTreeSha256,
      deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256,
      preflightSha256: preflight.preflightSha256,
      packageAuditSha256: packageAudit.packageAuditSha256,
      tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256,
      standaloneAuditSha256: auditBundle.auditSha256,
      certificateBundleSha256: certificateBundle.bundleSha256,
      certificateBundleVerificationSha256: certificateBundleVerification.status ? sha256(certificateBundleVerification) : undefined,
      certificateBundleAuditSha256: certificateBundle.auditSha256,
      certificateBundleObligationsSha256: certificateBundle.obligationsSha256,
      certificateBundleEnvironmentSha256: certificateBundle.environmentSnapshot?.environmentSha256,
      tarballSha256: tarballSmoke1.packed?.tarballSha256,
      tarballFilesSha256: tarballSmoke1.packed?.filesSha256,
    },
    componentSummaries: {
      preflight: { status: preflight.status, checks: preflight.checkCount, failures: preflight.requiredFailureCount, warnings: preflight.warningCount },
      packageAudit: { status: packageAudit.status, checks: packageAudit.checkCount, failures: packageAudit.requiredFailureCount, fileCount: packageAudit.packed?.fileCount },
      tarballSmoke: { status: tarballSmoke1.status, checks: tarballSmoke1.checkCount, failures: tarballSmoke1.requiredFailureCount, fileCount: tarballSmoke1.packed?.fileCount, runtime: tarballSmoke1.runtime?.status },
      auditBundle: { status: auditBundle.status, certificateVerification: auditBundle.certificateVerification?.status, auditSha256: auditBundle.auditSha256 },
      certificateBundle: {
        status: certificateBundle.status,
        verification: certificateBundleVerification.status,
        bundleSha256: certificateBundle.bundleSha256,
        auditSha256: certificateBundle.auditSha256,
        obligationsSha256: certificateBundle.obligationsSha256,
        environmentSha256: certificateBundle.environmentSnapshot?.environmentSha256,
      },
      obligations: { total: obligations.total, byStatus: obligations.byStatus, byProofStatus: obligations.byProofStatus },
      sourceTree: { status: sourceTree.status, verification: sourceTreeVerification.status, fileCount: sourceTree.fileCount, totalBytes: sourceTree.totalBytes, sourceTreeSha256: sourceTree.sourceTreeSha256 },
      sourceArchive: { status: releaseArchive.status, verification: releaseArchiveVerification.status, releaseArchiveSha256: releaseArchive.releaseArchiveSha256, archiveSha256: releaseArchive.archive.sha256, archiveBytes: releaseArchive.archive.bytes },
      deliveryBootstrap: { status: deliveryBootstrap.status, failures: deliveryBootstrap.requiredFailureCount, deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256 },
    },
    evidenceFiles,
  };
  const manifestWithHash = { ...manifest, releaseManifestSha256: sha256(manifest) };

  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_RELEASE_MANIFEST.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifestWithHash, null, 2)}\n`);
  }

  return manifestWithHash;

}

function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return 'release manifest must be an object';
  if (manifest.schema !== 'proofscript-pskernel-ts-kernel-release-manifest/v1') return 'release manifest schema mismatch';
  if (manifest.proofStatus !== 'not-proven') return 'release manifest proofStatus must be not-proven';
  if (manifest.trustLabel !== 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet') return 'release manifest trust label mismatch';
  if (manifest.semanticBaseline !== 'Lean 4.33.1') return 'release manifest semantic baseline mismatch';
  if (!manifest.componentHashes || typeof manifest.componentHashes !== 'object') return 'release manifest componentHashes must be an object';
  for (const field of [
    'statusReportSha256',
    'proofObligationsSha256',
    'sourceTreeSha256',
    'releaseArchiveSourceTreeSha256',
    'releaseArchivePayloadSha256',
    'releaseArchiveZipSha256',
    'releaseArchiveSha256',
    'deliveryBootstrapSha256',
    'preflightSha256',
    'packageAuditSha256',
    'tarballSmokeSha256',
    'standaloneAuditSha256',
    'certificateBundleSha256',
    'certificateBundleAuditSha256',
    'certificateBundleObligationsSha256',
    'certificateBundleEnvironmentSha256',
    'tarballSha256',
    'tarballFilesSha256',
  ]) {
    if (typeof manifest.componentHashes[field] !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.componentHashes[field])) return `release manifest componentHashes.${field} must be a sha256`;
  }
  if (typeof manifest.releaseManifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.releaseManifestSha256)) return 'release manifest releaseManifestSha256 must be a sha256';
  const withoutHash = { ...manifest };
  delete withoutHash.releaseManifestSha256;
  if (sha256(withoutHash) !== manifest.releaseManifestSha256) return 'release manifest hash does not match canonical payload';
  return undefined;
}

function verifyFreshBoundReleaseManifest(manifest) {
  const kernel = loadKernel();
  const checks = [];
  const add = (check) => checks.push(check);
  const failures = () => checks.filter((check) => check.status === 'rejected');
  const hashes = manifest.componentHashes ?? {};
  const statusReport = kernel.pskernelStatusReport();
  const obligations = kernel.pskernelProofObligations();
  const sourceTree = snapshotProofScriptSourceTree();
  const sourceTreeVerification = verifyProofScriptSourceTreeEvidence(sourceTree);
  const releaseArchive = createProofScriptReleaseArchive({ outputPath: 'artifacts/release-manifest-source-archive/proofscript-standalone-release-source.zip', writeDocs: true });
  const releaseArchiveVerification = verifyProofScriptReleaseArchiveEvidence(releaseArchive);
  const deliveryBootstrap = runProofScriptDeliveryBootstrapVerification({ archiveOutputPath: 'artifacts/release-manifest-delivery-bootstrap-source-archive.zip' });
  const smokeArtifactPath = resolve(repoRoot, 'artifacts/pskernel-cli-certify-smoke.json');
  const smokeArtifact = existsSync(smokeArtifactPath) ? readJson(smokeArtifactPath) : undefined;
  const auditBundle = smokeArtifact ? kernel.pskernelAuditCoreArtifact(smokeArtifact) : { status: 'rejected', message: 'smoke artifact missing' };
  const certificateBundle = smokeArtifact ? kernel.pskernelCreateCoreCertificateBundle(smokeArtifact) : { status: 'rejected', message: 'smoke artifact missing' };
  const certificateBundleVerification = certificateBundle.status === 'accepted' ? kernel.pskernelVerifyCoreCertificateBundle(certificateBundle) : { status: 'rejected', message: 'certificate bundle creation failed' };

  const expected = {
    statusReportSha256: sha256(statusReport),
    proofObligationsSha256: sha256(obligations),
    sourceTreeSha256: sourceTree.sourceTreeSha256,
    releaseArchiveSha256: releaseArchive.releaseArchiveSha256,
    releaseArchiveZipSha256: releaseArchive.archive.sha256,
    releaseArchivePayloadSha256: releaseArchive.archivePayloadSha256,
    releaseArchiveSourceTreeSha256: releaseArchive.sourceTreeSha256,
    deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256,
    standaloneAuditSha256: auditBundle.auditSha256,
    certificateBundleSha256: certificateBundle.bundleSha256,
    certificateBundleVerificationSha256: certificateBundleVerification.status ? sha256(certificateBundleVerification) : undefined,
    certificateBundleAuditSha256: certificateBundle.auditSha256,
    certificateBundleObligationsSha256: certificateBundle.obligationsSha256,
    certificateBundleEnvironmentSha256: certificateBundle.environmentSnapshot?.environmentSha256,
  };

  for (const [field, value] of Object.entries(expected)) {
    add(value === hashes[field]
      ? ok(`fresh-bound.${field}`, `${field} matches fresh deterministic evidence`, { sha256: value })
      : reject(`fresh-bound.${field}`, `${field} does not match fresh deterministic evidence`, { supplied: hashes[field], expected: value }));
  }
  add(certificateBundleVerification.status === 'accepted'
    ? ok('fresh-bound.certificate-bundle-verifies', 'Certificate bundle verifies by fresh replay')
    : reject('fresh-bound.certificate-bundle-verifies', 'Certificate bundle did not verify by fresh replay', certificateBundleVerification));
  add(sourceTreeVerification.status === 'accepted'
    ? ok('fresh-bound.source-tree-verifies', 'Source tree evidence verifies against fresh workspace', { sourceTreeSha256: sourceTree.sourceTreeSha256, fileCount: sourceTree.fileCount })
    : reject('fresh-bound.source-tree-verifies', 'Source tree evidence failed fresh verification', sourceTreeVerification));
  add(releaseArchiveVerification.status === 'accepted'
    ? ok('fresh-bound.source-archive-verifies', 'Source archive evidence verifies against fresh workspace/archive', { releaseArchiveSha256: releaseArchive.releaseArchiveSha256, archiveSha256: releaseArchive.archive.sha256 })
    : reject('fresh-bound.source-archive-verifies', 'Source archive evidence failed fresh verification', releaseArchiveVerification));
  add(deliveryBootstrap.status === 'accepted'
    ? ok('fresh-bound.delivery-bootstrap-verifies', 'Manifestless delivery bootstrap evidence verifies against fresh workspace', { deliveryBootstrapSha256: deliveryBootstrap.deliveryBootstrapSha256 })
    : reject('fresh-bound.delivery-bootstrap-verifies', 'Manifestless delivery bootstrap evidence failed fresh verification', deliveryBootstrap));

  if (Array.isArray(manifest.evidenceFiles)) {
    for (const evidence of manifest.evidenceFiles) {
      if (!evidence || typeof evidence.path !== 'string') {
        add(reject('fresh-bound.evidence-file.shape', 'Evidence file entry must include a path', { evidence }));
        continue;
      }
      const actual = fileEvidence(evidence.path);
      add(actual.exists === true && evidence.exists === true && actual.sha256 === evidence.sha256 && actual.bytes === evidence.bytes
        ? ok(`fresh-bound.evidence-file.${evidence.path}`, 'Evidence file bytes/hash match current workspace', { sha256: actual.sha256 })
        : reject(`fresh-bound.evidence-file.${evidence.path}`, 'Evidence file bytes/hash mismatch', { supplied: evidence, expected: actual }));
    }
  } else {
    add(reject('fresh-bound.evidence-files', 'Release manifest evidenceFiles must be an array'));
  }

  if (failures().length > 0) {
    return {
      status: 'rejected',
      mode: 'fresh-bound',
      proofStatus: 'not-proven',
      trustLabel: manifest.trustLabel,
      semanticBaseline: manifest.semanticBaseline,
      releaseManifestSha256: manifest.releaseManifestSha256,
      requiredFailureCount: failures().length,
      checks,
      message: 'release manifest does not match fresh bounded deterministic evidence',
    };
  }
  return {
    status: 'accepted',
    mode: 'fresh-bound',
    proofStatus: 'not-proven',
    trustLabel: manifest.trustLabel,
    semanticBaseline: manifest.semanticBaseline,
    releaseManifestSha256: manifest.releaseManifestSha256,
    certificateBundleSha256: hashes.certificateBundleSha256,
    certificateBundleObligationsSha256: hashes.certificateBundleObligationsSha256,
    certificateBundleEnvironmentSha256: hashes.certificateBundleEnvironmentSha256,
    standaloneAuditSha256: hashes.standaloneAuditSha256,
    sourceTreeSha256: hashes.sourceTreeSha256,
    releaseArchiveSha256: hashes.releaseArchiveSha256,
    releaseArchiveZipSha256: hashes.releaseArchiveZipSha256,
    deliveryBootstrapSha256: hashes.deliveryBootstrapSha256,
    checkCount: checks.length,
    requiredFailureCount: 0,
    checks,
  };
}

export function verifyPSKernelKernelReleaseManifest(manifest, options = {}) {
  const shapeError = validateManifestShape(manifest);
  if (shapeError) return { status: 'rejected', proofStatus: 'not-proven', trustLabel: 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet', semanticBaseline: 'Lean 4.33.1', message: shapeError };
  if (!options.fresh) {
    return {
      status: 'accepted',
      mode: 'shape-and-self-hash',
      proofStatus: 'not-proven',
      trustLabel: manifest.trustLabel,
      semanticBaseline: manifest.semanticBaseline,
      releaseManifestSha256: manifest.releaseManifestSha256,
      certificateBundleSha256: manifest.componentHashes.certificateBundleSha256,
      certificateBundleObligationsSha256: manifest.componentHashes.certificateBundleObligationsSha256,
      certificateBundleEnvironmentSha256: manifest.componentHashes.certificateBundleEnvironmentSha256,
      standaloneAuditSha256: manifest.componentHashes.standaloneAuditSha256,
      sourceTreeSha256: manifest.componentHashes.sourceTreeSha256,
      releaseArchiveSha256: manifest.componentHashes.releaseArchiveSha256,
      releaseArchiveZipSha256: manifest.componentHashes.releaseArchiveZipSha256,
      deliveryBootstrapSha256: manifest.componentHashes.deliveryBootstrapSha256,
    };
  }
  if (!options.heavy) return verifyFreshBoundReleaseManifest(manifest);

  const expected = runPSKernelKernelReleaseManifest(options);
  if (expected.status !== 'accepted') {
    return { status: expected.status, mode: 'fresh-heavy', proofStatus: 'not-proven', trustLabel: expected.trustLabel, semanticBaseline: expected.semanticBaseline, message: 'fresh heavy release manifest generation did not accept', expectedReleaseManifestSha256: expected.releaseManifestSha256 };
  }
  if (stableStringify(manifest) !== stableStringify(expected)) {
    const suppliedHashes = manifest.componentHashes ?? {};
    const expectedHashes = expected.componentHashes ?? {};
    const mismatch = manifest.releaseManifestSha256 !== expected.releaseManifestSha256 ? 'releaseManifestSha256'
      : suppliedHashes.certificateBundleSha256 !== expectedHashes.certificateBundleSha256 ? 'certificateBundleSha256'
      : suppliedHashes.certificateBundleObligationsSha256 !== expectedHashes.certificateBundleObligationsSha256 ? 'certificateBundleObligationsSha256'
      : suppliedHashes.certificateBundleEnvironmentSha256 !== expectedHashes.certificateBundleEnvironmentSha256 ? 'certificateBundleEnvironmentSha256'
      : suppliedHashes.standaloneAuditSha256 !== expectedHashes.standaloneAuditSha256 ? 'standaloneAuditSha256'
      : suppliedHashes.sourceTreeSha256 !== expectedHashes.sourceTreeSha256 ? 'sourceTreeSha256'
      : suppliedHashes.releaseArchiveSha256 !== expectedHashes.releaseArchiveSha256 ? 'releaseArchiveSha256'
      : suppliedHashes.releaseArchiveZipSha256 !== expectedHashes.releaseArchiveZipSha256 ? 'releaseArchiveZipSha256'
      : suppliedHashes.deliveryBootstrapSha256 !== expectedHashes.deliveryBootstrapSha256 ? 'deliveryBootstrapSha256'
      : 'release manifest payload';
    return {
      status: 'rejected',
      mode: 'fresh-heavy',
      proofStatus: 'not-proven',
      trustLabel: expected.trustLabel,
      semanticBaseline: expected.semanticBaseline,
      message: `release manifest mismatch: ${mismatch} does not match fresh deterministic evidence`,
      suppliedReleaseManifestSha256: manifest.releaseManifestSha256,
      expectedReleaseManifestSha256: expected.releaseManifestSha256,
    };
  }
  return {
    status: 'accepted',
    mode: 'fresh-heavy',
    proofStatus: 'not-proven',
    trustLabel: expected.trustLabel,
    semanticBaseline: expected.semanticBaseline,
    releaseManifestSha256: expected.releaseManifestSha256,
    certificateBundleSha256: expected.componentHashes.certificateBundleSha256,
    certificateBundleObligationsSha256: expected.componentHashes.certificateBundleObligationsSha256,
    certificateBundleEnvironmentSha256: expected.componentHashes.certificateBundleEnvironmentSha256,
    standaloneAuditSha256: expected.componentHashes.standaloneAuditSha256,
    sourceTreeSha256: expected.componentHashes.sourceTreeSha256,
    releaseArchiveSha256: expected.componentHashes.releaseArchiveSha256,
    releaseArchiveZipSha256: expected.componentHashes.releaseArchiveZipSha256,
    deliveryBootstrapSha256: expected.componentHashes.deliveryBootstrapSha256,
  };
}

function main() {
  const args = process.argv.slice(2);
  const writeDocs = args.includes('--write-docs');
  const packIndex = args.indexOf('--pack-destination');
  const packDestination = packIndex >= 0 ? args[packIndex + 1] : undefined;
  const json = args.includes('--json') || writeDocs;
  const repeatTarballSmoke = args.includes('--repeat-tarball-smoke');
  const result = runPSKernelKernelReleaseManifest({ writeDocs, packDestination, repeatTarballSmoke, heavyPreflight: args.includes('--heavy-preflight') });
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`PSKERNEL_TS_KERNEL_RELEASE_MANIFEST=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`releaseManifestSha256=${result.releaseManifestSha256}\n`);
    process.stdout.write(`tarballSha256=${result.componentHashes.tarballSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
