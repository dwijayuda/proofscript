import ProofScriptKernelEquivalence.ExprTranslation
import ProofScriptKernelEquivalence.LevelInstantiation

namespace ProofScriptKernelEquivalence

namespace PSExpr

/-- Structural universe instantiation on the trusted ProofScript expression model. -/
def instantiateLevelParams (e : PSExpr) (ps : List Lean.Name) (us : List PSLevel) : PSExpr :=
  match e with
  | .sort u => .sort (PSLevel.instantiateParams u ps us)
  | .bvar i => .bvar i
  | .const n ls => .const n (ls.map fun l => PSLevel.instantiateParams l ps us)
  | .app f a => .app (instantiateLevelParams f ps us) (instantiateLevelParams a ps us)
  | .lam d b bi => .lam (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .pi d b bi => .pi (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .letE t v b nondep =>
      .letE (instantiateLevelParams t ps us) (instantiateLevelParams v ps us)
        (instantiateLevelParams b ps us) nondep
  | .proj n i e => .proj n i (instantiateLevelParams e ps us)

end PSExpr

namespace LeanExprSpec

/--
Pure structural specification of universe instantiation on the shared expression
constructors.  It mirrors the logical effect of Lean 4.33.1
`Expr.instantiateLevelParams`; fvars/mvars/literals/metadata are retained only so
this function is total on `Lean.Expr`, but translated ProofScript expressions do
not contain those constructors.
-/
def instantiateLevelParams (e : Lean.Expr) (ps : List Lean.Name) (us : List Lean.Level) : Lean.Expr :=
  match e with
  | .bvar i => .bvar i
  | .fvar f => .fvar f
  | .mvar m => .mvar m
  | .sort u => .sort (LeanLevelSpec.instantiateParams u ps us)
  | .const n ls => .const n (ls.map fun l => LeanLevelSpec.instantiateParams l ps us)
  | .app f a => .app (instantiateLevelParams f ps us) (instantiateLevelParams a ps us)
  | .lam n d b bi => .lam n (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .forallE n d b bi => .forallE n (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .letE n t v b nondep =>
      .letE n (instantiateLevelParams t ps us) (instantiateLevelParams v ps us)
        (instantiateLevelParams b ps us) nondep
  | .lit l => .lit l
  | .mdata md e => .mdata md (instantiateLevelParams e ps us)
  | .proj n i e => .proj n i (instantiateLevelParams e ps us)

end LeanExprSpec

namespace PSExpr

private theorem levels_instantiate_toLean
    (ls : List PSLevel) (ps : List Lean.Name) (us : List PSLevel) :
    (ls.map fun l => PSLevel.instantiateParams l ps us).map PSLevel.toLean =
      (ls.map PSLevel.toLean).map fun l =>
        LeanLevelSpec.instantiateParams l ps (us.map PSLevel.toLean) := by
  induction ls with
  | nil => rfl
  | cons l ls ih =>
      simp only [List.map_cons, List.cons.injEq]
      exact ⟨PSLevel.instantiateParams_toLeanSpec l ps us, ih⟩

/--
Universe substitution commutes with Core→Lean expression translation for every
constructor in the declared shared Core.
-/
theorem instantiateLevelParams_toLeanSpec
    (e : PSExpr) (ps : List Lean.Name) (us : List PSLevel) :
    toLean (instantiateLevelParams e ps us) =
      LeanExprSpec.instantiateLevelParams (toLean e) ps (us.map PSLevel.toLean) := by
  induction e with
  | sort u =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean,
        PSLevel.instantiateParams_toLeanSpec]
  | bvar i => rfl
  | const n ls =>
      simp only [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean]
      rw [levels_instantiate_toLean]
  | app f a ihf iha =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean, ihf, iha]
  | lam d b bi ihd ihb =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean, ihd, ihb]
  | pi d b bi ihd ihb =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean, ihd, ihb]
  | letE t v b nondep iht ihv ihb =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean, iht, ihv, ihb]
  | proj n i e ihe =>
      simp [instantiateLevelParams, LeanExprSpec.instantiateLevelParams, toLean, ihe]

end PSExpr
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSExpr.instantiateLevelParams_toLeanSpec
