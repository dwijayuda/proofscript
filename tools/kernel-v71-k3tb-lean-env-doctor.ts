#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const expected = {
  version: '4.33.1',
  commit: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6',
};
const boundary = 'K3TB_NOT_FULLY_FORMAL_K3';
const claimGuard = 'trusted-boundary K3-TB; not fully formal K3';
const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');
const strict = args.has('--strict');

function result(status, extra = {}) {
  return {
    status,
    boundary,
    claimGuard,
    expected,
    actual: {
      binary: process.env.PROOFSCRIPT_LEAN_BIN || null,
      version: null,
      commit: null,
      lakeFound: false,
      lakePath: null,
      versionOutput: null,
      ...extra.actual,
    },
    publishPreflightCanRun: status === 'READY',
    nextAction: extra.nextAction ?? 'Run npm run verify:k3tb:publish only after this doctor reports READY.',
    details: extra.details ?? [],
  };
}

function commandExists(command, extraPath = '') {
  const dirs = [extraPath, ...(process.env.PATH ?? '').split(path.delimiter)].filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, command);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseLeanVersion(output) {
  const version = output.match(/version\s+([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ?? null;
  const commit = output.match(/commit\s+([0-9a-f]{40})/i)?.[1] ?? null;
  return { version, commit };
}

function diagnose() {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN;
  if (!lean) {
    return result('BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN', {
      nextAction: 'Set PROOFSCRIPT_LEAN_BIN to the Lean 4.33.1 binary, then rerun npm run verify:k3tb:publish.',
      details: ['The v71 publish preflight intentionally requires an exact Lean oracle and must not be bypassed.'],
    });
  }
  if (!fs.existsSync(lean)) {
    return result('BLOCKED_LEAN_BIN_NOT_FOUND', {
      nextAction: `Set PROOFSCRIPT_LEAN_BIN to an existing Lean 4.33.1 binary; current path was not found: ${lean}`,
    });
  }

  const versionProbe = spawnSync(lean, ['--version'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  });
  const versionOutput = [versionProbe.stdout ?? '', versionProbe.stderr ?? ''].filter(Boolean).join('');
  if (versionProbe.status !== 0) {
    return result('BLOCKED_LEAN_VERSION_PROBE_FAILED', {
      actual: { versionOutput },
      nextAction: `Ensure PROOFSCRIPT_LEAN_BIN is executable and supports --version: ${lean}`,
    });
  }

  const parsed = parseLeanVersion(versionOutput);
  if (parsed.version !== expected.version) {
    return result('BLOCKED_LEAN_VERSION_MISMATCH', {
      actual: { version: parsed.version, commit: parsed.commit, versionOutput },
      nextAction: `Install/configure Lean ${expected.version}; detected ${parsed.version ?? 'unknown version'}.`,
    });
  }
  if (parsed.commit !== expected.commit) {
    return result('BLOCKED_LEAN_COMMIT_MISMATCH', {
      actual: { version: parsed.version, commit: parsed.commit, versionOutput },
      nextAction: `Use exact Lean ${expected.version} commit ${expected.commit}; detected commit ${parsed.commit ?? 'unknown'}.`,
    });
  }

  const leanDir = path.dirname(lean);
  const siblingLake = path.join(leanDir, process.platform === 'win32' ? 'lake.exe' : 'lake');
  const lakePath = fs.existsSync(siblingLake) ? siblingLake : commandExists(process.platform === 'win32' ? 'lake.exe' : 'lake', leanDir);
  if (!lakePath) {
    return result('BLOCKED_LAKE_NOT_FOUND', {
      actual: { version: parsed.version, commit: parsed.commit, versionOutput, lakeFound: false, lakePath: null },
      nextAction: 'Put the matching lake executable next to Lean 4.33.1 or on PATH, then rerun npm run verify:k3tb:publish.',
    });
  }

  return result('READY', {
    actual: { version: parsed.version, commit: parsed.commit, versionOutput, lakeFound: true, lakePath },
    nextAction: 'Run npm run verify:k3tb:publish. Continue labeling this release trusted-boundary K3-TB, not fully formal K3.',
  });
}

function printHuman(d) {
  console.log(`K3TB_LEAN_ENV_STATUS=${d.status}`);
  console.log(`K3TB_LEAN_ENV_BOUNDARY=${d.boundary}`);
  console.log(`K3TB_LEAN_ENV_CLAIM_GUARD=${d.claimGuard}`);
  console.log(`K3TB_LEAN_ENV_EXPECTED_VERSION=${d.expected.version}`);
  console.log(`K3TB_LEAN_ENV_EXPECTED_COMMIT=${d.expected.commit}`);
  if (d.actual.binary) console.log(`K3TB_LEAN_ENV_BINARY=${d.actual.binary}`);
  if (d.actual.version) console.log(`K3TB_LEAN_ENV_ACTUAL_VERSION=${d.actual.version}`);
  if (d.actual.commit) console.log(`K3TB_LEAN_ENV_ACTUAL_COMMIT=${d.actual.commit}`);
  console.log(`K3TB_LEAN_ENV_LAKE_FOUND=${d.actual.lakeFound ? 'true' : 'false'}`);
  if (d.actual.lakePath) console.log(`K3TB_LEAN_ENV_LAKE=${d.actual.lakePath}`);
  console.log(`K3TB_LEAN_ENV_PUBLISH_PREFLIGHT_CAN_RUN=${d.publishPreflightCanRun ? 'true' : 'false'}`);
  console.log(`K3TB_LEAN_ENV_NEXT_ACTION=${d.nextAction}`);
}

const diagnosis = diagnose();
if (jsonMode) {
  process.stdout.write(`${JSON.stringify(diagnosis, null, 2)}\n`);
} else {
  printHuman(diagnosis);
}
if (strict && diagnosis.status !== 'READY') {
  process.exitCode = 1;
}
