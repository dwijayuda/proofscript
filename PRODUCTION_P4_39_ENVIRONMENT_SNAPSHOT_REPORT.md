# Production P4.39 — Deterministic Environment Snapshot Evidence

## Status

Completed as a trusted-boundary standalone-kernel evidence slice.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

Add a deterministic environment snapshot API and CLI so accepted replay/check-core runs can emit a stable, auditable view of the final trusted environment. This improves release evidence without widening the accepted language or claiming formal Lean 4 equivalence.

## Findings before implementation

- Replay already produced semantic summary hashes and certificates.
- The kernel environment already stored checked declarations, generated names, assumptions, and constant info entries.
- There was no exported API or CLI command that serialized the final checked environment into deterministic JSON.
- Release/audit evidence therefore could identify a semantic summary, but not a reusable final-environment snapshot hash.

## RED check added first

The smoke test was extended to require missing APIs before production code existed:

```txt
snapshotEnvironment
checkCoreDeclarationsWithSnapshot
replayCoreArtifactWithSnapshot
pskernelSnapshotCoreArtifact
pskernel snapshot <artifact.json>
```

The first run failed because the new named exports were not present. That verified the test was exercising new behavior.

## Implementation

### Environment API

Added:

```ts
EnvironmentCore.constantInfos(): ConstantInfo[]
```

This exposes admitted constant info entries for deterministic snapshotting without exposing mutable maps.

### Snapshot API

Added to `packages/kernel/src/PSKernel/Replay.ts`:

```ts
EnvironmentSnapshot
SnapshotReplaySummary
snapshotEnvironment(env, { label? })
checkCoreDeclarationsWithSnapshot(decls, implementationProfile?, preludeProfile?)
replayCoreArtifactWithSnapshot(artifact)
```

Snapshot content includes:

```txt
format marker
version
Lean semantic baseline
trust label
optional label
sorted constant info entries
sorted checked declaration entries
generated names
assumptions
metadata where present
environmentSha256
```

The hash uses the existing canonical stable JSON ordering path.

### Main/CLI API

Added:

```ts
pskernelSnapshotCoreArtifact(artifact)
```

Added CLI command:

```bash
node tools/pskernel.ts snapshot <artifact.json>
```

### Smoke performance guard

The slow package/tarball checks inside `tools/pskernel-kernel-smoke.ts` are now guarded behind:

```bash
PS_KERNEL_SMOKE_RELEASE=1
```

The release-manifest check remains separately guarded behind:

```bash
PS_KERNEL_SMOKE_HEAVY=1
```

This keeps the default kernel smoke aligned with the project rule: minimal, fast smoke checks by default; release packaging gates can still be run individually or with explicit environment flags.

### Proof obligation catalog

Added machine-readable obligation:

```txt
ProofScript.Replay.EnvironmentSnapshot.Deterministic
```

The obligation records that final environment snapshots are deterministic evidence only, not formal proof.

## Tests added

Smoke coverage now checks:

```txt
snapshotEnvironment returns proofscript-environment-snapshot format
snapshotEnvironment emits 64-char environmentSha256
snapshot includes ConstantInfo entries such as Nat.succ
snapshot includes checked generated declarations such as Quot.ind
same admitted environment gives same environmentSha256
checkCoreDeclarationsWithSnapshot includes final checked environment
replayCoreArtifactWithSnapshot includes artifact declarations in final environment
pskernel snapshot <artifact.json> emits environment snapshot hash
```

## Verification run

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts snapshot artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

## Verification results

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel snapshot: PASS
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0
```

Observed evidence hashes from this sandbox run:

```txt
reference-governance sha256: a89501575a8810b580848f40ab5c911ef760091824c5db22306341ff3092a7f7
governance sha256: 8db495e146210a87efd82c37a7235fa627c40376e41cfa2ac111d6cb54fb95db
package-audit sha256: 2bfd0e97ff01233ae88a7466cce832a8a8fea03d139a7f8a8a7a0a90c9228b98
tarball-smoke sha256: 869908f0c2c94d9f4f5480a3e8ab6b696492768a936e4d838a0f88cceb80273f
```

## Supported after P4.39

```txt
deterministic environment snapshot API
deterministic final-environment SHA-256 evidence
snapshot replay summary API
pskernel snapshot CLI command
snapshot proof-obligation catalog entry
fast default kernel smoke with explicit release/heavy gates
```

## Explicitly unsupported / unchanged

```txt
Full formal Lean 4 equivalence remains unproven.
Environment snapshots are evidence, not cryptographic signatures or proofs.
Full parser/elaborator/macro/tactic/native .olean replay remains outside the implemented standalone slice.
Unsupported recursor, primitive, and full Lean features remain fail-closed.
```

## Progress estimate after P4.39

```txt
Standalone PSC-1 without Lean4: ~89%
PSC-1 small complete programming language: ~58%
PSC-1 small theorem prover: ~55%
Full ProofScript compiler: ~50%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

## Next best step

Implement deterministic environment snapshot validation in replay certificates/audit bundles, or implement the small reference-governed `Option` match slice. The certificate/audit integration is the stronger trust step; the Option match slice is the stronger user-visible language-coverage step.
