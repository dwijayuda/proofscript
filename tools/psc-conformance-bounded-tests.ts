import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const flags = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];
const canonicalScripts: Record<string, string> = {
  'test:conformance:positive:core': 'positive-core',
  'test:conformance:positive:k2c-k2j': 'positive-k2c-k2j',
  'test:conformance:positive:k2k-k2r': 'positive-k2k-k2r',
  'test:conformance:negative:core': 'negative-core',
  'test:conformance:negative:k2d-k2f': 'negative-k2d-k2f',
  'test:conformance:negative:k2g-k2j': 'negative-k2g-k2j',
  'test:conformance:negative:k2k-k2m': 'negative-k2k-k2m',
  'test:conformance:negative:k2n-k2r': 'negative-k2n-k2r',
};
for (const [name, suite] of Object.entries(canonicalScripts)) {
  assert.ok(pkg.scripts[name], `missing package script ${name}`);
  assert.match(pkg.scripts[name], new RegExp(`conformance-runner\\.ts --suite ${suite}$`, 'u'), `${name} must target only ${suite}`);
}
assert.ok(pkg.scripts['test:conformance:bounded'], 'missing bounded aggregate script');
assert.ok(!pkg.scripts['test:conformance:negative:k2a-k2j'].includes('--suite negative-k2a-k2j'), 'compat alias must not point at nonexistent negative-k2a-k2j suite');
assert.ok(!pkg.scripts['test:conformance:negative:k2k-k2r'].includes('--suite negative-k2k-k2r'), 'compat alias must not point at nonexistent negative-k2k-k2r suite');

const smoke = spawnSync(process.execPath, [...flags, path.join(root, 'tools/conformance-runner.ts'), '--suite', 'positive-core'], {
  cwd: root,
  encoding: 'utf8',
  timeout: 90_000,
  maxBuffer: 16 * 1024 * 1024,
});
const combined = `${smoke.stdout ?? ''}${smoke.stderr ?? ''}`;
assert.equal(smoke.status, 0, `positive-core bounded smoke failed status=${smoke.status} signal=${smoke.signal}\n${combined}`);
assert.match(combined, /CONFORMANCE_POSITIVE_CORE=PASS/u, `positive-core bounded smoke did not print PASS marker\n${combined}`);
console.log('PSC_CONFORMANCE_BOUNDED0=PASS');
