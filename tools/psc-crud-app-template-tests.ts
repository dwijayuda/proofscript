#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const psc = path.join(repoRoot, 'bin', 'psc.mjs');
const nodeFlags = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];

function runPsc(args: string[], cwd = repoRoot) {
  return spawnSync(process.execPath, [psc, ...args], { cwd, encoding: 'utf8', timeout: 120_000 });
}

function runNodeTs(script: string, args: string[], cwd: string) {
  return spawnSync(process.execPath, [...nodeFlags, script, ...args], { cwd, encoding: 'utf8', timeout: 120_000 });
}

function runTsc(cwd: string, config: string) {
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
  return spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-crud-template-'));
try {
  const app = path.join(tmp, 'crud-app');
  const init = runPsc(['init', app, '--template', 'crud', '--json']);
  assert.equal(init.status, 0, init.stderr + init.stdout);
  const initJson = JSON.parse(init.stdout);
  assert.equal(initJson.template, 'crud');
  assert.equal(initJson.buildSystem.defaultOutDir, 'dist');
  assert.ok(initJson.files.includes('host/imperative-demo.ts'), 'crud template must include imperative host demo');
  assert.ok(initJson.files.includes('tsconfig.host.json'), 'crud template must include host TypeScript config');
  assert.ok(initJson.next.includes('npm run demo'), 'crud template must advertise one-command demo');

  const packageJson = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.build, 'psc build');
  assert.equal(packageJson.scripts['build:generated-js'], 'tsc -p tsconfig.generated.json');
  assert.equal(packageJson.scripts['build:host'], 'tsc -p tsconfig.host.json');
  assert.equal(packageJson.scripts['start:host'], 'node dist-host/imperative-demo.js');
  assert.equal(packageJson.scripts.demo, 'npm run build && npm run build:generated-js && npm run build:host && npm run start:host');
  assert.ok(!JSON.stringify(packageJson.scripts).includes('tsx'), 'crud template must not require uninstalled tsx');

  const source = fs.readFileSync(path.join(app, 'src', 'Main.ps'), 'utf8');
  assert.match(source, /function createTask/u);
  assert.match(source, /function deleteTask/u);
  assert.match(source, /theorem smokeSummary_eq/u);

  const check = runPsc(['check'], app);
  assert.equal(check.status, 0, check.stderr + check.stdout);
  const build = runPsc(['build'], app);
  assert.equal(build.status, 0, build.stderr + build.stdout);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')), 'crud build must emit dist/Main.ts');
  assert.ok(fs.existsSync(path.join(app, 'dist', 'proofscript-runtime.ts')), 'crud build must emit local runtime');

  const generatedJs = runTsc(app, 'tsconfig.generated.json');
  assert.equal(generatedJs.status, 0, generatedJs.stderr + generatedJs.stdout);
  const hostJs = runTsc(app, 'tsconfig.host.json');
  assert.equal(hostJs.status, 0, hostJs.stderr + hostJs.stdout);

  const runHost = spawnSync(process.execPath, ['dist-host/imperative-demo.js'], { cwd: app, encoding: 'utf8', timeout: 120_000 });
  assert.equal(runHost.status, 0, runHost.stderr + runHost.stdout);
  const summary = JSON.parse(runHost.stdout);
  assert.equal(summary.totalEstimate, '11');
  assert.equal(summary.nextId, '4');
  assert.equal(summary.foundTask3, true);
  assert.deepEqual(summary.taskTitles, ['Ship demo', 'Write spec']);
  assert.match(runHost.stdout, /Ship demo/u);

  const directRun = runPsc(['run', 'smokeSummary'], app);
  assert.equal(directRun.status, 0, directRun.stderr + directRun.stdout);
  assert.match(directRun.stdout, /3/u);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log('PSC_CRUD_APP_TEMPLATE0=PASS');
