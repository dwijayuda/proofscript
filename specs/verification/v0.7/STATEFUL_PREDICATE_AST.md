# Stateful Predicate AST v1

Status: **bounded typed normalized-predicate AST; WP/Triple semantic binding incomplete**

Schema:

```text
proofscript.stateful-predicate-ast/v1
```

Grammar profile:

```text
stateful-predicate-expressions0
```

This artifact is downstream of `proofscript.stateful-predicate-elaboration/v1`. It parses the already-normalized stateful postcondition predicate, not arbitrary ProofScript source. It is intentionally **not** a second general-purpose ProofScript parser or typechecker.

## Current grammar

The bounded profile currently covers the forms needed by the promoted monadic corpus:

- program parameters and explicit `__ps_entry`, `__ps_result`, `__ps_final` binders;
- descriptor-bound state observation calls after explicit state-argument insertion;
- natural-number, boolean, and string literals;
- grouping parentheses;
- arithmetic `+`, `-`, `*` over matching supported numeric types;
- proposition equality `=` and `==`;
- proposition inequality `!=`;
- ordering `>`, `>=`, `<`, `<=` over matching supported numeric types;
- Lean proposition negation `¬`;
- Lean proposition conjunction `∧`;
- Lean proposition disjunction `∨`, with precedence `¬` > relation > `∧` > `∨`.

Unsupported tokens or forms fail closed for the strict structural profile instead of falling through to an untyped string.

## Type rules

The AST binds identifier types from the program parameters and typed stateful predicate elaboration artifact.

Descriptor observations are interpreted using their normalized full argument list:

```text
descriptor: balanceOf : AccountId -> Bank -> Nat
normalized call: balanceOf(from, __ps_final)
```

The AST checks arity and argument types. Equality/inequality operands must have matching types. Ordering and arithmetic require compatible numeric operands. `¬` requires one `Prop` operand; `∧` and `∨` require two `Prop` operands. Lean emission normalizes `==` to `=` and `!=` to `≠`, while proposition connectives retain their Lean meanings. A successfully checked requirement/postcondition/frame root must have type `Prop`.

## Profile boundary

For `ps3-monadic-contracts0`:

- unsupported AST syntax produces `stateful-predicate-ast-unsupported`;
- definite AST type errors produce `stateful-predicate-ast-type-mismatch`;
- either condition prevents strict-profile admission.

This is stronger than source normalization, but it remains a structural/type staging claim.

## Explicit non-claims

Even when:

```text
typeCheckingComplete = true
```

for `stateful-predicate-expressions0`, the project still does **not** claim:

- arbitrary ProofScript/Lean expression elaboration;
- JavaScript/TypeScript truthiness or `&&`/`||` proposition semantics;
- definitional equality beyond the bounded syntactic type rules;
- WP/Triple semantic binding;
- state-model runner adequacy;
- verification-condition generation;
- vcgen/mvcgen discharge;
- checked proof terms;
- backend runtime correspondence.

The artifact therefore retains:

```text
wpTripleSemanticBindingComplete = false
stateModelAdequacyChecked = false
verificationConditionsGenerated = false
semanticProofDischarge = false
```

The typed AST is now consumed by the state-model WP/Triple and generated Lean VC pipeline for the bounded stateful profile. Concrete proof discharge remains evidence-based per generated theorem and Lean lane. The next expression work should expand only when required by Product v1 examples, rather than turning this artifact into a second general-purpose ProofScript frontend.
