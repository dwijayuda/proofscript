# 06 — Release and Conformance Gates

## 1. Purpose

This document defines what must pass before any ProofScript artifact is released or called usable.

## 2. Release levels

### Level R0 — Development snapshot

May have incomplete features. Must build.

Required:

```text
build PASS
trust label present
unsupported list present
```

### Level R1 — Kernel trusted-boundary snapshot

Required:

```text
kernel smoke PASS
replay smoke PASS
certificate smoke PASS
proof-obligation catalog present
fail-closed negative cases present
```

### Level R2 — Standalone small subset snapshot

Required:

```text
.ps small subset parse PASS
elaborate PASS
kernel check PASS
JS emit PASS
JS run PASS
no Lean4 required for run
```

### Level R3 — Package release candidate

Required:

```text
preflight PASS
package audit PASS
tarball install smoke PASS
release manifest PASS
deterministic artifact hashes present
```

### Level R4 — Conformance candidate

Required:

```text
feature conformance fixtures
negative fixtures
semantic snapshots
proof obligations linked
baseline version pinned
known divergence list
```

### Level R5 — Proven release

Required:

```text
selected proof obligations proven
proof artifacts linked
independent replay evidence
conformance report signed or hashed
```

## 3. Required release files

Every release should include:

```text
README.md
TRUST_BOUNDARY.md
PROOF_OBLIGATIONS.md
RELEASE_MANIFEST.json
PACKAGE_AUDIT.json
TARBALL_SMOKE.json
PREFLIGHT.json
CONFORMANCE_STATUS.md
UNSUPPORTED_FEATURES.md
```

## 4. Hash policy

Hash these artifacts:

```text
core artifacts
certificates
proof-obligation catalog
release manifest
package audit evidence
tarball smoke evidence
packed npm tarball
```

Hashes must exclude nondeterministic local paths, temporary directories, timestamps unless intentional, and npm timing noise.

## 5. Conformance claims

Allowed claim examples:

```text
PSC-1 standalone smoke passed.
Kernel replay accepted this artifact.
Nat literals work in the supported core subset.
Simple parameterized non-indexed recursors are implemented for documented shapes.
```

Forbidden claim examples:

```text
ProofScript is Lean-equivalent.
The compiler is proven correct.
All Lean code works.
The theorem prover is complete.
JavaScript output preserves all Lean semantics.
```

## 6. Baseline policy

Each release must declare:

```text
ProofScript reference version
Lean semantic target
pinned Lean revision if applicable
implementation profile
standalone/oracle mode
known unsupported features
security exceptions
```

## 7. Preflight checks

Preflight should check:

```text
all expected mirror files exist
no stale legacy dist files are active
proof-obligation catalog validates
trust-boundary docs exist
package docs exist
standalone small subset smoke exists
release manifest exists
```

## 8. Package audit checks

Package audit should check:

```text
published package includes dist
published package includes README
published package includes trust docs
published package includes proof docs
package imports work from tarball
tarball hash recorded
```

## 9. Emergency rejection rule

If a soundness bug is found, the project may strengthen rejection immediately.

The release must document:

- bug vector;
- affected profile;
- behavior before;
- behavior after;
- compatibility impact;
- new negative smoke case;
- proof obligation impact.
