# 04 — Trust Boundary and Proof Policy

## 1. Purpose

This document defines what ProofScript trusts, what it proves, and what it only tests.

## 2. Trust labels

Use these exact labels.

### trusted-boundary standalone kernel

Means the TypeScript kernel independently checks supported core declarations without Lean 4 at runtime.

Does not mean full Lean equivalence is proven.

### trusted-boundary standalone small subset

Means `.ps` source for PSC-1 subset can be parsed, elaborated, kernel-checked, and executed without Lean 4.

Does not mean full ProofScript or Lean compatibility.

### Lean-backed oracle mode

Means Lean 4 is used as parser/elaborator/checker/oracle.

Not standalone.

### formally proven equivalent

May be used only when a written proof exists and the proof obligation status is `proven`.

## 3. Trusted computing base

For PSC-1 standalone mode, the TCB includes:

```text
TypeScript kernel source
kernel-codec validation
certificate validation
runtime representation for executed values
Node.js / JS engine assumptions
build/package integrity assumptions
```

The TCB does not include:

```text
parser correctness, unless independently checked by replay
elaborator correctness, unless independently checked by replay
backend correctness, unless proven or tested against snapshots
LSP/editor behavior
formatting
human-readable reports
```

## 4. Kernel acceptance rule

A declaration may enter the trusted environment only if:

1. its shape is validated;
2. all referenced constants are known;
3. universe arguments are valid;
4. its type is a type/sort/proposition as appropriate;
5. its value checks against its type when a value exists;
6. unsupported constructs reject;
7. generated declarations are either fully typed or fail closed on use.

## 5. Replay rule

`psc verify` or `pskernel replay` must mean:

```text
The checker rechecked serialized declarations.
```

It must not mean:

```text
The compiler previously said success.
```

## 6. Certificate rule

A certificate must include:

```text
format version
ProofScript reference version
implementation profile
semantic baseline
prelude profile
checked declarations
semantic hash
proof-obligation catalog hash
trust label
unsupported feature list
```

A certificate is invalid if any referenced artifact is malformed or inconsistent.

## 7. Proof obligation rule

Every semantic feature must create proof obligations.

Examples:

```text
Sort cumulativity correctness
beta reduction correctness
zeta reduction correctness
delta transparency correctness
recursor type synthesis correctness
iota reduction correctness
proof irrelevance correctness
quotient computation correctness
parser elaboration preservation
JS backend semantic preservation
runtime representation correctness
```

## 8. Obligation statuses

Use exact statuses:

```text
not-started
informal-spec
mirrored
lean-proof-target
proof-in-progress
proven
rejected
retired
```

`proven` requires a linked proof artifact.

## 9. Test policy

Tests are required, but they are not proofs.

Allowed fast tests:

```text
build check
import smoke
kernel smoke
parser smoke
elaborator smoke
backend smoke
CLI smoke
replay/certificate smoke
package/tarball smoke
negative fail-closed smoke
```

Do not build huge test suites as a substitute for proof obligations.

## 10. Fail-closed rule

When unsure, reject.

Examples of required fail-closed behavior:

```text
unknown constants
bad universe arity
unresolved metavariables
free variables in declarations
unsupported recursors
unsupported indexed families
unsupported macros
unsupported tactics
unsupported backend terms
malformed replay artifacts
non-pinned semantic baseline
```

## 11. Overclaiming ban

The project must not claim:

```text
full Lean compatibility
full Lean kernel equivalence
complete theorem prover
complete compiler correctness
complete JS semantic preservation
complete macro/tactic compatibility
```

unless the release evidence and proof obligations support the exact claim.
