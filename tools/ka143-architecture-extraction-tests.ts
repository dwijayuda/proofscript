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
assert.equal(pkg.scripts?.['test:ka143'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka143-architecture-extraction-tests.ts');

for (const packageName of ['contracts', 'obligations', 'proof-status']) {
  const packagePath = path.join(ROOT, 'packages', packageName, 'package.json');
  assert.ok(fs.existsSync(packagePath), `${packageName} package exists`);
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const expectedName = packageName === 'contracts' ? '@proofscript/contracts-workflow' : `@proofscript/${packageName}`;
  assert.equal(packageJson.name, expectedName);
  assert.equal(packageJson.type, 'module');
  assert.ok(fs.existsSync(path.join(ROOT, 'packages', packageName, 'src', 'index.mjs')));
}

const cliText = fs.readFileSync(psc, 'utf8');
assert.ok(cliText.includes("../packages/contracts/src/index.mjs"));
assert.ok(cliText.includes("../packages/obligations/src/index.mjs"));
assert.ok(cliText.includes("../packages/proof-status/src/index.mjs"));
assert.ok(cliText.split('\n').length < 1900, 'psc CLI should remain bounded after extraction plus monadic lowering router');
assert.ok(!cliText.includes('function parseLoopSpecsFromBody'), 'loop parsing belongs in packages/contracts');
assert.ok(!cliText.includes('function leanCheckTextFromProofs'), 'proof-status Lean check generation belongs in packages/proof-status');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka143-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka143-app', '--json']));

const spec = path.join(app, 'src', 'Withdraw.ps');
fs.writeFileSync(spec, `function withdraw(acct: Account, amount: Nat): Account
  requires enough: amount <= acct.balance
  ghost before: Nat := acct.balance
  ensures balance_after: result.balance = old(acct.balance) - amount
:= {
  assert hEnough: amount <= acct.balance;
  while (amount <= acct.balance)
    invariant inv_enough: amount <= acct.balance
    decreases dec: acct.balance - amount
  {
    acct := { acct with balance := acct.balance - amount };
  }
  { acct with balance := acct.balance - amount }
}
`);

const contractsFile = path.join(app, 'dist', 'Withdraw.contracts.json');
const leanFile = path.join(app, 'dist', 'Withdraw.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', spec, '--out', contractsFile, '--emit-lean', leanFile, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.trustBoundary.loopInvariantChecking, 'structural-obligations-only');
assert.equal(contracts.trustBoundary.vcgenConnected, false);
assert.equal(contracts.loops.length, 1);
assert.equal(contracts.ghosts.length, 1);
assert.equal(contracts.oldSnapshots.length, 1);
assert.ok(contracts.obligations.some((o: any) => o.kind === 'assert'));
assert.ok(contracts.obligations.some((o: any) => o.kind === 'ensures'));
assert.ok(contracts.obligations.some((o: any) => o.kind === 'loop.invariant.init'));
assert.match(fs.readFileSync(leanFile, 'utf8'), /KA-143|loop proof workflow|ghost before/);

const obligationsFile = path.join(app, 'dist', 'Withdraw.obligations.json');
const obligations = jsonFrom(runOk(node, [psc, 'obligations', spec, '--contracts-out', contractsFile, '--out', obligationsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.schema, 'proofscript.obligations.v1');
assert.ok(obligations.obligations.length >= 5);
assert.ok(obligations.obligations.every((o: any) => typeof o.id === 'string' && o.id.includes('.')));
assert.ok(obligations.obligations.some((o: any) => o.vcgenLoweringStatus === 'not-implemented'));

const proofStatusFile = path.join(app, 'dist', 'Withdraw.proofstatus.json');
const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.status, 'accepted');
assert.equal(proofStatus.schema, 'proofscript.proof-status.v1');
assert.equal(proofStatus.summary.unproved, obligations.obligations.length);
assert.equal(proofStatus.trustBoundary.staleProofDetection, true);

const verify = jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));
assert.equal(verify.status, 'accepted');
assert.equal(verify.artifactKind, 'proof-status');
assert.equal(verify.summary.unproved, obligations.obligations.length);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('invariant'));
assert.ok(language.features.formalVerification.includes('decreases'));
assert.equal(language.trustBoundary.fullLean4Equivalence, false);

console.log('KA143_ARCHITECTURE_EXTRACTION_TESTS=PASS');
