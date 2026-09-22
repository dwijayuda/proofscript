import Lean4Lean.Theory.Typing.Env
import PSKernelKA16EnvExtensionBridge

/-
KA-17 direct Lean4Lean VEnv lookup/defeq-membership bridge.

KA-13 established conditional `VDecl.WF` facts for translated axioms and
ordinary definitions. KA-15 lifted them to `VEnv.WF`, and KA-16 proved the
resulting environments extend their inputs under Lean4Lean's real `VEnv.LE`.
KA-17 adds the next small reference fact: after Lean4Lean's own `addConst` and
`addDefEq` operations succeed, the translated constant is actually reachable
through the real imported `VEnv.constants` map, and a translated definition's
`VDefEq` is actually present in the real imported `VEnv.defeqs` relation.

This is still conditional assurance only. It does not prove executable
PSKernel refinement, definitional-equality soundness, inductive soundness, or
full Lean equivalence.
-/

namespace PSKernelKA17

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16

/-- Successful `addConst` makes the added constant available at its name. -/
theorem addConst_lookup_self
    (env env' : VEnv) (name : Name) (ci : VConstant)
    (hAdd : env.addConst name ci = some env') :
    env'.constants name = some ci := by
  unfold VEnv.addConst at hAdd
  split at hAdd <;> rename_i h
  · contradiction
  · cases hAdd
    dsimp
    simp

/-- Adding a definitional equation does not change the constants map. -/
theorem addDefEq_preserves_constant_lookup
    (env : VEnv) (df : VDefEq) (name : Name) (ci : VConstant)
    (hLookup : env.constants name = some ci) :
    (env.addDefEq df).constants name = some ci := by
  exact hLookup

/-- Adding a definitional equation makes that equation a member of `defeqs`. -/
theorem addDefEq_contains_self
    (env : VEnv) (df : VDefEq) :
    (env.addDefEq df).defeqs df := by
  unfold VEnv.addDefEq
  simp

/--
A translated PSKernel axiom added by Lean4Lean's `addConst` can be looked up in
Lean4Lean's real `VEnv.constants` map at the translated constant name.
-/
theorem translated_axiom_env_lookup
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env') :
    env'.constants c.name = some c.toVConstant := by
  exact addConst_lookup_self env env' c.name c.toVConstant hAdd

/--
A translated PSKernel definition added by Lean4Lean's `addConst` and then
extended with its defining equation can still be looked up through
`VEnv.constants` at the translated definition name.
-/
theorem translated_definition_env_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    (env'.addDefEq v.toDefEq).constants v.name = some v.toVConstant := by
  exact addDefEq_preserves_constant_lookup env' v.toDefEq v.name v.toVConstant
    (addConst_lookup_self env env' v.name v.toVConstant hAdd)

/--
A translated PSKernel definition added by Lean4Lean's `addConst` and then
extended with its defining equation has that equation in Lean4Lean's real
`VEnv.defeqs` relation.
-/
theorem translated_definition_env_defeq_member
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (_hAdd : env.addConst v.name v.toVConstant = some env') :
    (env'.addDefEq v.toDefEq).defeqs v.toDefEq := by
  exact addDefEq_contains_self env' v.toDefEq

/-- KA-17 still inherits KA-12/KA-13/KA-15/KA-16's inductive block. -/
theorem ka17_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka16_preserves_inductive_block d

end PSKernelKA17
