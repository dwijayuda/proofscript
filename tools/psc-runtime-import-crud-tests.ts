#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const psc = path.join(repoRoot, 'bin', 'psc.mjs');

function runPsc(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync(process.execPath, [psc, ...args], {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: 'utf8',
  });
}

function read(file: string): string { return fs.readFileSync(file, 'utf8'); }
function step(label: string) { console.error(`[psc-runtime-import-crud] ${label}`); }

function runRepoTsc(cwd: string) {
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
  return spawnSync(process.execPath, [tsc, '-p', 'tsconfig.generated.json', '--pretty', 'false'], { cwd, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-runtime-import-crud-'));
const crud = path.join(repoRoot, 'examples', 'software-profile', 'crud-app');
try {
  const app = path.join(tmp, 'app');
  step('init temp app');
  const init = runPsc(['init', app, '--json']);
  assert.equal(init.status, 0, init.stderr + init.stdout);

  step('build temp app local runtime');
  const build = runPsc(['build', '--json'], { cwd: app });
  assert.equal(build.status, 0, build.stderr + build.stdout);
  const distMain = path.join(app, 'dist', 'Main.ts');
  const distRuntime = path.join(app, 'dist', 'proofscript-runtime.ts');
  const manifest = path.join(app, 'dist', 'proofscript.manifest.json');
  assert.ok(fs.existsSync(distMain), 'default psc build must emit dist/Main.ts');
  assert.ok(fs.existsSync(distRuntime), 'default psc build must emit a local dist/proofscript-runtime.ts file');
  assert.ok(fs.existsSync(manifest), 'default psc build must emit dist/proofscript.manifest.json');
  assert.match(read(distMain), /from ['"]\.\/proofscript-runtime\.js['"]/u, 'default Main.ts must import local runtime with a Node ESM-compatible .js specifier');
  assert.doesNotMatch(read(distMain), /Nat_zero|Nat_add|Struct_mk/u, 'default Main.ts must not embed runtime implementation');
  assert.match(read(distRuntime), /export const __ps/u, 'runtime file must export __ps helpers');
  assert.match(read(distMain), /from ['"]\.\/proofscript-runtime\.js['"]/u, 'local runtime import must be Node ESM/NodeNext compatible with a .js specifier');
  assert.ok(fs.existsSync(path.join(app, 'tsconfig.generated.json')), 'psc init must create a generated-output TypeScript config');
  step('tsc temp app');
  const tscApp = runRepoTsc(app);
  assert.equal(tscApp.status, 0, tscApp.stderr + tscApp.stdout);
  step('run temp app JS');
  const runApp = spawnSync(process.execPath, ['dist-js/Main.js'], { cwd: app, encoding: 'utf8', timeout: 60_000 });
  assert.equal(runApp.status, 0, runApp.stderr + runApp.stdout);

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  step('build temp app bundled runtime');
  const bundled = runPsc(['build', '--bundle-runtime', '--json'], { cwd: app });
  assert.equal(bundled.status, 0, bundled.stderr + bundled.stdout);
  assert.ok(fs.existsSync(distMain), 'bundle mode must still emit dist/Main.ts');
  assert.ok(!fs.existsSync(distRuntime), 'bundle mode must not emit a separate runtime file');
  assert.match(read(distMain), /Nat_zero|Nat_add|Struct_mk/u, 'bundle mode must retain self-contained runtime');

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  step('build temp app package runtime');
  const pkgRuntime = runPsc(['build', '--runtime', 'package', '--json'], { cwd: app });
  assert.equal(pkgRuntime.status, 0, pkgRuntime.stderr + pkgRuntime.stdout);
  assert.ok(fs.existsSync(distMain), 'package runtime mode must emit dist/Main.ts');
  assert.ok(!fs.existsSync(distRuntime), 'package runtime mode must not emit local runtime copy');
  assert.match(read(distMain), /from ['"]@proofscript\/runtime['"]/u, 'package runtime mode must import @proofscript/runtime');

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  step('compile temp app dir');
  const compile = runPsc(['compile', 'src', '--out-dir', 'dist', '--json'], { cwd: app });
  assert.equal(compile.status, 0, compile.stderr + compile.stdout);
  assert.ok(fs.existsSync(distRuntime), 'compile directory mode must emit exactly one local runtime file');
  assert.equal(JSON.parse(compile.stdout).runtime?.mode, 'local');

  step('check CRUD fixture files');
  assert.ok(fs.existsSync(path.join(crud, 'proofscript.config.json')), 'CRUD example must include a project config');
  step('crud check');
  const crudCheck = runPsc(['check'], { cwd: crud });
  assert.equal(crudCheck.status, 0, crudCheck.stderr + crudCheck.stdout);
  step('crud build local runtime');
  const crudBuild = runPsc(['build', '--json'], { cwd: crud });
  assert.equal(crudBuild.status, 0, crudBuild.stderr + crudBuild.stdout);
  assert.ok(fs.existsSync(path.join(crud, 'dist', 'Main.ts')), 'CRUD example must build to dist/Main.ts');
  assert.ok(fs.existsSync(path.join(crud, 'dist', 'proofscript-runtime.ts')), 'CRUD example must use shared local runtime file');
  assert.match(read(path.join(crud, 'dist', 'Main.ts')), /from ['"]\.\/proofscript-runtime\.js['"]/u, 'CRUD Main.ts must use Node ESM-compatible runtime import');
  assert.ok(fs.existsSync(path.join(crud, 'tsconfig.generated.json')), 'CRUD example must include generated-output TypeScript config');
  step('crud tsc');
  const crudTsc = runRepoTsc(crud);
  assert.equal(crudTsc.status, 0, crudTsc.stderr + crudTsc.stdout);
  step('crud run JS');
  const crudRun = spawnSync(process.execPath, ['dist-js/Main.js'], { cwd: crud, encoding: 'utf8', timeout: 60_000 });
  assert.equal(crudRun.status, 0, crudRun.stderr + crudRun.stdout);
  const crudMain = read(path.join(crud, 'src', 'Main.ps'));
  for (const token of ['structure Task', 'inductive Priority', 'function createTask', 'function updateStatus', 'function deleteTask', 'Except(String, TaskStore)', 'theorem smokeSummary_eq']) {
    assert.match(crudMain, new RegExp(token.replace(/[()]/g, '\\$&'), 'u'), `CRUD example should demonstrate ${token}`);
  }
} finally {
  fs.rmSync(path.join(crud, 'dist'), { recursive: true, force: true });
  fs.rmSync(path.join(crud, 'dist-js'), { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('PSC_RUNTIME_IMPORT_CRUD0=PASS');
