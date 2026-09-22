# 03 — Architecture Constitution

## 1. Purpose

This document prevents ProofScript from becoming spaghetti code while allowing fast development.

## 2. Architecture slogan

```text
Small profile first. Layered architecture forever.
```

## 3. Required package layers

The production architecture should converge to:

```text
packages/
  kernel/              trusted core checker
  kernel-codec/        serialized declarations, environments, certificates
  syntax/              source syntax data model
  parser/              command-by-command parser
  macro/               macro/syntax expansion model, later profile
  elaborator/          syntax -> kernel core declarations
  semantic-ir/         checked semantic snapshots
  recursion/           structural/well-founded recursion elaboration
  typeclass/           explicit dictionary now, search later
  backend-lean/        Lean source/output backend
  backend-typescript/  executable TypeScript/JavaScript backend
  runtime/             runtime values preserving ProofScript semantics
  verifier/            replay/check/certify/audit
  certificates/        certificate schemas and manifests
  cli/                 psc command surface
  lsp/                 editor integration
  std/                 standard library source and core artifacts
  conformance/         fixtures, snapshots, differential evidence
```

Names may vary, but responsibilities must remain separated.

## 4. Dependency direction

Allowed direction:

```text
syntax -> shared primitives only
parser -> syntax
macro -> syntax + parser state
elaborator -> syntax + macro + kernel + recursion + typeclass
semantic-ir -> kernel + elaborator snapshots
backend-lean -> semantic-ir
backend-typescript -> semantic-ir + runtime
verifier -> kernel + kernel-codec + certificates
cli -> parser + elaborator + verifier + compiler/backends
lsp -> parser + elaborator diagnostics + semantic snapshots
kernel -> no parser/compiler/lsp/runtime dependency
```

Forbidden:

```text
kernel -> parser
kernel -> compiler
kernel -> runtime
kernel -> lsp
kernel -> CLI
kernel -> backend-typescript
parser -> backend-typescript
runtime -> kernel
```

## 5. Kernel boundary

The kernel checks core declarations. It must not perform:

- source parsing;
- tactic search;
- general elaboration;
- typeclass search;
- user syntax disambiguation;
- JS code generation;
- source-level termination search.

The kernel may perform:

- core type inference;
- definitional equality;
- WHNF/reduction;
- declaration admission;
- primitive validation;
- inductive/recursor validation for supported shapes;
- replay/certificate checks.

## 6. Parser boundary

The parser produces syntax. It must not decide theorem truth or backend meaning.

PSC-1 parser may be small and mostly fixed.

Full ProofScript parser must eventually become command-by-command and dynamic.

## 7. Elaborator boundary

The elaborator is responsible for turning source syntax into kernel core.

It owns:

- implicit argument insertion;
- expected type propagation;
- simple unification/metavariables;
- pattern compilation;
- recursion elaboration;
- proof tactic elaboration;
- dictionary/typeclass elaboration;
- source diagnostics.

The elaborator is not trusted unless its output is independently checked by the kernel.

## 8. Backend boundary

Backends compile checked executable declarations.

Backends must not define source semantics. If backend output disagrees with kernel meaning, backend output is wrong.

## 9. Runtime boundary

The runtime implements executable value semantics for JavaScript/TypeScript.

Runtime representations must be documented. Examples:

```text
Nat -> nonnegative bigint wrapper or canonical bigint discipline
Int -> bigint
Bool -> boolean
Unit -> singleton/null convention
Option -> tagged value
List -> tagged value or verified array-backed encoding
String -> documented Unicode boundary
```

## 10. Anti-spaghetti rules

Forbidden:

- large “god files” that mix parser, elaborator, kernel, and backend;
- direct JS emission from parser;
- kernel accepting source AST directly;
- duplicating semantic logic across CLI/LSP/compiler;
- hidden global mutable state for parser or environment;
- package cycles;
- compatibility shims that silently accept unsupported behavior;
- unchecked artifact mutation.

## 11. Migration rule

Legacy code may be preserved only as:

```text
legacy/
```

or explicit reference packages.

There must be exactly one active default kernel.

## 12. Public API rule

Every package must publish a small public API. Internal helpers should not leak as cross-package contracts.

Breaking public APIs requires a decision record and migration note.
