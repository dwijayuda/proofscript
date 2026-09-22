import Lean4Lean.Theory.Typing.Env
import PSKernelKA21NonDefEnvWFBridge

/-
KA-22 direct Lean4Lean VEnv.LE bridge for remaining supported ordinary
non-inductive declaration kinds.

KA-20 proved conditional `VDecl.WF` bridge lemmas for translated theorem,
example, and opaque declarations. KA-21 lifted those facts into the real
imported Lean4Lean `VEnv.WF` relation. KA-22 proves the corresponding
environment-extension facts in the real imported `Lean4Lean.VEnv.LE` relation:
translated theorem and opaque declarations extend their input environments;
translated examples leave the environment unchanged and therefore extend it
reflexively.

This remains conditional assurance only. It does not prove executable
PSKernel refinement, definitional-equality soundness, inductive soundness,
quotient soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA22

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

/-- Every Lean4Lean environment extends itself. -/
theorem env_extends_refl (env : VEnv) : env ≤ env := by
  constructor
  · intro _n _a hconst
    exact hconst
  · intro _df hdef
    exact hdef

/--
A translated PSKernel theorem uses the same Lean4Lean environment-extension
shape as a definition: first `addConst`, then `addDefEq`.
-/
theorem translated_theorem_env_extends
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env ≤ env'.addDefEq v.toDefEq := by
  exact VEnv.LE.trans
    (addConst_extends env env' v.name v.toVConstant hAdd)
    (addDefEq_extends env' v.toDefEq)

/--
A translated PSKernel example does not extend Lean4Lean's environment; the
unchanged environment is a reflexive `VEnv.LE` extension.
-/
theorem translated_example_env_extends
    (env : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .example)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.example v))
    (_hBody : v.WF env) :
    env ≤ env := by
  exact env_extends_refl env

/--
A translated PSKernel opaque declaration extends its input environment through
Lean4Lean's real `addConst` operation.
-/
theorem translated_opaque_env_extends
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env ≤ env' := by
  exact addConst_extends env env' v.name v.toVConstant hAdd

/-- KA-22 still inherits KA-12 through KA-21's inductive block. -/
theorem ka22_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka21_preserves_inductive_block d

end PSKernelKA22
