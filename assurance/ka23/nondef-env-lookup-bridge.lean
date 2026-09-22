import Lean4Lean.Theory.Typing.Env
import PSKernelKA22NonDefEnvExtensionBridge

/-
KA-23 direct Lean4Lean VEnv lookup/defeq-membership bridge for remaining
supported ordinary non-inductive declarations where lookup evidence applies.

KA-20/21/22 proved conditional `VDecl.WF`, `VEnv.WF`, and `VEnv.LE` bridge
lemmas for translated theorem, example, and opaque declarations. KA-23 adds the
next small reference fact for the adding members of that slice: translated
theorems and opaque declarations are reachable through the real imported
Lean4Lean `VEnv.constants` map after Lean4Lean's own `addConst` operation
succeeds, and translated theorems also insert their defining equation into
Lean4Lean's real `VEnv.defeqs` relation through `addDefEq`.

Examples intentionally do not add declarations to the environment in the KA-12
translation, so KA-23 records them as non-adding rather than proving a fake
lookup theorem for them.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, quotient
soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA23

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

/--
A translated PSKernel theorem added by Lean4Lean's `addConst` and then extended
with its defining equation can still be looked up through `VEnv.constants` at
the translated theorem name.
-/
theorem translated_theorem_env_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    (env'.addDefEq v.toDefEq).constants v.name = some v.toVConstant := by
  exact addDefEq_preserves_constant_lookup env' v.toDefEq v.name v.toVConstant
    (addConst_lookup_self env env' v.name v.toVConstant hAdd)

/--
A translated PSKernel theorem added by Lean4Lean's `addConst` and then extended
with its defining equation has that equation in Lean4Lean's real `VEnv.defeqs`
relation.
-/
theorem translated_theorem_env_defeq_member
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (_hAdd : env.addConst v.name v.toVConstant = some env') :
    (env'.addDefEq v.toDefEq).defeqs v.toDefEq := by
  exact addDefEq_contains_self env' v.toDefEq

/--
A translated PSKernel opaque declaration added by Lean4Lean's `addConst` can be
looked up in Lean4Lean's real `VEnv.constants` map at the translated opaque
constant name.
-/
theorem translated_opaque_env_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env'.constants v.name = some v.toVConstant := by
  exact addConst_lookup_self env env' v.name v.toVConstant hAdd

/-- KA-23 still inherits KA-12 through KA-22's inductive block. -/
theorem ka23_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka22_preserves_inductive_block d

end PSKernelKA23
