# P4.36 — PSC-1 Local Let/Have Def-Body Sequencing

**Date:** 2026-09-11  
**Scope:** Standalone small ProofScript subset without Lean4  
**Reference baseline:** ProofScript Language Reference v0.2.1 / Grammar v0.2.1, pinned to Lean 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`  
**Trust label:** trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet

## Summary

P4.36 promotes local `let` / `have` def-body sequencing into the reference-governed PSC-1 working language. The implementation already had Core-level `let` support and parser/elaborator skeleton support. This milestone makes it a visible, tested, documented, and regression-protected feature.

## Implemented Surface

```ts
def six: Nat := {
  let x: Nat := add2(2);
  add2(x)
}

def inferredLet: Nat := {
  let x := 2;
  add2(x)
}

def haveValue: Nat := {
  have x: Nat := 2;
  add2(x)
}
```

## Semantics

- `let` inside a `{ ... }` def body parses as a `defBodyPrelude` followed by mandatory body-sequence `;`.
- The final body term must not have a trailing body-level semicolon.
- Typed and inferred local bindings lower to checked Core `let` terms.
- `have` in a def-body prefix is treated as a nondependent local binding in this PSC-1 slice.
- JS emission lowers Core `let` to an IIFE-local `const` binding.
- Kernel checking validates local binding types and final result type.

## Positive Smoke

- `six` computes to `6`.
- `inferredLet` computes to `4`.
- `haveValue` computes to `4`.
- `theorem six_eq_six: six = 6 := by { rfl }` is accepted.
- `theorem inferred_let_eq_four: inferredLet = 4 := by { rfl }` is accepted.
- `theorem have_value_eq_four: haveValue = 4 := by { rfl }` is accepted.

## Negative Smoke

- `let x: Bool := 1` is rejected through kernel/type checking.
- A trailing final body semicolon after the final term is rejected:

```ts
def bad_let_final_semicolon: Nat := {
  let x: Nat := 1;
  x;
}
```

## Boundaries

Still fail-closed:

- local function binder sugar;
- `let rec`;
- arbitrary term-level `let` outside the PSC-1 def-body sequence form;
- proof-local `have` inside tactic blocks;
- full Lean tactic and parser semantics.

## Fresh Verification Evidence

```text
npm run build -- --pretty false: PASS
npm run test:fast-smoke: PASS
node tools/pskernel.ts preflight: PASS checks=29 warnings=0 failures=0
node tools/pskernel.ts package-audit: PASS checks=26 failures=0
node tools/pskernel.ts release-manifest: PASS checks=9 failures=0
node tools/pskernel.ts tarball-smoke: PASS checks=8 failures=0
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json: PASS declarations=35
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call six --json: PASS result=6
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call haveValue --json: PASS result=4
```

## Progress Estimate

| Goal | Practical Progress |
|---|---:|
| Standalone PSC-1 without Lean4 | ~84% |
| PSC-1 small complete programming language | ~51% |
| PSC-1 small theorem prover | ~51% |
| Full ProofScript compiler | ~47% |
| Full Lean-like ProofScript without Lean4 | ~9% |
| Formal Lean 4 equivalence | 0 proven obligations |

## Next Best Step

Add proof-local `have` inside `by { ... }` blocks, then Option values and simple match/elimination smoke.
