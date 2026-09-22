import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA93
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-93 bridge: primitive names reserved in the checked environment are present in the model. -/
theorem translated_contains_primitive_wf {c : VContext} {n : Name}
    (hs : c.safety = .safe) (h : c.env.contains n)
    (hp : Environment.primitives.contains n := by
      simp [Environment.primitives, NameSet.contains, NameSet.ofList]) :
    c.venv.contains n := by
  exact Lean4Lean.TypeChecker.VContext.contains_primitive hs h hp

/-- KA-93 bridge: reflected `Nat → Nat → Nat` primitives compute on literal arguments. -/
theorem translated_natBinLit_wf {c : VContext} {fc : Name} {f : Nat → Nat → Nat}
    (H : c.venv.ReflectsNatNatNat fc f) (hfc : c.venv.contains fc) (a b : Nat) :
    c.IsDefEqU (((VExpr.const fc []).app (.natLit a)).app (.natLit b)) (.natLit (f a b)) := by
  exact Lean4Lean.TypeChecker.VContext.natBinLit H hfc a b

/-- KA-93 bridge: reflected `Nat → Nat → Bool` primitives compute on literal arguments. -/
theorem translated_natBinLitBool_wf {c : VContext} {fc : Name} {f : Nat → Nat → Bool}
    (H : c.venv.ReflectsNatNatBool fc f) (hfc : c.venv.contains fc) (a b : Nat) :
    c.IsDefEqU (((VExpr.const fc []).app (.natLit a)).app (.natLit b)) (.boolLit (f a b)) := by
  exact Lean4Lean.TypeChecker.VContext.natBinLitBool H hfc a b

/-- KA-93 bridge: introducing a local `Nat` probe preserves the modeled computation. -/
theorem translated_withNatProbe_wf {c : VContext} {m : MLCtx} [cwf : c.MLCWF m]
    {s₀ s : VState} {α} {f : Expr → M α} {Q} {name : Name}
    (hprim : c.venv.HasPrimitives) (hnat : c.venv.contains ``Nat) (hs : s₀ ≤ s)
    (H : ∀ id, let m' := m.vlam id name q(Nat) .nat .default
      ∀ cwf' s', s₀ ≤ s' → ¬s.ngen.Reserves id →
        let : TrTerm c.venv c.lparams m'.vlctx (.fvar id) .nat :=
          .fvar (VLCtx.find?_vlam_self (ty := .nat)) (.bvar .zero)
        M.WF (c.withMLC m' (wf := cwf')) s' (f (.fvar id)) Q) :
    (withLocalDecl name .default q(Nat) f).WF (c.withMLC m) s Q := by
  exact Lean4Lean.TypeChecker.M.WF.withNatProbe hprim hnat hs H

/-- KA-93 bridge: introducing a local `Bool` probe preserves the modeled computation. -/
theorem translated_withBoolProbe_wf {c : VContext} {m : MLCtx} [cwf : c.MLCWF m]
    {s₀ s : VState} {α} {f : Expr → M α} {Q} {name : Name}
    (hprim : c.venv.HasPrimitives) (hbool : c.venv.contains ``Bool) (hs : s₀ ≤ s)
    (H : ∀ id, let m' := m.vlam id name q(Bool) .bool .default
      ∀ cwf' s', s₀ ≤ s' → ¬s.ngen.Reserves id →
        let : TrTerm c.venv c.lparams m'.vlctx (.fvar id) .bool :=
          .fvar (VLCtx.find?_vlam_self (ty := .bool)) (.bvar .zero)
        M.WF (c.withMLC m' (wf := cwf')) s' (f (.fvar id)) Q) :
    (withLocalDecl name .default q(Bool) f).WF (c.withMLC m) s Q := by
  exact Lean4Lean.TypeChecker.M.WF.withBoolProbe hprim hbool hs H

end Lean4Lean.PSKernelKA93
