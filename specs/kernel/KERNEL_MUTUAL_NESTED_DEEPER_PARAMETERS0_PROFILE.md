# KERNEL-mutual-nested-deeper-parameters0 profile (Core v57)

Semantic baseline: Lean 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile extends v56 only for a bounded composition: monomorphic `Type` mutual blocks with a common shared/dependent uniform parameter telescope, zero outer indices, and exactly one linear nested recursive path of arbitrary finite depth >= 2 through already checked monomorphic one-parameter zero-index containers.

Trusted rules:

- derive the common mutual parameter context from the declaration telescope;
- every recursive field must project out of constructor-local context;
- every mutual target uses the exact shared parameter tuple up to trusted contextual definitional equality;
- each synthesized helper carries the same parameter prefix;
- helpers are deterministic and are rechecked atomically with the original members by the existing mutual checker;
- linked recursor computation is derived from the checked synthetic graph;
- no artifact/frontend flag can authorize parameter preservation or constructor-local capture.

Exact Lean evidence covers ordinary parameters, dependent `(α : Type) (x : α)` parameters, depth-2/depth-3 helper order, and rejection of non-uniform/local fixed parameters.

Explicit later work includes outer indices, explicit universe-polymorphic deep composition, multiple deep fields, Prop+parameter deep composition, and indexed/dependent deep containers.
