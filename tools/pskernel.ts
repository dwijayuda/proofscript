#!/usr/bin/env node
import './register-local-workspace.cts';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runPSKernelKernelPreflight } from './pskernel-kernel-preflight.ts';
import { runPSKernelKernelPackageAudit } from './pskernel-kernel-package-audit.ts';
import { runPSKernelKernelTarballSmoke } from './pskernel-kernel-tarball-smoke.ts';
import { runPSKernelKernelReleaseManifest, verifyPSKernelKernelReleaseManifest } from './pskernel-kernel-release-manifest.ts';
import { runGovernanceCheck } from './governance-check.ts';
import { snapshotProofScriptSourceTree, verifyProofScriptSourceTreeEvidence } from './pskernel-kernel-source-tree.ts';
import { createProofScriptReleaseArchive, verifyProofScriptReleaseArchiveEvidence } from './pskernel-kernel-release-archive.ts';
import { runProofScriptDeliveryVerification } from './pskernel-kernel-delivery-verify.ts';
import { runProofScriptDeliveryBootstrapVerification } from './pskernel-kernel-delivery-bootstrap.ts';
import { verifyProofScriptDeliveryArchive } from './pskernel-kernel-delivery-archive-verify.ts';
import { loadKernel } from './local-kernel-loader.ts';

const require = createRequire(import.meta.url);
const { linkLocalWorkspaces } = require('./link-local-workspaces.cts');
const kernel = loadKernel();

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(exitCode = 0) {
  process.stdout.write(`pskernel — ProofScript pskernel-derived TypeScript kernel\n\nCommands:\n  status\n  check-core <declarations.json> [implementationProfile]\n  replay <artifact.json>\n  obligations
  preflight [--json|--write-docs]
  package-audit [--json|--write-docs|--pack-destination <dir>]
  tarball-smoke [--json|--write-docs|--pack-destination <dir>|--keep-temp]
  release-manifest [--json|--write-docs|--pack-destination <dir>|--heavy-preflight]
  verify-release-manifest <manifest.json> [--json|--fresh|--heavy|--pack-destination <dir>]
  source-tree [--json|--write-docs]
  verify-source-tree <source-tree.json> [--json]
  source-archive [--json|--write-docs|--output <zip>]
  verify-source-archive <archive-evidence.json> [--json]
  bootstrap-local-workspaces [--json]
  delivery-bootstrap [--json|--write-docs|--output <zip>]
  verify-delivery [--json|--write-docs]
  verify-delivery-archive <zip> [--json|--write-docs|--full|--keep-temp]
  governance [--json|--write-docs]

Trust label: trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.\n`);
  process.exit(exitCode);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(resolve(file), 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printJson({ status: 'rejected', message: `invalid JSON input: ${message}` });
    process.exitCode = 2;
    return undefined;
  }
}

const [cmd, arg1, arg2] = process.argv.slice(2);
let forceExitAfterFlush = false;

