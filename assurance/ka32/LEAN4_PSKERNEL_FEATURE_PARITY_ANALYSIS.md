# KA-32 Lean4/PSKernel Feature-Equivalence Audit

**Checkpoint:** proofscript-v1-ka32-feature-equivalence-audit0  
**Version:** 1.0.0-pskernel.35  
**Baseline:** proofscript-v1-ka31-example-env-aggregate-bridge0  
**Core format:** 71  
**Formal Lean4Lean bridge obligations counted:** 56

## Conclusion

PSKernel is **not yet feature-equivalent to the full Lean4 kernel**. It has a strong and growing source/assurance surface, and KA-13 through KA-31 provide 56 counted conditional Lean4Lean bridge obligations for ordinary declarations, examples, and quotients. However, full equivalence still requires inductive/mutual declarations, full expression tag coverage, executable TypeChecker/WHNF/defeq refinement, primitive/literal policy proof, codec/replay correctness, and resource/error conservativity.

## Source audit

- Lean4Lean source root: `/mnt/data/ka32-lean4lean-upload/lean4lean-master`
- Lean4Lean toolchain: `leanprover/lean4:v4.33.0-rc2`
- Lean4Lean .lean files audited: 110
- PSKernel .ts files audited: 113
- Lean4Lean VDecl constructors observed: axiom, def, example, induct, mutualDef, opaque, quot
- Lean4Lean VEnv operations observed: addConst, addConsts, addDefEq, addDefEqs, addInduct, addQuot
- Lean4Lean TypeChecker operations observed: ensureForallCore, ensureSortCore, inferConstant, inferType, isDefEq, whnf

## Matrix summary

- Total feature groups: 15
- Bridged: 4
- Implemented/source-present but not fully bridged: 3
- Partial: 6
- Missing formal bridge: 1
- Missing: 1
- Gap groups still blocking a full Lean-equivalence claim: 11

| Feature group | Status | Current evidence boundary | Next milestone |
|---|---:|---|---|
| levels-universe-normalization | implemented-source | source-present; earlier V71/KA gates exist, but no full executable Lean4Lean refinement theorem for the TS level engine is counted here. | KA33-level-executable-refinement |
| core-vexpr-six-constructor-theory | bridged | covered by KA12+ translation surface and KA13..KA31 environment bridge obligations for the supported ordinary/quot slices. | KA36-full-expression-tag-coverage |
| full-lean-expression-tags | partial | KA12 explicitly blocked fvar/mvar/let/lit/proj from the formal translation slice; runtime/source support exists for more tags but not full formal coverage. | KA36-full-expression-tag-coverage |
| ordinary-declarations | bridged | KA13..KA25 and KA30..KA31 provide conditional VDecl.WF, VEnv.WF, VEnv.LE, lookup, freshness, and defeq aggregate bridges for ordinary declarations. | KA35-executable-typechecker-refinement |
| quot-declaration | bridged | KA26..KA29 prove conditional environment bridges for addQuot lookup, freshness/no-overwrite, defeq preservation, and aggregate packaging. | KA37-quotient-semantic-soundness |
| mutual-definitions | missing | Lean4Lean has VDecl.WF.mutualDef and helper lemmas; PSKernel has source-level surfaces, but no KA counted mutualDef bridge obligations yet. | KA34-mutual-def-env-bridge |
| inductive-declarations | missing-formal-bridge | PSKernel has substantial source/runtime inductive code and older V71 assurance checkpoints, but KA12..KA31 deliberately excluded inductive/mutual/nested from the Lean4Lean bridge count. | KA33-inductive-env-bridge |
| recursor-reduction-iota-eta-k | partial | Runtime/source and arena evidence exist, but no full formal reduction/refinement theorem counted against Lean4Lean here. | KA38-recursor-whnf-refinement |
| type-inference-checking | implemented-source | Implemented/source-bound but not proved as an executable refinement of Lean4Lean TypeChecker across all expression/declaration classes. | KA35-executable-typechecker-refinement |
| defeq-conversion-whnf | partial | Runtime/source and arena evidence exist; full algorithmic conversion equivalence is not proven. | KA39-defeq-whnf-refinement |
| environment-extension-ordering | bridged | Strongly bridged for ordinary declarations and quotient; missing formal inductive/mutual block coverage. | KA33-inductive-env-bridge |
| primitive-axioms-literals | partial | Source present; formal bridge for literals/primitive policy is not complete in KA counted obligations. | KA40-primitive-literal-policy-bridge |
| kernel-codec-export-arena | partial | Arena evidence exists and classifier gates pass, but codec/parser correctness is not formally connected to Lean4Lean semantics. | KA41-codec-replay-refinement |
| resource-fuel-error-semantics | implemented-source | Source present; full semantic proof of resource-policy conservativity is still open. | KA42-resource-error-conservativity |
| metatheory-typing-relations | partial | KA13..KA31 import slices of this theory, but no global theorem states PSKernel implements the full theory. | KA43-theory-wide-refinement-map |

## Required work before PSKernel can claim Lean4 kernel feature equivalence

1. **levels-universe-normalization** → Prove PSKernel level normalization/comparison refines Lean4Lean/Lean kernel level equivalence for every level expression accepted by the codec.
2. **full-lean-expression-tags** → Add formal translation and bridge obligations for letE, literals, projections, fvar/mvar policy, and metadata erasure.
3. **mutual-definitions** → Prove VDecl.WF/VEnv.WF/VEnv.LE/lookup/defeq preservation for mutualDef blocks and then connect to executable checking.
4. **inductive-declarations** → Prove addInduct/VInductDecl.WF bridge, constructor/recursor environment effects, positivity/nested preprocessing soundness, and recursor reduction correspondence.
5. **recursor-reduction-iota-eta-k** → Prove WHNF/reduction/refiner correspondence for recursor cases and projections under Lean4Lean semantics.
6. **type-inference-checking** → Prove executable PSKernel TypeScript checker accepts/rejects exactly the Lean4Lean checker for the declared kernel feature subset.
7. **defeq-conversion-whnf** → Prove PSKernel conversion/WHNF refines Lean4Lean including all supported reductions and conservative decline/error policy.
8. **primitive-axioms-literals** → Prove literal expansion and primitive/axiom policy agree with Lean4Lean/Lean for all accepted exports.
9. **kernel-codec-export-arena** → Prove/validate codec translation preserves declarations, levels, expressions, and decline/error semantics against Lean4Lean replay.
10. **resource-fuel-error-semantics** → Prove resource exhaustion never becomes an unsound accept/reject and is classified conservatively.
11. **metatheory-typing-relations** → Systematically connect every executable kernel rule to the corresponding Lean4Lean metatheory relation.

## Claim boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Core format changed: **no**, still 71
- Kernel codec changed: **no**
- Trusted PSKernel semantic change: **no**
