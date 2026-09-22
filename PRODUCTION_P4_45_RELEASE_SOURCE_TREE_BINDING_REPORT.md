# P4.45 — Release Source Tree Binding

## Status

PASS — deterministic release-critical source tree evidence added and bound into release-manifest verification.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

P4.44 made `verify-release-manifest --fresh` practical in the sandbox, but the release manifest still did not explicitly bind the release-critical source tree. P4.45 adds a deterministic source inventory and hash, then requires release-manifest fresh verification to recompute and match that hash.

## Changes

```txt
- Added tools/pskernel-kernel-source-tree.ts.
- Added deterministic release-critical source tree evidence schema.
- Added source tree snapshot generation:
  snapshotProofScriptSourceTree(...)
- Added source tree verification:
  verifyProofScriptSourceTreeEvidence(...)
- Added pskernel commands:
  node tools/pskernel.ts source-tree --json
  node tools/pskernel.ts verify-source-tree <source-tree.json> --json
- Added npm scripts:
  source-tree:pskernel-kernel
  source-tree:pskernel-kernel:json
  source-tree:pskernel-kernel:write-docs
- Release manifest now includes componentHashes.sourceTreeSha256.
- Fresh-bound release verification now recomputes the source-tree hash.
- Forged sourceTreeSha256 evidence rejects.
- Added source tree release proof obligation.
```

## Source tree evidence profile

The profile intentionally hashes release-critical source inputs instead of volatile generated outputs. It includes:

```txt
- root project config and governance docs,
- packages/*/src source files,
- packages/* package metadata/config files,
- tools/**/*.ts/cjs/js source scripts,
- tests/specs/examples/types source material.
```

It excludes volatile or derived material:

```txt
- node_modules,
- dist,
- artifacts,
- coverage,
- legacy,
- packed archives,
- logs,
- tsbuildinfo,
- source maps.
```

This keeps the hash useful as a source-input binding while tarball/package gates continue to bind generated distribution outputs.

## TDD result

```txt
RED:
pskernel source-tree command did not exist.

GREEN:
pskernel source-tree emits deterministic sourceTreeSha256;
pskernel verify-source-tree accepts fresh matching evidence;
forged sourceTreeSha256 rejects.
```

## Fresh verification

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts source-tree --json
node tools/pskernel.ts verify-source-tree /tmp/p45_source_tree.json --json
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p45tar2
node tools/pskernel.ts verify-release-manifest artifacts/p4-45-release-manifest.json --json --fresh
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p45tar-smoke-final
```

## Observed results

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS
governance: PASS
source-tree: accepted
verify-source-tree: accepted
forged verify-source-tree: rejected
release-manifest: accepted
verify-release-manifest --fresh: accepted, failures=0
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
```

## Observed source tree evidence

```txt
sourceTreeSha256=35a7adc75b19a0f3223f584d59cf6f3016d1046c519bc5105ef4f33a5164b0c5
fileCount=819
totalBytes=4868448
```

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~92.7%
PSC-1 small complete programming language: ~60.5%
PSC-1 small theorem prover: ~58.7%
Full ProofScript compiler: ~53.8%
Full Lean-like ProofScript without Lean4: ~10.7%
Formal Lean 4 equivalence: 0 proven obligations
```

## Caveat

This is source/evidence binding, not a proof of Lean kernel equivalence. The trust label remains trusted-boundary and not-proven. `--fresh --heavy` remains the slower fully regenerative CI path and was not counted as passing in this sandbox.
