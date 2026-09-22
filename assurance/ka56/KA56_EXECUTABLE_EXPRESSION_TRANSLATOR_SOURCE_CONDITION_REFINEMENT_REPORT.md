# KA-56 Executable Expression Translator Source-Condition Refinement Report

Checkpoint: `proofscript-v1-ka56-executable-expression-translator-source-condition-refinement0`

Public version: `1.0.0-pskernel.59`

Baseline: `proofscript-v1-ka55-executable-expression-translator-substitution-refinement0`

## What changed

KA-56 promotes Lean4Lean's source-expression `FVarsIn` and `Closed` precondition surface into explicit ProofScript/PSKernel bridge wrappers. This complements KA-51 through KA-55, which covered direct expression constructors, binders, residual constructors, determinism/eqv transport, and VExpr substitution algebra. It still does not prove full executable expression translator refinement.

## Machine-checked bridge lemmas

- `translated_expr_fvars_mono_wf`
- `translated_expr_closed_mono_wf`
- `translated_expr_fvars_no_mvar_equiv_wf`
- `translated_expr_literal_constructor_closed_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-56 tool files: **2**
- New KA-56 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable expression translator refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**

## Arena wrapper timeout note

`TERM=xterm npm run verify:arena` timed out during its internal tutorial rerun and is recorded as **timed-out-not-counted**. The timed-out tail commands were rerun individually and passed: `test:arena:tutorial`, `test:arena:recursor-rule-arity-validation`, `test:arena:transparent-result-sort-reject`, and `test:arena:mutual-imax-prop-reject`.