switch (cmd) {
  case undefined:
  case '-h':
  case '--help':
  case 'help':
    usage(0);
    break;
  case 'status':
    if (arg1 === '--json') printJson(kernel.pskernelStatusReport());
    else process.stdout.write(`${kernel.pskernelStatus()}\n`);
    break;
  case 'check-core': {
    if (!arg1) usage(2);
    const declarations = readJson(arg1);
    if (declarations === undefined) break;
    if (!Array.isArray(declarations)) {
      printJson({ status: 'rejected', message: 'check-core input must be a JSON array of CoreDeclaration objects' });
      process.exitCode = 2;
      break;
    }
    const summary = kernel.pskernelCheckCore(declarations, arg2 ?? 'pskernel-cli-check-core');
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }
  case 'replay': {
    if (!arg1) usage(2);
    const artifact = readJson(arg1);
    if (artifact === undefined) break;
    const summary = kernel.replayCoreArtifact(artifact);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }
  case 'certify': {
    if (!arg1) usage(2);
    const artifact = readJson(arg1);
    if (artifact === undefined) break;
    const summary = kernel.pskernelCertifyCoreArtifact(artifact);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }
  case 'verify-cert': {
    if (!arg1) usage(2);
    const bundle = readJson(arg1);
    if (bundle === undefined) break;
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle) || !('artifact' in bundle) || !('certificate' in bundle)) {
      printJson({ status: 'rejected', message: 'verify-cert input must be an object with artifact and certificate fields' });
      process.exitCode = 2;
      break;
    }
    const summary = kernel.pskernelVerifyCoreCertificate(bundle.artifact, bundle.certificate);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }
  case 'audit': {
    if (!arg1) usage(2);
    const artifact = readJson(arg1);
    if (artifact === undefined) break;
    const summary = kernel.pskernelAuditCoreArtifact(artifact);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }

  case 'snapshot': {
    if (!arg1) usage(2);
    const artifact = readJson(arg1);
    if (artifact === undefined) break;
    const summary = kernel.pskernelSnapshotCoreArtifact(artifact);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }

  case 'bundle': {
    if (!arg1) usage(2);
    const artifact = readJson(arg1);
    if (artifact === undefined) break;
    const summary = kernel.pskernelCreateCoreCertificateBundle(artifact);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }

  case 'verify-bundle': {
    if (!arg1) usage(2);
    const bundle = readJson(arg1);
    if (bundle === undefined) break;
    const summary = kernel.pskernelVerifyCoreCertificateBundle(bundle);
    printJson(summary);
    process.exitCode = summary.status === 'accepted' ? 0 : 1;
    break;
  }

  case 'preflight': {
    const result = runPSKernelKernelPreflight({ writeDocs: arg1 === '--write-docs' || arg2 === '--write-docs' });
    if (arg1 === '--json' || arg1 === '--write-docs' || arg2 === '--json' || arg2 === '--write-docs') printJson(result);
    else {
      process.stdout.write(`PSKERNEL_TS_KERNEL_PREFLIGHT=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`checks=${result.checkCount} warnings=${result.warningCount} failures=${result.requiredFailureCount}
`);
      process.stdout.write(`preflightSha256=${result.preflightSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }

  case 'package-audit': {
    const args = process.argv.slice(3);
    const packIndex = args.indexOf('--pack-destination');
    const result = runPSKernelKernelPackageAudit({
      writeDocs: args.includes('--write-docs'),
      heavyPreflight: args.includes('--heavy-preflight'),
      packDestination: packIndex >= 0 ? args[packIndex + 1] : undefined,
    });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PSKERNEL_TS_KERNEL_PACKAGE_AUDIT=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}
`);
      process.stdout.write(`packageAuditSha256=${result.packageAuditSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }


  case 'tarball-smoke': {
    const args = process.argv.slice(3);
    const packIndex = args.indexOf('--pack-destination');
    const result = runPSKernelKernelTarballSmoke({
      writeDocs: args.includes('--write-docs'),
      keepTemp: args.includes('--keep-temp'),
      packDestination: packIndex >= 0 ? args[packIndex + 1] : undefined,
    });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PSKERNEL_TS_KERNEL_TARBALL_SMOKE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}
`);
      process.stdout.write(`tarballSmokeSha256=${result.tarballSmokeSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }


  case 'release-manifest': {
    const args = process.argv.slice(3);
    const packIndex = args.indexOf('--pack-destination');
    const result = runPSKernelKernelReleaseManifest({
      writeDocs: args.includes('--write-docs'),
      heavyPreflight: args.includes('--heavy-preflight'),
      packDestination: packIndex >= 0 ? args[packIndex + 1] : undefined,
      repeatTarballSmoke: args.includes('--repeat-tarball-smoke'),
    });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PSKERNEL_TS_KERNEL_RELEASE_MANIFEST=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}
`);
      process.stdout.write(`releaseManifestSha256=${result.releaseManifestSha256}
`);
      process.stdout.write(`tarballSha256=${result.componentHashes.tarballSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }



  case 'verify-release-manifest': {
    if (!arg1) usage(2);
    const manifest = readJson(arg1);
    if (manifest === undefined) break;
    const args = process.argv.slice(3);
    const packIndex = args.indexOf('--pack-destination');
    const result = verifyPSKernelKernelReleaseManifest(manifest, {
      fresh: args.includes('--fresh'),
      heavy: args.includes('--heavy'),
      packDestination: packIndex >= 0 ? args[packIndex + 1] : undefined,
      repeatTarballSmoke: args.includes('--repeat-tarball-smoke'),
    });
    if (args.includes('--json')) printJson(result);
    else {
      process.stdout.write(`PSKERNEL_TS_KERNEL_VERIFY_RELEASE_MANIFEST=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`releaseManifestSha256=${result.releaseManifestSha256 ?? result.expectedReleaseManifestSha256 ?? ''}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }


  case 'source-tree': {
    const args = process.argv.slice(3);
    const result = snapshotProofScriptSourceTree({ writeDocs: args.includes('--write-docs') });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_SOURCE_TREE=PASS
`);
      process.stdout.write(`files=${result.fileCount} bytes=${result.totalBytes}
`);
      process.stdout.write(`sourceTreeSha256=${result.sourceTreeSha256}
`);
    }
    break;
  }

  case 'verify-source-tree': {
    if (!arg1) usage(2);
    const evidence = readJson(arg1);
    if (evidence === undefined) break;
    const args = process.argv.slice(3);
    const result = verifyProofScriptSourceTreeEvidence(evidence);
    if (args.includes('--json')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_VERIFY_SOURCE_TREE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`sourceTreeSha256=${result.sourceTreeSha256 ?? ''}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    break;
  }


  case 'source-archive': {
    const args = process.argv.slice(3);
    const outputIndex = args.indexOf('--output');
    const result = createProofScriptReleaseArchive({
      writeDocs: args.includes('--write-docs'),
      outputPath: outputIndex >= 0 ? args[outputIndex + 1] : undefined,
    });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_RELEASE_ARCHIVE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`archiveSha256=${result.archive.sha256}
`);
      process.stdout.write(`releaseArchiveSha256=${result.releaseArchiveSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }

  case 'verify-source-archive': {
    if (!arg1) usage(2);
    const evidence = readJson(arg1);
    if (evidence === undefined) break;
    const args = process.argv.slice(3);
    const result = verifyProofScriptReleaseArchiveEvidence(evidence);
    if (args.includes('--json')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_VERIFY_RELEASE_ARCHIVE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`releaseArchiveSha256=${result.releaseArchiveSha256 ?? ''}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }


  case 'bootstrap-local-workspaces': {
    const args = process.argv.slice(3);
    const result = linkLocalWorkspaces();
    if (args.includes('--json')) printJson(result);
    else process.stdout.write(`PROOFSCRIPT_LOCAL_WORKSPACE_LINKS=${result.status === 'accepted' ? 'PASS' : 'FAIL'} packages=${result.packageCount}
`);
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    break;
  }


  case 'delivery-bootstrap': {
    const args = process.argv.slice(3);
    const outputIndex = args.indexOf('--output');
    const result = runProofScriptDeliveryBootstrapVerification({
      writeDocs: args.includes('--write-docs'),
      archiveOutputPath: outputIndex >= 0 ? args[outputIndex + 1] : undefined,
    });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_DELIVERY_BOOTSTRAP=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
      process.stdout.write(`checks=${result.checkCount} failures=${result.requiredFailureCount}\n`);
      process.stdout.write(`deliveryBootstrapSha256=${result.deliveryBootstrapSha256 ?? ''}\n`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }

  case 'verify-delivery': {
    const args = process.argv.slice(3);
    const result = runProofScriptDeliveryVerification({ writeDocs: args.includes('--write-docs') });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_DELIVERY_VERIFY=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`deliveryVerificationSha256=${result.deliveryVerificationSha256 ?? ''}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }


  case 'verify-delivery-archive': {
    const args = process.argv.slice(3);
    const archivePath = args.find(arg => !arg.startsWith('--'));
    if (!archivePath) usage(2);
    const result = verifyProofScriptDeliveryArchive(archivePath, {
      full: args.includes('--full'),
      keepTemp: args.includes('--keep-temp'),
    });
    if (args.includes('--write-docs')) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const outPath = resolve('docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json');
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, `${JSON.stringify(result, null, 2)}
`);
    }
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_VERIFY_DELIVERY_ARCHIVE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`deliveryArchiveVerificationSha256=${result.deliveryArchiveVerificationSha256 ?? ''}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }

  case 'governance': {
    const args = process.argv.slice(3);
    const result = runGovernanceCheck({ writeDocs: args.includes('--write-docs') });
    if (args.includes('--json') || args.includes('--write-docs')) printJson(result);
    else {
      process.stdout.write(`PROOFSCRIPT_GOVERNANCE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}
`);
      process.stdout.write(`checks=${result.checkCount} warnings=${result.warningCount} failures=${result.requiredFailureCount}
`);
      process.stdout.write(`governanceSha256=${result.governanceSha256}
`);
    }
    process.exitCode = result.status === 'accepted' ? 0 : 1;
    forceExitAfterFlush = true;
    break;
  }

  case 'obligations': {
    const report = kernel.pskernelProofObligations();
    if (arg1 === '--json') printJson(report);
    else printJson({
      status: report.status,
      proofStatus: report.proofStatus,
      semanticBaseline: report.semanticBaseline,
      total: report.total,
      byStatus: report.byStatus,
      documents: [
        'docs/PROOF_OBLIGATIONS.md',
        'docs/PSKERNEL_TS_PORTING_MAP.md',
        'docs/PSKERNEL_TS_PHASE_PLAN.md',
      ],
    });
    break;
  }
  default:
    process.stderr.write(`unknown pskernel command: ${cmd}\n`);
    usage(2);
}

if (forceExitAfterFlush) {
  process.stdout.write('', () => process.exit(process.exitCode ?? 0));
}
