import Lean4Lean.Theory.Typing.Env
import PSKernelKA24NonDefEnvNoOverwriteBridge

/-
KA-25 direct Lean4Lean VEnv definitional-equation preservation bridge for the
remaining ordinary non-inductive declaration kinds where environment insertion
happens.

KA-23 proved lookup/defeq membership facts for translated theorems and opaque
constants, and KA-24 proved freshness/no-overwrite facts for their constants.
KA-25 adds the corresponding `VEnv.defeqs` preservation facts: adding a
translated theorem preserves pre-existing definitional equations and inserts
its own equation; adding a translated opaque declaration preserves
pre-existing definitional equations. Translated examples remain non-adding and
are intentionally not given fake insertion facts.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, quotient
soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA25

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

/--
Adding a translated theorem with `addConst` and then `addDefEq` preserves all
pre-existing definitional equations in Lean4Lean's real `VEnv.defeqs` relation.
-/
theorem translated_theorem_preserves_existing_defeq
    (env env' : VEnv) (d : PSDecl) (v : VDefVal) (df : VDefEq)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hDefEq : env.defeqs df) :
    (env'.addDefEq v.toDefEq).defeqs df := by
  exact addDefEq_preserves_existing_defeq env' v.toDefEq df
    (addConst_preserves_existing_defeq env env' v.name v.toVConstant df hAdd hDefEq)

/--
Adding a translated theorem both preserves an existing definitional equation and
inserts the translated theorem's own equation.
-/
theorem translated_theorem_preserves_existing_and_adds_new_defeq
    (env env' : VEnv) (d : PSDecl) (v : VDefVal) (df : VDefEq)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hDefEq : env.defeqs df) :
    (env'.addDefEq v.toDefEq).defeqs df ∧ (env'.addDefEq v.toDefEq).defeqs v.toDefEq := by
  constructor
  · exact translated_theorem_preserves_existing_defeq env env' d v df
      _hk _htr _hdecl _hType _hBody hAdd hDefEq
  · exact translated_theorem_env_defeq_member env env' d v
      _hk _htr _hdecl _hType _hBody hAdd

/--
Adding a translated opaque declaration preserves all pre-existing definitional
equations in Lean4Lean's real imported `VEnv.defeqs` relation.
-/
theorem translated_opaque_preserves_existing_defeq
    (env env' : VEnv) (d : PSDecl) (v : VDefVal) (df : VDefEq)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hDefEq : env.defeqs df) :
    env'.defeqs df := by
  exact addConst_preserves_existing_defeq env env' v.name v.toVConstant df hAdd hDefEq

/-- KA-25 still inherits KA-12 through KA-24's inductive block. -/
theorem ka25_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka24_preserves_inductive_block d

end PSKernelKA25
