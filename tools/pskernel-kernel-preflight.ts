#!/usr/bin/env node
import './register-local-workspace.cts';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPSKernelKernelPackageAudit } from './pskernel-kernel-package-audit.ts';
import { runPSKernelKernelTarballSmoke } from './pskernel-kernel-tarball-smoke.ts';
import { runGovernanceCheck } from './governance-check.ts';
import { loadKernel } from './local-kernel-loader.ts';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parsePortingMap(markdown) {
  const rows = [];
  const rowPattern = /^\| `([^`]+\.lean)` \| `([^`]+\.ts)` \| `([^`]+)` \|\s*$/;
  for (const line of markdown.split(/\r?\n/)) {
    const match = rowPattern.exec(line.trim());
    if (!match) continue;
    rows.push({ sourceLeanFile: match[1], targetTypeScriptFile: match[2], portingMapStatus: match[3] });
  }
  return rows;
}

function extractPortStatus(fileText) {
  const portStart = fileText.search(/export const .*portStatus|export const portStatus_/);
  const slice = portStart >= 0 ? fileText.slice(portStart) : fileText;
  const sourceMatch = /source:\s*"([^"]+)"/.exec(slice);
  const statusMatch = /status:\s*"([^"]+)"/.exec(slice);
  const proofMatch = /proofStatus:\s*"([^"]+)"/.exec(slice);
  return {
    source: sourceMatch?.[1],
    status: statusMatch?.[1],
    proofStatus: proofMatch?.[1],
  };
}

function ok(id, message, details = {}) {
  return { id, status: 'accepted', message, details };
}

function warn(id, message, details = {}) {
  return { id, status: 'warning', message, details };
}

function reject(id, message, details = {}) {
  return { id, status: 'rejected', message, details };
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function runPSKernelKernelPreflight(options = {}) {
  const checks = [];
  const warnings = [];
  const requiredFailures = [];
  const manifestEntries = [];

  const add = (check) => {
    checks.push(check);
    if (check.status === 'warning') warnings.push(check);
    if (check.status === 'rejected') requiredFailures.push(check);
  };

  const portingMapPath = resolve(repoRoot, 'docs/PSKERNEL_TS_PORTING_MAP.md');
  if (!existsSync(portingMapPath)) {
    add(reject('mirror.porting-map.exists', 'docs/PSKERNEL_TS_PORTING_MAP.md is missing'));
  } else {
    const rows = parsePortingMap(readFileSync(portingMapPath, 'utf8'));
    add(rows.length === 112
      ? ok('mirror.porting-map.count', 'Porting map has the expected 112 pskernel source rows', { rows: rows.length })
      : reject('mirror.porting-map.count', 'Porting map row count is not the expected pskernel source inventory size', { rows: rows.length, expected: 112 }));
    add(unique(rows.map(row => row.sourceLeanFile))
      ? ok('mirror.porting-map.unique-source', 'Porting map source Lean files are unique')
      : reject('mirror.porting-map.unique-source', 'Porting map contains duplicate source Lean files'));
    add(unique(rows.map(row => row.targetTypeScriptFile))
      ? ok('mirror.porting-map.unique-target', 'Porting map target TypeScript files are unique')
      : reject('mirror.porting-map.unique-target', 'Porting map contains duplicate target TypeScript files'));

    let missingTargets = 0;
    let missingPortStatus = 0;
    let missingProofStatus = 0;
    let sourceMismatches = 0;
    const statusMismatches = [];

    for (const row of rows) {
      const targetPath = resolve(repoRoot, row.targetTypeScriptFile);
      if (!existsSync(targetPath)) {
        missingTargets += 1;
        manifestEntries.push({ ...row, exists: false });
        continue;
      }
      const fileText = readFileSync(targetPath, 'utf8');
      const portStatus = extractPortStatus(fileText);
      if (!fileText.includes('portStatus_')) missingPortStatus += 1;
      if (portStatus.proofStatus !== 'not-proven') missingProofStatus += 1;
      if (portStatus.source && portStatus.source !== row.sourceLeanFile) sourceMismatches += 1;
      if (portStatus.status && portStatus.status !== row.portingMapStatus) {
        statusMismatches.push({ target: row.targetTypeScriptFile, map: row.portingMapStatus, file: portStatus.status });
      }
      manifestEntries.push({
        ...row,
        exists: true,
        filePortStatus: portStatus.status ?? 'unknown',
        fileProofStatus: portStatus.proofStatus ?? 'unknown',
        sha256: sha256File(targetPath),
        bytes: statSync(targetPath).size,
      });
    }

    add(missingTargets === 0
      ? ok('mirror.targets.exist', 'Every pskernel source row has a TypeScript target file')
      : reject('mirror.targets.exist', 'Some pskernel source rows are missing TypeScript target files', { missingTargets }));
    add(missingPortStatus === 0
      ? ok('mirror.targets.port-status', 'Every mirrored target declares portStatus metadata')
      : reject('mirror.targets.port-status', 'Some mirrored target files lack portStatus metadata', { missingPortStatus }));
    add(missingProofStatus === 0
      ? ok('mirror.targets.not-proven', 'Every mirrored target keeps proofStatus not-proven')
      : reject('mirror.targets.not-proven', 'Some mirrored target files overclaim proof status or omit proofStatus', { missingProofStatus }));
    add(sourceMismatches === 0
      ? ok('mirror.targets.source-link', 'Target portStatus source links match the porting map')
      : reject('mirror.targets.source-link', 'Some target portStatus source links do not match the porting map', { sourceMismatches }));
    if (statusMismatches.length > 0) {
      add(warn('mirror.targets.status-drift', 'Some implementation statuses differ from the original porting-map snapshot; update docs when preparing a public release', { count: statusMismatches.length, sample: statusMismatches.slice(0, 10) }));
    } else {
      add(ok('mirror.targets.status-drift', 'File statuses match the porting-map snapshot'));
    }
  }

  const packageJsonPath = resolve(repoRoot, 'packages/kernel/package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = readJson(packageJsonPath);
    add(pkg.name === '@proofscript/kernel'
      ? ok('package.name', 'Active package name remains @proofscript/kernel')
      : reject('package.name', 'Active kernel package name changed unexpectedly', { name: pkg.name }));
    add(pkg.main === 'dist/index.js' && pkg.types === 'dist/index.d.ts'
      ? ok('package.entrypoints', 'Package entrypoints target built dist output')
      : reject('package.entrypoints', 'Package entrypoints do not target the expected dist files', { main: pkg.main, types: pkg.types }));
  } else {
    add(reject('package.exists', 'packages/kernel/package.json is missing'));
  }

  for (const stale of ['core.js', 'core.d.ts', 'kernel.js', 'kernel.d.ts', 'level.js', 'level.d.ts', 'runner.js', 'runner.d.ts']) {
    const stalePath = resolve(repoRoot, 'packages/kernel/dist', stale);
    add(!existsSync(stalePath)
      ? ok(`dist.no-legacy.${stale}`, `Legacy compact-kernel dist file ${stale} is absent`)
      : reject(`dist.no-legacy.${stale}`, `Legacy compact-kernel dist file ${stale} must not be present in active dist`));
  }

  try {
    const kernel = loadKernel();
    const statusReport = kernel.pskernelStatusReport();
    add(statusReport.status === 'trusted-boundary' && statusReport.proofStatus === 'not-proven'
      ? ok('status.trust-boundary', 'Status report keeps trusted-boundary / not-proven wording')
      : reject('status.trust-boundary', 'Status report overclaims or lost trusted-boundary status', statusReport));
    add(Array.isArray(statusReport.failClosedSlices) && statusReport.failClosedSlices.length > 0
      ? ok('status.fail-closed-slices', 'Status report exposes fail-closed slices')
      : reject('status.fail-closed-slices', 'Status report must list fail-closed slices'));

    const obligations = kernel.pskernelProofObligations();
    const catalogCheck = kernel.verifyProofObligationCatalog(obligations.obligations);
    add(catalogCheck.status === 'accepted' && obligations.total >= 39
      ? ok('obligations.catalog', 'Proof-obligation catalog validates and covers the current trusted-boundary slices', { total: obligations.total })
      : reject('obligations.catalog', 'Proof-obligation catalog validation failed or is below the release-preflight minimum', { catalogCheck, total: obligations.total }));
    add(Object.keys(obligations.byProofStatus).length === 1 && obligations.byProofStatus['not-proven'] === obligations.total
      ? ok('obligations.no-proven-overclaim', 'Proof-obligation catalog contains no proven overclaim')
      : reject('obligations.no-proven-overclaim', 'Proof-obligation catalog must not mark any obligation proven yet', obligations.byProofStatus));

    const artifactPath = resolve(repoRoot, 'artifacts/pskernel-cli-certify-smoke.json');
    if (existsSync(artifactPath)) {
      const artifact = readJson(artifactPath);
      const audit1 = kernel.pskernelAuditCoreArtifact(artifact);
      const audit2 = kernel.pskernelAuditCoreArtifact(artifact);
      add(audit1.status === 'accepted' && audit1.certificateVerification?.status === 'accepted'
        ? ok('audit.accepted', 'Standalone audit accepts the smoke artifact and verifies its certificate', { auditSha256: audit1.auditSha256 })
        : reject('audit.accepted', 'Standalone audit did not accept the smoke artifact', audit1));
      add(stableStringify(audit1) === stableStringify(audit2) && audit1.auditSha256 === audit2.auditSha256
        ? ok('audit.deterministic', 'Standalone audit bundle is deterministic across repeated runs', { auditSha256: audit1.auditSha256 })
        : reject('audit.deterministic', 'Standalone audit bundle changed across repeated runs', { first: audit1.auditSha256, second: audit2.auditSha256 }));
    } else {
      add(reject('audit.fixture-exists', 'artifacts/pskernel-cli-certify-smoke.json is missing'));
    }
  } catch (error) {
    add(reject('kernel.runtime-load', 'Failed to load or run @proofscript/kernel preflight checks', { message: error instanceof Error ? error.message : String(error) }));
  }

  try {
    const packageAudit = runPSKernelKernelPackageAudit();
    add(packageAudit.status === 'accepted'
      ? ok('package.audit', 'Package audit accepts dry-run npm package contents', { packageAuditSha256: packageAudit.packageAuditSha256, checkCount: packageAudit.checkCount })
      : reject('package.audit', 'Package audit rejected dry-run npm package contents', { packageAuditSha256: packageAudit.packageAuditSha256, failures: packageAudit.requiredFailureCount }));
  } catch (error) {
    add(reject('package.audit', 'Package audit threw before release preflight could complete', { message: error instanceof Error ? error.message : String(error) }));
  }

  try {
    const governance = runGovernanceCheck();
    add(governance.status === 'accepted'
      ? ok('governance.check', 'Governance/constitution compliance smoke gate accepts the current package layout', { governanceSha256: governance.governanceSha256, checkCount: governance.checkCount })
      : reject('governance.check', 'Governance/constitution compliance smoke gate rejected the current package layout', { governanceSha256: governance.governanceSha256, failures: governance.requiredFailureCount }));
  } catch (error) {
    add(reject('governance.check', 'Governance check threw before release preflight could complete', { message: error instanceof Error ? error.message : String(error) }));
  }

  try {
    const referenceSmoke = spawnSync(process.execPath, ['tools/reference-language-governance-smoke.ts', '--json'], { cwd: repoRoot, encoding: 'utf8' });
    let details = {};
    try { details = JSON.parse(referenceSmoke.stdout || '{}'); } catch { details = { stdout: referenceSmoke.stdout.slice(0, 1000) }; }
    add(referenceSmoke.status === 0 && details.status === 'accepted'
      ? ok('reference.language-governance', 'ProofScript v0.2.x reference-governed language smoke accepts current PSC-1 slice', { referenceGovernanceSha256: details.referenceGovernanceSha256, checkCount: details.checkCount })
      : reject('reference.language-governance', 'Reference-governed language smoke rejected current PSC-1 slice', { exitCode: referenceSmoke.status, details, stderr: referenceSmoke.stderr.slice(0, 1000) }));
  } catch (error) {
    add(reject('reference.language-governance', 'Reference language governance smoke threw before release preflight could complete', { message: error instanceof Error ? error.message : String(error) }));
  }

  if (process.env.PS_KERNEL_SMOKE_RELEASE === '1') {
    try {
      const tarballSmoke = runPSKernelKernelTarballSmoke({ packDestination: 'artifacts/tarball-smoke-preflight' });
      add(tarballSmoke.status === 'accepted'
        ? ok('package.tarball-smoke', 'Packed tarball installs into a fresh project and passes runtime API smoke', { tarballSmokeSha256: tarballSmoke.tarballSmokeSha256, checkCount: tarballSmoke.checkCount })
        : reject('package.tarball-smoke', 'Packed tarball install/runtime smoke rejected', { tarballSmokeSha256: tarballSmoke.tarballSmokeSha256, failures: tarballSmoke.requiredFailureCount }));
    } catch (error) {
      add(reject('package.tarball-smoke', 'Tarball install/runtime smoke threw before release preflight could complete', { message: error instanceof Error ? error.message : String(error) }));
    }
  } else {
    add(ok('package.tarball-smoke.skipped-fast-preflight', 'Tarball install/runtime smoke is delegated to release-manifest/package gates unless PS_KERNEL_SMOKE_RELEASE=1'));
  }

  try {
    const liveSmoke = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'smoke', '--json'], { cwd: repoRoot, encoding: 'utf8' });
    let details = {};
    try { details = JSON.parse(liveSmoke.stdout || '{}'); } catch { details = { stdout: liveSmoke.stdout.slice(0, 1000) }; }
    add(liveSmoke.status === 0 && details.status === 'accepted'
      ? ok('standalone-small.live-smoke', 'Standalone .ps small subset checks with the new kernel and emits/runs JS without Lean4', { emittedDeclarations: details.emittedDeclarations, outputSha256: details.outputSha256 })
      : reject('standalone-small.live-smoke', 'Standalone .ps small subset smoke failed', { exitCode: liveSmoke.status, details, stderr: liveSmoke.stderr.slice(0, 1000) }));
  } catch (error) {
    add(reject('standalone-small.live-smoke', 'Standalone .ps small subset smoke threw before release preflight could complete', { message: error instanceof Error ? error.message : String(error) }));
  }

  const manifest = {
    schema: 'proofscript-pskernel-ts-kernel-preflight/v1',
    status: requiredFailures.length === 0 ? 'accepted' : 'rejected',
    proofStatus: 'not-proven',
    trustLabel: 'trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet',
    semanticBaseline: 'Lean 4.33.1',
    pinnedLeanRevision: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
    generatedAt: new Date(0).toISOString(),
    checkCount: checks.length,
    requiredFailureCount: requiredFailures.length,
    warningCount: warnings.length,
    checks,
    mirror: {
      expectedLeanSourceRows: 112,
      entries: manifestEntries,
      entryCount: manifestEntries.length,
    },
  };
  const manifestWithHash = { ...manifest, preflightSha256: sha256(manifest) };

  if (options.writeDocs) {
    const outPath = resolve(repoRoot, 'docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(manifestWithHash, null, 2)}\n`);
  }

  return manifestWithHash;
}

function main() {
  const args = process.argv.slice(2);
  const writeDocs = args.includes('--write-docs');
  const json = args.includes('--json') || writeDocs;
  const result = runPSKernelKernelPreflight({ writeDocs });
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`PSKERNEL_TS_KERNEL_PREFLIGHT=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} warnings=${result.warningCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`preflightSha256=${result.preflightSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
