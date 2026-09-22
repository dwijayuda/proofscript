import Lean4Lean.Theory.Typing.Env
import PSKernelKA25NonDefEnvDefEqPreservationBridge

/-
KA-30 direct Lean4Lean ordinary environment aggregate bridge.

KA-13 through KA-25 established separate conditional facts for translated
ordinary non-inductive ProofScript declarations against real Lean4Lean
environment surfaces. KA-30 packages the independently checked facts for
axioms, definitions, theorems, and opaque declarations into aggregate bridge
theorems over `VDecl.WF`, `VEnv.WF`, `VEnv.LE`, `VEnv.constants`, freshness /
no-overwrite, unrelated lookup preservation, and `VEnv.defeqs` preservation / insertion.

Examples remain intentionally non-adding and are already covered by their
`VDecl.WF`, `VEnv.WF`, and `VEnv.LE` bridge lemmas in KA-20..KA-22. Quotient
bridges remain in KA-26..KA-29.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, quotient
semantic soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA30

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16
open PSKernelKA17
open PSKernelKA18
open PSKernelKA19
open PSKernelKA20
open PSKernelKA21
open PSKernelKA22
open PSKernelKA23
open PSKernelKA24
open PSKernelKA25

/--
Aggregate KA-13..KA-19 bridge package for a translated axiom: declaration and
environment well-formedness, environment extension, lookup of the added
constant, freshness before insertion, unrelated lookup preservation, and
preservation of an existing definitional equation.
-/
theorem translated_axiom_env_aggregate_bridge
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (other : Name) (otherCi : VConstant) (df : VDefEq)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env')
    (hEnv : VEnv.WF env)
    (hOther : c.name ≠ other)
    (hLookup : env.constants other = some otherCi)
    (hDefEq : env.defeqs df) :
    VDecl.WF env (VDecl.axiom c) env'
      ∧ VEnv.WF env'
      ∧ env ≤ env'
      ∧ env'.constants c.name = some c.toVConstant
      ∧ env.constants c.name = none
      ∧ env'.constants other = some otherCi
      ∧ env'.defeqs df := by
  constructor
  · exact translated_axiom_vdecl_wf env env' d c _hk _htr _hdecl _hType hAdd
  constructor
  · exact translated_axiom_env_wf env env' d c _hk _htr _hdecl _hType hAdd hEnv
  constructor
  · exact translated_axiom_env_extends env env' d c _hk _htr _hdecl _hType hAdd
  constructor
  · exact translated_axiom_env_lookup env env' d c _hk _htr _hdecl _hType hAdd
  constructor
  · exact translated_axiom_fresh_before_add env env' d c _hk _htr _hdecl _hType hAdd
  constructor
  · exact translated_axiom_preserves_other_lookup env env' d c other otherCi
      _hk _htr _hdecl _hType hAdd hOther hLookup
  · exact translated_axiom_preserves_existing_defeq env env' d c df
      _hk _htr _hdecl _hType hAdd hDefEq

