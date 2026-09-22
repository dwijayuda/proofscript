import Lean4Lean.Theory.Typing.Env
import PSKernelKA20NonDefVDeclWFBridge

/-
KA-21 direct Lean4Lean VEnv.WF bridge for remaining supported ordinary
non-inductive declaration kinds.

KA-20 proved conditional `VDecl.WF` bridge lemmas for translated theorem,
example, and opaque declarations. KA-21 lifts those facts into the real
imported Lean4Lean `VEnv.WF` environment well-formedness relation. The bridge
stays conditional on Lean4Lean's own well-formedness/addition premises and does
not prove executable PSKernel refinement, quotient soundness, inductive
soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA21

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16
open PSKernelKA17
open PSKernelKA18
open PSKernelKA19
open PSKernelKA20

/--
If a translated PSKernel theorem satisfies the KA-20 direct `VDecl.WF`
premises and the input environment is already well formed, then the extended
environment with the defining equation is well formed according to the real
imported `Lean4Lean.VEnv.WF` relation.
-/
theorem translated_theorem_env_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hEnv : VEnv.WF env) :
    VEnv.WF (env'.addDefEq v.toDefEq) := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨(VDecl.def v) :: ds,
    VEnv.WF'.decl
      (translated_theorem_vdecl_wf env env' d v _hk _htr _hdecl _hType hBody hAdd)
      hds⟩

/--
If a translated PSKernel example satisfies the KA-20 direct `VDecl.WF`
premise and the input environment is already well formed, then the unchanged
environment is still well formed through Lean4Lean's example declaration rule.
-/
theorem translated_example_env_wf
    (env : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .example)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.example v))
    (hBody : v.WF env)
    (hEnv : VEnv.WF env) :
    VEnv.WF env := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨(VDecl.example v) :: ds,
    VEnv.WF'.decl
      (translated_example_vdecl_wf env d v _hk _htr _hdecl hBody)
      hds⟩

/--
If a translated PSKernel opaque declaration satisfies the KA-20 direct
`VDecl.WF` premises and the input environment is already well formed, then the
extended output environment is well formed according to the real imported
`Lean4Lean.VEnv.WF` relation.
-/
theorem translated_opaque_env_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hEnv : VEnv.WF env) :
    VEnv.WF env' := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨(VDecl.opaque v) :: ds,
    VEnv.WF'.decl
      (translated_opaque_vdecl_wf env env' d v _hk _htr _hdecl hBody hAdd)
      hds⟩

/-- KA-21 still inherits KA-12 through KA-20's inductive block. -/
theorem ka21_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka20_preserves_inductive_block d

end PSKernelKA21
