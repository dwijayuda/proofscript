# P5.60 Reference v0.6.1 Declaration Forms Report

P5.60 replaces the primary ProofScript language reference with the uploaded `proofscript-language-reference-v0.6.1` compiler-ready package and implements the admitted v0.6.1 expression-bodied declaration forms in the PSC-1 parser.

## Scope

Implemented frontend support:

- `const answer : Nat := 42;`
- `function add(x : Nat, y : Nat) : Nat := x + y;`
- `def mul(x : Nat, y : Nat) : Nat := x * y;`
- `if (x > y) { x } else { y }`

The parser lowers these forms to the existing checked Core representation. Backend JS/TS emission remains available only after Core checking. The existing legacy checked block spelling `:= { term }` remains accepted to avoid breaking the current PSC-1 corpus, but v0.6.1 is now the primary reference target.

## Reference replacement

Primary reference files now checked into `docs/reference/`:

- `docs/reference/ProofScript_Language_Reference_v0.6.1_authoritative_draft.md`
- `docs/reference/ProofScript_Feature_Registry_v0.6.1.json`
- `docs/reference/ProofScript_Parser_Lowering_API_Contract_v0.6.1.md`
- `docs/reference/proofscript-language-reference-v0.6.1/`

The old v0.2.1 primary reference files were moved under `docs/reference/legacy/` so they are no longer the current authoritative reference.

## Tests

Focused test:

- `tools/pslive-reference-v061-declaration-tests.ts`

The red run failed before implementation with `expected '{' ... found '42'`, proving the test covered the old parser behavior. The green run checks parser acceptance, Core emission, JS execution, TypeScript emission/typechecking, and negative diagnostics for invalid const/function/return-like forms.

## Kernel impact

No kernel source changed. No new primitive reduction rule was introduced.

## Trust boundary

The result remains K3-TB trusted-boundary only. It is not fully formal K3 and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.
