import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadKernel } from './local-kernel-loader.ts';
import { cases, runTypeScriptCorpus } from './lib/pskernel-reference-corpus.ts';
import { PINNED_LEAN_VERSION, PINNED_LEAN_RELEASE_COMMIT } from './lib/lean-toolchain.ts';

test('kernel loader selects the reported local build over an installed stale package', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'ps-kernel-loader-'));
  try {
    for (const dir of ['tools', 'packages/kernel/dist', 'node_modules/@proofscript/kernel']) mkdirSync(join(temp, dir), { recursive: true });
    for (const file of ['local-kernel-loader.ts', 'register-local-workspace.cts']) copyFileSync(join('tools', file), join(temp, 'tools', file));
    writeFileSync(join(temp, 'packages/kernel/dist/index.js'), "module.exports = { build: 'current' };\n");
    writeFileSync(join(temp, 'node_modules/@proofscript/kernel/index.js'), "module.exports = { build: 'stale' };\n");
    const run = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import { loadKernel } from './tools/local-kernel-loader.ts'; console.log(loadKernel().build);"],
      { cwd: temp, encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.trim(), 'current');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

// Exercise the runner protocol, not kernel semantics: an executable may start
// successfully without checking a declaration, or fail before kernel checking.
for (const scenario of ['silent', 'elaboration-error', 'valid', 'wrong-case', 'duplicate']) test(`native protocol validates case decisions (${scenario})`, () => {
  const temp = mkdtempSync(join(tmpdir(), 'ps-oracle-protocol-'));
  try {
    const oracle = join(temp, 'oracle');
    const version = `Lean (version ${PINNED_LEAN_VERSION}, commit ${PINNED_LEAN_RELEASE_COMMIT}, Release)`;
    const decision = `const id = process.argv[2].split('/').pop().replace(/\\.lean$/, ''); const status = ['distinct-abstract-values', 'wrong-function-type'].includes(id) ? 'rejected' : 'accepted'; const marker = 'PS_KERNEL_RESULT:' + id + ':' + status;`;
    const output = {
      silent: '',
      'elaboration-error': "console.error('Type mismatch in unrelated elaboration'); process.exitCode = 1;",
      valid: decision + 'console.log(marker);',
      'wrong-case': "console.log('PS_KERNEL_RESULT:unrelated:accepted');",
      duplicate: decision + 'console.log(marker); console.log(marker);',
    }[scenario];
    writeFileSync(oracle, `#!${process.execPath}\nif (process.argv.includes('--version')) console.log(${JSON.stringify(version)});\nelse { ${output} }\n`, { mode: 0o755 });
    const report = join(temp, 'report.json');
    const run = spawnSync(process.execPath, ['tools/pskernel-reference-compare.ts', '--lean', oracle,
      '--report', report, '--emit-dir', join(temp, 'sources')], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, scenario === 'valid' ? 0 : 1, run.stderr);
    const result = JSON.parse(readFileSync(report, 'utf8'));
    assert.equal(result.comparedCases, scenario === 'valid' ? cases.length : 0);
    assert.equal(result.oracleBoundary, 'Lean.Kernel');
    if (scenario !== 'valid') assert.equal(result.nativeLean.every(r => r.status === 'error'), true);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('all paired-corpus TypeScript cases meet their expected outcomes', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  for (const r of runTypeScriptCorpus(loadKernel())) assert.equal(r.status, r.expected, r.id);
});
for (const allowMissing of [false, true]) test(`missing oracle is explicitly blocked (allowMissing=${allowMissing})`, () => {
  const temp = mkdtempSync(join(tmpdir(), 'ps-reference-test-'));
  try {
    const report = join(temp, 'report.json');
    const args = ['tools/pskernel-reference-compare.ts', '--lean', join(temp, 'missing-lean'), '--report', report, '--emit-dir', join(temp, 'sources')];
    if (allowMissing) args.push('--allow-missing');
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, allowMissing ? 0 : 2, run.stderr);
    const result = JSON.parse(readFileSync(report, 'utf8'));
    assert.equal(result.status, 'blocked');
    assert.equal(result.comparedCases, 0);
    assert.equal(result.formalEquivalence, 'not-proven');
    assert.equal(result.typescript.every(r => r.status === r.expected), true);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
