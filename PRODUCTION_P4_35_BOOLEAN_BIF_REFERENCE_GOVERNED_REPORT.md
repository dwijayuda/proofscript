# P4.35 — Boolean `bif` Reference-Governed PSC-1 Slice

## Summary

P4.35 adds the first reference-governed conditional expression to the standalone PSC-1 implementation: Boolean-only `bif (b) { then } else { else }`.

This intentionally does **not** implement ordinary `if`. In the v0.2.x reference, ordinary `if` is proposition/`Decidable`-based. PSC-1 does not yet implement Decidable/typeclass elaboration, so ordinary `if` remains fail-closed.

## Implemented Surface

```ts
function choose(b: Bool): Nat := {
  bif (b) { 1 } else { 2 }
}

function not(b: Bool): Bool := {
  bif (b) { false } else { true }
}

theorem choose_true_eq_one: choose(true) = 1 := by { rfl }

theorem choose_false_eq_two: choose(false) = 2 := by { rfl }
```

## Semantics

- Parser recognizes `bif (condition) { thenBranch } else { elseBranch }` as an expression.
- Elaborator requires the condition to check as `Bool`.
- Elaborator requires an expected result type for both branches.
- Elaborator lowers to `Bool.rec` with branch order matching Lean's false/true recursor arguments.
- Kernel checks the constructed Core term.
- Backend emits JavaScript conditional code for executable definitions.

## Negative Boundaries

- Ordinary `if` remains rejected in PSC-1 standalone mode until proposition/`Decidable` elaboration exists.
- Mismatched branch result types are rejected.
- General branch type synthesis is deferred; `bif` requires an expected type.
- No full Lean `if`/`dite`/`if let` coverage is claimed.

## Verification

Fresh verification command group for this milestone:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pskernel.ts tarball-smoke
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call choose --args true --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call choose --args false --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call not --args true --json
```

## Trust Label

trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet
