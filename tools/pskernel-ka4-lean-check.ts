#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

export type LeanDiscovery = {
  leanPath: string | null;
  versionText: string | null;
  targetVersionMatched: boolean;
  lakeOnPath: boolean;
  sevenZipOnPath: boolean;
  archivePartsPresent: boolean;
  reason?: string;
};

function commandPath(command: string): string | null {
  const result = spawnSync('bash', ['-lc', `command -v ${JSON.stringify(command).slice(1, -1)}`], { encoding: 'utf8' });
  if (result.status === 0) {
    const out = result.stdout.trim();
    return out.length > 0 ? out.split('\n')[0] : null;
  }
  return null;
}

function executableVersion(exe: string): string | null {
  const result = spawnSync(exe, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return (result.stdout || result.stderr || '').trim();
}

export function discoverLean(): LeanDiscovery {
  const envLean = process.env.LEAN_BIN && process.env.LEAN_BIN.trim().length > 0 ? process.env.LEAN_BIN.trim() : null;
  const candidateLeanPaths = [
    envLean,
    '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean',
    '/mnt/data/lean-4.33.1/lean-4.33.1-linux/bin/lean',
    '/mnt/data/lean-4.33.1-extract/lean-4.33.1-linux/bin/lean',
  ].filter((x): x is string => Boolean(x));
  const materializedLean = candidateLeanPaths.find((candidate) => fs.existsSync(candidate)) ?? null;
  const leanPath = materializedLean ?? commandPath('lean');
  const versionText = leanPath ? executableVersion(leanPath) : null;
  const targetVersionMatched = Boolean(versionText && /Lean \(version 4\.33\.1\)|Lean version 4\.33\.1|4\.33\.1/.test(versionText));
  const adjacentLake = leanPath ? path.join(path.dirname(leanPath), 'lake') : null;
  const lakeOnPath = Boolean(commandPath('lake') || (adjacentLake && fs.existsSync(adjacentLake)));
  const sevenZipOnPath = Boolean(commandPath('7z') || commandPath('7zz') || commandPath('7za') || fs.existsSync('/mnt/data/lean-tools/7z2603/7zz'));
  const archivePartsPresent = fs.existsSync('/mnt/data/lean-4.33.1-linux.7z(2).001') && fs.existsSync('/mnt/data/lean-4.33.1-linux.7z(2).002');
  const reason = !leanPath
    ? 'lean executable not found on PATH, LEAN_BIN, or known /mnt/data Lean 4.33.1 materialization paths'
    : !versionText
      ? 'lean executable found but --version failed'
      : !targetVersionMatched
        ? `lean executable version does not match target 4.33.1: ${versionText}`
        : undefined;
  return { leanPath, versionText, targetVersionMatched, lakeOnPath, sevenZipOnPath, archivePartsPresent, reason };
}

export function runLeanCheck(leanPath: string, files: string[]) {
  const results = files.map((rel) => {
    const abs = path.join(root, rel);
    const r = spawnSync(leanPath, [abs], { cwd: root, encoding: 'utf8' });
    return { file: rel, status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
  });
  return { ok: results.every((r) => r.status === 0), results };
}

export function runKA4LeanGate(options: { strict?: boolean } = {}) {
  const required = [
    'assurance/ka1/KA1_RELEASE_GATE.json',
    'assurance/ka2/translation-relation.json',
    'assurance/ka3/KA3_RELEASE_GATE.json',
    'assurance/ka4/lean-toolchain-gate.json',
    'assurance/ka4/machine-check-status.json',
    'assurance/ka4/lean4lean-binding-plan.json',
    'assurance/ka4/noninductive-soundness-machine-check.lean',
    'assurance/ka4/KA4_REPORT.md',
  ];
  for (const rel of required) assert.ok(exists(rel), `missing ${rel}`);

  const pkg = readJson('package.json');
  const versions = readJson('versions.json');
  const ka4 = readJson('assurance/ka4/lean-toolchain-gate.json');
  const machine = readJson('assurance/ka4/machine-check-status.json');
  const skeleton = read('assurance/ka4/noninductive-soundness-machine-check.lean');
  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.defaultKernelCoreFormat, 71);
  assert.equal(versions.ka4TrustedSemanticChange, false);
  assert.equal(versions.ka4KernelCodecChange, false);
  assert.equal(versions.ka4FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(ka4.schema, 'proofscript.assurance.ka4.lean-toolchain-gate/v1');
  assert.equal(machine.schema, 'proofscript.assurance.ka4.machine-check-status/v1');
  assert.match(skeleton, /namespace PSKernelKA4/);
  assert.match(skeleton, /theorem noninductive_kind_translation_sound/);
  assert.match(skeleton, /theorem unsupported_decl_kind_blocks_translation/);
  assert.doesNotMatch(skeleton, /sorry/);
  assert.doesNotMatch(skeleton, /admit/);

  const discovery = discoverLean();
  const proofFiles: string[] = ka4.proofFiles;
  let leanRun: ReturnType<typeof runLeanCheck> | null = null;
  let strictLeanCheckPassed = false;
  let leanCheckedHere = false;
  let status: 'passed' | 'lean-unavailable' | 'lean-version-mismatch' | 'lean-check-failed' = 'passed';
  let reason: string | undefined = discovery.reason;

  if (discovery.leanPath && discovery.targetVersionMatched) {
    leanRun = runLeanCheck(discovery.leanPath, proofFiles);
    strictLeanCheckPassed = leanRun.ok;
    leanCheckedHere = leanRun.ok;
    if (!leanRun.ok) {
      status = 'lean-check-failed';
      reason = 'Lean executable was found, but at least one KA-4 proof file failed to check';
    }
  } else if (discovery.leanPath && !discovery.targetVersionMatched) {
    status = 'lean-version-mismatch';
  } else {
    status = 'lean-unavailable';
  }

  if (options.strict && !strictLeanCheckPassed) {
    const err: any = new Error(reason ?? 'strict Lean KA-4 check failed');
    err.gate = { status, discovery, leanRun };
    throw err;
  }

  return {
    status: options.strict ? 'passed' : status,
    checkpoint: 'proofscript-v1-ka4-lean-toolchain-gate0',
    publicVersion: pkg.version,
    coreFormat: 71,
    targetLeanVersion: '4.33.1',
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    leanCheckedHere,
    strictLeanCheckPassed,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    proofFiles,
    discovery,
    leanRun,
    reason,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  try {
    const result = runKA4LeanGate({ strict });
    console.log(JSON.stringify(result, null, 2));
    if (strict && !result.strictLeanCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, gate: error.gate ?? null }, null, 2));
    process.exit(strict ? 2 : 1);
  }
}
