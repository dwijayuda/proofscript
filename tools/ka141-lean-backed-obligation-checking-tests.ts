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
function writeExecutable(file: string, text: string) {
  fs.writeFileSync(file, text);
  fs.chmodSync(file, 0o755);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'proofscript');
assert.equal(pkg.version, '1.0.0-pskernel.149');
assert.equal(pkg.scripts?.['test:ka141'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka141-lean-backed-obligation-checking-tests.ts');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka141-'));
const app = path.join(tmp, 'app');
jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka141-app', '--json']));

const spec = path.join(app, 'src', 'AccountSpec.ps');
fs.writeFileSync(spec, `structure Account {\n  balance: Nat;\n}\n\nfunction withdraw(acct: Account, amount: Nat): Account\n  requires enough: amount <= acct.balance\n  ghost before: Nat := acct.balance\n  ensures balance_after: result.balance = old(acct.balance) - amount\n:= {\n  assert hEnough: amount <= acct.balance;\n  { acct with balance := acct.balance - amount }\n}\n`);

const obligationsFile = path.join(app, 'dist', 'AccountSpec.obligations.json');
const contractsFile = path.join(app, 'dist', 'AccountSpec.contracts.json');
jsonFrom(runOk(node, [psc, 'obligations', spec, '--out', obligationsFile, '--contracts-out', contractsFile, '--json'], app));
const obligationsArtifact = JSON.parse(fs.readFileSync(obligationsFile, 'utf8'));
assert.equal(obligationsArtifact.schema, 'proofscript.obligations.v1');
assert.equal(obligationsArtifact.obligations.length, 2);

const proofsFile = path.join(app, 'proofs.json');
fs.writeFileSync(proofsFile, JSON.stringify({
  schema: 'proofscript.lean-proofs.v1',
  proofs: {
    'withdraw.assert.hEnough': {
      language: 'lean',
      body: 'by\n  exact enough'
    }
  }
}, null, 2) + '\n');

const fakeLean = path.join(tmp, 'fake-lean.cjs');
writeExecutable(fakeLean, `#!/usr/bin/env node\nconst fs = require('fs');\nconst file = process.argv[2];\nconst text = fs.readFileSync(file, 'utf8');\nif (!text.includes('ProofScript KA-141 Lean obligation check file')) process.exit(11);\nif (!text.includes('theorem withdraw_assert_hEnough')) process.exit(12);\nif (!text.includes('exact enough')) process.exit(13);\nprocess.exit(0);\n`);
const failingLean = path.join(tmp, 'failing-lean.cjs');
writeExecutable(failingLean, `#!/usr/bin/env node\nprocess.stderr.write('fake lean failure\\n');\nprocess.exit(7);\n`);

const proofStatusFile = path.join(app, 'dist', 'AccountSpec.proofstatus.json');
const leanCheckFile = path.join(app, 'dist', 'AccountSpec.leancheck.lean');
const proofStatus = jsonFrom(runOk(node, [psc, 'proof-status', obligationsFile, '--proofs', proofsFile, '--lean-cmd', fakeLean, '--emit-lean-check', leanCheckFile, '--out', proofStatusFile, '--json'], app));
assert.equal(proofStatus.status, 'accepted');
assert.equal(proofStatus.schema, 'proofscript.proof-status.v1');
assert.equal(proofStatus.leanCheck.status, 'accepted');
assert.equal(proofStatus.leanCheck.checked, 1);
assert.equal(proofStatus.summary.total, 2);
assert.equal(proofStatus.summary.checked, 1);
assert.equal(proofStatus.summary.unproved, 1);
assert.equal(proofStatus.obligations.find((o: any) => o.id === 'withdraw.assert.hEnough')?.status, 'checked');
assert.equal(proofStatus.obligations.find((o: any) => o.id === 'withdraw.ensures.balance_after')?.status, 'unproved');
assert.ok(fs.existsSync(leanCheckFile));
assert.match(fs.readFileSync(leanCheckFile, 'utf8'), /theorem withdraw_assert_hEnough/);

const verifyFresh = jsonFrom(runOk(node, [psc, 'verify', proofStatusFile, '--json'], app));
assert.equal(verifyFresh.status, 'accepted');
assert.equal(verifyFresh.artifactKind, 'proof-status');
assert.equal(verifyFresh.leanCheck.status, 'accepted');
assert.equal(verifyFresh.summary.checked, 1);

fs.appendFileSync(leanCheckFile, '\n-- tamper lean check file\n');
const tampered = run(node, [psc, 'verify', proofStatusFile, '--json'], app);
assert.equal(tampered.status, 1, `tampered lean check file must reject\nstdout=${tampered.stdout}\nstderr=${tampered.stderr}`);
assert.match(JSON.parse(tampered.stdout).message, /lean check hash mismatch/i);

const statusAlias = path.join(app, 'dist', 'AccountSpec.alias.proofstatus.json');
const aliasLean = path.join(app, 'dist', 'AccountSpec.alias.leancheck.lean');
const alias = jsonFrom(runOk(node, [psc, 'check-obligations', obligationsFile, '--proofs', proofsFile, '--lean-cmd', fakeLean, '--emit-lean-check', aliasLean, '--out', statusAlias, '--json'], app));
assert.equal(alias.status, 'accepted');
assert.equal(alias.command, 'check-obligations');
assert.equal(alias.leanCheck.status, 'accepted');

const rejected = run(node, [psc, 'proof-status', obligationsFile, '--proofs', proofsFile, '--lean-cmd', failingLean, '--out', path.join(app, 'dist', 'bad.proofstatus.json'), '--json'], app);
assert.equal(rejected.status, 1, `failing Lean must reject\nstdout=${rejected.stdout}\nstderr=${rejected.stderr}`);
const rejectedJson = JSON.parse(rejected.stdout);
assert.equal(rejectedJson.status, 'rejected');
assert.equal(rejectedJson.command, 'proof-status');
assert.match(rejectedJson.message, /Lean obligation check failed/i);
assert.equal(rejectedJson.leanExitCode, 7);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.ok(['lean-backed-obligation-alpha', 'verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('Lean-backed proof-status checking'));
assert.ok(language.commands.includes('check-obligations'));

console.log('KA141_LEAN_BACKED_OBLIGATION_CHECKING_TESTS=PASS');
