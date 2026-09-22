import Lean4Lean.Theory.Typing.HeadReduction
import Lean4Lean.Theory.Typing.Lemmas

/-
KA-39 direct Lean4Lean definitional equality / WHNF refinement bridge.

KA-37 and KA-38 established theory-level weak-head-reduction and WHNF
preservation facts. KA-39 adds the definitional-equality bridge surface needed
before an executable PSKernel conversion checker can be related to Lean4Lean:
typed defeq exposes typing evidence, typed defeq erases to untyped defeq,
untyped defeq has reflexive/symmetric structure, and typing/defeq facts are
monotone under environment extension.

This remains a theory-level bridge. It does not prove that PSKernel's
executable conversion algorithm is complete, terminating, or equivalent to
Lean4Lean's executable TypeChecker.isDefEq.
-/

namespace PSKernelKA39
open Lean4Lean
open Lean4Lean.VEnv
open Lean4Lean.VExpr

/-- A Lean4Lean definitional equality carries typing evidence for both sides. -/
theorem translated_defeq_has_type_pair {env : VEnv} {U : Nat} {Γ : List VExpr} {e1 e2 A : VExpr}
    (h : IsDefEq env U Γ e1 e2 A) :
    HasType env U Γ e1 A ∧ HasType env U Γ e2 A := by
  exact h.hasType

/-- A typed Lean4Lean definitional equality can be viewed as untyped defeq. -/
theorem translated_defeq_to_untyped {env : VEnv} {U : Nat} {Γ : List VExpr} {e1 e2 A : VExpr}
    (h : IsDefEq env U Γ e1 e2 A) :
    IsDefEqU env U Γ e1 e2 := by
  exact h.toU

/-- Lean4Lean untyped definitional equality is reflexive for WF expressions. -/
theorem translated_defeq_untyped_refl {env : VEnv} {U : Nat} {Γ : List VExpr} {e : VExpr}
    (h : VExpr.WF env U Γ e) :
    IsDefEqU env U Γ e e := by
  exact IsDefEqU.refl h

/-- Lean4Lean untyped definitional equality is symmetric. -/
theorem translated_defeq_untyped_symm {env : VEnv} {U : Nat} {Γ : List VExpr} {e1 e2 : VExpr}
    (h : IsDefEqU env U Γ e1 e2) :
    IsDefEqU env U Γ e2 e1 := by
  exact h.symm

/-- Lean4Lean typed definitional equality is monotone under environment extension. -/
theorem translated_defeq_mono_env {env env' : VEnv} {U : Nat} {Γ : List VExpr} {e1 e2 A : VExpr}
    (henv : env ≤ env') (h : IsDefEq env U Γ e1 e2 A) :
    IsDefEq env' U Γ e1 e2 A := by
  exact h.mono henv

/-- Lean4Lean untyped definitional equality is monotone under environment extension. -/
theorem translated_defeq_untyped_mono_env {env env' : VEnv} {U : Nat} {Γ : List VExpr} {e1 e2 : VExpr}
    (henv : env ≤ env') (h : IsDefEqU env U Γ e1 e2) :
    IsDefEqU env' U Γ e1 e2 := by
  exact h.mono henv

/-- Lean4Lean typing is monotone under environment extension. -/
theorem translated_has_type_mono_env {env env' : VEnv} {U : Nat} {Γ : List VExpr} {e A : VExpr}
    (henv : env ≤ env') (h : HasType env U Γ e A) :
    HasType env' U Γ e A := by
  exact h.mono henv

end PSKernelKA39
