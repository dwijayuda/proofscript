#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const logDir = path.join(root, 'artifacts', 'p5-verify-logs');
fs.mkdirSync(logDir, { recursive: true });

function childEnv() {
  const allowed = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'PROOFSCRIPT_LEAN_BIN', 'NODE_OPTIONS']) {
    if (process.env[key] !== undefined) allowed[key] = process.env[key];
  }
  return allowed;
}

/**
 * P5.75 kernel false elim release gate.
 *
 * This is intentionally compact. It verifies the canonical controlled-feature
 * path and the promoted feature without re-running inherited P6/v71 publish
 * gates or every historical smoke test. Broader checks remain companion tests.
 */
const steps = [
  ['build', npm, ['run', 'build', '--', '--pretty', 'false'], 300_000],
  ['typescript-migration-audit', node, ['tools/typescript-migration-audit.ts'], 120_000],
  ['p5-baseline', node, ['tools/p5-controlled-baseline-tests.ts'], 120_000],
  ['architecture-boundaries', node, ['tools/check-boundaries.ts'], 120_000],
  ['feature-promotion-check', node, ['tools/check-feature-promotion.ts'], 120_000],
  ['verification-matrix-check', node, ['tools/check-verification-matrix.ts'], 120_000],
  ['proof-obligations-check', node, ['tools/check-proof-obligations.ts'], 120_000],
  ['production-traceability-check', node, ['tools/check-production-traceability.ts'], 120_000],
  ['development-workflow-check', node, ['tools/check-development-workflow.ts'], 120_000],
  ['production-status-check', node, ['tools/production-status.ts', '--check'], 120_000],
  ['pslive-int', node, ['tools/pslive-int-tests.ts'], 120_000],
  ['pslive-int-arith', node, ['tools/pslive-int-arith-tests.ts'], 120_000],
  ['pslive-int-operators', node, ['tools/pslive-int-operator-tests.ts'], 120_000],
  ['pslive-list-map', node, ['tools/pslive-list-map-tests.ts'], 120_000],
  ['pslive-list-foldl', node, ['tools/pslive-list-foldl-tests.ts'], 120_000],
  ['pslive-array', node, ['tools/pslive-array-tests.ts'], 120_000],
  ['pslive-array-access', node, ['tools/pslive-array-access-tests.ts'], 120_000],
  ['pslive-array-map', node, ['tools/pslive-array-map-tests.ts'], 120_000],
  ['pslive-array-foldl', node, ['tools/pslive-array-foldl-tests.ts'], 120_000],
  ['pslive-list-array-filter', node, ['tools/pslive-list-array-filter-tests.ts'], 120_000],
  ['pslive-list-array-append', node, ['tools/pslive-list-array-append-tests.ts'], 120_000],
  ['pslive-list-array-length-empty', node, ['tools/pslive-list-array-length-empty-tests.ts'], 120_000],
  ['pslive-list-array-reverse', node, ['tools/pslive-list-array-reverse-tests.ts'], 120_000],
  ['pslive-list-array-any-all', node, ['tools/pslive-list-array-any-all-tests.ts'], 120_000],
  ['pslive-list-array-find', node, ['tools/pslive-list-array-find-tests.ts'], 120_000],
  ['pslive-list-array-head', node, ['tools/pslive-list-array-head-tests.ts'], 120_000],
  ['pslive-list-array-tail', node, ['tools/pslive-list-array-tail-tests.ts'], 120_000],
  ['pslive-list-isempty', node, ['tools/pslive-list-isempty-tests.ts'], 120_000],
  ['pslive-list-array-last', node, ['tools/pslive-list-array-last-tests.ts'], 120_000],
  ['pslive-list-get', node, ['tools/pslive-list-get-tests.ts'], 120_000],
  ['pslive-list-array-take', node, ['tools/pslive-list-array-take-tests.ts'], 120_000],
  ['pslive-list-array-drop', node, ['tools/pslive-list-array-drop-tests.ts'], 120_000],
  ['pslive-list-array-range', node, ['tools/pslive-list-array-range-tests.ts'], 120_000],
  ['pslive-list-array-replicate', node, ['tools/pslive-list-array-replicate-tests.ts'], 120_000],
  ['pslive-list-array-convert', node, ['tools/pslive-list-array-convert-tests.ts'], 120_000],
  ['pslive-list-array-takewhile', node, ['tools/pslive-list-array-takewhile-tests.ts'], 120_000],
  ['pslive-list-array-dropwhile', node, ['tools/pslive-list-array-dropwhile-tests.ts'], 120_000],
  ['pslive-list-array-countp', node, ['tools/pslive-list-array-countp-tests.ts'], 120_000],
  ['pslive-list-array-singleton', node, ['tools/pslive-list-array-singleton-tests.ts'], 120_000],
  ['pslive-option-except-predicates', node, ['tools/pslive-option-except-predicates-tests.ts'], 120_000],
  ['pslive-option-except-getd', node, ['tools/pslive-option-except-getd-tests.ts'], 120_000],
  ['pslive-option-except-orelse', node, ['tools/pslive-option-except-orelse-tests.ts'], 120_000],
  ['pslive-option-except-convert', node, ['tools/pslive-option-except-convert-tests.ts'], 120_000],
  ['pslive-option-except-collection-convert', node, ['tools/pslive-option-except-collection-convert-tests.ts'], 120_000],
  ['pslive-option-except-toexcept-toarray', node, ['tools/pslive-option-except-toexcept-toarray-tests.ts'], 120_000],
  ['pslive-except-maperror', node, ['tools/pslive-except-maperror-tests.ts'], 120_000],
  ['pslive-option-filter', node, ['tools/pslive-option-filter-tests.ts'], 120_000],
  ['pslive-option-flatten', node, ['tools/pslive-option-flatten-tests.ts'], 120_000],
  ['pslive-option-fold', node, ['tools/pslive-option-fold-tests.ts'], 120_000],
  ['pslive-except-flatten', node, ['tools/pslive-except-flatten-tests.ts'], 120_000],
  ['pslive-except-toerror', node, ['tools/pslive-except-toerror-tests.ts'], 120_000],
  ['pslive-except-geterrord', node, ['tools/pslive-except-geterrord-tests.ts'], 120_000],
  ['pslive-except-swap', node, ['tools/pslive-except-swap-tests.ts'], 120_000],
  ['pslive-except-fold', node, ['tools/pslive-except-fold-tests.ts'], 120_000],
  ['pslive-except-bimap', node, ['tools/pslive-except-bimap-tests.ts'], 120_000],
  ['pslive-option-any', node, ['tools/pslive-option-any-tests.ts'], 120_000],
  ['pslive-reference-v061-declarations', node, ['tools/pslive-reference-v061-declaration-tests.ts'], 120_000],
  ['pslive-reference-v061-match', node, ['tools/pslive-reference-v061-match-tests.ts'], 120_000],
  ['pslive-reference-v061-where', node, ['tools/pslive-reference-v061-where-tests.ts'], 120_000],
  ['pslive-reference-v061-structure-expr', node, ['tools/pslive-reference-v061-structure-expr-tests.ts'], 120_000],
  ['pslive-except', node, ['tools/pslive-except-tests.ts'], 120_000],
  ['pslive-option-except-map', node, ['tools/pslive-option-except-map-tests.ts'], 120_000],
  ['pslive-option-except-bind', node, ['tools/pslive-option-except-bind-tests.ts'], 120_000],
  ['pslive-do-notation', node, ['tools/pslive-do-notation-tests.ts'], 120_000],
  ['standalone-small', node, ['tools/proofscript-live-small-smoke.ts'], 180_000],
  ['kernel-smoke', node, ['tools/pskernel-kernel-smoke.ts'], 180_000],
];

