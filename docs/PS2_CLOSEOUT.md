# PS2 Closeout — v0.6.1 Product Rebaseline

Status: **closed on the cleanup branch**

PS2 rebaselines the current ProofScript product around the compiler-ready v0.6.1 language reference without rewriting historical Core/kernel evidence.

## Closed outcomes

### Normative v0.6.1 conformance

The repository now has separate reference and production evidence:

- **C0 — PASS:** the v0.6.1 registry/schema/corpus is internally well formed.
- **C1 — PASS:** the independent reference frontend accepts/rejects the corpus as specified.
- **C2 — PASS:** the independent reference frontend emits all canonical Lean lowerings in the corpus.
- **C3 — PASS:** production matches the reference on the bounded corpus for:
  - acceptance/rejection;
  - ProofScript-owned feature identity/ranges;
  - canonical Lean lowering.

The independent reference frontend is `reference/v061/frontend.ts` and does not import the production parser or elaborator.

C3 is deliberately corpus-bounded. It is not a proof of full language equivalence.

### Registry ownership

The v0.6.1 registry now distinguishes:

- inherited/admitted language overlays;
- explicitly registered `X-*` exclusions that must stay outside the production-owned feature set.

The production owned-feature set is mechanically checked against the admitted registry.

Where the released corpus does not have a dedicated primary case:

- `D-DECL-SEMI` uses explicit cross-cutting evidence from existing normative cases;
- `E-CLASS-BODY` uses supplemental production/reference ownership + canonical-lowering evidence.

The released positive/negative/lowering corpus remains unchanged.

### Product identity

Current product-facing metadata is now separated from historical Core/Lean compatibility:

- ProofScript reference: `v0.6.1`
- product profile: `ps1-v061`
- product conformance claim: bounded C3
- native supported profile: does not require Lean

Historical Core artifacts may still identify older ProofScript/Lean compatibility baselines. They are not relabeled.

### Certificates

Current structural certificates:

- use certificate v4;
- record current ProofScript/product profile;
- record the bound Core artifact's compatibility metadata separately;
- fail closed on metadata tampering;
- keep older certificate artifacts readable when the new metadata fields are absent.

### Plugin API

Plugin API remains **v1/frozen**.

Current in-repo plugins use the current product profile. The host still accepts the explicitly defined legacy Plugin API v1 metadata lane, while mixed/stale metadata fails closed.

Backend checked-module snapshots carry:

- current product identity;
- explicit Core compatibility;
- deprecated legacy aliases only for Plugin API v1 compatibility.

### Project configuration

Current project configuration supports:

```js
{ language: "0.6.1", productProfile: "ps1-v061" }
```

Legacy projects using the old language/Core-baseline pair remain readable.

Mixed current/legacy fields fail closed so a Lean/Core compatibility baseline cannot silently become the product semantic version.

### CLI ownership and routing

- the root `proofscript` package is the sole public owner of the `psc` executable;
- `packages/cli` is private `@proofscript/cli` internal orchestration/reference code;
- workspace/root package-name collisions are mechanically rejected;
- current source/project checking paths are routed through the canonical compiler facade;
- product-profile/certificate policy is outside the root router in `packages/product-profile`.

### Repository cleanup

Four metadata-only placeholder workspaces were audited, found to have no code or consumers, and removed:

- `diagnostics`
- `formatter`
- `macro`
- `tactics-core`

Their future capabilities remain roadmap items, not empty packages.

## Green closure gate

The PS2 closeout checkpoint passes the normal product suite, including:

```text
build
architecture package classification
PS2 plugin metadata
PS2 project metadata
PS2 CLI project profile
PS2 feature registry governance
compiler facade
canonical incremental compiler
language service
language worker
LSP transport
v0.6.1 C0
v0.6.1 C1/C2
v0.6.1 production surface corpus
v0.6.1 C3 production/reference differential
PS3 pure-contract corpus (existing bounded alpha gate)
KA137
KA140
KA146
```

## Explicitly not closed by PS2

PS2 does **not** establish:

- C4 machine-checked reference theorems;
- S2/S3 parser/lowering refinement proofs;
- full Lean 4 kernel equivalence;
- fully formal K3;
- runtime backend correspondence proofs;
- semantic discharge of all contract obligations.

Those claims remain separate assurance/product milestones.

## Next milestone

PS3 begins with the smallest useful verification layer:

1. pure `requires`;
2. pure `ensures`;
3. reserved postcondition-only `result`;
4. canonical compiler validation of the executable runtime function;
5. stable obligation IDs and explicit unproved status.

Ghost/old/assert/loops and monadic verification remain later subphases until the pure layer is converged.
