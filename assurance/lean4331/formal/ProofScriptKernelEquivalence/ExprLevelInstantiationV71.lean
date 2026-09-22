import ProofScriptKernelEquivalence.ExprTranslation
import ProofScriptKernelEquivalence.LevelInstantiationV71

namespace ProofScriptKernelEquivalence

namespace PSExprV71

/-- Actual v71 structural universe instantiation on trusted Core expressions. -/
def instantiateLevelParams (e : PSExpr) (ps : List Lean.Name) (us : List PSLevel) : PSExpr :=
  match e with
  | .sort u => .sort (PSLevelV71.instantiateParams u ps us)
  | .bvar i => .bvar i
  | .const n ls => .const n (ls.map fun l => PSLevelV71.instantiateParams l ps us)
  | .app f a => .app (instantiateLevelParams f ps us) (instantiateLevelParams a ps us)
  | .lam d b bi => .lam (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .pi d b bi => .pi (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .letE t v b nondep =>
      .letE (instantiateLevelParams t ps us) (instantiateLevelParams v ps us)
        (instantiateLevelParams b ps us) nondep
  | .proj n i e => .proj n i (instantiateLevelParams e ps us)

end PSExprV71

namespace LeanExprSpecV71

/-- Pure shared-expression specification using the v71 level-substitution model. -/
def instantiateLevelParams (e : Lean.Expr) (ps : List Lean.Name) (us : List Lean.Level) : Lean.Expr :=
  match e with
  | .bvar i => .bvar i
  | .fvar f => .fvar f
  | .mvar m => .mvar m
  | .sort u => .sort (LeanLevelSpecV71.instantiateParams u ps us)
  | .const n ls => .const n (ls.map fun l => LeanLevelSpecV71.instantiateParams l ps us)
  | .app f a => .app (instantiateLevelParams f ps us) (instantiateLevelParams a ps us)
  | .lam n d b bi => .lam n (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .forallE n d b bi => .forallE n (instantiateLevelParams d ps us) (instantiateLevelParams b ps us) bi
  | .letE n t v b nondep =>
      .letE n (instantiateLevelParams t ps us) (instantiateLevelParams v ps us)
        (instantiateLevelParams b ps us) nondep
  | .lit l => .lit l
  | .mdata md e => .mdata md (instantiateLevelParams e ps us)
  | .proj n i e => .proj n i (instantiateLevelParams e ps us)

end LeanExprSpecV71

namespace PSExprV71

private theorem levels_toLean
    (ls : List PSLevel) (ps : List Lean.Name) (us : List PSLevel) :
    (ls.map fun l => PSLevelV71.instantiateParams l ps us).map PSLevel.toLean =
      (ls.map PSLevel.toLean).map fun l =>
        LeanLevelSpecV71.instantiateParams l ps (us.map PSLevel.toLean) := by
  induction ls with
  | nil => rfl
  | cons l ls ih =>
      simp only [List.map_cons, List.cons.injEq]
      exact ⟨PSLevelV71.instantiateParams_toLeanSpec l ps us, ih⟩

/-- v71 expression universe instantiation commutes with Core→Lean translation. -/
theorem instantiateLevelParams_toLeanSpec
    (e : PSExpr) (ps : List Lean.Name) (us : List PSLevel) :
    PSExpr.toLean (instantiateLevelParams e ps us) =
      LeanExprSpecV71.instantiateLevelParams (PSExpr.toLean e) ps (us.map PSLevel.toLean) := by
  induction e with
  | sort u =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean,
        PSLevelV71.instantiateParams_toLeanSpec]
  | bvar i => rfl
  | const n ls =>
      simp only [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean]
      rw [levels_toLean]
  | app f a ihf iha =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean, ihf, iha]
  | lam d b bi ihd ihb =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean, ihd, ihb]
  | pi d b bi ihd ihb =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean, ihd, ihb]
  | letE t v b nondep iht ihv ihb =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean, iht, ihv, ihb]
  | proj n i e ihe =>
      simp [instantiateLevelParams, LeanExprSpecV71.instantiateLevelParams, PSExpr.toLean, ihe]

end PSExprV71
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSExprV71.instantiateLevelParams_toLeanSpec
