# ProofScript v0.6.1 Compiler-Ready Conformance Assets

These files are copied from the authoritative `proofscript-language-reference-v0.6.1-compiler-ready` package.

The prose language reference already exists at:

```text
specs/language/ProofScript_Language_Reference_v0.6.1.md
```

This directory retains the machine-readable part of the compiler-ready package so the production frontend can be tested against the declared reference rather than only historical implementation tests.

## Files

- `feature-registry.json` — registered v0.6.1 surface features;
- `feature-registry.schema.json` — registry schema;
- `cases/positive.jsonl` — specified positive source cases;
- `cases/negative.jsonl` — specified negative source cases;
- `cases/lowering.jsonl` — canonical source-to-Lean lowering relations;
- `expected/positive-lowerings.lean` — readable expected Lean corpus.

## Status

These assets retain their original v0.6.1 metadata, including the historical Lean 4.33.1 semantic/reference baseline and S1 claim ceiling. Importing them into the repository does **not** upgrade the implementation to C1/C2/C3 automatically.

PS2 must run the corpus against the production frontend and record actual conformance evidence.
