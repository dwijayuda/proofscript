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
function runFail(cmd: string, args: string[], cwd = ROOT) {
  const r = run(cmd, args, cwd);
  assert.notEqual(r.status, 0, `${cmd} ${args.join(' ')} unexpectedly succeeded\nstdout=${r.stdout}\nstderr=${r.stderr}`);
  return r;
}
function jsonFrom(r: ReturnType<typeof runOk>) {
  try { return JSON.parse(r.stdout); }
  catch { assert.fail(`expected JSON stdout, got:\n${r.stdout}\nstderr=${r.stderr}`); }
}
function jsonFromAny(r: ReturnType<typeof run>) {
  try { return JSON.parse(r.stdout); }
  catch { assert.fail(`expected JSON stdout, got:\n${r.stdout}\nstderr=${r.stderr}`); }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.version, '1.0.0-pskernel.149');
assert.equal(pkg.scripts?.['test:ka144'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka144-state-model-descriptor-tests.ts');
assert.ok(fs.existsSync(path.join(ROOT, 'packages', 'state-models', 'src', 'index.mjs')));
const smPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'state-models', 'package.json'), 'utf8'));
assert.equal(smPkg.name, '@proofscript/state-models');

const cliText = fs.readFileSync(psc, 'utf8');
assert.ok(cliText.includes('../packages/state-models/src/index.mjs'));
assert.ok(cliText.split('\n').length < 1900, 'psc should remain a router, not absorb all state-model logic');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka144-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka144-app', '--json']));

const modelFile = path.join(app, 'src', 'BankState.model.json');
fs.writeFileSync(modelFile, JSON.stringify({
  schema: 'proofscript.state-model.v1',
  name: 'BankStateModel',
  stateType: 'Bank',
  monad: { name: 'State Bank', typeConstructor: 'State Bank α' },
  wp: { triple: 'Std.Do.Triple', precondition: 'Bank -> Prop', postcondition: 'α -> Bank -> Prop' },
  semantics: { runner: 'runBankState', adequacyTheorem: 'runBankState_adequate' },
  operations: [
    { name: 'debit', type: 'AccountId -> Nat -> State Bank Unit', spec: 'decreases source balance by amount', verification: { tripleTheorem: 'BankStateModel.debit_triple' } },
    { name: 'credit', type: 'AccountId -> Nat -> State Bank Unit', spec: 'increases destination balance by amount', verification: { tripleTheorem: 'BankStateModel.credit_triple' } }
  ],
  observations: [
    { name: 'balanceOf', type: 'AccountId -> Bank -> Nat', stateArgument: 'last', spec: 'reads account balance' }
  ],
  laws: [
    { name: 'debit_credit_preserve_total', statement: 'transfer preserves total bank balance' }
  ],
  vcgen: { status: 'not-connected', tactic: 'vcgen' }
}, null, 2));

const modelValidation = jsonFrom(runOk(node, [psc, 'state-model', 'validate', modelFile, '--json'], app));
assert.equal(modelValidation.status, 'accepted');
assert.equal(modelValidation.schema, 'proofscript.state-model-validation.v1');
assert.equal(modelValidation.capabilities.monadicContracts, true);
assert.equal(modelValidation.capabilities.operationTripleTheoremIdentities, 2);
assert.equal(modelValidation.capabilities.vcgenConnected, false);
assert.equal(modelValidation.trustBoundary.semanticProofChecking, false);

const badModelFile = path.join(app, 'src', 'Bad.model.json');
fs.writeFileSync(badModelFile, JSON.stringify({ schema: 'proofscript.state-model.v1', name: 'Bad' }, null, 2));
const badModel = jsonFromAny(runFail(node, [psc, 'state-model', 'validate', badModelFile, '--json'], app));
assert.equal(badModel.status, 'rejected');
assert.ok(badModel.errors.some((e: any) => e.field === 'stateType'));

const transfer = path.join(app, 'src', 'Transfer.ps');
fs.writeFileSync(transfer, `function transfer(from: AccountId, to: AccountId, amount: Nat): State Bank Unit
  requires positive: amount > 0
  ensures debit: balanceOf(from) = old(balanceOf(from)) - amount
  ensures credit: balanceOf(to) = old(balanceOf(to)) + amount
:= do {
  debit(from, amount);
  credit(to, amount);
}
`);
const missingModel = jsonFromAny(runFail(node, [psc, 'contracts', transfer, '--json'], app));
assert.equal(missingModel.status, 'unsupported');
assert.match(missingModel.message, /state model/i);

const contractsFile = path.join(app, 'dist', 'Transfer.contracts.json');
const leanFile = path.join(app, 'dist', 'Transfer.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', transfer, '--state-model', modelFile, '--out', contractsFile, '--emit-lean', leanFile, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.contractKind, 'monadic-stateful');
assert.equal(contracts.verification.profile, 'ps3-monadic-contracts0');
assert.equal(contracts.statefulPredicateAST.typeCheckingComplete, true);
assert.equal(contracts.stateModel.name, 'BankStateModel');
assert.equal(contracts.trustBoundary.monadicContracts, 'state-model-descriptor-bound');
assert.equal(contracts.trustBoundary.vcgenConnected, false);
assert.ok(contracts.obligations.every((o: any) => o.kind.startsWith('monadic.')));
assert.match(fs.readFileSync(leanFile, 'utf8'), /state model BankStateModel/);

const obligationsFile = path.join(app, 'dist', 'Transfer.obligations.json');
const obligations = jsonFrom(runOk(node, [psc, 'obligations', transfer, '--state-model', modelFile, '--contracts-out', contractsFile, '--out', obligationsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.schema, 'proofscript.obligations.v1');
assert.ok(obligations.obligations.length >= 2);
assert.ok(obligations.obligations.every((o: any) => o.vcgenLoweringStatus === 'not-implemented'));
assert.equal(obligations.trustBoundary.vcgenConnected, false);

const proofStatusFile = path.join(app, 'dist', 'Transfer.proofstatus.json');
const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.status, 'accepted');
assert.equal(proofStatus.summary.unproved, obligations.obligations.length);
jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('state model descriptors'));
assert.ok(language.unsupported.includes('monadic vcgen/mvcgen semantic discharge'));

const alphaOut = path.join(app, 'dist', 'alpha');
const alpha = jsonFrom(runOk(node, [psc, 'software-alpha', '--out-dir', alphaOut, '--json'], app));
assert.equal(alpha.status, 'accepted');
assert.ok(alpha.summary.monadicContractExamples >= 1);
assert.ok(alpha.workflows.some((w: any) => w.kind === 'monadic-contract'));

console.log('KA144_STATE_MODEL_DESCRIPTOR_TESTS=PASS');
