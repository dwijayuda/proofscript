# @proofscript/formatter

Product-layer canonical formatter for ProofScript source.

The formatter reuses the canonical `@proofscript/parser` tokenizer/parser and does not
implement a second language grammar. v1 is deliberately conservative:

- it rewrites whitespace only;
- string literals are re-escaped through the standard ProofScript escape set;
- it verifies that the formatted source has the same canonical token stream;
- Lean-compatible comments (`--` and `/- ... -/`) are rejected rather than silently
  removed until trivia-preserving formatting is implemented.

The formatter is not proof authority and cannot change kernel acceptance.
