import Lean4Lean.Theory.Typing.Env
import PSKernelKA15EnvWFBridge

/-
KA-16 direct Lean4Lean VEnv.LE environment-extension bridge.

KA-13 established conditional `VDecl.WF` facts for translated non-inductive
axioms/definitions. KA-15 lifted those into `VEnv.WF`. KA-16 proves that the
same translated declarations are monotone environment extensions in the real
imported Lean4Lean environment order `VEnv.LE` (`≤`). This is still a
conditional reference-model bridge: it does not prove executable PSKernel
refinement, definitional equality soundness, inductive soundness, or full Lean
equivalence.
-/

namespace PSKernelKA16

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15

/-- Successful `addConst` extends the original Lean4Lean environment. -/
theorem addConst_extends
    (env env' : VEnv) (name : Name) (ci : VConstant)
    (hAdd : env.addConst name ci = some env') : env ≤ env' := by
  unfold VEnv.addConst at hAdd
  split at hAdd <;> rename_i h
  · contradiction
  · cases hAdd
    constructor
    · intro n a hconst
      dsimp
      by_cases hn : name = n
      · subst hn
        rw [h] at hconst
        contradiction
      · simp [hn, hconst]
    · intro df hdf
      exact hdf

/-- Adding a definitional equation preserves all earlier constants and equations. -/
theorem addDefEq_extends
    (env : VEnv) (df : VDefEq) : env ≤ env.addDefEq df := by
  constructor
  · intro _n _a hconst
    exact hconst
  · intro _df hdef
    unfold VEnv.addDefEq
    simp [hdef]

/--
A translated PSKernel axiom that is added by Lean4Lean's `addConst` produces an
environment extension in the real imported `VEnv.LE` relation.
-/
theorem translated_axiom_env_extends
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env') :
    env ≤ env' := by
  exact addConst_extends env env' c.name c.toVConstant hAdd

/--
A translated PSKernel definition that is added by Lean4Lean's `addConst` and
then receives its defining equation produces an environment extension in the
real imported `VEnv.LE` relation.
-/
theorem translated_definition_env_extends
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env ≤ env'.addDefEq v.toDefEq := by
  exact VEnv.LE.trans
    (addConst_extends env env' v.name v.toVConstant hAdd)
    (addDefEq_extends env' v.toDefEq)

/-- KA-16 still inherits KA-12/KA-13/KA-15's inductive block. -/
theorem ka16_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka15_preserves_inductive_block d

end PSKernelKA16
