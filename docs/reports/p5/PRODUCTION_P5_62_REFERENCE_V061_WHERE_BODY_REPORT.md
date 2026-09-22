# Production P5.62 Reference v0.6.1 Where Body Report

P5.62 continues PSC-1 conformance against the v0.6.1 compiler-ready language reference. It adds parser support for the admitted E-WHERE-BODY spelling:

```proofscript
function addViaWhere(x : Nat, y : Nat) : Nat := helper(x, y) where {
  helper(a : Nat, b : Nat) : Nat := a + b;
};
```

The supported slice is intentionally bounded: local where helpers may reference earlier helpers, but self-recursive, mutual, later-helper, and nested where helper definitions remain fail-closed. The parser lowers the supported form to existing local `let` and lambda SurfaceTerm nodes, so elaboration, Core checking, and JS/TypeScript execution all reuse existing checked paths.

Evidence:

- `tools/pslive-reference-v061-where-tests.ts` checks source parsing, Core checking, JS execution, TypeScript compilation, theorem reduction, and negative fail-closed behavior.
- `packages/parser/src/whereBodyParser.ts` owns the bounded local where parser/lowering logic.
- `packages/parser/src/index.ts` delegates expression-bodied declaration `where` tails to the extracted parser.
- `config/feature-promotion-gate.json`, `config/verification-matrix.json`, `config/development-workflow.json`, and `config/production-traceability-bundle.json` link the feature to release evidence.

No kernel source changed. P5.62 remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.
