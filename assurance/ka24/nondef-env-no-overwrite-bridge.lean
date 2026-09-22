import Lean4Lean.Theory.Typing.Env
import PSKernelKA23NonDefEnvLookupBridge

/-
KA-24 direct Lean4Lean VEnv no-overwrite/freshness bridge for remaining
supported ordinary non-inductive declarations where environment insertion
happens.

KA-23 proved lookup/defeq-membership facts for translated theorem and opaque
declarations. KA-24 proves the next small environment-safety facts for the same
adding slice: successful Lean4Lean `addConst` means the target name was fresh,
and the insertion preserves unrelated existing constant lookups. Translated
examples remain non-adding and are intentionally not given fake insertion
facts.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, quotient
soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA24

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

/--
A translated PSKernel theorem whose constant is added by Lean4Lean's `addConst`
was fresh in the original Lean4Lean environment.
-/
theorem translated_theorem_fresh_before_add
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env.constants v.name = none := by
  exact addConst_success_requires_fresh env env' v.name v.toVConstant hAdd

/--
A translated PSKernel opaque declaration whose constant is added by Lean4Lean's
`addConst` was fresh in the original Lean4Lean environment.
-/
theorem translated_opaque_fresh_before_add
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env.constants v.name = none := by
  exact addConst_success_requires_fresh env env' v.name v.toVConstant hAdd

/--
Adding a translated theorem and then its definitional equation preserves all
pre-existing constant lookups at names other than the translated theorem's
name.
-/
theorem translated_theorem_preserves_other_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hOther : v.name ≠ other)
    (hLookup : env.constants other = some otherCi) :
    (env'.addDefEq v.toDefEq).constants other = some otherCi := by
  exact addDefEq_preserves_any_constant_lookup env' v.toDefEq other otherCi
    (addConst_preserves_other_lookup env env' v.name other v.toVConstant otherCi
      hAdd hOther hLookup)

/--
Adding a translated opaque declaration preserves all pre-existing constant
lookups at names other than the translated opaque declaration's name.
-/
theorem translated_opaque_preserves_other_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hOther : v.name ≠ other)
    (hLookup : env.constants other = some otherCi) :
    env'.constants other = some otherCi := by
  exact addConst_preserves_other_lookup env env' v.name other v.toVConstant otherCi
    hAdd hOther hLookup

/-- KA-24 still inherits KA-12 through KA-23's inductive block. -/
theorem ka24_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka23_preserves_inductive_block d

end PSKernelKA24
