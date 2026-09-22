#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const versions = readJson('versions.json');
const status = readJson('kernel-status.json');
const coverage = read('docs/KERNEL_COVERAGE.md');

assert.equal(pkg.version, '1.0.0-pskernel.3');
assert.equal(lock.version, '1.0.0-pskernel.3');
assert.equal(lock.packages[''].version, '1.0.0-pskernel.3');
assert.equal(versions.implementation, '1.0.0-pskernel.3');
assert.equal(versions.proofscriptPublicVersion, '1.0.0-pskernel.3');

assert.equal(versions.kernelImplementationName, 'PSKernel');
assert.equal(versions.defaultKernelCoreFormat, 71);
assert.equal(versions.kernelArtifactFormat, 71);
assert.equal(versions.defaultKernel, 'KERNEL-level-instantiation-conformance1');
assert.equal(versions.implementationProfile, 'KERNEL-level-instantiation-conformance1');
assert.equal(versions.resourceSecurityStatus, 'accepted');
assert.equal(versions.fullyFormalK3, false);
assert.equal(versions.fullLean4Equivalence, false);
assert.equal(versions.formalLean4EquivalenceProvenObligations, 0);

assert.equal(status.summary.total, 41);
assert.equal(status.summary.implemented, 41);
assert.equal(status.summary.partially_implemented, 0);
assert.equal(status.summary.unsupported, 0);
assert.equal(status.auditedK3TBChecklistComplete, true);
assert.equal(status.fullLean4Equivalence, false);
assert.equal(status.fullyFormalK3, false);
assert.equal(status.formalLean4EquivalenceProvenObligations, 0);

assert.ok(fs.existsSync(path.join(root, 'packages/kernel/src/PSKernel.ts')));
assert.ok(fs.existsSync(path.join(root, 'packages/kernel/src/PSKernel/TypeChecker.ts')));
assert.match(coverage, /KERNEL-resource-bounds0 \/ Core v68 evidence/);
assert.match(coverage, /Audited practical\/default kernel profile.*KERNEL-level-instantiation-conformance1/s);

assert.ok(pkg.scripts['arena:corpus-preflight']);
assert.ok(pkg.scripts['arena:corpus-preflight:soft']);
assert.ok(pkg.scripts['test:arena:corpus-preflight']);
assert.ok(pkg.scripts['verify:arena'].startsWith('npm run arena:corpus-preflight && '));
assert.ok(fs.existsSync(path.join(root, 'tools/arena-corpus-preflight.ts')));

const banned = [] as string[];
const skipDirs = new Set(['node_modules', '.git', 'dist']);
function walk(dir: string) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (ent.isFile() && /\.(ts|js|json|md)$/.test(ent.name)) {
      const rel = path.relative(root, file);
      if (rel === 'package-lock.json' || rel === 'package.json') continue;
      const text = fs.readFileSync(file, 'utf8');
      const legacyUpper = ['Lean', '4', 'Lean'].join('');
      const legacyLower = legacyUpper.toLowerCase();
      if (text.includes(legacyUpper) || text.includes(legacyLower) || rel.includes(legacyUpper) || rel.includes(legacyLower)) banned.push(rel);
    }
  }
}
walk(path.join(root, 'packages/kernel/src'));
assert.deepEqual(banned, []);

console.log('PSKERNEL_ADVANCEMENT_AUDIT=PASS');
