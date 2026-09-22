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
assert.equal(pkg.scripts?.['test:ka139'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka139-proof-obligation-workflow-tests.ts');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka139-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka139-app', '--json']));

const spec = path.join(app, 'src', 'AccountSpec.ps');
fs.writeFileSync(spec, `structure Account {\n  balance: Nat;\n}\n\nfunction withdraw(acct: Account, amount: Nat): Account\n  requires enough: amount <= acct.balance\n  ghost before: Nat := acct.balance\n  ensures balance_after: result.balance = old(acct.balance) - amount\n:= {\n  assert hEnough: amount <= acct.balance;\n  { acct with balance := acct.balance - amount }\n}\n`);

const contractsFile = path.join(app, 'dist', 'AccountSpec.contracts.json');
const obligationsFile = path.join(app, 'dist', 'AccountSpec.obligations.json');
const proofStatusFile = path.join(app, 'dist', 'AccountSpec.proofstatus.json');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', spec, '--out', contractsFile, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.obligations.length, 2);
assert.ok(contracts.obligations.every((o: any) => typeof o.id === 'string' && o.id.startsWith('withdraw.')));
assert.ok(contracts.obligations.every((o: any) => typeof o.statementSha256 === 'string' && o.statementSha256.length === 64));
assert.ok(contracts.obligations.some((o: any) => o.exactTheoremStatement?.includes('theorem withdraw_ensures_balance_after')));

const obligations = jsonFrom(runOk(node, [psc, 'obligations', contractsFile, '--out', obligationsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.command, 'obligations');
assert.equal(obligations.count, 2);
assert.equal(obligations.out, obligationsFile);
assert.ok(obligations.obligations.every((o: any) => o.status === 'unproved'));
assert.ok(obligations.obligations.every((o: any) => o.proofRequired === true));
assert.ok(obligations.obligations.every((o: any) => o.exactTheoremStatement.startsWith('theorem ')));
assert.ok(obligations.obligations.every((o: any) => o.sourceSha256 === obligations.source.sha256));
const writtenObligations = JSON.parse(fs.readFileSync(obligationsFile, 'utf8'));
assert.equal(writtenObligations.schema, 'proofscript.obligations.v1');
assert.equal(writtenObligations.source.sha256, obligations.source.sha256);
assert.equal(writtenObligations.contracts.sha256.length, 64);

const directObligations = jsonFrom(runOk(node, [psc, 'obligations', spec, '--out', path.join(app, 'dist', 'direct.obligations.json'), '--contracts-out', path.join(app, 'dist', 'direct.contracts.json'), '--json'], app));
assert.equal(directObligations.status, 'accepted');
assert.equal(directObligations.inputKind, 'source');
assert.equal(directObligations.count, 2);

const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.status, 'accepted');
assert.equal(proofStatus.command, 'proof-status');
assert.equal(proofStatus.summary.total, 2);
assert.equal(proofStatus.summary.proved, 0);
assert.equal(proofStatus.summary.unproved, 2);
assert.equal(proofStatus.out, proofStatusFile);
const proofStatusArtifact = JSON.parse(fs.readFileSync(proofStatusFile, 'utf8'));
assert.equal(proofStatusArtifact.schema, 'proofscript.proof-status.v1');
assert.equal(proofStatusArtifact.source.sha256, obligations.source.sha256);
assert.ok(proofStatusArtifact.obligations.every((o: any) => o.status === 'unproved'));

const verifyFresh = jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));
assert.equal(verifyFresh.status, 'accepted');
assert.equal(verifyFresh.artifactKind, 'proof-status');
assert.equal(verifyFresh.summary.unproved, 2);

fs.appendFileSync(spec, '\n-- user edit that must stale the proof-status artifact\n');
const stale = run(node, [psc, 'verify', proofStatusFile, '--json'], app);
assert.equal(stale.status, 1, `stale proof-status must reject\nstdout=${stale.stdout}\nstderr=${stale.stderr}`);
const staleJson = JSON.parse(stale.stdout);
assert.equal(staleJson.status, 'rejected');
assert.match(staleJson.message, /source hash mismatch/i);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['usable-software-verification-alpha', 'lean-backed-obligation-alpha', 'verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('proof status records'));
assert.ok(language.features.formalVerification.includes('stale proof detection'));
assert.ok(!language.features.notYetImplemented.includes('proof obligation workflow'));

console.log('KA139_PROOF_OBLIGATION_WORKFLOW_TESTS=PASS');
