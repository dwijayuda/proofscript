import Lean4Lean.Verify.Primitive

/-
KA-40 direct Lean4Lean primitive/literal policy bridge.

KA-40 records the primitive and literal surface needed before PSKernel can claim
Lean4-like handling of built-in literal constructors. This is a proof-surface
bridge over Lean4Lean's existing HasPrimitives and TrExprS facts. It does not
add trusted PSKernel computation rules and does not prove executable primitive
reflection/checking completeness.
-/

namespace PSKernelKA40
open Lean4Lean
open Lean4Lean.VEnv
open Lean4Lean.VExpr

/-- The Lean4Lean literal policy for a Nat literal requires Nat to be present. -/
theorem translated_literal_policy_nat_requires_nat {env : VEnv} {n : Nat}
    (h : env.ContainsLits (.natVal n)) : env.contains ``Nat := by
  exact h

/-- The Lean4Lean literal policy for a String literal requires Char.ofNat and String.ofList. -/
theorem translated_literal_policy_string_requires_primitives {env : VEnv} {s : String}
    (h : env.ContainsLits (.strVal s)) :
    env.contains ``Char.ofNat ∧ env.contains ``String.ofList := by
  exact h

/-- Lean4Lean primitive policy gives Nat.zero its Nat type. -/
theorem translated_nat_zero_has_type {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (Γ : List VExpr) :
    env.HasType 0 Γ .natZero .nat := by
  exact hprim.natZeroT hord hnat Γ

/-- Lean4Lean primitive policy gives Nat.succ its Nat → Nat type. -/
theorem translated_nat_succ_has_type {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (Γ : List VExpr) :
    env.HasType 0 Γ .natSucc (.forallE .nat .nat) := by
  exact hprim.natSuccT hord hnat Γ

/-- Lean4Lean primitive policy types every Nat literal as Nat. -/
theorem translated_nat_literal_has_type {env : VEnv} {U : Nat} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (k : Nat) (Γ : List VExpr) :
    env.HasType U Γ (.natLit k) .nat := by
  exact hprim.natLitT hord hnat k Γ

/-- Lean4Lean Nat literals are closed under the VExpr representation. -/
theorem translated_nat_literal_closed {n k : Nat} :
    (VExpr.natLit n).ClosedN k := by
  exact VExpr.closedN_natLit

/-- Lean4Lean primitive policy recognizes Nat as a type in any verified local context. -/
theorem translated_nat_is_type {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Us : List Name} {Δ : VLCtx}
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    env.IsType Us.length Δ.toCtx .nat := by
  exact hprim.natIsType hord hnat hΔ

/-- Lean4Lean primitive policy translates the Nat constant to the VExpr Nat constant. -/
theorem translated_nat_const_translates {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) {Us : List Name} {Δ : VLCtx} :
    TrExprS env Us Δ (.const ``Nat []) .nat := by
  exact hprim.trNat hord hnat

/-- Lean4Lean primitive policy types Bool literals as Bool. -/
theorem translated_bool_literal_has_type {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) (b : Bool) (Γ : List VExpr) :
    env.HasType 0 Γ (.boolLit b) .bool := by
  exact hprim.boolLitT hord hbool b Γ

/-- Lean4Lean primitive policy recognizes Bool as a type in any verified local context. -/
theorem translated_bool_is_type {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) {Us : List Name} {Δ : VLCtx}
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) :
    env.IsType Us.length Δ.toCtx .bool := by
  exact hprim.boolIsType hord hbool hΔ

/-- Lean4Lean primitive policy translates the Bool constant to the VExpr Bool constant. -/
theorem translated_bool_const_translates {env : VEnv} (hord : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) {Us : List Name} {Δ : VLCtx} :
    TrExprS env Us Δ (.const ``Bool []) .bool := by
  exact hprim.trBool hord hbool

end PSKernelKA40
