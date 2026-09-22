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
assert.equal(pkg.scripts?.['test:ka145'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka145-monadic-lowering-tests.ts');
assert.ok(fs.existsSync(path.join(ROOT, 'packages', 'monadic-lowering', 'src', 'index.mjs')));
const mlPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'monadic-lowering', 'package.json'), 'utf8'));
assert.equal(mlPkg.name, '@proofscript/monadic-lowering');

const cliText = fs.readFileSync(psc, 'utf8');
assert.ok(cliText.includes('../packages/monadic-lowering/src/index.mjs'));
assert.ok(cliText.includes('psc monadic-lowering <contracts.json>'));
assert.ok(cliText.split('\n').length < 1900, 'psc should remain a router, not absorb all monadic lowering logic');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka145-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka145-app', '--json']));

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
  vcgen: { status: 'planned', tactic: 'vcgen' }
}, null, 2));

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

jsonFrom(runOk(node, [psc, 'state-model', 'validate', modelFile, '--json'], app));
const contractsFile = path.join(app, 'dist', 'Transfer.contracts.json');
const contractsLean = path.join(app, 'dist', 'Transfer.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', transfer, '--state-model', modelFile, '--out', contractsFile, '--emit-lean', contractsLean, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.contractKind, 'monadic-stateful');
assert.equal(contracts.verification.profile, 'ps3-monadic-contracts0');

const loweringFile = path.join(app, 'dist', 'Transfer.monadic-lowering.json');
const loweringLean = path.join(app, 'dist', 'Transfer.monadic-triple.lean');
const lowering = jsonFrom(runOk(node, [psc, 'monadic-lowering', contractsFile, '--out', loweringFile, '--emit-lean', loweringLean, '--json'], app));
assert.equal(lowering.status, 'accepted');
assert.equal(lowering.schema, 'proofscript.monadic-lowering.v1');
assert.equal(lowering.stateModel, 'BankStateModel');
assert.equal(lowering.tripleSkeleton.triple, 'Std.Do.Triple');
assert.equal(lowering.tripleSkeleton.vcgenLoweringStatus, 'not-connected');
assert.equal(lowering.trustBoundary.semanticProofChecking, false);
assert.equal(lowering.trustBoundary.monadicProofDischarge, false);

const loweringArtifact = JSON.parse(fs.readFileSync(loweringFile, 'utf8'));
assert.equal(loweringArtifact.schema, 'proofscript.monadic-lowering.v1');
assert.equal(loweringArtifact.tripleSkeleton.loweringStatus, 'std-do-triple-skeleton');
assert.equal(loweringArtifact.summary.hasStdDoTripleSkeleton, true);
assert.equal(loweringArtifact.statefulPredicateAST.schema, 'proofscript.stateful-predicate-ast/v1');
assert.equal(loweringArtifact.statefulPredicateAST.typeCheckingComplete, true);
assert.equal(loweringArtifact.statefulWpBinding.schema, 'proofscript.stateful-wp-binding/v1');
assert.equal(loweringArtifact.statefulWpBinding.typedRequirementsReady, true);
assert.equal(loweringArtifact.statefulWpBinding.typedPostconditionsReady, true);
assert.equal(loweringArtifact.statefulWpBinding.bindingReady, true);
assert.equal(loweringArtifact.statefulWpBinding.wp.triple, 'Std.Do.Triple');
assert.equal(loweringArtifact.statefulWpBinding.semantics.runner, 'runBankState');
assert.equal(loweringArtifact.statefulWpBinding.semantics.adequacyTheorem, 'runBankState_adequate');
assert.equal(loweringArtifact.statefulWpBinding.semantics.adequacyTheoremChecked, false);
assert.equal(loweringArtifact.statefulWpBinding.verificationConditionsGenerated, false);
assert.equal(loweringArtifact.statefulWpBinding.semanticProofDischarge, false);
assert.equal(loweringArtifact.tripleSkeleton.precondition, loweringArtifact.statefulWpBinding.precondition.functionSource);
assert.equal(loweringArtifact.tripleSkeleton.postcondition, loweringArtifact.statefulWpBinding.postcondition.functionSource);
assert.equal(loweringArtifact.summary.semanticProofDischarge, false);
assert.ok(loweringArtifact.operations.length >= 2);
assert.ok(loweringArtifact.obligations.length >= 2);
const leanText = fs.readFileSync(loweringLean, 'utf8');
assert.match(leanText, /Std\.Do\.Triple/);
assert.match(leanText, /vcgen\/mvcgen connection: not connected/);
assert.match(leanText, /admit/);

const badLowering = jsonFromAny(runFail(node, [psc, 'monadic-lowering', transfer, '--out', path.join(app, 'dist', 'bad.json'), '--json'], app));
assert.equal(badLowering.status, 'rejected');
assert.match(badLowering.message, /expected proofscript\.contracts\.v1|monadic|valid JSON/i);

const obligationsFile = path.join(app, 'dist', 'Transfer.obligations.json');
jsonFrom(runOk(node, [psc, 'obligations', transfer, '--state-model', modelFile, '--contracts-out', contractsFile, '--out', obligationsFile, '--json'], app));
const proofStatusFile = path.join(app, 'dist', 'Transfer.proofstatus.json');
const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.summary.unproved, loweringArtifact.obligations.length);
jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));

const alphaOut = path.join(app, 'dist', 'alpha');
const alpha = jsonFrom(runOk(node, [psc, 'software-alpha', '--out-dir', alphaOut, '--json'], app));
assert.equal(alpha.status, 'accepted');
assert.ok(alpha.summary.monadicContractExamples >= 1);
assert.ok(alpha.summary.monadicLoweringSkeletons >= 1);
const monadicWorkflow = alpha.workflows.find((w: any) => w.kind === 'monadic-contract');
assert.ok(monadicWorkflow?.monadicLowering?.tripleSkeleton);
assert.equal(monadicWorkflow?.trustBoundary?.vcgenConnected, false);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('Std.Do.Triple-style monadic lowering skeleton'));
assert.ok(language.commands.includes('monadic-lowering'));
assert.equal(language.trustBoundary.monadicProofDischarge, false);
assert.equal(language.trustBoundary.monadicLoweringSkeletons, true);

console.log('KA145_MONADIC_LOWERING_TESTS=PASS');
