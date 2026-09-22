import Lean4Lean.TypeChecker
import Lean4Lean.FuelConfig

/-
KA-42 direct Lean4Lean resource/error conservativity bridge.

This file imports the real Lean4Lean TypeChecker and FuelConfig surfaces. It
only proves small wrapper obligations showing that resource exhaustion is
represented as deterministic errors (`deepRecursion`) rather than as successful
acceptance, and that the explicit fuel defaults are visible at the proof
surface. It does not prove full PSKernel resource/error conservativity or a
complete executable refinement theorem.
-/

namespace PSKernelKA42

open Lean4Lean
open Lean hiding Environment Exception
open Kernel

/-- The default recursion-depth fuel is explicit and deterministic. -/
theorem translated_default_rec_depth_policy :
    ({} : FuelConfig).recDepth = 50000 := by
  rfl

/-- The default WHNF unfold-loop fuel is explicit and deterministic. -/
theorem translated_default_whnf_policy :
    ({} : FuelConfig).whnf = 100000 := by
  rfl

/-- The default lazy-delta fuel is explicit and deterministic. -/
theorem translated_default_lazy_delta_policy :
    ({} : FuelConfig).lazyDelta = 1000 := by
  rfl

/-- At recursion fuel zero, WHNF cannot accept by computation; it throws `deepRecursion`. -/
theorem translated_zero_fuel_whnf_deep_recursion (e : Expr) :
    (TypeChecker.Methods.withFuel 0).whnf e = throw Exception.deepRecursion := by
  rfl

/-- At recursion fuel zero, WHNF-core cannot accept by computation; it throws `deepRecursion`. -/
theorem translated_zero_fuel_whnfCore_deep_recursion (e : Expr) (cheapProj : Bool) :
    (TypeChecker.Methods.withFuel 0).whnfCore e cheapProj = throw Exception.deepRecursion := by
  rfl

/-- At recursion fuel zero, inference cannot accept by computation; it throws `deepRecursion`. -/
theorem translated_zero_fuel_inferType_deep_recursion (e : Expr) (inferOnly : Bool) :
    (TypeChecker.Methods.withFuel 0).inferType e inferOnly = throw Exception.deepRecursion := by
  rfl

/-- At recursion fuel zero, definitional equality cannot accept by computation; it throws `deepRecursion`. -/
theorem translated_zero_fuel_isDefEqCore_deep_recursion (t s : Expr) :
    (TypeChecker.Methods.withFuel 0).isDefEqCore t s = throw Exception.deepRecursion := by
  rfl

/-- An `Except.error` result cannot provide an accepted value for any postcondition. -/
theorem translated_except_error_not_success {α : Type} {e : Exception} {Q : α → Prop} :
    (∀ a, (throw e : Except Exception α) = .ok a → Q a) := by
  intro a h
  cases h

end PSKernelKA42
