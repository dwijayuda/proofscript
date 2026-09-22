# P4.51 — Lean-style Constructor Pattern Binders

Status: accepted smoke-tested trusted-boundary slice.

Trust label: trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.

## Scope

P4.51 adds Lean-style constructor pattern binders for the PSC-1 match subset:

```proofscript
function predLeanStyle(n: Nat): Nat := {
  match (n) {
    | 0 => 0
    | Nat.succ k => k
  }
}

function predShortSucc(n: Nat): Nat := {
  match (n) {
    | 0 => 0
    | succ k => k
  }
}
```

The implementation parses space-separated constructor pattern binders and resolves an unqualified constructor name by the scrutinee type when that constructor belongs to the matched inductive. It does not introduce JS-only pattern semantics: the elaborator still lowers the accepted match into checked recursor applications.

## TDD result

RED:

```text
node tools/pslive.ts check /tmp/LeanStyleSuccPattern.ps --json
=> rejected: expected '=>' ... found 'k'
```

GREEN:

```text
Nat.succ k accepts, elaborates, verifies rfl examples, and executes through the existing Nat.rec runtime path.
succ k accepts by scrutinee-type-scoped constructor resolution.
duplicate/over-arity pattern binders reject.
```

## Implementation notes

- `packages/parser/src/index.ts`
  - accepts parenthesized pattern binders as before: `Nat.succ(k)`
  - additionally accepts Lean-style space binders: `Nat.succ k`
  - rejects duplicate binder names in either style

- `packages/elaborator/src/index.ts`
  - resolves unqualified constructor patterns by the matched inductive type when possible, e.g. `succ k` in a `Nat` match resolves to `Nat.succ`.

- `packages/runtime/src/index.ts`
  - runtime manifest documents the new supported PSC-1 match slice.

- `tools/pslive-smoke-lib.ts`
  - positive executable smoke for `Nat.succ k` and `succ k`
  - rfl theorem smokes for both forms
  - negative smokes for duplicate and over-arity constructor pattern binders

- `tools/reference-language-governance-smoke.ts`
  - reference-governed positive and negative checks for the new syntax.

- `examples/standalone-small/src/Main.ps`
  - includes `predLeanStyle`, `predShortSucc`, and their rfl theorems.

- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
  - adds `ProofScript.Frontend.Match.LeanStyleConstructorPatternBinders`.

## Verified commands

```text
npm run build -- --pretty false
npm run test:standalone-small
npm run test:reference-governance
npm run test:kernel:smoke
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-51.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call predLeanStyle --args 0 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call predLeanStyle --args 3 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call predShortSucc --args 0 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call predShortSucc --args 3 --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p51tar-smoke-final
```

Observed results:

```text
build: PASS
standalone-small: PASS, checkedDeclarations=55
reference-governance: PASS, checks=40
kernel smoke: PASS
governance: PASS, checks=27, warnings=0, failures=0
example check: accepted, declarations=60
example build-js: accepted
predLeanStyle(0): 0
predLeanStyle(3): 2
predShortSucc(0): 0
predShortSucc(3): 2
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
```

## Boundary

This is not full Lean pattern matching. The accepted shape remains bounded to the PSC-1 single-discriminant, parameterless/indexless constructor-match subset. Nested patterns, typed patterns, as-patterns, inaccessible patterns, dependent pattern matching, multiple discriminants, and full Lean elaboration remain fail-closed.

## Progress estimate

```text
Standalone PSC-1 without Lean4: ~94.2%
PSC-1 small complete programming language: ~62.0%
PSC-1 small theorem prover: ~59.5%
Full ProofScript compiler: ~55.0%
Full Lean-like ProofScript without Lean4: ~11.4%
Formal Lean 4 equivalence: 0 proven obligations
```
