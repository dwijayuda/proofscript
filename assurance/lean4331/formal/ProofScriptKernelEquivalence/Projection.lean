import ProofScriptKernelEquivalence.ExprOperations

namespace ProofScriptKernelEquivalence

namespace PSExpr

/-- Structural loose-bvar test used by exact Lean-style projection telescope traversal. -/
def hasLooseBVarAt : PSExpr → Nat → Bool
  | .sort _, _ => false
  | .bvar i, depth => decide (depth ≤ i)
  | .const _ _, _ => false
  | .app f a, depth => hasLooseBVarAt f depth || hasLooseBVarAt a depth
  | .lam d b _, depth => hasLooseBVarAt d depth || hasLooseBVarAt b (depth + 1)
  | .pi d b _, depth => hasLooseBVarAt d depth || hasLooseBVarAt b (depth + 1)
  | .letE t v b _, depth =>
      hasLooseBVarAt t depth || hasLooseBVarAt v depth || hasLooseBVarAt b (depth + 1)
  | .proj _ _ e, depth => hasLooseBVarAt e depth

end PSExpr

namespace LeanExprSpec

/-- Pure structural reference for Lean's loose-bvar dependency test. -/
def hasLooseBVarAt : Lean.Expr → Nat → Bool
  | .bvar i, depth => decide (depth ≤ i)
  | .fvar _, _ => false
  | .mvar _, _ => false
  | .sort _, _ => false
  | .const _ _, _ => false
  | .app f a, depth => hasLooseBVarAt f depth || hasLooseBVarAt a depth
  | .lam _ d b _, depth => hasLooseBVarAt d depth || hasLooseBVarAt b (depth + 1)
  | .forallE _ d b _, depth => hasLooseBVarAt d depth || hasLooseBVarAt b (depth + 1)
  | .letE _ t v b _, depth =>
      hasLooseBVarAt t depth || hasLooseBVarAt v depth || hasLooseBVarAt b (depth + 1)
  | .lit _, _ => false
  | .mdata _ e, depth => hasLooseBVarAt e depth
  | .proj _ _ e, depth => hasLooseBVarAt e depth

end LeanExprSpec

namespace PSExpr

/-- Core→Lean translation preserves the dependency classifier exactly. -/
theorem hasLooseBVarAt_toLean (e : PSExpr) (depth : Nat) :
    hasLooseBVarAt e depth = LeanExprSpec.hasLooseBVarAt (toLean e) depth := by
  induction e generalizing depth with
  | sort u => rfl
  | bvar i => rfl
  | const n us => rfl
  | app f a ihf iha => simp [hasLooseBVarAt, LeanExprSpec.hasLooseBVarAt, PSExpr.toLean, ihf, iha]
  | lam d b bi ihd ihb => simp [hasLooseBVarAt, LeanExprSpec.hasLooseBVarAt, PSExpr.toLean, ihd, ihb]
  | pi d b bi ihd ihb => simp [hasLooseBVarAt, LeanExprSpec.hasLooseBVarAt, PSExpr.toLean, ihd, ihb]
  | letE t v b nondep iht ihv ihb =>
      simp [hasLooseBVarAt, LeanExprSpec.hasLooseBVarAt, PSExpr.toLean, iht, ihv, ihb]
  | proj n i e ihe => simp [hasLooseBVarAt, LeanExprSpec.hasLooseBVarAt, PSExpr.toLean, ihe]

end PSExpr

namespace Projection

/--
Dependency-aware traversal of a parameter-instantiated constructor telescope.
This models the soundness-critical part of Lean 4.33.1 raw projection typing:
a prior field is materialized as a projection only when the remaining telescope
actually depends on it.  For a Prop-valued major, every materialized prior field
and the target field must itself be proposition-valued.
-/
inductive PSFieldWalk
    (isProp : PSExpr → Prop) (majorIsProp : Bool)
    (typeName : Lean.Name) (major : PSExpr) :
    Nat → Nat → PSExpr → PSExpr → Prop where
  | target {seen : Nat} {d b : PSExpr} {bi : PSBinderInfo} :
      (majorIsProp = true → isProp d) →
      PSFieldWalk isProp majorIsProp typeName major seen 0 (.pi d b bi) d
  | dependent {seen remaining : Nat} {d b result : PSExpr} {bi : PSBinderInfo} :
      PSExpr.hasLooseBVarAt b 0 = true →
      (majorIsProp = true → isProp d) →
      PSFieldWalk isProp majorIsProp typeName major (seen + 1) remaining
        (PSExpr.instantiate1 b (.proj typeName seen major)) result →
      PSFieldWalk isProp majorIsProp typeName major seen (remaining + 1) (.pi d b bi) result
  | independent {seen remaining : Nat} {d b result : PSExpr} {bi : PSBinderInfo} :
      PSExpr.hasLooseBVarAt b 0 = false →
      PSFieldWalk isProp majorIsProp typeName major (seen + 1) remaining b result →
      PSFieldWalk isProp majorIsProp typeName major seen (remaining + 1) (.pi d b bi) result

