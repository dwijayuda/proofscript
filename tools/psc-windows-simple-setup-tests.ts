#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const psc = path.join(repoRoot, 'bin', 'psc.mjs');
const nodeTsFlags = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];
function runPsc(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; inherit?: boolean } = {}) {
  console.error(`[psc-windows-simple-setup] psc ${args.join(' ')}`);
  return spawnSync(process.execPath, [psc, ...args], { cwd: options.cwd ?? repoRoot, env: { ...process.env, ...(options.env ?? {}) }, encoding: 'utf8', stdio: options.inherit ? 'inherit' : 'pipe' });
}
function runNodeTs(script: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [...nodeTsFlags, path.join(repoRoot, script), ...args], { cwd: repoRoot, env: { ...process.env, ...env }, encoding: 'utf8' });
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts.setup, 'node bin/psc.mjs setup');
assert.equal(packageJson.scripts.build, 'node bin/psc.mjs setup');
assert.equal(packageJson.scripts['test:psc:windows-simple-setup'], 'node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/psc-windows-simple-setup-tests.ts');
for (const [name, script] of Object.entries(packageJson.scripts as Record<string, string>)) {
  assert.ok(!script.includes('export NODE_OPTIONS'), `${name} must not use Unix-only export syntax`);
}

const forced = runNodeTs('tools/link-local-workspaces.cts', ['--json'], { PROOFSCRIPT_FORCE_WORKSPACE_LINK_COPY: '1' });
assert.equal(forced.status, 0, forced.stderr + forced.stdout);
const forcedJson = JSON.parse(forced.stdout);
assert.equal(forcedJson.status, 'accepted');
assert.ok(forcedJson.packageCount > 0);
assert.ok(forcedJson.links.every((x: { mode: string }) => x.mode === 'copy-fallback-forced'));
assert.ok(fs.existsSync(path.join(repoRoot, 'node_modules', '@proofscript', 'frontend', 'package.json')));

const simulated = runNodeTs('tools/link-local-workspaces.cts', ['--json'], { PROOFSCRIPT_TEST_SYMLINK_EPERM: '1' });
assert.equal(simulated.status, 0, simulated.stderr + simulated.stdout);
const simulatedJson = JSON.parse(simulated.stdout);
assert.equal(simulatedJson.status, 'accepted');
assert.ok(simulatedJson.links.every((x: { mode: string }) => x.mode === 'copy-fallback'));

const setup = runPsc(['setup', '--pretty', 'false'], { env: { PROOFSCRIPT_TEST_SYMLINK_EPERM: '1' } });
assert.equal(setup.status, 0, setup.stderr + setup.stdout);
assert.match(setup.stdout, /PROOFSCRIPT_SETUP=PASS/u, 'setup must report completion without relying on inherited stdio');
assert.ok(fs.existsSync(path.join(repoRoot, 'packages', 'frontend', 'dist', 'index.js')), 'setup must build packages/frontend/dist/index.js');
assert.ok(fs.existsSync(path.join(repoRoot, 'node_modules', '@proofscript', 'frontend', 'dist', 'index.js')), 'copy fallback must refresh node_modules/@proofscript/frontend/dist/index.js after build');

const doctor = runPsc(['doctor', '--json']);
assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
const doctorJson = JSON.parse(doctor.stdout);
assert.equal(doctorJson.requiresLean4, false);
assert.equal(doctorJson.packageDist.ok, true);
assert.equal(doctorJson.pscCheckCanRun.ok, true);
assert.equal(doctorJson.pscCheckCanRun.sample, 'temporary-smoke');
assert.ok(doctorJson.localWorkspacePackages.installed >= doctorJson.localWorkspacePackages.expected);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-windows-simple-'));
try {
  const app = path.join(tmp, 'app');
  const init = runPsc(['init', app, '--json']);
  assert.equal(init.status, 0, init.stderr + init.stdout);
  const appPackage = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  assert.equal(appPackage.scripts.check, 'psc check');
  assert.equal(appPackage.scripts.build, 'psc build');
  assert.equal(appPackage.scripts['build:ts'], 'psc build --target ts');
  const check = runPsc(['check'], { cwd: app });
  assert.equal(check.status, 0, check.stderr + check.stdout);
  const build = runPsc(['build'], { cwd: app });
  assert.equal(build.status, 0, build.stderr + build.stdout);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));
  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  const compile = runPsc(['compile', 'src', '--out-dir', 'dist'], { cwd: app });
  assert.equal(compile.status, 0, compile.stderr + compile.stdout);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('PSC_WINDOWS_SIMPLE_SETUP0=PASS');
