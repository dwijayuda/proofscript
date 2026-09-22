import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { runPSKernelKernelReleaseManifest, verifyPSKernelKernelReleaseManifest } from './pskernel-kernel-release-manifest.ts';

const manifest = runPSKernelKernelReleaseManifest({ packDestination: '/tmp/p48-red-manifest-pack' });
assert.equal(manifest.status, 'accepted', manifest.checks?.find(c => c.status === 'rejected')?.message ?? manifest.message);
assert.match(
  manifest.componentHashes.deliveryBootstrapSha256,
  /^[0-9a-f]{64}$/,
  'release manifest should bind manifestless delivery-bootstrap verification hash',
);
assert.equal(
  manifest.componentSummaries.deliveryBootstrap.status,
  'accepted',
  'release manifest should summarize delivery-bootstrap verification status',
);

const verification = verifyPSKernelKernelReleaseManifest(manifest, { fresh: true, packDestination: '/tmp/p48-red-manifest-fresh' });
assert.equal(verification.status, 'accepted', verification.message);
assert.equal(
  verification.checks.some(check => check.id === 'fresh-bound.deliveryBootstrapSha256' && check.status === 'accepted'),
  true,
  'fresh verifier should recompute and validate delivery-bootstrap hash',
);

const forged = { ...manifest, componentHashes: { ...manifest.componentHashes, deliveryBootstrapSha256: '9'.repeat(64) } };
delete forged.releaseManifestSha256;
forged.releaseManifestSha256 = '8'.repeat(64);
writeFileSync('/tmp/p48_forged_delivery_manifest.json', JSON.stringify(forged, null, 2));
assert.throws(
  () => execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-release-manifest', '/tmp/p48_forged_delivery_manifest.json', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
  'release manifest verifier should reject forged delivery-bootstrap hash',
);

const cliBootstrap = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'delivery-bootstrap', '--json', '--output', '/tmp/p48-test-bootstrap.zip'], { encoding: 'utf8' }));
assert.equal(cliBootstrap.status, 'accepted', cliBootstrap.message);
assert.match(cliBootstrap.deliveryBootstrapSha256, /^[0-9a-f]{64}$/, 'pskernel delivery-bootstrap should emit deterministic bootstrap hash');

console.log('P4_48_RELEASE_MANIFEST_DELIVERY_BINDING_TEST=PASS');
