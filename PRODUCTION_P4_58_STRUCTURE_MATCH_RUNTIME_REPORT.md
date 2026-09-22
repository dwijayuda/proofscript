# Production P4.58 — Executable Single-Constructor Structure Match

Status: **accepted trusted-boundary slice**.

This phase adds executable JS backend coverage for PSC-1 matches over parameterless single-constructor source structures after they have already elaborated to checked Core recursor applications. It does **not** add general Lean match compilation or multi-constructor user-inductive runtime emission.

## Scope

Implemented bounded structure destructuring of the form:

```proofscript
function matchPointX(p: Point): Nat := {
  match (p) {
    | Point.mk x y => x
  }
}
```

The frontend already elaborates this form to a checked `Point.rec` Core application. P4.58 adds backend/runtime execution for that already-checked Core shape.

## Changes

- Added focused regression test: `tools/structure-match-runtime-tests.ts`.
- Added npm script: `npm run test:structure-match-runtime`.
- Added runtime helper: `Struct_rec`.
- Added backend recursor collection for parameterless/indexless single-constructor inductives.
- `Point.rec motive branch scrutinee` now emits to a validated frozen-record recursor call.
- Runtime validates constructor owner, constructor index, and field arity before applying the curried branch.
- Multi-constructor user-inductive match JS emission remains fail-closed.
- Updated standalone-small smoke, reference governance smoke, runtime feature manifest, proof obligations, and example source.

## TDD

RED:

```txt
node tools/pslive.ts build-js StructMatchRuntime.ps --out StructMatchRuntime.js --json
=> rejected: unsupported executable Core constant 'Point.rec'
```

GREEN:

```txt
STRUCTURE_MATCH_RUNTIME=PASS
matchedX => 1
matchedY => 2
multi-constructor user-inductive JS match emission rejects
```

## Trust boundary

This is trusted-boundary implementation evidence only. It does not prove equivalence to Lean 4's full recursor semantics. It is limited to parameterless/indexless single-constructor structures/inductives whose source terms have already passed the existing kernel checker.

Unsupported forms remain outside the executable PSC-1 subset:

- multi-constructor user-inductive JS match emission,
- dependent motives at runtime,
- indexed inductive recursors,
- parameterized structures,
- arbitrary JavaScript object destructuring,
- full Lean pattern compilation.
