#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const psc = path.join(repoRoot, 'bin', 'psc.mjs');

function run(args: string[], options: { cwd?: string; timeout?: number } = {}) {
  process.stderr.write(`[psc simple] ${args.join(' ')}\n`);
  return spawnSync(process.execPath, [psc, ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    timeout: options.timeout ?? 90_000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts.setup, 'node bin/psc.mjs setup');
assert.equal(packageJson.scripts.build, 'node bin/psc.mjs setup');
assert.ok(!String(packageJson.scripts.build).includes('export NODE_OPTIONS'));
assert.match(fs.readFileSync(path.join(repoRoot, 'tools', 'link-local-workspaces.cts'), 'utf8'), /junction-or-copy|copy-fallback|junction/u);

const help = run(['help']);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /psc check\n/u);
assert.match(help.stdout, /psc build\n/u);
assert.match(help.stdout, /psc run sample/u);
assert.match(help.stdout, /npm run setup/u);

const doctor = run(['doctor']);
assert.equal(doctor.status, 0, doctor.stderr);
assert.match(doctor.stdout, /windowsWorkspaceLinks=junction-or-copy-fallback/u);
assert.match(doctor.stdout, /simpleProjectCommands=yes/u);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-psc-simple-'));
try {
  const app = path.join(tmp, 'simple-app');
  const init = run(['init', app, '--json']);
  assert.equal(init.status, 0, init.stderr + init.stdout);
  const initJson = JSON.parse(init.stdout);
  assert.deepEqual(initJson.next.slice(1), ['psc check', 'psc build', 'psc run sample']);
  const appPackage = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  assert.equal(appPackage.scripts.check, 'psc check');
  assert.equal(appPackage.scripts.build, 'psc build');
  assert.equal(appPackage.scripts['build:ts'], 'psc build --target ts');
  assert.equal(appPackage.scripts['build:js'], 'psc build --target js');
  assert.equal(appPackage.scripts['run:sample'], 'psc run sample');

  const check = run(['check', '--json'], { cwd: app });
  assert.equal(check.status, 0, check.stderr + check.stdout);
  assert.equal(JSON.parse(check.stdout).status, 'accepted');

  const buildTs = run(['build-ts', '--json'], { cwd: app });
  assert.equal(buildTs.status, 0, buildTs.stderr + buildTs.stdout);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));

  const buildJs = run(['build-js', '--json'], { cwd: app });
  assert.equal(buildJs.status, 0, buildJs.stderr + buildJs.stdout);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.js')));

  const runSample = run(['run', 'sample', '--json'], { cwd: app });
  assert.equal(runSample.status, 0, runSample.stderr + runSample.stdout);
  const sampleJson = JSON.parse(runSample.stdout);
  assert.equal(sampleJson.status, 'accepted');
  assert.equal(String(sampleJson.result), '95');

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  const build = run(['build', '--json'], { cwd: app });
  assert.equal(build.status, 0, build.stderr + build.stdout);
  const buildJson = JSON.parse(build.stdout);
  assert.equal(buildJson.status, 'accepted');
  assert.equal(buildJson.count, 1);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  const compile = run(['compile', '--json'], { cwd: app });
  assert.equal(compile.status, 0, compile.stderr + compile.stdout);
  const compileJson = JSON.parse(compile.stdout);
  assert.equal(compileJson.status, 'accepted');
  assert.equal(compileJson.count, 1);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('PSC_SIMPLE_COMMANDS0=PASS');