/-- Lean-expression image of the same exact projection field traversal. -/
inductive LeanFieldWalk
    (isProp : Lean.Expr → Prop) (majorIsProp : Bool)
    (typeName : Lean.Name) (major : Lean.Expr) :
    Nat → Nat → Lean.Expr → Lean.Expr → Prop where
  | target {seen : Nat} {d b : Lean.Expr} {bi : Lean.BinderInfo} :
      (majorIsProp = true → isProp d) →
      LeanFieldWalk isProp majorIsProp typeName major seen 0
        (.forallE .anonymous d b bi) d
  | dependent {seen remaining : Nat} {d b result : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanExprSpec.hasLooseBVarAt b 0 = true →
      (majorIsProp = true → isProp d) →
      LeanFieldWalk isProp majorIsProp typeName major (seen + 1) remaining
        (LeanExprSpec.instantiate1 b (.proj typeName seen major)) result →
      LeanFieldWalk isProp majorIsProp typeName major seen (remaining + 1)
        (.forallE .anonymous d b bi) result
  | independent {seen remaining : Nat} {d b result : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanExprSpec.hasLooseBVarAt b 0 = false →
      LeanFieldWalk isProp majorIsProp typeName major (seen + 1) remaining b result →
      LeanFieldWalk isProp majorIsProp typeName major seen (remaining + 1)
        (.forallE .anonymous d b bi) result

/--
Machine-checked PS→Lean refinement for projection field reconstruction, relative
only to a sound proposition classifier.  Constructor lookup/parameter
instantiation is intentionally left to the later declaration/environment theorem.
-/
theorem fieldWalk_sound
    (psIsProp : PSExpr → Prop) (leanIsProp : Lean.Expr → Prop)
    (hProp : ∀ e, psIsProp e → leanIsProp (PSExpr.toLean e))
    (majorIsProp : Bool) (typeName : Lean.Name) (major : PSExpr)
    {seen remaining : Nat} {tail result : PSExpr}
    (h : PSFieldWalk psIsProp majorIsProp typeName major seen remaining tail result) :
    LeanFieldWalk leanIsProp majorIsProp typeName (PSExpr.toLean major) seen remaining
      (PSExpr.toLean tail) (PSExpr.toLean result) := by
  induction h with
  | target hSafe =>
      apply LeanFieldWalk.target
      intro hm
      exact hProp _ (hSafe hm)
  | @dependent seen remaining d b result bi hLoose hSafe hRest ih =>
      apply LeanFieldWalk.dependent
      · simpa [PSExpr.hasLooseBVarAt_toLean] using hLoose
      · intro hm
        exact hProp _ (hSafe hm)
      · simpa [PSExpr.instantiate1_toLean, PSExpr.toLean] using ih
  | @independent seen remaining d b result bi hLoose hRest ih =>
      apply LeanFieldWalk.independent
      · simpa [PSExpr.hasLooseBVarAt_toLean] using hLoose
      · exact ih

/-- Canonical left-associated application spine. -/
def PSMkApps (head : PSExpr) (args : List PSExpr) : PSExpr :=
  args.foldl PSExpr.app head

def LeanMkApps (head : Lean.Expr) (args : List Lean.Expr) : Lean.Expr :=
  args.foldl Lean.Expr.app head

/-- Translation commutes with construction of application spines. -/
theorem mkApps_toLean (head : PSExpr) (args : List PSExpr) :
    PSExpr.toLean (PSMkApps head args) =
      LeanMkApps (PSExpr.toLean head) (args.map PSExpr.toLean) := by
  induction args generalizing head with
  | nil => rfl
  | cons a rest ih =>
      simp [PSMkApps, LeanMkApps]
      simpa [PSMkApps, LeanMkApps, PSExpr.toLean] using ih (.app head a)

/-- Raw constructor projection/iota selection in ProofScript Core. -/
inductive PSProjIota : PSExpr → PSExpr → Prop where
  | constructor
      {typeName : Lean.Name} {index : Nat} {ctorHead : PSExpr}
      {params fields : List PSExpr} {result : PSExpr} :
      fields[index]? = some result →
      PSProjIota
        (.proj typeName index (PSMkApps ctorHead (params ++ fields))) result

/-- Lean-expression image of raw constructor projection/iota selection. -/
inductive LeanProjIota : Lean.Expr → Lean.Expr → Prop where
  | constructor
      {typeName : Lean.Name} {index : Nat} {ctorHead : Lean.Expr}
      {params fields : List Lean.Expr} {result : Lean.Expr} :
      fields[index]? = some result →
      LeanProjIota
        (.proj typeName index (LeanMkApps ctorHead (params ++ fields))) result

private theorem getElem?_map_sound
    (xs : List PSExpr) (i : Nat) (x : PSExpr)
    (h : xs[i]? = some x) :
    (xs.map PSExpr.toLean)[i]? = some (PSExpr.toLean x) := by
  rw [List.getElem?_map]
  simpa [h]

/-- Core→Lean translation preserves constructor projection reduction exactly. -/
theorem iota_sound {before after : PSExpr} (h : PSProjIota before after) :
    LeanProjIota (PSExpr.toLean before) (PSExpr.toLean after) := by
  cases h with
  | constructor hField =>
      simp only [PSExpr.toLean, mkApps_toLean, List.map_append]
      apply LeanProjIota.constructor
      exact getElem?_map_sound _ _ _ hField

end Projection
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSExpr.hasLooseBVarAt_toLean
#print axioms ProofScriptKernelEquivalence.Projection.fieldWalk_sound
#print axioms ProofScriptKernelEquivalence.Projection.mkApps_toLean
#print axioms ProofScriptKernelEquivalence.Projection.iota_sound
