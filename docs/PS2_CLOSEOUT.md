# PS2 Closure Report — ProofScript v0.6.1 Reference Conformance

Status: **complete**

PS2 was intentionally narrow: implement the independent executable reference frontend required by the normative v0.6.1 conformance appendix and earn C1/C2 without reusing the production parser.

## Completion evidence

| Requirement | Result |
|---|---|
| Independent reference frontend exists | PASS — `@proofscript/reference-v061` |
| Zero production ProofScript package dependencies | PASS |
| C0 corpus integrity remains green | PASS |
| C1 positive cases accepted | PASS — 12/12 |
| C1 negative cases rejected | PASS — 8/8 |
| C2 canonical Lean lowerings | PASS — 12/12 exact |
| C2 relation | `SyntaxEq` |
| Production surface corpus remains green | PASS — 20/20 |
| Package dependency classification | PASS |
| PS1 compiler/editor stack regressions | PASS |
| KA137 / KA140 / KA146 | PASS |

## Independence boundary

The reference package does not import:

- `@proofscript/syntax`
- `@proofscript/parser`
- `@proofscript/elaborator`
- `@proofscript/frontend`
- `@proofscript/compiler`
- `@proofscript/kernel`

It owns a deliberately small tokenizer/parser/lowerer for the immutable registered v0.6.1 corpus surface.

This is necessary so C1/C2 are reference evidence rather than production self-comparison.

## Claim discipline

This closure establishes the normative implementation-conformance checkpoints:

- **C0** — static corpus well formed;
- **C1** — reference frontend accepts/rejects all corpus cases as specified;
- **C2** — reference frontend emits canonical Lean matching the corpus.

It does **not** establish:

- C3 production frontend matches the reference frontend;
- C4 machine-checked reference theorems;
- S2/S3 semantic proof claims;
- full Lean parser coverage;
- full Lean kernel equivalence;
- runtime correspondence.

## Next milestone

PS3 should be only **C3 differential conformance**:

1. compare production and reference accept/reject decisions for the frozen corpus;
2. expose production canonical lowering for the registered cases;
3. compare production canonical Lean against reference canonical Lean;
4. surface mismatches as structured differential failures;
5. keep C0/C1/C2 and all product gates green.

Source maps, richer LSP features, v0.7 verification syntax, and broader frontend-next migration remain separate follow-up work unless directly required by C3.
