import Lean4Lean.Verify.Environment.Primitive.Condition

namespace Lean4Lean.PSKernelKA84
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker

/-- KA-84 bridge: `Bool → Prop` condition predicate type translates to the primitive model. -/
theorem translated_boolProp_wf {env : VEnv} {Us : List Name} {Δ : VLCtx} {n : Name}
    {bi : BinderInfo} (henv : env.Ordered) (hprim : env.HasPrimitives)
    (hbool : env.contains ``Bool) (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    TrExprS env Us Δ (.forallE n q(Bool) q(Prop) bi) vexpr(Bool → Prop) := by
  exact Lean4Lean.Primitive.TrExprS.boolProp henv hprim hbool hΔ

/-- KA-84 bridge: `Prop → Bool → Prop` conditional reflection type translates. -/
theorem translated_propBoolProp_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {n₁ n₂ : Name} {bi₂ bi₁ : BinderInfo} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool)
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    TrExprS env Us Δ (.forallE n₁ q(Prop) (.forallE n₂ q(Bool) q(Prop) bi₂) bi₁)
      vexpr(Prop → Bool → Prop) := by
  exact Lean4Lean.Primitive.TrExprS.propBoolProp henv hprim hbool hΔ

/-- KA-84 bridge: `Bool → Nat → Nat → Nat` branch type translates. -/
theorem translated_boolNat3_wf {env : VEnv} {Us : List Name} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (hbool : env.contains ``Bool)
    {Δ : VLCtx} {n₁ n₂ n₃ : Name} {bi₁ bi₂ bi₃ : BinderInfo}
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    TrExprS env Us Δ
      (.forallE n₁ q(Bool) (.forallE n₂ q(Nat) (.forallE n₃ q(Nat) q(Nat) bi₃) bi₂) bi₁)
      vexpr(Bool → Nat → Nat → Nat) := by
  exact Lean4Lean.Primitive.TrExprS.boolNat3 henv hprim hnat hbool hΔ

/-- KA-84 bridge: `Nat → Nat → Prop` guard type translates. -/
theorem translated_natNatProp_wf {env : VEnv} {Us : List Name} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Δ : VLCtx}
    {n₁ n₂ : Name} {bi₁ bi₂ : BinderInfo} (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    TrExprS env Us Δ (.forallE n₁ q(Nat) (.forallE n₂ q(Nat) q(Prop) bi₂) bi₁)
      vexpr(Nat → Nat → Prop) := by
  exact Lean4Lean.Primitive.TrExprS.natNatProp henv hprim hnat hΔ

/-- KA-84 bridge: reflected `Nat.ble` conditions compute on literal arguments. -/
theorem translated_natLE_apply_wf {c : VContext}
    (w : Lean4Lean.Primitive.Condition.WF c Lean4Lean.Primitive.Condition.natLE)
    (hprim : c.venv.HasPrimitives) {be : VExpr} (a b : Nat)
    (hbe : w.himpl.apply [.natLit a, .natLit b] be) :
    c.IsDefEqU be (.boolLit (Nat.ble a b)) := by
  exact Lean4Lean.Primitive.Condition.WF.natLE_apply w hprim a b hbe

/-- KA-84 bridge: reflected `Nat.beq` conditions compute on literal arguments. -/
theorem translated_natEq_apply_wf {c : VContext}
    (w : Lean4Lean.Primitive.Condition.WF c Lean4Lean.Primitive.Condition.natEq)
    (hprim : c.venv.HasPrimitives) {be : VExpr} (a b : Nat)
    (hbe : w.himpl.apply [.natLit a, .natLit b] be) :
    c.IsDefEqU be (.boolLit (Nat.beq a b)) := by
  exact Lean4Lean.Primitive.Condition.WF.natEq_apply w hprim a b hbe

/-- KA-84 bridge: reflected `Nat.ble` literal computation transports to the closed extension. -/
theorem translated_natLE_apply_zero_wf {c : VContext}
    (w : Lean4Lean.Primitive.Condition.WF c Lean4Lean.Primitive.Condition.natLE)
    (hprim : c.venv.HasPrimitives) (E : c.Ext) {be : VExpr} (a b : Nat)
    (hbe : w.himpl.apply [.natLit a, .natLit b] be) :
    E.IsDefEqU₀ be (.boolLit (Nat.ble a b)) := by
  exact Lean4Lean.Primitive.Condition.WF.natLE_apply₀ w hprim E a b hbe

/-- KA-84 bridge: reflected `Nat.beq` literal computation transports to the closed extension. -/
theorem translated_natEq_apply_zero_wf {c : VContext}
    (w : Lean4Lean.Primitive.Condition.WF c Lean4Lean.Primitive.Condition.natEq)
    (hprim : c.venv.HasPrimitives) (E : c.Ext) {be : VExpr} (a b : Nat)
    (hbe : w.himpl.apply [.natLit a, .natLit b] be) :
    E.IsDefEqU₀ be (.boolLit (Nat.beq a b)) := by
  exact Lean4Lean.Primitive.Condition.WF.natEq_apply₀ w hprim E a b hbe

end Lean4Lean.PSKernelKA84
