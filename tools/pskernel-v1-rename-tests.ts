import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git']);
const oldCamel = 'Lean' + '4' + 'Lean';
const oldLower = 'lean' + '4' + 'lean';
const oldUpper = 'LEAN' + '4' + 'LEAN';
const forbidden = [oldCamel, oldLower, oldUpper].map((s) => new RegExp(s));
const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.yml', '.yaml', '.lock', '.html', '.css', '.sh'
]);

function ext(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const path = join(dir, name);
    yield path;
    if (statSync(path).isDirectory()) yield* walk(path);
  }
}

const badPaths: string[] = [];
const badText: string[] = [];
for (const path of walk(root)) {
  const rel = relative(root, path).replaceAll('\\\\', '/');
  if (forbidden.some((rx) => rx.test(rel))) badPaths.push(rel);
  if (statSync(path).isFile() && textExtensions.has(ext(path))) {
    const text = readFileSync(path, 'utf8');
    if (forbidden.some((rx) => rx.test(text))) badText.push(rel);
  }
}

assert.equal(badPaths.length, 0, `old kernel label paths remain: ${badPaths.slice(0, 20).join(', ')}`);
assert.equal(badText.length, 0, `old kernel label text remains: ${badText.slice(0, 20).join(', ')}`);
assert.ok(existsSync(join(root, 'packages/kernel/src/PSKernel.ts')), 'expected packages/kernel/src/PSKernel.ts');
assert.ok(existsSync(join(root, 'packages/kernel/src/PSKernel')), 'expected packages/kernel/src/PSKernel directory');
assert.ok(!existsSync(join(root, 'packages/kernel/src', `${oldCamel}.ts`)), 'old top-level kernel file must be gone');
assert.ok(!existsSync(join(root, 'packages/kernel/src', oldCamel)), 'old kernel directory must be gone');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\./, 'project version naming should restart at version 1.x');

console.log('PSKERNEL_V1_RENAME_TESTS=PASS');
