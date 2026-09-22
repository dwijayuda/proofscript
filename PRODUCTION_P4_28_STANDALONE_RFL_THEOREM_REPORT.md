# Production P4.28 — Standalone PSC-1 `by { rfl }` Theorem Smoke

## Status

Accepted as a fast smoke-test development milestone.

Trust label remains:

```txt
trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet
```

## Goal served

Move ProofScript from a standalone executable Nat subset toward a standalone programming-language-and-theorem-prover subset without requiring Lean4.

This phase adds the first tiny proof-script surface accepted by the live `.ps` path:

```ts
theorem two_eq_two: 2 = 2 := by { rfl };
example: add2(2) = 4 := by { rfl };
```

## Implementation changes

- Added `SurfaceTerm` tag `rflProof`.
- Added parser support for theorem/example proof blocks of exactly `by { rfl }`.
- Kept general `by` tactic syntax unsupported outside theorem/example proof position.
- Added elaboration of `rflProof` using the expected Eq target type.
- The elaborator now checks that:
  - an expected type exists;
  - the target is canonical propositional equality `Eq`;
  - both equality sides are definitionally equal;
  - the Eq universe matches the operand type universe;
  - Eq/Eq.refl are already available from the checked bootstrap prelude.
- Generated proof term is `Eq.refl` applied to the operand type and left side.
- Updated standalone smoke source to include a theorem and example.
- Updated standalone smoke to reject a bad `rfl` theorem (`2 = 3`).
- Updated PSC-1 runtime status metadata to report theorem/example `by { rfl }` support.

## Fail-closed boundaries

Still unsupported:

- arbitrary tactic scripts;
- `by { exact ... }`;
- `by { intro ... }`;
- `rw`, `simp`, `apply`, `cases`, `induction`;
- theorem automation;
- holes/metavariable proof search;
- full Lean tactic compatibility.

Unsupported behavior rejects instead of being silently accepted.

## Commands run

```bash
npm install --ignore-scripts --silent
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-28.js --json
node artifacts/standalone-small-main-p4-28.js
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

## Verification result

```txt
build: PASS
kernel smoke: PASS
standalone small smoke: PASS
governance check: PASS
preflight: PASS
pslive check: PASS
pslive build-js: PASS
generated JS execution: PASS
pslive run add2(5): 7
```

## Evidence

```txt
governanceSha256=443196cbe8d6a78e5b04b1f96b8634c65ef8974c4f8bf5a05ff74bc1f79a4095
preflightSha256=f9750451b73d101d07a87344e63b48123c8913aee17465d14127606538bb3cff
standalone source semanticSha256=75451c0cbcec50ab5687f35bd628e1daa18fc8a82e0b285833bc8d759a991f48
standalone JS outputSha256=09ce07f2e16645cfbccea55e8bc5324bfdb6c2d28c3c0722cac63d14cc0439bb
```

## Progress toward goals

```txt
Standalone PSC-1 executable subset without Lean4: live and slightly deeper
Standalone PSC-1 theorem prover subset without Lean4: first proof construct live (`by { rfl }`)
Small PSC-1 goal: ~38% complete
Standalone no-Lean4 small subset goal: ~68% complete
Full ProofScript compiler: ~38% complete
Full Lean-like ProofScript without Lean4: still long-term
Formal Lean4 equivalence: not proven
```

## Next recommended milestone

Add `by { exact term }` and direct proof-term theorem examples. This is the next smallest theorem-prover step after `rfl` and stays aligned with fast smoke-test development.