/--
Aggregate KA-13..KA-19 bridge package for a translated definition: declaration
and environment well-formedness, environment extension, lookup of the added
constant after `addDefEq`, definitional-equation insertion, freshness before
insertion, unrelated lookup preservation, and preservation of an existing
definitional equation.
-/
theorem translated_definition_env_aggregate_bridge
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant) (df : VDefEq)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hEnv : VEnv.WF env)
    (hOther : v.name ≠ other)
    (hLookup : env.constants other = some otherCi)
    (hDefEq : env.defeqs df) :
    VDecl.WF env (VDecl.def v) (env'.addDefEq v.toDefEq)
      ∧ VEnv.WF (env'.addDefEq v.toDefEq)
      ∧ env ≤ env'.addDefEq v.toDefEq
      ∧ (env'.addDefEq v.toDefEq).constants v.name = some v.toVConstant
      ∧ (env'.addDefEq v.toDefEq).defeqs v.toDefEq
      ∧ env.constants v.name = none
      ∧ (env'.addDefEq v.toDefEq).constants other = some otherCi
      ∧ (env'.addDefEq v.toDefEq).defeqs df := by
  constructor
  · exact translated_definition_vdecl_wf env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_definition_env_wf env env' d v _hk _htr _hdecl _hType _hBody hAdd hEnv
  constructor
  · exact translated_definition_env_extends env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_definition_env_lookup env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_definition_env_defeq_member env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_definition_fresh_before_add env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_definition_preserves_other_lookup env env' d v other otherCi
      _hk _htr _hdecl _hType _hBody hAdd hOther hLookup
  · exact translated_definition_preserves_existing_defeq env env' d v df
      _hk _htr _hdecl _hType _hBody hAdd hDefEq

/--
Aggregate KA-20..KA-25 bridge package for a translated theorem: declaration and
environment well-formedness, environment extension, lookup of the added theorem
constant after `addDefEq`, theorem definitional-equation insertion, freshness
before insertion, unrelated lookup preservation, and preservation of an existing
definitional equation.
-/
theorem translated_theorem_env_aggregate_bridge
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant) (df : VDefEq)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hEnv : VEnv.WF env)
    (hOther : v.name ≠ other)
    (hLookup : env.constants other = some otherCi)
    (hDefEq : env.defeqs df) :
    VDecl.WF env (VDecl.def v) (env'.addDefEq v.toDefEq)
      ∧ VEnv.WF (env'.addDefEq v.toDefEq)
      ∧ env ≤ env'.addDefEq v.toDefEq
      ∧ (env'.addDefEq v.toDefEq).constants v.name = some v.toVConstant
      ∧ (env'.addDefEq v.toDefEq).defeqs v.toDefEq
      ∧ env.constants v.name = none
      ∧ (env'.addDefEq v.toDefEq).constants other = some otherCi
      ∧ (env'.addDefEq v.toDefEq).defeqs df := by
  constructor
  · exact translated_theorem_vdecl_wf env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_theorem_env_wf env env' d v _hk _htr _hdecl _hType _hBody hAdd hEnv
  constructor
  · exact translated_theorem_env_extends env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_theorem_env_lookup env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_theorem_env_defeq_member env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_theorem_fresh_before_add env env' d v _hk _htr _hdecl _hType _hBody hAdd
  constructor
  · exact translated_theorem_preserves_other_lookup env env' d v other otherCi
      _hk _htr _hdecl _hType _hBody hAdd hOther hLookup
  · exact translated_theorem_preserves_existing_defeq env env' d v df
      _hk _htr _hdecl _hType _hBody hAdd hDefEq

/--
Aggregate KA-20..KA-25 bridge package for a translated opaque declaration:
declaration and environment well-formedness, environment extension, lookup of
the added opaque constant, freshness before insertion, unrelated lookup
preservation, and preservation of an existing definitional equation.
-/
theorem translated_opaque_env_aggregate_bridge
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant) (df : VDefEq)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hEnv : VEnv.WF env)
    (hOther : v.name ≠ other)
    (hLookup : env.constants other = some otherCi)
    (hDefEq : env.defeqs df) :
    VDecl.WF env (VDecl.opaque v) env'
      ∧ VEnv.WF env'
      ∧ env ≤ env'
      ∧ env'.constants v.name = some v.toVConstant
      ∧ env.constants v.name = none
      ∧ env'.constants other = some otherCi
      ∧ env'.defeqs df := by
  constructor
  · exact translated_opaque_vdecl_wf env env' d v _hk _htr _hdecl _hBody hAdd
  constructor
  · exact translated_opaque_env_wf env env' d v _hk _htr _hdecl _hBody hAdd hEnv
  constructor
  · exact translated_opaque_env_extends env env' d v _hk _htr _hdecl _hBody hAdd
  constructor
  · exact translated_opaque_env_lookup env env' d v _hk _htr _hdecl _hBody hAdd
  constructor
  · exact translated_opaque_fresh_before_add env env' d v _hk _htr _hdecl _hBody hAdd
  constructor
  · exact translated_opaque_preserves_other_lookup env env' d v other otherCi
      _hk _htr _hdecl _hBody hAdd hOther hLookup
  · exact translated_opaque_preserves_existing_defeq env env' d v df
      _hk _htr _hdecl _hBody hAdd hDefEq

/-- KA-30 still inherits KA-12's inductive block. -/
theorem ka30_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka25_preserves_inductive_block d

end PSKernelKA30
