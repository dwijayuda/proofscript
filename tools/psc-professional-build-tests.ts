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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-professional-build-'));
try {
  const app = path.join(tmp, 'app');
  const init = runPsc(['init', app, '--json']);
  assert.equal(init.status, 0, init.stderr + init.stdout);
  const initJson = JSON.parse(init.stdout);
  assert.equal(initJson.status, 'accepted');
  assert.equal(initJson.buildSystem?.defaultOutDir, 'dist');

  const config = JSON.parse(fs.readFileSync(path.join(app, 'proofscript.config.json'), 'utf8'));
  assert.equal(config.outDir, 'dist');
  assert.equal(config.build?.target, 'ts');
  assert.equal(config.build?.outDir, 'dist');
  assert.equal(config.diagnostics?.sourceLocations, true);

  const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.check, 'psc check');
  assert.equal(pkg.scripts.build, 'psc build');
  assert.equal(pkg.scripts['build:ts'], 'psc build --target ts');
  assert.equal(pkg.scripts['build:generated-js'], 'tsc -p tsconfig.generated.json');
  assert.equal(pkg.scripts.start, 'node dist-js/Main.js');
  assert.equal(pkg.devDependencies?.typescript, 'file:../vendor/npm/typescript-5.8.3.tgz');
  assert.ok(fs.existsSync(path.join(app, 'tsconfig.generated.json')));
  assert.equal(pkg.scripts.compile, 'psc compile');
  assert.equal(pkg.scripts.clean, 'psc clean');

  const check = runPsc(['check'], { cwd: app });
  assert.equal(check.status, 0, check.stderr + check.stdout);

  const build = runPsc(['build', '--json'], { cwd: app });
  assert.equal(build.status, 0, build.stderr + build.stdout);
  const buildJson = JSON.parse(build.stdout);
  assert.equal(buildJson.status, 'accepted');
  assert.equal(buildJson.outDir?.replace(/\\/g, '/').endsWith('/dist'), true);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));
  assert.ok(!fs.existsSync(path.join(app, 'generated', 'Main.ts')), 'default build must not use generated/ anymore');

  fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });
  const compile = runPsc(['compile', 'src', '--json'], { cwd: app });
  assert.equal(compile.status, 0, compile.stderr + compile.stdout);
  const compileJson = JSON.parse(compile.stdout);
  assert.equal(compileJson.status, 'accepted');
  assert.equal(compileJson.outDir?.replace(/\\/g, '/').endsWith('/dist'), true);
  assert.ok(fs.existsSync(path.join(app, 'dist', 'Main.ts')));

  const clean = runPsc(['clean', '--json'], { cwd: app });
  assert.equal(clean.status, 0, clean.stderr + clean.stdout);
  assert.equal(JSON.parse(clean.stdout).status, 'accepted');
  assert.ok(!fs.existsSync(path.join(app, 'dist', 'Main.ts')));

  const broken = path.join(app, 'src', 'Broken.ps');
  fs.writeFileSync(broken, `def ok: Nat := { 1 }\n// bad comment\n`);
  const bad = runPsc(['check', 'src/Broken.ps'], { cwd: app });
  assert.notEqual(bad.status, 0);
  const diagnostic = bad.stderr + bad.stdout;
  assert.match(diagnostic, /src[/\\]Broken\.ps:2:1/u);
  assert.match(diagnostic, /2 \| \/\/ bad comment/u);
  assert.match(diagnostic, /\^/u);
  assert.match(diagnostic, /use Lean-compatible -- line comments/u);

  const doctor = runPsc(['doctor', '--json'], { cwd: app });
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
  const doctorJson = JSON.parse(doctor.stdout);
  assert.equal(doctorJson.requiresLean4, false);
  assert.equal(doctorJson.projectConfig?.outDir, 'dist');
  assert.equal(doctorJson.buildSystem?.defaultOutDir, 'dist');
  assert.equal(doctorJson.diagnostics?.sourceLocations, true);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('PSC_PROFESSIONAL_BUILD0=PASS');
