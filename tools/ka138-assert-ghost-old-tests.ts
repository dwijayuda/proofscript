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
assert.equal(pkg.scripts?.['test:ka138'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka138-assert-ghost-old-tests.ts');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka138-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka138-app', '--json']));

const spec = path.join(app, 'src', 'AccountSpec.ps');
fs.writeFileSync(spec, `structure Account {\n  balance: Nat;\n}\n\nfunction withdraw(acct: Account, amount: Nat): Account\n  requires enough: amount <= acct.balance\n  ghost before: Nat := acct.balance\n  ensures balance_after: result.balance = old(acct.balance) - amount\n:= {\n  assert hEnough: amount <= acct.balance;\n  { acct with balance := acct.balance - amount }\n}\n`);

const contractsFile = path.join(app, 'dist', 'AccountSpec.contracts.json');
const contractsLean = path.join(app, 'dist', 'AccountSpec.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', spec, '--out', contractsFile, '--emit-lean', contractsLean, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.command, 'contracts');
assert.equal(contracts.ghosts.length, 1);
assert.equal(contracts.assertions.length, 1);
assert.equal(contracts.oldSnapshots.length, 1);
assert.equal(contracts.obligations.length, 2, 'ensures and assert each generate obligations');
assert.equal(contracts.trustBoundary.semanticProofChecking, false);
assert.equal(contracts.trustBoundary.hiddenAxioms, false);
assert.equal(contracts.trustBoundary.ghostErasureVerified, false);
assert.equal(contracts.trustBoundary.oldIsLogicalSnapshot, true);
assert.equal(contracts.trustBoundary.runtimeAssertionTrust, false);
assert.equal(contracts.trustBoundary.fullLean4Equivalence, false);

const artifact = JSON.parse(fs.readFileSync(contractsFile, 'utf8'));
assert.equal(artifact.schema, 'proofscript.contracts.v1');
assert.equal(artifact.functions[0].ghosts[0].name, 'before');
assert.equal(artifact.functions[0].assertions[0].name, 'hEnough');
assert.equal(artifact.oldSnapshots[0].expression, 'acct.balance');
assert.ok(artifact.obligations.some((o: any) => o.kind === 'assert' && o.name === 'withdraw_assert_hEnough'));
assert.ok(artifact.obligations.some((o: any) => o.kind === 'ensures' && o.statement.includes('__old_')));

const lean = fs.readFileSync(contractsLean, 'utf8');
assert.match(lean, /ghost before : Nat := acct\.balance/);
assert.match(lean, /assert obligation/);
assert.match(lean, /old snapshot/);

const obligations = jsonFrom(runOk(node, [psc, 'obligations', contractsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.count, 2);
assert.ok(obligations.obligations.every((o: any) => o.status === 'unproved'));
assert.ok(obligations.obligations.every((o: any) => o.proofRequired === true));

const status = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(status.features.formalVerification.includes('old'));
assert.ok(status.features.formalVerification.includes('assert'));
assert.ok(status.features.formalVerification.includes('ghost'));
assert.ok(!status.features.notYetImplemented.includes('old'));
assert.ok(!status.features.notYetImplemented.includes('assert'));
assert.ok(!status.features.notYetImplemented.includes('ghost'));
assert.ok(['assert-ghost-old-alpha', 'usable-software-verification-alpha', 'lean-backed-obligation-alpha', 'verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(status.layers.formalVerification.status));

const badGhostRuntime = path.join(app, 'src', 'BadGhostRuntime.ps');
fs.writeFileSync(badGhostRuntime, `function bad(x: Nat): Nat\n  ghost y: Nat := x\n  ensures same: result = x\n:= {\n  y\n}\n`);
const bad = run(node, [psc, 'contracts', badGhostRuntime, '--json'], app);
assert.equal(bad.status, 2, `ghost-in-runtime must be unsupported\nstdout=${bad.stdout}\nstderr=${bad.stderr}`);
assert.equal(JSON.parse(bad.stdout).status, 'unsupported');
assert.match(JSON.parse(bad.stdout).message, /ghost.*runtime/i);

const packDir = path.join(tmp, 'pack');
fs.mkdirSync(packDir);
const pack = runOk('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir]);
const tgzName = pack.stdout.trim().split(/\n/).find(line => line.endsWith('.tgz'));
assert.ok(tgzName);
const consumer = path.join(tmp, 'consumer');
fs.mkdirSync(consumer);
runOk('npm', ['init', '-y'], consumer);
runOk('npm', ['install', path.join(packDir, tgzName!), '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
const installedStatus = jsonFrom(runOk('npx', ['psc', 'language', 'status', '--json'], consumer));
assert.equal(installedStatus.status, 'accepted');
assert.ok(installedStatus.features.formalVerification.includes('ghost'));

console.log('KA138_ASSERT_GHOST_OLD_TESTS=PASS');
