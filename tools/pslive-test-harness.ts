import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(toolsDir, '..');
const NODE_TS_FLAGS = [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
];

export function runPslive(args, expect = 0) {
  const result = spawnSync(process.execPath, [...NODE_TS_FLAGS, 'tools/pslive.ts', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    expect,
    `${args.join(' ')} expected exit ${expect}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return result;
}

export function parseJsonOutput(result, label = 'pslive JSON output') {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label} was not valid JSON\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

export function runPsliveJson(args, expect = 0) {
  return parseJsonOutput(runPslive(args, expect), args.join(' '));
}

export function expectPsliveRejected(args) {
  const result = runPsliveJson(args, 1);
  assert.equal(result.status, 'rejected', `${args.join(' ')} should reject with status=rejected`);
  assert.equal(typeof result.message, 'string', `${args.join(' ')} rejection should include message`);
  return result;
}

export function createPsliveFixture(prefix, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const pathInFixture = (...segments) => path.join(dir, ...segments);
  const write = (relativePath, text) => {
    const target = pathInFixture(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
    return target;
  };
  const fileName = options.fileName ?? 'Main.ps';
  const source = write(fileName, options.source ?? '');
  return {
    dir,
    source,
    path: pathInFixture,
    write,
  };
}

export function buildJsFixture(fixture, fileName = 'out.js') {
  const outPath = fixture.path(fileName);
  const result = runPsliveJson(['build-js', fixture.source, '--out', outPath, '--json']);
  assert.equal(result.status, 'accepted');
  assert.equal(result.target, 'js');
  assert.equal(result.outPath, outPath);
  assert.ok(fs.existsSync(outPath), `expected JS output at ${outPath}`);
  return { outPath, result };
}

export function buildTsFixture(fixture, fileName = 'out.ts') {
  const outPath = fixture.path(fileName);
  const result = runPsliveJson(['build-ts', fixture.source, '--out', outPath, '--json']);
  assert.equal(result.status, 'accepted');
  assert.equal(result.target, 'ts');
  assert.equal(result.outPath, outPath);
  assert.ok(fs.existsSync(outPath), `expected TypeScript output at ${outPath}`);
  return { outPath, result };
}

export function compileTypeScriptFixture(tsPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
  const result = spawnSync(process.execPath, [
    tsc,
    tsPath,
    '--target',
    'ES2022',
    '--module',
    'CommonJS',
    '--strict',
    '--skipLibCheck',
    '--outDir',
    outDir,
  ], { encoding: 'utf8', timeout: 60_000 });
  assert.equal(
    result.status,
    0,
    `generated TypeScript must typecheck${result.error ? `\nERROR:\n${result.error.message}` : ''}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return path.join(outDir, `${path.basename(tsPath, path.extname(tsPath))}.js`);
}

export function requireFixtureModule(file) {
  const requireFromHere = createRequire(import.meta.url);
  return requireFromHere(file);
}
