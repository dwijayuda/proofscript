import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA98
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-98 bridge: primitive recognizers discharge universe arity from safe no-level definitions. -/
theorem translated_data_uvars_eq_wf {c : VContext} {v : DefinitionVal} {ci' : VDefVal}
    (P : Data v ci' c) (hok' : v.safety = .safe ∧ v.levelParams = []) :
    ci'.uvars = 0 := by
  exact Data.uvars_eq P hok'

/-- KA-98 bridge: fuel-recursion call well-formedness exposes typed divisor/fuel arguments. -/
theorem translated_goArgs_wf {c : VContext} {go' le' : VExpr}
    (hgoT : ∀ {Γ : List VExpr}, c.venv.HasType c.lparams.length Γ go' (natGoType le'))
    (hleC : le'.ClosedN) {bb pf f x pf' : VExpr}
    (hwf : c.WF₀ (natGoCall go' bb pf f x pf')) :
    c.HasType₀ bb .nat ∧ c.HasType₀ pf ((le'.app (.natLit 1)).app bb) ∧
    c.HasType₀ f .nat ∧ c.HasType₀ x .nat ∧
    c.HasType₀ pf' ((le'.app (VExpr.natSucc.app x)).app f) ∧
    c.HasType₀ (natGoCall go' bb pf f x pf') .nat := by
  exact goArgs hgoT hleC hwf

/-- KA-98 bridge: primitive fuel recursion computes reflected literal results under its step law. -/
theorem translated_natFuelRec_wf {c : VContext} {go' le' : VExpr} {F : Nat → Nat → Nat}
    {h : Nat → Nat} {H : VExpr → VExpr} {E : Nat → Nat}
    (hgoT : ∀ {Γ : List VExpr}, c.venv.HasType c.lparams.length Γ go' (natGoType le'))
    (hleC : le'.ClosedN)
    (hFlt : ∀ bb x, x < bb → F x bb = E x)
    (hFstep : ∀ bb x, 0 < bb → bb ≤ x → F x bb = h (F (x - bb) bb))
    (hHwf : ∀ {e}, c.WF₀ (H e) → c.WF₀ e)
    (hH : ∀ {e n}, c.HasType₀ e .nat → c.IsDefEqU₀ e (.natLit n) →
      c.IsDefEqU₀ (H e) (.natLit (h n)))
    (hstep : ∀ (bb x f' : Nat) (pf pf' : VExpr), 0 < bb →
      c.WF₀ (natGoCall go' (.natLit bb) pf (.natLit (f'+1)) (.natLit x) pf') →
      if bb ≤ x then
        ∃ pf3, c.IsDefEqU₀ (natGoCall go' (.natLit bb) pf (.natLit (f'+1)) (.natLit x) pf')
          (H (natGoCall go' (.natLit bb) pf (.natLit f') (.natLit (x - bb)) pf3))
      else c.IsDefEqU₀ (natGoCall go' (.natLit bb) pf (.natLit (f'+1)) (.natLit x) pf')
        (.natLit (E x)))
    (f bb x : Nat) (pf pf' : VExpr) (hbb : 0 < bb) (hlt : x < f)
    (hwf : natGoCall go' (.natLit bb) pf (.natLit f) (.natLit x) pf'
      |>.WF c.venv c.lparams.length []) :
    c.IsDefEqU₀ (natGoCall go' (.natLit bb) pf (.natLit f) (.natLit x) pf')
      (.natLit (F x bb)) := by
  exact natFuelRec hgoT hleC hFlt hFstep hHwf hH hstep f bb x pf pf' hbb hlt hwf

/-- KA-98 bridge: guard failure branches are fail-closed and preserve the continuation proof. -/
theorem translated_elseFail_wf {α : Type} {p : Prop} [Decidable p] {c : VContext} {s f Q}
    {e : Kernel.Exception} (H : p → M.WF (α := α) c s f Q) :
    (if p then f else do let _ : Unit ← throw e; f).WF c s Q := by
  exact elseFail H

/-- KA-98 bridge: recognizer `ok` implies safe definitions with no universe parameters. -/
theorem translated_hok_wf {v : DefinitionVal} (h : ok v) :
    v.safety = .safe ∧ v.levelParams = [] := by
  exact hok h

end Lean4Lean.PSKernelKA98
