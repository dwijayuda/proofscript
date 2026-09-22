# 07 — Package and Module Rules

## 1. Purpose

ProofScript packages must stay modular so PSC-1 can grow into full ProofScript without rewrites.

## 2. Package categories

### Trusted packages

Trusted packages are part of the trust boundary.

Examples:

```text
kernel
kernel-codec
certificates
verifier
runtime core representations
```

Trusted packages require stricter validation, deterministic outputs, and proof obligations.

### Untrusted frontend packages

Examples:

```text
parser
macro
elaborator
formatter
LSP
CLI source conveniences
```

They may be wrong, but their output must be checked by the kernel/replay path.

### Backend packages

Examples:

```text
backend-typescript
backend-lean
runtime
```

Backends must preserve semantics for the executable subset and must not define source meaning.

## 3. Module imports

PSC-1 supports simple modules first:

```ts
module My.Project

import Std.Nat
import Std.List
```

Module resolution must be deterministic.

## 4. Artifact modules

A checked module artifact should include:

```text
module name
imports
exported declarations
checked declarations
prelude profile
semantic hash
certificate hash
```

## 5. npm package policy

ProofScript packages may be distributed through npm.

A package may contain:

```text
.ps source
.pscore.json checked core artifacts
.pscert.json certificates
generated .ts/.js output
proof-obligation metadata
semantic snapshots
```

## 6. Package trust policy

Installing a package does not automatically trust it.

A package is trusted only when:

1. its certificate verifies;
2. its core artifact replays;
3. its declared semantic baseline matches the consuming project;
4. unsupported features are compatible;
5. hash/certificate checks pass.

## 7. Public API policy

Each package must expose a small public API.

Package internals must be imported only through package-local paths.

Cross-package deep imports are forbidden unless explicitly documented.

## 8. Dependency cycle ban

Package cycles are forbidden.

The kernel package must remain at the bottom of the trusted stack.

## 9. Legacy package policy

Legacy packages must be marked clearly:

```text
legacy/
packages/*-legacy/
```

Legacy code may not be imported by active trusted packages except through an explicit migration adapter that fails closed.

## 10. Standard library policy

`std` should be built in layers:

```text
Std.Core
Std.Nat
Std.Bool
Std.Unit
Std.Eq
Std.Option
Std.List
Std.Result
Std.String
Std.Array
Std.Function
Std.Proof
```

Each standard module must have:

- source file;
- core artifact;
- certificate;
- smoke fixture;
- proof obligations;
- backend runtime mapping if executable.
