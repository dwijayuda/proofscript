import Lean4Lean.Verify.Primitive

namespace Lean4Lean.PSKernelKA83
open Lean4Lean
open Lean

/-- KA-83 bridge: Nat literal reflection stays closed at every de Bruijn cutoff. -/
theorem translated_natLitClosed_wf {n k : Nat} :
    (VExpr.natLit n).ClosedN k := by
  exact Lean4Lean.VExpr.closedN_natLit

/-- KA-83 bridge: the primitive first-projection lambda over Nat literals beta-reduces definitionally. -/
theorem translated_natFstLamApp_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Γ : List VExpr}
    (hΓ : OnCtx Γ (env.IsType U)) (x y : Nat) :
    env.IsDefEqU U Γ
      (((VExpr.lam .nat (.lam .nat (.bvar 1))).app (.natLit x)).app (.natLit y)) (.natLit x) := by
  exact Lean4Lean.VEnv.HasPrimitives.natFstLamApp henv hprim hnat hΓ x y

/-- KA-83 bridge: primitive Nat presence yields Nat as a well-formed type. -/
theorem translated_natIsType_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Us : List Name} {Δ : VLCtx}
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    env.IsType Us.length Δ.toCtx .nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natIsType henv hprim hnat hΔ

/-- KA-83 bridge: Lean `Nat` translates to the PSKernel `VExpr.nat` primitive type. -/
theorem translated_trNat_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Us : List Name} {Δ : VLCtx} :
    TrExprS env Us Δ (.const ``Nat []) .nat := by
  exact Lean4Lean.VEnv.HasPrimitives.trNat henv hprim hnat

/-- KA-83 bridge: primitive Bool presence yields Bool as a well-formed type. -/
theorem translated_boolIsType_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) {Us : List Name} {Δ : VLCtx}
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    env.IsType Us.length Δ.toCtx .bool := by
  exact Lean4Lean.VEnv.HasPrimitives.boolIsType henv hprim hbool hΔ

/-- KA-83 bridge: Lean `Bool` translates to the PSKernel `VExpr.bool` primitive type. -/
theorem translated_trBool_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) {Us : List Name} {Δ : VLCtx} :
    TrExprS env Us Δ (.const ``Bool []) .bool := by
  exact Lean4Lean.VEnv.HasPrimitives.trBool henv hprim hbool

end Lean4Lean.PSKernelKA83
