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
assert.equal(pkg.scripts?.['test:ka146'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka146-monadic-preflight-tests.ts');
assert.ok(fs.existsSync(path.join(ROOT, 'packages', 'monadic-lowering', 'src', 'index.mjs')));
const moduleText = fs.readFileSync(path.join(ROOT, 'packages', 'monadic-lowering', 'src', 'index.mjs'), 'utf8');
assert.ok(moduleText.includes('leanPreflightForMonadicLoweringArtifact'));
assert.ok(moduleText.includes('proofscript.monadic-preflight.v1'));
const cliText = fs.readFileSync(psc, 'utf8');
const monadicCommands = fs.readFileSync(path.join(ROOT, 'bin', 'monadic-commands.mjs'), 'utf8');
assert.ok(cliText.includes('psc monadic-preflight <monadic-lowering.json>'));
assert.ok(cliText.includes('./monadic-commands.mjs'));
assert.ok(monadicCommands.includes('createMonadicLeanPreflightBundle'));
assert.ok(cliText.split('\n').length < 1950, 'psc should remain a router, not absorb all preflight logic');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka146-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka146-app', '--json']));

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
  laws: [{ name: 'debit_credit_preserve_total', statement: 'transfer preserves total bank balance' }],
  vcgen: { status: 'planned', tactic: 'mvcgen' }
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
const contracts = jsonFrom(runOk(node, [psc, 'contracts', transfer, '--state-model', modelFile, '--out', contractsFile, '--emit-lean', path.join(app, 'dist', 'Transfer.contracts.lean'), '--json'], app));
assert.equal(contracts.verification.profile, 'ps3-monadic-contracts0');
assert.equal(contracts.statefulPredicateAST.typeCheckingComplete, true);
const loweringFile = path.join(app, 'dist', 'Transfer.monadic-lowering.json');
const lowering = jsonFrom(runOk(node, [psc, 'monadic-lowering', contractsFile, '--out', loweringFile, '--emit-lean', path.join(app, 'dist', 'Transfer.monadic-triple.lean'), '--json'], app));
assert.equal(lowering.statefulWpBinding.bindingReady, true);
assert.equal(lowering.statefulVcPlan.planningReady, true);
assert.equal(lowering.statefulVcPlan.realVerificationConditionsGenerated, false);

const fakeLean = path.join(app, 'fake-lean.mjs');
fs.writeFileSync(fakeLean, `#!/usr/bin/env node
import fs from 'node:fs';
const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
if (text.includes('admit') || text.includes('sorry')) process.exit(10);
if (!text.includes('ProofScript.Generated.Preflight')) process.exit(11);
if (!text.includes('theorem transfer_triple_preflight')) process.exit(12);
process.exit(0);
`);
fs.chmodSync(fakeLean, 0o755);

const preflightJson = path.join(app, 'dist', 'Transfer.monadic-preflight.json');
const preflightLean = path.join(app, 'dist', 'Transfer.monadic-preflight.lean');
const preflight = jsonFrom(runOk(node, [psc, 'monadic-preflight', loweringFile, '--out', preflightJson, '--emit-lean', preflightLean, '--lean-cmd', fakeLean, '--json'], app));
assert.equal(preflight.status, 'accepted');
assert.equal(preflight.schema, 'proofscript.monadic-preflight.v1');
assert.equal(preflight.leanRun.status, 'passed');
assert.equal(preflight.summary.leanCommandPassed, true);
assert.equal(preflight.summary.semanticProofDischarge, false);
assert.equal(preflight.trustBoundary.preflightOnly, true);
assert.equal(preflight.trustBoundary.preflightStubAxioms, true);
assert.equal(preflight.trustBoundary.checkableAsCompleteSemanticProof, false);

const preflightArtifact = JSON.parse(fs.readFileSync(preflightJson, 'utf8'));
assert.equal(preflightArtifact.schema, 'proofscript.monadic-preflight.v1');
assert.equal(preflightArtifact.staticChecks.hasExplicitStubBoundary, true);
assert.equal(preflightArtifact.staticChecks.originalTheoremPreservedAsComment, true);
assert.equal(preflightArtifact.leanRun.status, 'passed');
const preflightLeanText = fs.readFileSync(preflightLean, 'utf8');
assert.match(preflightLeanText, /namespace ProofScript\.Generated\.Preflight/);
assert.match(preflightLeanText, /Original planned theorem:/);
assert.match(preflightLeanText, /axiom AccountId : Type/);
assert.match(preflightLeanText, /axiom Bank : Type/);
assert.match(preflightLeanText, /theorem transfer_triple_preflight/);
assert.doesNotMatch(preflightLeanText, /\badmit\b|\bsorry\b/);
assert.match(preflightLeanText, /preflight stub, not a semantic proof/i);

const verified = jsonFrom(runOk(node, [psc, 'verify', preflightJson, '--json'], app));
assert.equal(verified.artifactKind, 'monadic-preflight');
assert.equal(verified.trustBoundary.preflightOnly, true);

fs.appendFileSync(preflightLean, '\n-- tamper\n');
const badVerify = jsonFromAny(runFail(node, [psc, 'verify', preflightJson, '--json'], app));
assert.equal(badVerify.status, 'rejected');
assert.match(badVerify.message, /hash mismatch/);

const badLean = path.join(app, 'bad-lean.mjs');
fs.writeFileSync(badLean, `#!/usr/bin/env node
process.exit(7);
`);
fs.chmodSync(badLean, 0o755);
const failedPreflight = jsonFromAny(runFail(node, [psc, 'monadic-preflight', loweringFile, '--out', path.join(app, 'dist', 'failed-preflight.json'), '--emit-lean', path.join(app, 'dist', 'failed-preflight.lean'), '--lean-cmd', badLean, '--json'], app));
assert.equal(failedPreflight.status, 'rejected');
assert.equal(failedPreflight.leanRun.status, 'failed');

const alphaOut = path.join(app, 'dist', 'alpha');
const alpha = jsonFrom(runOk(node, [psc, 'software-alpha', '--out-dir', alphaOut, '--json'], app));
assert.equal(alpha.status, 'accepted');
assert.ok(alpha.summary.monadicPreflightStubs >= 1);
const monadicWorkflow = alpha.workflows.find((w: any) => w.kind === 'monadic-contract');
assert.ok(monadicWorkflow?.monadicPreflight);
assert.ok(monadicWorkflow?.monadicPreflightLean?.explicitStubs);
assert.equal(monadicWorkflow?.trustBoundary?.monadicPreflightStubs, true);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.equal(language.layers.formalVerification.status, 'monadic-preflight-alpha');
assert.ok(language.features.formalVerification.includes('Lean-checkable monadic preflight stubs'));
assert.ok(language.commands.includes('monadic-preflight'));
assert.equal(language.trustBoundary.monadicPreflightStubs, true);
assert.equal(language.trustBoundary.vcgenConnected, false);

console.log('KA146_MONADIC_PREFLIGHT_TESTS=PASS');
