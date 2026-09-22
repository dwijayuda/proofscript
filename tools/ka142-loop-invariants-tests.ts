import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const node = process.execPath;
const psc = path.join(ROOT, 'bin', 'psc.mjs');
function run(cmd: string, args: string[], cwd = ROOT) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function runOk(cmd: string, args: string[], cwd = ROOT) {
  const r = run(cmd, args, cwd);
  assert.equal(r.status, 0, `${cmd} ${args.join(' ')} failed\nstdout=${r.stdout}\nstderr=${r.stderr}`);
  return r;
}
function jsonFrom(r: ReturnType<typeof runOk>) {
  try { return JSON.parse(r.stdout); }
  catch { assert.fail(`expected JSON stdout, got:\n${r.stdout}\nstderr=${r.stderr}`); }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'proofscript');
assert.equal(pkg.version, '1.0.0-pskernel.149');
assert.equal(pkg.scripts?.['test:ka142'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka142-loop-invariants-tests.ts');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka142-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka142-app', '--json']));

const spec = path.join(app, 'src', 'SumTo.ps');
fs.writeFileSync(spec, `function sumTo(n: Nat): Nat
  ensures closed_form: result = n * (n + 1) / 2
:= {
  let mut i: Nat := 0;
  let mut acc: Nat := 0;
  while (i <= n)
    invariant inv_acc: acc = i * (i - 1) / 2
    invariant inv_bound: i <= n + 1
    decreases dec: n - i
  {
    acc := acc + i;
    i := i + 1;
  }
  acc
}
`);

const contractsFile = path.join(app, 'dist', 'SumTo.contracts.json');
const leanFile = path.join(app, 'dist', 'SumTo.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', spec, '--out', contractsFile, '--emit-lean', leanFile, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.command, 'contracts');
assert.equal(contracts.loops.length, 1);
assert.equal(contracts.loops[0].invariants.length, 2);
assert.equal(contracts.loops[0].decreases.length, 1);
assert.ok(contracts.obligations.some((o: any) => o.kind === 'loop.invariant.init'));
assert.ok(contracts.obligations.some((o: any) => o.kind === 'loop.invariant.preserve'));
assert.ok(contracts.obligations.some((o: any) => o.kind === 'loop.decreases'));
assert.ok(contracts.obligations.some((o: any) => o.kind === 'loop.exit'));
assert.match(fs.readFileSync(leanFile, 'utf8'), /loop invariant/);

const artifact = JSON.parse(fs.readFileSync(contractsFile, 'utf8'));
assert.equal(artifact.schema, 'proofscript.contracts.v1');
assert.equal(artifact.loops.length, 1);
assert.equal(artifact.trustBoundary.loopInvariantChecking, 'structural-obligations-only');
assert.equal(artifact.trustBoundary.vcgenConnected, false);
assert.equal(artifact.obligations.length, 7);

const obligationsFile = path.join(app, 'dist', 'SumTo.obligations.json');
const obligations = jsonFrom(runOk(node, [psc, 'obligations', spec, '--out', obligationsFile, '--contracts-out', contractsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.count, 7);
assert.ok(obligations.obligations.every((o: any) => o.status === 'unproved'));
assert.equal(obligations.obligations.filter((o: any) => o.vcgenLoweringStatus === 'not-implemented').length, 6);

const proofStatusFile = path.join(app, 'dist', 'SumTo.proofstatus.json');
const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.status, 'accepted');
assert.equal(proofStatus.summary.total, 7);
assert.equal(proofStatus.summary.unproved, 7);
assert.equal(proofStatus.trustBoundary.loopInvariantChecking, 'structural-obligations-only');

const verify = jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));
assert.equal(verify.status, 'accepted');
assert.equal(verify.artifactKind, 'proof-status');
assert.equal(verify.summary.unproved, 7);

const examplesDir = path.join(ROOT, 'examples', 'software');
assert.ok(fs.existsSync(path.join(examplesDir, '05-loop-invariant-contract.ps')));
const outDir = path.join(tmp, 'software-alpha-out');
const softwareAlpha = jsonFrom(runOk(node, [psc, 'software-alpha', '--examples-dir', examplesDir, '--out-dir', outDir, '--json']));
assert.equal(softwareAlpha.status, 'accepted');
assert.ok(softwareAlpha.summary.examples >= 5);
assert.ok(softwareAlpha.summary.contractExamples >= 3);
assert.ok(softwareAlpha.summary.obligations >= 10);
assert.ok(fs.existsSync(path.join(outDir, '05-loop-invariant-contract.obligations.json')));

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('invariant'));
assert.ok(language.features.formalVerification.includes('decreases'));
assert.ok(language.features.formalVerification.includes('loop invariant structural obligations'));
assert.ok(language.features.notYetImplemented.includes('monadic vcgen/mvcgen contracts') || language.features.notYetImplemented.includes('monadic vcgen/mvcgen semantic discharge'));
assert.ok(!language.features.notYetImplemented.includes('invariant'));
assert.ok(!language.features.notYetImplemented.includes('decreases'));

console.log('KA142_LOOP_INVARIANTS_TESTS=PASS');
