# @proofscript/reference-v061

Independent executable reference frontend for the immutable ProofScript Language Reference v0.6.1 conformance corpus.

## Independence rule

This package has zero dependencies on the production ProofScript parser, syntax AST, elaborator, frontend, compiler, or kernel.

That separation is intentional:

- normative C1 requires a reference frontend to accept/reject the corpus;
- normative C2 requires that reference frontend to emit the expected canonical Lean;
- importing the production parser would reduce C1/C2 to self-comparison.

## Scope

The implementation covers the registered v0.6.1 conformance surface needed by the normative corpus. It is an executable specification, not the production compiler and not a Lean replacement.

Unknown/unregistered forms fail closed.

## API

parseAndLowerReferenceV061(source) returns either:

- an accepted feature-tagged lowering result; or
- a structured reference error code and source offset.

Accepted results expose canonical Lean text, relation kind, encountered feature IDs, and source-map evidence level.

## Non-claims

C1/C2 are implementation-conformance checkpoints. They do not establish S2/S3 proof claims, full Lean parser compatibility, or production compiler correctness.