const results = [];
for (const [label, cmd, args, timeout] of steps) {
  const started = Date.now();
  const stdoutLog = path.join(logDir, `${label}.stdout.log`);
  const stderrLog = path.join(logDir, `${label}.stderr.log`);
  const outFd = fs.openSync(stdoutLog, 'w');
  const errFd = fs.openSync(stderrLog, 'w');
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', outFd, errFd],
    timeout,
    windowsHide: true,
    env: childEnv(),
  });
  fs.closeSync(outFd);
  fs.closeSync(errFd);
  const record = {
    label,
    command: [cmd, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    durationMs: Date.now() - started,
    stdoutLog: path.relative(root, stdoutLog),
    stderrLog: path.relative(root, stderrLog),
  };
  results.push(record);
  if (result.status !== 0 || result.signal) {
    console.error(JSON.stringify({ release: 'P5.85', status: 'failed', failedStep: record, results }, null, 2));
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${label} (${record.durationMs}ms)`);
}

const summary = {
  release: 'P5.85',
  status: 'passed',
  scope: 'Compact P5.65 controlled-release gate: architecture/status matrices plus focused Int, Array(Nat), Array.size/get?, Array.map/Array.foldl/Array.filter/Array.append/Array.isEmpty/Array.reverse/Array.any/Array.all, List.map/List.foldl/List.filter/List.append/List.length/List.reverse/List.any/List.all, Except(E, A), Option.map/Except.map, Option.bind/Except.bind, minimal do-notation, List.reverse/Array.reverse, and List.any/List.all/Array.any/Array.all, List.find?/Array.find?, List.head?/Array.head?, plus List.tail?/Array.tail?, List.isEmpty, plus List.last?/Array.last? List.get?, List.take/Array.take, and List.drop/Array.drop, List.range/Array.range, List.replicate/Array.replicate, and List.takeWhile/Array.takeWhile, List.dropWhile/Array.dropWhile, List.countP/Array.countP, and List.singleton/Array.singleton, Option.isSome/Option.isNone/Except.isOk/Except.isError, and Option.getD/Except.getD, Option.orElse/Except.orElse, and Option.toList/Except.toOption and Option.toArray/Except.toList and Option.toExcept/Except.toArray, Except.mapError, Option.filter, Option.flatten, Option.fold, Except.flatten, Except.toError, Except.getErrorD, Except.swap, Except.fold, Except.bimap, Option.any, and reference v0.6.1 declaration-form, match-body, and where-body and class-body-body feature smokes; broader conformance is a companion check',
  excludedInheritedGates: ['verify:production:no-build', 'verify:k3tb:publish'],
  companionVerification: ['npm run test:pslive:language-fast', 'node tools/conformance-runner.ts', 'npm run test:typescript-migration'],
  trust: 'K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4',
  formalLean4EquivalenceProvenObligations: 0,
  passedSteps: results.length,
  failedSteps: 0,
  totalDurationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
  logDir: path.relative(root, logDir),
};
fs.writeFileSync(path.join(root, 'artifacts', 'p5-controlled-release-results.json'), JSON.stringify({ ...summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
