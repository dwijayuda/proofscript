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
assert.equal(pkg.scripts?.['test:ka140'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/ka140-usable-software-verification-alpha-tests.ts');

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.149\b/);

const examplesDir = path.join(ROOT, 'examples', 'software');
for (const name of ['01-domain-model.ps', '02-state-machine.ps', '03-bounded-counter-contract.ps', '04-permission-contract.ps']) {
  assert.ok(fs.existsSync(path.join(examplesDir, name)), `missing example ${name}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka140-'));
const outDir = path.join(tmp, 'software-alpha-out');
const alpha = jsonFrom(runOk(node, [psc, 'software-alpha', '--examples-dir', examplesDir, '--out-dir', outDir, '--json']));
assert.equal(alpha.status, 'accepted');
assert.equal(alpha.command, 'software-alpha');
assert.equal(alpha.schema, 'proofscript.software-alpha.v1');
assert.ok(alpha.summary.examples >= 4);
assert.equal(alpha.summary.executableExamples, 2);
assert.ok(alpha.summary.contractExamples >= 2);
assert.equal(alpha.summary.runtimeArtifacts, 2);
assert.equal(alpha.summary.certificates, 2);
assert.ok(alpha.summary.obligations >= 3);
assert.equal(alpha.trustBoundary.semanticProofChecking, false);
assert.equal(alpha.trustBoundary.certifiableArtifacts, true);
assert.ok(fs.existsSync(alpha.manifest));
assert.equal(alpha.manifestSha256.length, 64);

const manifest = JSON.parse(fs.readFileSync(alpha.manifest, 'utf8'));
assert.equal(manifest.schema, 'proofscript.software-alpha.v1');
assert.ok(manifest.workflows.length >= 4);
assert.ok(manifest.workflows.filter((w: any) => w.kind === 'executable').every((w: any) => fs.existsSync(path.resolve(ROOT, w.core.path)) || fs.existsSync(path.resolve(w.core.path)) || fs.existsSync(path.join(process.cwd(), w.core.path))));

const domain = path.join(examplesDir, '01-domain-model.ps');
const check = jsonFrom(runOk(node, [psc, 'check', domain, '--json']));
assert.equal(check.status, 'accepted');
assert.ok(check.userDeclarations.some((d: any) => d.name === 'validateAdult'));

const core = path.join(outDir, '01-domain-model.pscore.json');
const lean = path.join(outDir, '01-domain-model.lean');
const cert = path.join(outDir, '01-domain-model.pscert.json');
const ts = path.join(outDir, '01-domain-model.ts');
for (const file of [core, lean, cert, ts]) assert.ok(fs.existsSync(file), `${file} exists`);
const verifyCert = jsonFrom(runOk(node, [psc, 'verify', cert, '--json']));
assert.equal(verifyCert.status, 'accepted');
assert.equal(verifyCert.artifactKind, 'certificate');

const contractArtifact = path.join(outDir, '03-bounded-counter-contract.contracts.json');
const obligationsArtifact = path.join(outDir, '03-bounded-counter-contract.obligations.json');
const proofStatusArtifact = path.join(outDir, '03-bounded-counter-contract.proofstatus.json');
for (const file of [contractArtifact, obligationsArtifact, proofStatusArtifact]) assert.ok(fs.existsSync(file), `${file} exists`);
const obligations = JSON.parse(fs.readFileSync(obligationsArtifact, 'utf8'));
assert.equal(obligations.schema, 'proofscript.obligations.v1');
assert.equal(obligations.summary.unproved, 2);
assert.ok(obligations.obligations.some((o: any) => o.kind === 'assert'));
assert.ok(obligations.obligations.some((o: any) => o.kind === 'ensures'));
const verifyProofStatus = jsonFrom(runOk(node, [psc, 'verify', proofStatusArtifact, '--json']));
assert.equal(verifyProofStatus.status, 'accepted');
assert.equal(verifyProofStatus.artifactKind, 'proof-status');

const emittedLean = path.join(tmp, 'contract.emit.lean');
const emitLean = jsonFrom(runOk(node, [psc, 'emit-lean', contractArtifact, '--out', emittedLean, '--json']));
assert.equal(emitLean.status, 'accepted');
assert.match(fs.readFileSync(emittedLean, 'utf8'), /theorem incrementCounter_ensures_increases/);

const directObligations = jsonFrom(runOk(node, [psc, 'obligations', path.join(examplesDir, '03-bounded-counter-contract.ps'), '--out', path.join(tmp, 'direct.obligations.json'), '--contracts-out', path.join(tmp, 'direct.contracts.json'), '--json']));
assert.equal(directObligations.status, 'accepted');
assert.equal(directObligations.inputKind, 'source');
assert.equal(directObligations.count, 2);

const language = jsonFrom(runOk(node, [psc, 'language', 'status', '--json']));
assert.equal(language.layers.programmingLanguage.status, 'usable-software-alpha');
assert.ok(['usable-software-verification-alpha', 'lean-backed-obligation-alpha', 'verification-package-extraction-alpha', 'state-model-descriptor-alpha', 'monadic-lowering-skeleton-alpha', 'monadic-preflight-alpha'].includes(language.layers.formalVerification.status));
assert.ok(language.features.formalVerification.includes('software examples workflow'));
assert.ok(language.commands.includes('software-alpha'));

console.log('KA140_USABLE_SOFTWARE_VERIFICATION_ALPHA_TESTS=PASS');
