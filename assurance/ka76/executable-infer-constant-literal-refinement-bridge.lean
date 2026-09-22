import Lean4Lean.Verify.TypeChecker.InferType

namespace Lean4Lean.PSKernelKA76
open Lean hiding Environment Exception
open Kernel
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.TypeChecker.Inner

/-- KA-76 bridge: constant inference transports checked constants into translated typing. -/
theorem translated_inferConstant_wf {c : VContext} {name : Name} {ls : List Level} {inferOnly : Bool}
    (H : ∀ l ∈ ls, l.hasMVar' = false)
    (hinf : inferOnly = true → ∃ e', c.TrExprS (.const name ls) e') :
    (Lean4Lean.TypeChecker.Inner.inferConstant c.toContext name ls inferOnly).WF fun ty =>
      ∃ e' ty', c.TrTyping (.const name ls) ty e' ty' := by
  exact Lean4Lean.TypeChecker.Inner.inferConstant.WF H hinf

/-- KA-76 bridge: Nat constants used by literals are primitive-backed. -/
theorem translated_literal_is_primitive_nat_wf :
    Environment.primitives.contains ``Nat := by
  exact Lean4Lean.TypeChecker.Inner.literal_is_primitive (.inl rfl)

/-- KA-76 bridge: Char.ofNat constants used by literals are primitive-backed. -/
theorem translated_literal_is_primitive_char_wf :
    Environment.primitives.contains ``Char.ofNat := by
  exact Lean4Lean.TypeChecker.Inner.literal_is_primitive (.inr (.inl rfl))

/-- KA-76 bridge: String.ofList constants used by literals are primitive-backed. -/
theorem translated_literal_is_primitive_string_wf :
    Environment.primitives.contains ``String.ofList := by
  exact Lean4Lean.TypeChecker.Inner.literal_is_primitive (.inr (.inr rfl))

/-- KA-76 bridge: literal inference transports source literals to translated primitive literal typing. -/
theorem translated_infer_literal_wf {c : VContext} {l : Literal}
    (H : c.venv.ContainsLits l) :
    c.TrTyping (.lit l) l.type (.trLiteral l) (.const l.typeName []) := by
  exact Lean4Lean.TypeChecker.Inner.infer_literal H

end Lean4Lean.PSKernelKA76
