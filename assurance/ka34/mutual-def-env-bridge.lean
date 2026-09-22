import Lean4Lean.Theory.Typing.EnvLemmas

/-
KA-34 direct Lean4Lean mutual-definition environment bridge.

KA-32 identified mutual definitions as a remaining Lean4 kernel feature gap.
KA-34 deliberately adds only a conditional bridge to the real Lean4Lean
`VDecl.mutualDef` / `VDecl.WF.mutualDef` surface. It does not add a trusted
PSKernel runtime rule, does not implement executable mutual recursion checking,
and does not claim full Lean 4 equivalence.
-/

namespace PSKernelKA34

open Lean4Lean

structure PSMutualDefBlock where
  defs : List VDefVal

/-- Bridge-only translator for an already translated block of Lean4Lean definition values. -/
def translateMutualDefBlock? (b : PSMutualDefBlock) : Option VDecl :=
  some (VDecl.mutualDef b.defs)

/-- A PSKernel mutual-definition bridge block targets the real Lean4Lean `VDecl.mutualDef`. -/
theorem translated_mutual_def_is_real_vdecl (b : PSMutualDefBlock) :
    translateMutualDefBlock? b = some (VDecl.mutualDef b.defs) := by
  rfl

/--
A translated mutual-definition block is accepted by Lean4Lean's real
`VDecl.WF.mutualDef` when Lean4Lean's own constant and body premises hold.
-/
theorem translated_mutual_def_vdecl_wf
    (env env' : VEnv) (b : PSMutualDefBlock)
    (hConsts : ∀ ci ∈ b.defs, ci.toVConstant.WF env)
    (hAdd : env.addConsts b.defs = some env')
    (hDefs : ∀ ci ∈ b.defs, ci.WF env') :
    VDecl.WF env (VDecl.mutualDef b.defs) (env'.addDefEqs b.defs) := by
  exact VDecl.WF.mutualDef hConsts hAdd hDefs

/-- A translated mutual-definition block preserves Lean4Lean environment well-formedness. -/
theorem translated_mutual_def_env_wf
    (env env' : VEnv) (b : PSMutualDefBlock)
    (hConsts : ∀ ci ∈ b.defs, ci.toVConstant.WF env)
    (hAdd : env.addConsts b.defs = some env')
    (hDefs : ∀ ci ∈ b.defs, ci.WF env')
    (hEnv : VEnv.WF env) :
    VEnv.WF (env'.addDefEqs b.defs) := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨VDecl.mutualDef b.defs :: ds,
    VEnv.WF'.decl
      (translated_mutual_def_vdecl_wf env env' b hConsts hAdd hDefs)
      hds⟩

/-- Imported Lean4Lean lemmas give orderedness after successful mutual-definition addition. -/
theorem translated_mutual_def_env_ordered
    (env env' : VEnv) (b : PSMutualDefBlock)
    (hConsts : ∀ ci ∈ b.defs, ci.toVConstant.WF env)
    (hAdd : env.addConsts b.defs = some env')
    (hDefs : ∀ ci ∈ b.defs, ci.WF env')
    (hEnv : VEnv.WF env) :
    (env'.addDefEqs b.defs).Ordered := by
  exact VEnv.addDefEqs_ordered
    (VEnv.addConsts_ordered (VEnv.WF.ordered hEnv) hConsts hAdd)
    (VEnv.addConsts_constants hAdd)
    hDefs

/-- Successful `addConsts` exposes each mutual block constant in the intermediate environment. -/
theorem translated_mutual_def_constants_member
    (env env' : VEnv) (b : PSMutualDefBlock)
    (hAdd : env.addConsts b.defs = some env')
    (ci : VDefVal) (hmem : ci ∈ b.defs) :
    env'.constants ci.name = some ci.toVConstant := by
  exact VEnv.addConsts_constants hAdd ci hmem

/-- Adding all mutual-definition equations is an environment extension. -/
theorem addDefEqs_le : ∀ (env : VEnv) (cis : List VDefVal), env ≤ env.addDefEqs cis
  | env, [] => VEnv.LE.rfl
  | env, ci :: cis => by
      exact VEnv.LE.trans (VEnv.addDefEq_le (env := env) (df := ci.toDefEq))
        (addDefEqs_le (env.addDefEq ci.toDefEq) cis)

/-- Each definition equation from a mutual block is present after `addDefEqs`. -/
theorem translated_mutual_def_defeq_member :
    ∀ (env' : VEnv) (b : PSMutualDefBlock) (ci : VDefVal),
      ci ∈ b.defs -> (env'.addDefEqs b.defs).defeqs ci.toDefEq
  | env', ⟨[]⟩, ci, hmem => nomatch hmem
  | env', ⟨c :: cs⟩, ci, hmem => by
      cases hmem with
      | head =>
          exact (addDefEqs_le (env'.addDefEq c.toDefEq) cs).defeqs
            (VEnv.addDefEq_self (env := env') (df := c.toDefEq))
      | tail _ htail =>
          exact translated_mutual_def_defeq_member (env'.addDefEq c.toDefEq) ⟨cs⟩ ci htail

end PSKernelKA34
