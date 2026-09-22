# Production P5.63 Reference v0.6.1 Structure Expression Bodies Report

P5.63 continues PSC-1 conformance against the v0.6.1 compiler-ready language reference. It adds parser support for expression-bodied declaration values that begin with structure literal/update braces after `:=`:

```proofscript
const pair : Pair := { fst := 20, snd := 22 };
function setFst(p : Pair, x : Nat) : Pair := { p with fst := x };
```

## Implementation

- `tools/pslive-reference-v061-structure-expr-tests.ts` checks parsing, Core checking, JS execution, TypeScript compilation, definitional theorem smokes, and negative fail-closed behavior.
- `packages/parser/src/definitionBodyParser.ts` owns the lexical disambiguation between legacy checked declaration-body blocks and v0.6.1 expression-bodied structure literals/updates.
- Existing structure literal/update/projection elaboration remains in the checked Core path; no backend shortcut or kernel source change is introduced.

## Trust boundary

No kernel source changed. P5.63 remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.
