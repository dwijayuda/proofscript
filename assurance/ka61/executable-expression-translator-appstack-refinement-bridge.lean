import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA61
open Lean
open Lean4Lean

/-- KA-61 bridge: an AppStack proof yields the translated head expression. -/
theorem translated_appStack_tr_wf {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr} {as : List Expr}
    (H : AppStack env Us Δ e e' as) :
    TrExprS env Us Δ e e' := by
  exact AppStack.tr H

/-- KA-61 bridge: a translated application list can be decomposed into an AppStack. -/
theorem translated_appStack_build_wf {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr} {as : List Expr}
    (H : TrExprS env Us Δ (e.mkAppList as) e') :
    ∃ e', AppStack env Us Δ e e' as := by
  exact AppStack.build H

/-- KA-61 bridge: rebuilding reversed application lists preserves translated expressions. -/
theorem translated_trExpr_rebuild_mkAppRevList_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {e e₁ : Expr} {e' ea' : VExpr} {as : List Expr}
    (henv : env.WF) (hΔ : Δ.WF env Us.length)
    (he : TrExprS env Us Δ e e')
    (h1 : TrExprS env Us Δ (e.mkAppRevList as) ea')
    (h2 : TrExpr env Us Δ e₁ e') :
    TrExpr env Us Δ (e₁.mkAppRevList as) ea' := by
  exact TrExpr.rebuild_mkAppRevList henv hΔ he h1 h2

/-- KA-61 bridge: rebuilding forward application lists preserves translated expressions. -/
theorem translated_trExpr_rebuild_mkAppList_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {e e₁ : Expr} {e' ea' : VExpr} {as : List Expr}
    (henv : env.WF) (hΔ : Δ.WF env Us.length)
    (he : TrExprS env Us Δ e e')
    (h1 : TrExprS env Us Δ (e.mkAppList as) ea')
    (h2 : TrExpr env Us Δ e₁ e') :
    TrExpr env Us Δ (e₁.mkAppList as) ea' := by
  exact TrExpr.rebuild_mkAppList henv hΔ he h1 h2

end Lean4Lean.PSKernelKA61
