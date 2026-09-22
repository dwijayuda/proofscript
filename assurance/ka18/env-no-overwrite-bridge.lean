import Lean4Lean.Theory.Typing.Env
import PSKernelKA17EnvLookupBridge

/-
KA-18 direct Lean4Lean VEnv no-overwrite/freshness bridge.

KA-17 proved that translated axiom/definition additions are visible in the
real imported Lean4Lean environment lookup relations after `addConst` and
`addDefEq`. KA-18 proves the next small environment-safety facts: a successful
Lean4Lean `addConst` implies that the target name was fresh in the input
environment, and it preserves all existing lookups at other names.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, or full Lean
equivalence.
-/

namespace PSKernelKA18

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16
open PSKernelKA17

/-- Successful `addConst` means the name was not already bound. -/
theorem addConst_success_requires_fresh
    (env env' : VEnv) (name : Name) (ci : VConstant)
    (hAdd : env.addConst name ci = some env') :
    env.constants name = none := by
  unfold VEnv.addConst at hAdd
  split at hAdd <;> rename_i h
  · contradiction
  · exact h

/-- Successful `addConst` preserves existing lookups at all other names. -/
theorem addConst_preserves_other_lookup
    (env env' : VEnv) (name other : Name) (ci otherCi : VConstant)
    (hAdd : env.addConst name ci = some env')
    (hOther : name ≠ other)
    (hLookup : env.constants other = some otherCi) :
    env'.constants other = some otherCi := by
  unfold VEnv.addConst at hAdd
  split at hAdd <;> rename_i h
  · contradiction
  · cases hAdd
    dsimp
    simp [hOther, hLookup]

/-- `addDefEq` preserves all constant lookups. -/
theorem addDefEq_preserves_any_constant_lookup
    (env : VEnv) (df : VDefEq) (name : Name) (ci : VConstant)
    (hLookup : env.constants name = some ci) :
    (env.addDefEq df).constants name = some ci := by
  exact hLookup

/--
A translated PSKernel axiom whose constant is added by Lean4Lean's `addConst`
was fresh in the original Lean4Lean environment.
-/
theorem translated_axiom_fresh_before_add
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env') :
    env.constants c.name = none := by
  exact addConst_success_requires_fresh env env' c.name c.toVConstant hAdd

/--
A translated PSKernel definition whose constant is added by Lean4Lean's
`addConst` was fresh in the original Lean4Lean environment.
-/
theorem translated_definition_fresh_before_add
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (_hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    env.constants v.name = none := by
  exact addConst_success_requires_fresh env env' v.name v.toVConstant hAdd

/--
Adding a translated axiom preserves all pre-existing constant lookups at names
other than the translated axiom's name.
-/
theorem translated_axiom_preserves_other_lookup
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (other : Name) (otherCi : VConstant)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (_hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env')
    (hOther : c.name ≠ other)
    (hLookup : env.constants other = some otherCi) :
    env'.constants other = some otherCi := by
  exact addConst_preserves_other_lookup env env' c.name other c.toVConstant otherCi
    hAdd hOther hLookup

/--
Adding a translated definition and then its definitional equation preserves all
pre-existing constant lookups at names other than the translated definition's
name.
-/
theorem translated_definition_preserves_other_lookup
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (other : Name) (otherCi : VConstant)
    (_hk : d.kind = .definition)
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

/-- KA-18 still inherits KA-12 through KA-17's inductive block. -/
theorem ka18_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka17_preserves_inductive_block d

end PSKernelKA18
