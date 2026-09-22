#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadKernel } from './local-kernel-loader.ts';
import { cases, leanSource, runTypeScriptCorpus } from './lib/pskernel-reference-corpus.ts';
import { PINNED_LEAN_VERSION, PINNED_LEAN_RELEASE_COMMIT, parseLeanVersion, parseLeanCommit } from './lib/lean-toolchain.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  const key = args[i];
  if (key === '--allow-missing') options.allowMissing = true;
  else if (['--lean', '--report', '--emit-dir'].includes(key) && args[i + 1] && !args[i + 1].startsWith('--')) options[key.slice(2)] = args[++i];
  else throw new Error(`unknown or incomplete argument: ${key}`);
}
const binary = options.lean ?? process.env.PROOFSCRIPT_LEAN_BIN ?? 'lean';
const reportPath = resolve(root, options.report ?? 'artifacts/p4-48/reference-comparison.json');
const emitDir = resolve(root, options['emit-dir'] ?? 'artifacts/p4-48/reference-inputs');
const hash = data => createHash('sha256').update(data).digest('hex');
const fileHash = path => hash(readFileSync(resolve(root, path)));
const lockPath = 'assurance/KERNEL_REFERENCE_LOCK.json';
const lock = JSON.parse(readFileSync(resolve(root, lockPath), 'utf8'));
if (lock.oracle.version !== PINNED_LEAN_VERSION || lock.oracle.commit !== PINNED_LEAN_RELEASE_COMMIT) throw new Error('reference lock disagrees with existing pinned toolchain');
mkdirSync(emitDir, { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
const inputs = cases.map(c => {
  const source = leanSource(c);
  const path = resolve(emitDir, `${c.id}.lean`);
  writeFileSync(path, source);
  return { id: c.id, path, sha256: hash(source) };
});
const typescript = runTypeScriptCorpus(loadKernel());
const tsMatches = typescript.every(r => r.status === r.expected);
const versionRun = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
const versionOutput = `${versionRun.stdout ?? ''}${versionRun.stderr ?? ''}`.trim();
const version = parseLeanVersion(versionOutput), commit = parseLeanCommit(versionOutput);
const oracleReady = !versionRun.error && versionRun.status === 0 && version === lock.oracle.version && commit === lock.oracle.commit;
const report = {
  schema: 'proofscript-kernel-reference-comparison/v2',
  status: tsMatches ? 'blocked' : 'failed',
  formalEquivalence: 'not-proven',
  scope: `${cases.length} paired Core cases using Lean.Kernel.check and Lean.Kernel.isDefEq. This does not execute pskernel or prove general equivalence.`,
  oracleBoundary: 'Lean.Kernel',
  lockSha256: fileHash(lockPath),
  corpusSha256: fileHash('tools/lib/pskernel-reference-corpus.ts'),
  checkerSourceSha256: fileHash('packages/kernel/src/PSKernel/TypeChecker.ts'),
  executedCheckerSha256: fileHash('packages/kernel/dist/PSKernel/TypeChecker.js'),
  oracle: { status: oracleReady ? 'available' : 'unavailable', version: version ?? null, commit: commit ?? null,
    expectedVersion: lock.oracle.version, expectedCommit: lock.oracle.commit, output: versionOutput,
    message: oracleReady ? null : versionRun.error?.message ?? 'oracle version/commit does not match the pinned identity' },
  comparedCases: 0, typescript, nativeLean: [], inputs: inputs.map(({ id, sha256 }) => ({ id, sha256 })),
};
if (oracleReady) {
  for (const input of inputs) {
    const run = spawnSync(binary, [input.path], { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.replaceAll(input.path, `<${input.id}.lean>`).trim();
    let status;
    if (run.error?.code === 'ETIMEDOUT' || /maximum recursion depth|maximum number of heartbeats/i.test(output)) status = 'resource-limit';
    else if (run.error || run.status === null) status = 'error';
    else if (run.status === 0 && output === `PS_KERNEL_RESULT:${input.id}:accepted`) status = 'accepted';
    else if (run.status === 0 && output === `PS_KERNEL_RESULT:${input.id}:rejected`) status = 'rejected';
    else status = 'error';
    report.nativeLean.push({ id: input.id, status, exitCode: run.status, output, message: run.error?.message ?? null });
  }
  report.comparedCases = report.nativeLean.filter(r => ['accepted', 'rejected'].includes(r.status)).length;
  report.status = tsMatches && report.nativeLean.every((r, i) => r.status === cases[i].expected && r.status === typescript[i].status) ? 'passed' : 'failed';
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`KERNEL_REFERENCE_COMPARISON=${report.status.toUpperCase()} ts=${typescript.filter(r => r.status === r.expected).length}/${cases.length} compared=${report.comparedCases}`);
process.exitCode = report.status === 'passed' ? 0 : report.status === 'failed' ? 1 : options.allowMissing ? 0 : 2;
