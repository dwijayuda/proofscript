import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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
  catch (error) { assert.fail(`expected JSON stdout, got:\n${r.stdout}\nstderr=${r.stderr}`); }
}
function readJson(file: string) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha256(file: string) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

const pkg = readJson(path.join(ROOT, 'package.json'));
assert.equal(pkg.name, 'proofscript', 'root package must be the npm package users install as proofscript');
assert.equal(pkg.private, false, 'root package must be publishable for npm alpha dry-run');
assert.equal(pkg.bin?.psc, './bin/psc.mjs', 'package must expose psc binary');
assert.equal(pkg.bin?.proofscript, './bin/psc.mjs', 'package must expose proofscript alias');
for (const required of ['bin', 'tools', 'packages', 'templates', 'config', 'README.md', 'LICENSE', 'kernel-status.json']) {
  assert.ok(pkg.files?.includes(required), `package files must include ${required}`);
}

const version = runOk(node, [psc, '--version']);
assert.match(version.stdout, /^ProofScript 1\.0\.0-pskernel\.14[0-9]\b/, 'psc --version must print npm package version');

const readiness = jsonFrom(runOk(node, [psc, 'npm-readiness', '--json']));
assert.equal(readiness.status, 'accepted');
assert.equal(readiness.package.name, 'proofscript');
assert.equal(readiness.package.private, false);
assert.equal(readiness.bin.psc, './bin/psc.mjs');
assert.equal(readiness.trustBoundary.fullLean4Equivalence, false);
assert.equal(readiness.trustBoundary.requiresLeanForBasicPscCommands, false);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-ka136-user-'));
const app = path.join(tmp, 'app');
const init = jsonFrom(runOk(node, [psc, 'init', app, '--name', 'ka136-app', '--json']));
assert.equal(init.status, 'accepted');
assert.ok(fs.existsSync(path.join(app, 'package.json')));
assert.ok(fs.existsSync(path.join(app, 'src', 'Main.ps')));

const check = jsonFrom(runOk(node, [psc, 'check', '--json'], app));
assert.equal(check.status, 'accepted');
assert.equal(check.fullLean4Equivalence, false);

const coreFile = path.join(app, 'dist', 'Main.pscore.json');
const checkCore = jsonFrom(runOk(node, [psc, 'check', 'src/Main.ps', '--emit-core', coreFile, '--json'], app));
assert.equal(checkCore.status, 'accepted');
assert.ok(fs.existsSync(coreFile), 'psc check --emit-core must write core artifact');

const verifyCore = jsonFrom(runOk(node, [psc, 'verify', coreFile, '--json'], app));
assert.equal(verifyCore.status, 'accepted');
assert.equal(verifyCore.artifactKind, 'pscore');
assert.equal(verifyCore.sha256, sha256(coreFile));

const contractSrc = path.join(app, 'src', 'Contracts.ps');
fs.writeFileSync(contractSrc, `function boundedAdd(x: Nat, y: Nat, max: Nat): Nat\n  requires hx: x <= max\n  requires hy: y <= max\n  ensures upper: result <= x + y\n:= {\n  x + y\n}\n`);
const contractsFile = path.join(app, 'dist', 'Contracts.contracts.json');
const contractsLean = path.join(app, 'dist', 'Contracts.contracts.lean');
const contracts = jsonFrom(runOk(node, [psc, 'contracts', contractSrc, '--out', contractsFile, '--emit-lean', contractsLean, '--json'], app));
assert.equal(contracts.status, 'accepted');
assert.equal(contracts.obligations.length, 1);
assert.ok(fs.existsSync(contractsFile));
assert.ok(fs.existsSync(contractsLean));

const obligations = jsonFrom(runOk(node, [psc, 'obligations', contractsFile, '--json'], app));
assert.equal(obligations.status, 'accepted');
assert.equal(obligations.obligations.length, 1);
assert.equal(obligations.obligations[0].name, 'boundedAdd_ensures_upper');

const verifyContracts = jsonFrom(runOk(node, [psc, 'verify', contractsFile, '--json'], app));
assert.equal(verifyContracts.status, 'accepted');
assert.equal(verifyContracts.artifactKind, 'contracts');
assert.equal(verifyContracts.sha256, sha256(contractsFile));

const pack = runOk('npm', ['pack', '--ignore-scripts', '--pack-destination', tmp]);
const tgzMatch = pack.stdout.trim().split(/\n/).find(line => line.endsWith('.tgz'));
assert.ok(tgzMatch, `npm pack did not print a tarball name: ${pack.stdout}`);
const tgz = path.join(tmp, tgzMatch);
assert.ok(fs.existsSync(tgz), `tarball missing at ${tgz}`);

const consumer = path.join(tmp, 'consumer');
fs.mkdirSync(consumer);
runOk('npm', ['init', '-y'], consumer);
runOk('npm', ['install', tgz, '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
const installedVersion = runOk('npx', ['psc', '--version'], consumer);
assert.match(installedVersion.stdout, /^ProofScript 1\.0\.0-pskernel\.14[0-9]\b/);
const installedReady = jsonFrom(runOk('npx', ['psc', 'npm-readiness', '--json'], consumer));
assert.equal(installedReady.status, 'accepted');

console.log('KA136_NPM_TOOLCHAIN_REBASE_TESTS=PASS');
