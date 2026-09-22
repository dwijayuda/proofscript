# Lean Compatibility and Version Policy

Status: active policy for ProofScript product and assurance work.

## Principle

Do not use the phrase "latest Lean" inside a reproducible artifact.

ProofScript may track current Lean releases, but every release, certificate, oracle result, and assurance bundle must record the exact Lean version and commit it used.

## Version lanes

### 1. Product stable lane

The primary Lean oracle/conformance target for new ProofScript releases.

As of 2026-09-22:

- Lean stable: **4.34.0**

A ProofScript release pins the exact version/commit it actually validates. Updating the stable lane is a deliberate compatibility change with CI evidence.

### 2. Tracking/RC lane

Used to discover upcoming compatibility changes before they become stable.

As of 2026-09-22:

- Lean RC: **4.35.0-rc2**

RC success is informative. It does not silently change the semantic baseline of an already published ProofScript release.

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

New development should eventually have three separate jobs:

```text
native-product
  Node + pinned TypeScript + PSKernel tests

lean-stable
  exact current supported stable Lean

lean-rc
  exact tracked release candidate, allowed to be advisory until promoted
```

Historical K3-TB verification remains a separate manually invoked/release workflow.

## Upgrade rule

Before changing the product stable lane:

1. read the target Lean release notes;
2. run parser/lowering conformance;
3. run Lean export/oracle differential tests;
4. run kernel parity evidence relevant to the supported subset;
5. record any changed semantics or capability gaps;
6. update the release manifest;
7. only then make the new version the default stable lane.

## Soundness incident rule

If Lean publishes a kernel/soundness fix, ProofScript must:

- identify which ProofScript assurance artifacts used the affected Lean version;
- determine whether the ProofScript native kernel reproduces the issue;
- rerun relevant conformance/parity suites;
- never silently treat evidence from the affected version as equivalent to evidence from the fixed release.
