import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Theory.VExpr

namespace Lean4Lean.PSKernelKA55
open Lean
open Lean4Lean

/-- KA-55 bridge: level-instantiation commutes with single binder instantiation. -/
theorem translated_vexpr_instL_instN_wf
    {e₁ e₂ : VExpr} {k : Nat} {ls : List VLevel} :
    (e₁.inst e₂ k).instL ls = (e₁.instL ls).inst (e₂.instL ls) k := by
  exact VExpr.instL_instN

/-- KA-55 bridge: verified lift composition is stable for executable translated expressions. -/
theorem translated_vexpr_lift_prime_comp_wf
    {e : VExpr} {l₁ l₂ : Lift} :
    e.lift' (.comp l₁ l₂) = (e.lift' l₁).lift' l₂ := by
  exact VExpr.lift'_comp

/-- KA-55 bridge: substitution through a verified lift follows Lean4Lean's left-lift law. -/
theorem translated_vexpr_subst_lift_prime_wf
    {e : VExpr} {ρ : Lift} {σ : VExpr.Subst} :
    (e.lift' ρ).subst σ = VExpr.subst e (VExpr.Subst.lift_l ρ σ) := by
  exact VExpr.subst_lift'

/-- KA-55 bridge: sequential substitutions compose through Lean4Lean's executable substitution law. -/
theorem translated_vexpr_subst_subst_wf
    {e : VExpr} {σ σ' : VExpr.Subst} :
    (e.subst σ).subst σ' = VExpr.subst e (VExpr.Subst.comp σ σ') := by
  exact VExpr.subst_subst

end Lean4Lean.PSKernelKA55
