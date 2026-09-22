#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA4LeanGate } from './pskernel-ka4-lean-check.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const data = '/mnt/data';
const sevenZipTar = path.join(data, '7z2603-linux-x64.tar.xz');
const sevenZipDir = path.join(data, 'lean-tools', '7z2603');
const sevenZipExe = path.join(sevenZipDir, '7zz');
const split001 = path.join(data, 'lean-4.33.1-linux.7z(2).001');
const split002 = path.join(data, 'lean-4.33.1-linux.7z(2).002');
const archiveExtractDir = path.join(data, 'lean-4.33.1-extract');
const tarZst = path.join(archiveExtractDir, 'lean-4.33.1-linux.tar.zst');
const toolchainParent = path.join(data, 'lean-4.33.1-toolchain');
const toolchainRoot = path.join(toolchainParent, 'lean-4.33.1-linux');
const leanPath = path.join(toolchainRoot, 'bin', 'lean');
const lakePath = path.join(toolchainRoot, 'bin', 'lake');

const exists = (p: string) => fs.existsSync(p);
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

function run(cmd: string, args: string[], options: { cwd?: string } = {}) {
  const result = spawnSync(cmd, args, { cwd: options.cwd ?? root, encoding: 'utf8' });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }

export function materializeLean4331() {
  const actions: string[] = [];
  if (exists(leanPath) && exists(lakePath)) {
    actions.push('toolchain-already-materialized');
    return { ok: true, actions, leanPath, lakePath };
  }

  assert.ok(exists(split001), `missing ${split001}`);
  assert.ok(exists(split002), `missing ${split002}`);

  if (!exists(sevenZipExe)) {
    assert.ok(exists(sevenZipTar), `missing ${sevenZipTar}`);
    ensureDir(sevenZipDir);
    const r = run('tar', ['-xJf', sevenZipTar, '-C', sevenZipDir]);
    assert.equal(r.status, 0, `failed to extract 7zz: ${r.stderr || r.stdout}`);
    actions.push('extracted-7zz');
  }

  if (!exists(tarZst)) {
    ensureDir(archiveExtractDir);
    const r = run(sevenZipExe, ['x', '-y', `-o${archiveExtractDir}`, split001]);
    assert.equal(r.status, 0, `failed to extract Lean split 7z: ${r.stderr || r.stdout}`);
    actions.push('extracted-split-7z-to-tar-zst');
  }

  if (!exists(leanPath)) {
    ensureDir(toolchainParent);
    const r = run('tar', ['--zstd', '-xf', tarZst, '-C', toolchainParent]);
    assert.equal(r.status, 0, `failed to extract Lean tar.zst: ${r.stderr || r.stdout}`);
    actions.push('extracted-lean-toolchain');
  }

  assert.ok(exists(leanPath), `materialization finished but lean missing at ${leanPath}`);
  assert.ok(exists(lakePath), `materialization finished but lake missing at ${lakePath}`);
  return { ok: true, actions, leanPath, lakePath };
}

export function runKA5Gate(options: { strict?: boolean, materialize?: boolean } = {}) {
  const required = [
    'assurance/ka4/noninductive-soundness-machine-check.lean',
    'assurance/ka5/toolchain-materialization.json',
    'assurance/ka5/KA5_REPORT.md',
    'assurance/ka5/KA5_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const versions = readJson('versions.json');
  const gate = readJson('assurance/ka5/KA5_RELEASE_GATE.json');
  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.defaultKernelCoreFormat, 71);
  assert.equal(versions.ka5TrustedSemanticChange, false);
  assert.equal(versions.ka5KernelCodecChange, false);
  assert.equal(versions.ka5FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(gate.claimBoundary.fullLean4Equivalence, false);
  assert.equal(gate.claimBoundary.formalLean4EquivalenceProvenObligations, 0);

  const materialization = options.materialize ? materializeLean4331() : { ok: exists(leanPath), actions: exists(leanPath) ? ['toolchain-present'] : ['toolchain-not-materialized'], leanPath, lakePath };
  const ka4Strict = runKA4LeanGate({ strict: Boolean(options.strict) });
  const ok = Boolean(materialization.ok && ka4Strict.strictLeanCheckPassed);
  if (options.strict) assert.equal(ok, true, 'KA-5 strict gate requires materialized Lean 4.33.1 and strict KA-4 proof check pass');
  return {
    checkpoint: 'proofscript-v1-ka5-lean4331-strict-check0',
    publicVersion: pkg.version,
    targetLeanVersion: '4.33.1',
    coreFormat: 71,
    materialization,
    ka4Strict,
    leanCheckedHere: ka4Strict.leanCheckedHere,
    strictLeanCheckPassed: ka4Strict.strictLeanCheckPassed,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const materialize = process.argv.includes('--materialize');
    const strict = process.argv.includes('--strict');
    const result = runKA5Gate({ strict, materialize });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
