import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA106
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-106 bridge: environment extension preserves primitive closed definitional equality. -/
theorem translated_vcontext_ext_mono_wf {c : VContext} (E : c.Ext) {U Γ e₁ e₂}
    (h : c.venv.IsDefEqU U Γ e₁ e₂) : E.venv.IsDefEqU U Γ e₁ e₂ := by
  exact TypeChecker.VContext.Ext.mono E h

/-- KA-106 bridge: environment extension preserves primitive typing facts. -/
theorem translated_vcontext_ext_monoT_wf {c : VContext} (E : c.Ext) {U Γ e A}
    (h : c.venv.HasType U Γ e A) : E.venv.HasType U Γ e A := by
  exact TypeChecker.VContext.Ext.monoT E h

/-- KA-106 bridge: environment extension preserves well-formed expressions. -/
theorem translated_vcontext_ext_monoW_wf {c : VContext} (E : c.Ext) {U Γ e}
    (h : VExpr.WF c.venv U Γ e) : VExpr.WF E.venv U Γ e := by
  exact TypeChecker.VContext.Ext.monoW E h

/-- KA-106 bridge: environment extension preserves primitive type judgements. -/
theorem translated_vcontext_ext_monoIsType_wf {c : VContext} (E : c.Ext) {U Γ A}
    (h : c.venv.IsType U Γ A) : E.venv.IsType U Γ A := by
  exact TypeChecker.VContext.Ext.monoIsType E h

/-- KA-106 bridge: environment extension preserves type-valid contexts. -/
theorem translated_vcontext_ext_monoCtx_wf {c : VContext} (E : c.Ext) {U Γ}
    (h : OnCtx Γ (c.venv.IsType U)) : OnCtx Γ (E.venv.IsType U) := by
  exact TypeChecker.VContext.Ext.monoCtx E h

end Lean4Lean.PSKernelKA106
