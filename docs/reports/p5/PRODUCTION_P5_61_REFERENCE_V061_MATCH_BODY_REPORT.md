# Production P5.61 Reference v0.6.1 Match Body Report

## Summary

P5.61 continues PSC-1 conformance against the v0.6.1 compiler-ready language reference. It adds parser support for the admitted E-MATCH-BODY spelling:

```proofscript
match value with {
  | .none => fallback;
  | .some x => x;
}
```

The feature preserves the existing legacy `match (value) { ... }` spelling for older PSC-1 tests, consumes optional semicolons after case bodies inside the match block, and rejects call-style constructor pattern sugar such as `.some(x)` because v0.6.1 keeps patterns Lean-spaced.

## Implementation

- `packages/parser/src/index.ts` accepts unparenthesized `match value with { ... }` in addition to legacy parenthesized match.
- `packages/parser/src/patternParser.ts` rejects match pattern call sugar while leaving equation-pattern parsing unchanged.
- `tools/pslive-reference-v061-match-tests.ts` checks source parsing, Core checking, JS execution, TypeScript compilation, theorem reduction, and negative fail-closed behavior.
- `packages/elaborator/src/termElaboration.ts` now owns recursive SurfaceTerm dispatch, leaving `packages/elaborator/src/index.ts` as public API wiring.

## Verification

The focused test was written before implementation and initially failed with `expected '(' at offset 75, found 'value'`. After implementation it passed with `PSLIVE_REFERENCE_V061_MATCH=PASS`.

## Trust Boundary

No kernel source changed. P5.61 remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.
