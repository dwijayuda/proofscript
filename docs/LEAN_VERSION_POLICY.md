# Lean Compatibility and Version Policy

Status: active policy for ProofScript product and assurance work.

## Principle

ProofScript separates **compatibility policy** from **evidence identity**.

The active stateful-verification product lane accepts **Lean 4.33.1 or newer**, including later stable, RC, and development/nightly builds. A reproducible evidence artifact must still record the exact Lean version (and commit when available) that actually executed it.

Historical assurance artifacts may remain exactly pinned when their claim is defined against a particular Lean release.

## Version lanes

### 1. Stateful verification compatibility lane

The active v0.7 stateful-verification tooling has this compatibility floor:

```text
Lean >= 4.33.1
```

This lane accepts later stable releases, release candidates, and future development/nightly versions. The repository's default developer toolchain may move forward without redefining the minimum compatibility floor.

As of 2026-09-23:

- minimum supported stateful Lean: **4.33.1**;
- default developer toolchain: **4.34.0**;
- current stable discovered upstream: **4.34.0**;
- current RC discovered upstream: **4.35.0-rc2**.

Compatibility CI resolves and tests the floor, latest stable, and latest RC dynamically. Each resulting execution artifact records the exact Lean version actually used.

Local proof-matrix runs may select an exact compatible lane with
`--lean-toolchain <version>`. The runner applies that selector to a temporary
copy of the Lean verification project; the checked-in developer toolchain is not
rewritten. The selected toolchain and the exact observed `lean --version`
remain separate evidence fields.

### 2. Product tracking lanes

The current stable and RC lanes are compatibility probes, not permanent semantic identities.

A newer stable or RC may be tested immediately when it appears upstream. Passing such a lane means the tested ProofScript feature set is compatible with that exact observed Lean build; it does not rewrite historical ProofScript or K3-TB assurance claims.

### 3. Historical assurance lane

Existing K3-TB evidence remains bound to:

- Lean **4.33.1**
- commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

Historical evidence must never be relabeled as evidence for 4.34.0 or another version merely because the product lane advances.

## Native ProofScript rule

The supported native ProofScript profile should be checkable without Lean installed:

```text
.ps
 -> ProofScript parser/elaborator
 -> explicit Core
 -> PSKernel
```

Lean is used for:

- canonical export;
- differential comparison;
- reference/parser-lowering proofs;
- optional oracle verification;
- compatibility assurance.

This preserves the long-term goal that ProofScript can operate independently while still being Lean-semantic and Lean-comparable.

## Release manifest minimum

Every release manifest should record at least:

```json
{
  "proofscript_version": "<semver>",
  "proofscript_spec_version": "<version>",
  "compiler_revision": "<git-sha>",
  "kernel_revision": "<git-sha>",
  "core_format": "<version/profile>",
  "node_version": "<exact-tested-version>",
  "typescript_version": "<exact-tested-version>",
  "lean_oracle": {
    "channel": "stable|rc|historical|none",
    "version": "<exact-version-or-null>",
    "commit": "<exact-commit-or-null>"
  },
  "conformance": {
    "surface": "C0|C1|C2|C3|C4",
    "claim_level": "S1|S2|S3|S4|S5"
  },
  "runtime_profile": "<version-or-null>",
  "axiom_policy": "<declared-policy>",
  "artifact_hashes": {}
}
```

## Compatibility CI

Current product verification uses:

```text
native-product
  Node + pinned TypeScript + PSKernel/product tests

stateful-lean-floor
  Lean 4.33.1

stateful-lean-stable
  latest non-prerelease Lean release discovered from upstream

stateful-lean-rc
  latest upstream -rc release when one exists
```

The stable and RC versions are resolved at workflow execution time, deduplicated with the floor, and written into the verification project's `lean-toolchain` before running. The resulting evidence reports the actual Lean version observed by `lean --version`.

Historical K3-TB verification remains separate and exactly pinned to its original 4.33.1 release/commit.

## Upgrade rule

The stateful-verification compatibility floor does not move merely because a new Lean version exists. Before raising the minimum above 4.33.1:

1. identify which supported stateful features require the newer Lean;
2. run the floor/current-stable/current-RC compatibility suites;
3. record any changed semantics or capability gaps;
4. update the compatibility specification and release manifest;
5. raise the floor only with explicit executable evidence.

The default developer toolchain may advance independently as long as the 4.33.1 floor remains green.

## Soundness incident rule

If Lean publishes a kernel/soundness fix, ProofScript must:

- identify which ProofScript assurance artifacts used the affected Lean version;
- determine whether the ProofScript native kernel reproduces the issue;
- rerun relevant conformance/parity suites;
- never silently treat evidence from the affected version as equivalent to evidence from the fixed release.
