import Lean4Lean.Theory.Typing.Env
import PSKernelKA13VDeclWFBridge

/-
KA-15 direct Lean4Lean VEnv.WF bridge.

This file deliberately remains conditional. KA-13 proves that translated
non-inductive axiom/definition declarations satisfy Lean4Lean.VDecl.WF when
Lean4Lean's own premises are supplied. KA-15 lifts those single-declaration
facts into the real imported Lean4Lean.VEnv.WF environment well-formedness
relation. It does not prove executable PSKernel refinement, definitional
equality soundness, inductive soundness, or full Lean equivalence.
-/

namespace PSKernelKA15

open Lean4Lean
open PSKernelKA12
open PSKernelKA13

/--
If a translated PSKernel axiom satisfies the KA-13 direct `VDecl.WF` premises
and the input environment is already well formed, then the extended output
environment is well formed according to the real imported `Lean4Lean.VEnv.WF`
relation.
-/
theorem translated_axiom_env_wf
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env')
    (hEnv : VEnv.WF env) :
    VEnv.WF env' := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨(VDecl.axiom c) :: ds,
    VEnv.WF'.decl
      (translated_axiom_vdecl_wf env env' d c _hk _htr _hdecl hType hAdd)
      hds⟩

/--
If a translated PSKernel definition satisfies the KA-13 direct `VDecl.WF`
premises and the input environment is already well formed, then the extended
environment with the defining equation is well formed according to the real
imported `Lean4Lean.VEnv.WF` relation.
-/
theorem translated_definition_env_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
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
      (translated_definition_vdecl_wf env env' d v _hk _htr _hdecl _hType hBody hAdd)
      hds⟩

/-- KA-15 still inherits KA-12/KA-13's inductive block. -/
theorem ka15_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka13_preserves_inductive_block d

end PSKernelKA15
