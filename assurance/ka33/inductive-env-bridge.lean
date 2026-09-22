import Lean4Lean.Theory.Typing.Env
import Lean4Lean.Theory.Typing.InductiveLemmas
import Lean4Lean.Theory.Typing.EnvLemmas
import PSKernelKA12DirectReference

/-
KA-33 direct Lean4Lean inductive environment bridge.

KA-32 identified inductive declarations as the first major missing feature
surface on the path from PSKernel's current bridge slice toward Lean4 kernel
feature parity. KA-33 deliberately adds only a small conditional bridge over the
real Lean4Lean inductive environment surface: if an already-translated
inductive declaration satisfies Lean4Lean's own `VInductDecl.WF` premise and
Lean4Lean's own `VEnv.addInduct` succeeds, then the declaration is accepted by
Lean4Lean's `VDecl.WF`, the resulting environment is `VEnv.WF`, and Lean4Lean's
imported `addInduct_WF` theorem yields orderedness of the resulting
environment.

This remains conditional assurance only. It does not implement PSKernel's full
inductive translator, does not prove positivity/recursor/projection semantic
soundness, does not prove executable PSKernel refinement, and does not claim
full Lean 4 equivalence.
-/

namespace PSKernelKA33

open Lean4Lean
open PSKernelKA12

/--
KA-33's bridge-only inductive translator. It intentionally leaves the KA-12
ordinary `translateDecl?` unchanged, while introducing the first direct
Lean4Lean target for `.inductive` declarations.
-/
def translateInductDecl? (d : PSDecl) (decl : VInductDecl) : Option VDecl :=
  match d.kind with
  | .inductive => some (VDecl.induct decl)
  | _ => none

/-- A PSKernel `.inductive` declaration maps to the real Lean4Lean `VDecl.induct` constructor. -/
theorem translated_inductive_is_real_vdecl
    (d : PSDecl) (decl : VInductDecl)
    (hk : d.kind = .inductive) :
    translateInductDecl? d decl = some (VDecl.induct decl) := by
  cases d with
  | mk name uvars kind typ val? =>
    subst hk
    rfl

/--
A translated inductive declaration is a real Lean4Lean `VDecl.WF` inductive
when Lean4Lean's own `VInductDecl.WF` and `addInduct` premises hold.
-/
theorem translated_inductive_vdecl_wf
    (env env' : VEnv) (d : PSDecl) (decl : VInductDecl)
    (hk : d.kind = .inductive)
    (hdecl : translateInductDecl? d decl = some (VDecl.induct decl))
    (hWF : decl.WF env)
    (hAdd : env.addInduct decl = some env') :
    VDecl.WF env (VDecl.induct decl) env' := by
  exact VDecl.WF.induct hWF hAdd

/--
A translated inductive declaration preserves Lean4Lean environment
well-formedness, conditional on Lean4Lean's own inductive premises.
-/
theorem translated_inductive_env_wf
    (env env' : VEnv) (d : PSDecl) (decl : VInductDecl)
    (hk : d.kind = .inductive)
    (hdecl : translateInductDecl? d decl = some (VDecl.induct decl))
    (hWF : decl.WF env)
    (hAdd : env.addInduct decl = some env')
    (hEnv : VEnv.WF env) :
    VEnv.WF env' := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨VDecl.induct decl :: ds,
    VEnv.WF'.decl
      (translated_inductive_vdecl_wf env env' d decl hk hdecl hWF hAdd)
      hds⟩

/--
The imported Lean4Lean inductive lemma gives orderedness of the resulting
environment after successful `addInduct`.
-/
theorem translated_inductive_env_ordered
    (env env' : VEnv) (d : PSDecl) (decl : VInductDecl)
    (hk : d.kind = .inductive)
    (hdecl : translateInductDecl? d decl = some (VDecl.induct decl))
    (hWF : decl.WF env)
    (hAdd : env.addInduct decl = some env')
    (hEnv : VEnv.WF env) :
    env'.Ordered := by
  exact Lean4Lean.VEnv.addInduct_WF (Lean4Lean.VEnv.WF.ordered hEnv) hWF hAdd

/-- KA-33 still blocks mutual inductives until a separate mutual bridge exists. -/
theorem ka33_preserves_mutual_inductive_block (d : PSDecl) :
    d.kind = .mutualInductive -> translateInductDecl? d arbitrary = none := by
  intro h
  cases d with
  | mk name uvars kind typ val? =>
    subst h
    rfl

end PSKernelKA33
