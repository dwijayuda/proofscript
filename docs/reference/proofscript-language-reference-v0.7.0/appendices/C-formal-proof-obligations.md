# Appendix C — Formal Proof Obligations

Status: **Formal plan appendix v0.7.0**

The central S2/S3 theorem targets must begin from source and must not hide Lean acceptance inside parser definitions.

## C.1 Main source theorem shape

```lean
theorem parsed_derivable_source_has_lean_derivation
    (Γ : PSEnv)
    (src : String)
    (out : PSProgram)
    (hParse : ReferenceFrontendParses Γ src out)
    (hDeriv : PSDerivable Γ out) :
    LeanDerivable (lowerEnv Γ) (lowerProgram out)
```

`ReferenceFrontendParses` means parsing/classification only. It MUST NOT contain the conclusion of Lean acceptance. `PSDerivable` must be defined by the named ProofScript semantic/lowering relation, not by assuming the theorem conclusion.

## C.2 D-CALL obligations

```text
parse_adjacent_call
parse_spaced_defer
parse_comment_breaks_adjacency
parse_nested_call_in_lambda
parse_nested_calls
lower_call_nil
lower_call_one
lower_call_two
lowerArgs_append
lower_call_append
lower_empty_call_unit
```

Cases:

```text
f(x)
f(x,y)
f()
f (x)
f (x,y)
f/*comment*/(x)
f(x)(y)
f(x) y
fun x => f(x)
g(f(x), h(y))
```

## C.3 Declaration alias obligations

```text
parse_const_alias
parse_function_alias
reject_const_with_params
reject_function_without_params
lower_const_to_def
lower_function_to_def
production_refines_reference_aliases
```

Cases:

```text
const answer : Nat := 42;
const increment : Nat -> Nat := fun x => x + 1;
function add(x : Nat, y : Nat) : Nat := x + y;
function identity {α : Type}(x : α) : α := x;
function answer : Nat := 42;                  rejected
const add(x : Nat, y : Nat) : Nat := x + y;   rejected
```

## C.4 E-class obligations

For every E-class feature:

```text
ExceptionParseCorrect(exceptionID)
ExceptionLowerCorrect(exceptionID)
ExceptionCompatibilityCostDeclared(exceptionID)
ProductionRefinesReference(exceptionID)
```

E-IF-BRACE requires:

```text
parse_e_if_brace
lower_e_if_brace
branch_is_single_term
native_if_still_accepted
reject_statement_block_branch
```

E-STRUCT-BODY requires:

```text
parse_e_structure_body
lower_structure_body_preserves_member_order
inner_implicit_field_binder_preserved
inner_instance_field_binder_preserved
reject_ambiguous_member_if_not_supported
```

E-MATCH-BODY requires:

```text
parse_match_body_exception
patterns_remain_native
lower_match_alt_order
rhs_uses_recursive_ps_terms
reject_call_syntax_in_pattern_position
```

## C.5 Production refinement

A TypeScript or Rust frontend is not proved correct merely because a Lean reference exists. S3 requires:

```text
production(source) R reference(source)
```

where `R` is one of:

```text
SyntaxEq
NormalizedSyntaxEq
ElabEq
```

The release must state the exact relation used.

## Conformance artifact obligations

v0.7.0 adds the following non-theorem but implementation-critical obligations:

```text
RegistryWellFormed
ConformanceCasesWellTypedAsData
EveryCaseFeatureIdRegistered
PositiveCasesHaveCanonicalLean
NegativeCasesHaveReason
ProductionCaseResultMatchesReference
```

These checks do not prove Lean soundness. They prevent an implementation from drifting away from the reference before formal proof work begins.
