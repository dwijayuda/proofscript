# ProofScript Standalone Kernel Maturity Replacement P4.73 — Boolean If Sugar

Status: **fast MVP slice accepted with limited verification**

## What changed

P4.73 adds PSC-1 direct Boolean `if` expression syntax:

```proofscript
function choose(b: Bool, x: Nat, y: Nat): Nat := { if b then x else y }
def a: Nat := { if true then 4 else 5 }
theorem a_eq: a = 4 := by rfl
```

The new syntax lowers to the existing checked `bif` / `Bool.rec` path. It does not introduce a new kernel primitive, proof rule, or trusted runtime rule.

## Boundary

This is direct Boolean control flow only. Proposition/Decidable `if` over arbitrary propositions remains outside PSC-1 until Decidable/typeclass elaboration is implemented.

This release remains **K3-TB trusted-boundary**, not fully formal K3, and not proven equivalent to the full Lean 4 kernel.

## Files changed

- `packages/parser/src/index.ts`
- `packages/parser/dist/index.js`
- `packages/parser/dist/index.d.ts`
- `packages/runtime/src/index.ts`
- `packages/runtime/dist/index.js`
- `packages/runtime/dist/index.d.ts`
- `tools/pslive-bool-if-tests.ts`
- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`
- `package.json`
- `README.md`

## Fast verification run

The user requested faster iteration with fewer tests, so only the focused and critical smoke checks were rerun.

```text
npm run build -- --pretty false        PASS
npm run test:pslive:bool-if           PASS
npm run test:standalone-small         PASS
npm run test:kernel:smoke             PASS
node tools/pskernel.ts status --json PASS, trusted-boundary / not-proven
```

Not rerun:

```text
npm run verify:k3tb:publish            NOT RERUN; still requires PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for faster iteration
npm run test:reference-governance:json NOT RERUN; patched for bool-if but not timed in this fast slice
```

## Progress ledger after P4.73

```text
Standalone PSC-1 without Lean4:                 ~97.1%
PSC-1 small complete programming language:      ~71.5%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~60.0%
Full Lean-like ProofScript without Lean4:       ~13.7%
Formal Lean 4 equivalence:                      0 proven obligations
```
