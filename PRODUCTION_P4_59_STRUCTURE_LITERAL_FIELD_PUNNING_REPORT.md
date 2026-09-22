# P4.59 — Structure Literal Field Punning Evidence

Status: trusted-boundary / not formally equivalent to Lean 4.

## Goal

Promote PSC-1 structure literal field punning into explicit release evidence:

```proofscript
function mkLiteralPunnedPoint(x: Nat, y: Nat): Point := {
  {x, y}
}
```

This is frontend syntax for:

```proofscript
{x := x, y := y}
```

The punned identifiers are resolved and type-checked normally by the elaborator. JavaScript emission still happens only after Core checking.

## TDD

RED:

```text
npm run test:structure-literal-field-punning
=> AssertionError: runtime feature manifest must explicitly list checked structure literal field punning
```

GREEN:

```text
STRUCTURE_LITERAL_FIELD_PUNNING=PASS
```

## Implemented

- Added `tools/structure-literal-field-punning-tests.ts`.
- Added `npm run test:structure-literal-field-punning`.
- Added explicit runtime supported-feature entry.
- Documented parser field-punning behavior in `packages/parser/src/index.ts`.
- Added smoke/example declarations:
  - `mkLiteralPunnedPoint`
  - `literalPunnedPoint`
  - `literalPunnedX`
  - `literalPunnedY`
- Added rfl theorem smoke:
  - `literal_punned_x_eq_four`
  - `literal_punned_y_eq_five`
- Added reference-governance checks for acceptance, emission, execution, and fail-closed negatives.
- Added proof obligation `ProofScript.Frontend.Structure.LiteralFieldPunning`.

## Supported subset

- Expected-type-directed structure literals.
- Known parameterless single-constructor PSC-1 source structures.
- Same-name punned field values only.

## Fail-closed boundary

- Missing punned value identifiers reject.
- Wrong punned value types reject.
- Duplicate and unknown fields continue to reject.
- Dependent/parameterized structure elaboration remains outside this PSC-1 slice.
- Dynamic JavaScript object literal semantics are not introduced.

## Proof status

No formal Lean equivalence proof was added. This phase adds trusted-boundary implementation and release evidence only.
