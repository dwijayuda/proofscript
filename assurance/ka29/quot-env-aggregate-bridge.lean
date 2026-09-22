import Lean4Lean.Theory.Typing.Env
import Lean4Lean.Theory.Typing.QuotLemmas
import PSKernelKA28QuotEnvDefEqPreservationBridge

/-
KA-29 direct Lean4Lean quotient aggregate environment bridge.

KA-26 through KA-28 established separate conditional facts for the translated
ProofScript `.quot` declaration against real Lean4Lean environment surfaces:
`VDecl.WF`, `VEnv.WF`, `VEnv.LE`, quotient constant lookups, quotient
freshness/no-overwrite, unrelated lookup preservation, and definitional-equation
preservation. KA-29 packages those independent bridge facts into one
machine-checked aggregate theorem over the same real imported Lean4Lean
relations.

This remains conditional assurance only. It does not prove quotient semantic
soundness, executable PSKernel refinement, definitional-equality soundness,
inductive soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA29

open Lean4Lean
open PSKernelKA12
open PSKernelKA26
open PSKernelKA27
open PSKernelKA28

/--
Successful translation plus Lean4Lean `addQuot` gives the complete KA-26..KA-28
quotient environment bridge package in one theorem: declaration/environment
well-formedness, extension, four quotient lookups, quotient defeq insertion,
freshness of the four quotient names before insertion, preservation of an
unrelated existing constant lookup, and preservation of an existing definitional
equation.
-/
theorem translated_quot_env_aggregate_bridge
    (env env' : VEnv) (d : PSDecl)
    (other : Name) (otherCi : VConstant) (df : VDefEq)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (hReady : env.QuotReady)
    (hAdd : env.addQuot = some env')
    (hEnv : VEnv.WF env)
    (hOtherQuot : (``Quot : Name) ≠ other)
    (hOtherQuotMk : (``Quot.mk : Name) ≠ other)
    (hOtherQuotLift : (``Quot.lift : Name) ≠ other)
    (hOtherQuotInd : (``Quot.ind : Name) ≠ other)
    (hLookup : env.constants other = some otherCi)
    (hDefEq : env.defeqs df) :
    VDecl.WF env VDecl.quot env'
      ∧ VEnv.WF env'
      ∧ env ≤ env'
      ∧ env'.constants ``Quot = some quotConst
      ∧ env'.constants ``Quot.mk = some quotMkConst
      ∧ env'.constants ``Quot.lift = some quotLiftConst
      ∧ env'.constants ``Quot.ind = some quotIndConst
      ∧ env'.defeqs quotDefEq
      ∧ env.constants ``Quot = none
      ∧ env.constants ``Quot.mk = none
      ∧ env.constants ``Quot.lift = none
      ∧ env.constants ``Quot.ind = none
      ∧ env'.constants other = some otherCi
      ∧ env'.defeqs df := by
  constructor
  · exact translated_quot_vdecl_wf env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_wf env env' d _hk _hdecl hReady hAdd hEnv
  constructor
  · exact translated_quot_env_extends env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_lookup_quot env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_lookup_quot_mk env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_lookup_quot_lift env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_lookup_quot_ind env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_env_defeq_member env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_fresh_quot_before_add env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_fresh_quot_mk_before_add env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_fresh_quot_lift_before_add env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_fresh_quot_ind_before_add env env' d _hk _hdecl hReady hAdd
  constructor
  · exact translated_quot_preserves_other_lookup env env' d other otherCi
      _hk _hdecl hReady hAdd
      hOtherQuot hOtherQuotMk hOtherQuotLift hOtherQuotInd hLookup
  · exact translated_quot_preserves_existing_defeq env env' d df
      _hk _hdecl hReady hAdd hDefEq

/-- KA-29 still inherits KA-12's inductive block. -/
theorem ka29_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka28_preserves_inductive_block d

end PSKernelKA29
