import Lean4Lean.Theory.Typing.Env
import PSKernelKA18EnvNoOverwriteBridge

/-
KA-19 direct Lean4Lean VEnv definitional-equation preservation bridge.

KA-17 proved that a translated definition's own `VDefEq` is inserted in the
real imported Lean4Lean environment. KA-18 proved constants are not overwritten
and unrelated constant lookups are preserved. KA-19 adds the next small
environment fact: successful translated axiom/definition additions preserve
pre-existing definitional-equation membership, while translated definitions add
their own new definitional equation.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, or full Lean
equivalence.
-/

namespace PSKernelKA19

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16
open PSKernelKA17
open PSKernelKA18

/-- Successful `addConst` preserves the imported Lean4Lean `defeqs` relation. -/
theorem addConst_preserves_existing_defeq
    (env env' : VEnv) (name : Name) (ci : VConstant) (df : VDefEq)
    (hAdd : env.addConst name ci = some env')
    (hDefEq : env.defeqs df) :
    env'.defeqs df := by
  unfold VEnv.addConst at hAdd
  split at hAdd <;> rename_i h
  · contradiction
  · cases hAdd
    exact hDefEq

/-- `addDefEq` preserves every previously known definitional equation. -/
theorem addDefEq_preserves_existing_defeq
    (env : VEnv) (new old : VDefEq)
    (hOld : env.defeqs old) :
    (env.addDefEq new).defeqs old := by
  unfold VEnv.addDefEq
  simp [hOld]

/--
Adding a translated axiom preserves all pre-existing definitional equations in
Lean4Lean's real imported `VEnv.defeqs` relation.
-/
theorem translated_axiom_preserves_existing_defeq
    (env env' : VEnv) (d : PSDecl) (c : VConstVal) (df : VDefEq)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env')
    (hDefEq : env.defeqs df) :
    env'.defeqs df := by
  exact addConst_preserves_existing_defeq env env' c.name c.toVConstant df hAdd hDefEq

/--
Adding a translated definition with `addConst` and then `addDefEq` preserves all
pre-existing definitional equations in Lean4Lean's real `VEnv.defeqs` relation.
-/
theorem translated_definition_preserves_existing_defeq
    (env env' : VEnv) (d : PSDecl) (v : VDefVal) (df : VDefEq)
    (_hk : d.kind = .definition)
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
Adding a translated definition both preserves an existing definitional equation
and inserts the translated definition's own equation.
-/
theorem translated_definition_preserves_existing_and_adds_new_defeq
    (env env' : VEnv) (d : PSDecl) (v : VDefVal) (df : VDefEq)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env')
    (hDefEq : env.defeqs df) :
    (env'.addDefEq v.toDefEq).defeqs df ∧ (env'.addDefEq v.toDefEq).defeqs v.toDefEq := by
  constructor
  · exact translated_definition_preserves_existing_defeq env env' d v df
      _hk _htr _hdecl _hType _hBody hAdd hDefEq
  · exact translated_definition_env_defeq_member env env' d v
      _hk _htr _hdecl _hType _hBody hAdd

/-- KA-19 still inherits KA-12 through KA-18's inductive block. -/
theorem ka19_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka18_preserves_inductive_block d

end PSKernelKA19
