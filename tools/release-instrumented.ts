#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPSKernelKernelPreflight } from './pskernel-kernel-preflight.ts';
import { runPSKernelKernelPackageAudit } from './pskernel-kernel-package-audit.ts';
import { runPSKernelKernelTarballSmoke } from './pskernel-kernel-tarball-smoke.ts';
import { loadKernel } from './local-kernel-loader.ts';
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

export function runPSKernelKernelReleaseManifest(options = {}) {
  const checks = [];
  const add = (check) => checks.push(check);
  const failures = () => checks.filter((check) => check.status === 'rejected');
  const kernel = loadKernel();
  const packageJson = readJson(resolve(repoRoot, 'packages/kernel/package.json'));
  const statusReport = kernel.pskernelStatusReport();
  const obligations = kernel.pskernelProofObligations();
  const obligationCatalogCheck = kernel.verifyProofObligationCatalog(obligations.obligations);

  add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
    ? ok('status.trust-boundary', 'Kernel status keeps trusted-boundary / not-proven wording')
    : reject('status.trust-boundary', 'Kernel status overclaims beyond trusted-boundary', statusReport));
  add(packageJson.name === '@proofscript/kernel' && packageJson.main === 'dist/index.js' && packageJson.types === 'dist/index.d.ts'
    ? ok('package.entrypoints', 'Package entrypoints are release-manifest compatible')
    : reject('package.entrypoints', 'Package entrypoints changed unexpectedly', { name: packageJson.name, main: packageJson.main, types: packageJson.types }));
  add(obligationCatalogCheck.status === 'accepted' && obligations.proofStatus === 'not-proven' && obligations.byProofStatus['not-proven'] === obligations.total
    ? ok('obligations.not-proven', 'Proof obligations validate and do not claim proven status')
    : reject('obligations.not-proven', 'Proof obligations are invalid or overclaim proven status', { obligationCatalogCheck, byProofStatus: obligations.byProofStatus }));

  console.error("STEP preflight start");
  const preflight = runPSKernelKernelPreflight();
  console.error("STEP preflight done", preflight.status);
  add(preflight.status === 'accepted'
    ? ok('component.preflight', 'Release preflight accepts', { preflightSha256: preflight.preflightSha256, checkCount: preflight.checkCount })
    : reject('component.preflight', 'Release preflight rejected', { preflightSha256: preflight.preflightSha256, failures: preflight.requiredFailureCount }));

  console.error("STEP packageAudit start");
  const packageAudit = runPSKernelKernelPackageAudit();
  console.error("STEP packageAudit done", packageAudit.status);
  add(packageAudit.status === 'accepted'
    ? ok('component.package-audit', 'Package audit accepts', { packageAuditSha256: packageAudit.packageAuditSha256, checkCount: packageAudit.checkCount })
    : reject('component.package-audit', 'Package audit rejected', { packageAuditSha256: packageAudit.packageAuditSha256, failures: packageAudit.requiredFailureCount }));

  const tarballPackDestination = options.packDestination ?? 'artifacts/release-manifest-tarball-smoke';
  console.error("STEP tarball1 start");
  const tarballSmoke1 = runPSKernelKernelTarballSmoke({ packDestination: tarballPackDestination });
  console.error("STEP tarball1 done", tarballSmoke1.status);
  console.error("STEP tarball2 start");
  const tarballSmoke2 = runPSKernelKernelTarballSmoke({ packDestination: tarballPackDestination });
  console.error("STEP tarball2 done", tarballSmoke2.status);
  add(tarballSmoke1.status === 'accepted' && tarballSmoke2.status === 'accepted'
    ? ok('component.tarball-smoke', 'Install-from-tarball smoke accepts twice', { tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256, checkCount: tarballSmoke1.checkCount })
    : reject('component.tarball-smoke', 'Install-from-tarball smoke rejected', { first: tarballSmoke1.status, second: tarballSmoke2.status }));
  add(tarballSmoke1.tarballSmokeSha256 === tarballSmoke2.tarballSmokeSha256
    ? ok('component.tarball-smoke.deterministic', 'Tarball smoke manifest hash is deterministic across repeated runs', { tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256 })
    : reject('component.tarball-smoke.deterministic', 'Tarball smoke manifest hash changed across repeated runs', { first: tarballSmoke1.tarballSmokeSha256, second: tarballSmoke2.tarballSmokeSha256 }));

  const smokeArtifactPath = resolve(repoRoot, 'artifacts/pskernel-cli-certify-smoke.json');
  let auditBundle = { status: 'not-run' };
  console.error("STEP auditbundle start");
  if (existsSync(smokeArtifactPath)) {
    auditBundle = kernel.pskernelAuditCoreArtifact(readJson(smokeArtifactPath));
    add(auditBundle.status === 'accepted' && auditBundle.certificateVerification?.status === 'accepted'
      ? ok('component.audit-bundle', 'Standalone audit bundle accepts and verifies its certificate', { auditSha256: auditBundle.auditSha256 })
      : reject('component.audit-bundle', 'Standalone audit bundle rejected or certificate verification failed', auditBundle));
  } else {
    add(reject('component.audit-bundle', 'Smoke artifact required for release manifest is missing'));
  }

  console.error("STEP auditbundle done");
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
      preflightSha256: preflight.preflightSha256,
      packageAuditSha256: packageAudit.packageAuditSha256,
      tarballSmokeSha256: tarballSmoke1.tarballSmokeSha256,
      standaloneAuditSha256: auditBundle.auditSha256,
      tarballSha256: tarballSmoke1.packed?.tarballSha256,
      tarballFilesSha256: tarballSmoke1.packed?.filesSha256,
    },
    componentSummaries: {
      preflight: { status: preflight.status, checks: preflight.checkCount, failures: preflight.requiredFailureCount, warnings: preflight.warningCount },
      packageAudit: { status: packageAudit.status, checks: packageAudit.checkCount, failures: packageAudit.requiredFailureCount, fileCount: packageAudit.packed?.fileCount },
      tarballSmoke: { status: tarballSmoke1.status, checks: tarballSmoke1.checkCount, failures: tarballSmoke1.requiredFailureCount, fileCount: tarballSmoke1.packed?.fileCount, runtime: tarballSmoke1.runtime?.status },
      auditBundle: { status: auditBundle.status, certificateVerification: auditBundle.certificateVerification?.status },
      obligations: { total: obligations.total, byStatus: obligations.byStatus, byProofStatus: obligations.byProofStatus },
    },
    evidenceFiles,
  };
  const manifestWithHash = { ...manifest, releaseManifestSha256: sha256(manifest) };

  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_RELEASE_MANIFEST.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifestWithHash, null, 2)}\n`);
  }

  console.error("STEP done");
  return manifestWithHash;
}

function main() {
  const args = process.argv.slice(2);
  const writeDocs = args.includes('--write-docs');
  const packIndex = args.indexOf('--pack-destination');
  const packDestination = packIndex >= 0 ? args[packIndex + 1] : undefined;
  const json = args.includes('--json') || writeDocs;
  const result = runPSKernelKernelReleaseManifest({ writeDocs, packDestination });
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
