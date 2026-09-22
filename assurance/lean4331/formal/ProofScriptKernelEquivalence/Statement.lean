/-!
ProofScript Core v71 ↔ Lean 4.33.1: formal target statement.

This file deliberately contains NO `axiom`, NO `sorry`, and NO theorem that pretends
kernel equivalence has already been proved.  It records the propositions the formal
workstream must discharge once the exact PSKernel/Lean 4.33.1 theory model is vendored.
-/

namespace ProofScriptKernelEquivalence

/-- Logical result separates semantic rejection from implementation resource exhaustion. -/
inductive CheckResult where
  | accept
  | reject
  | resourceExhausted
  deriving DecidableEq, Repr

/-- Abstract interface intentionally independent of the implementation language. -/
structure KernelModel (Env Obj Ty : Type) where
  translateEnv : Env → Env
  infer : Env → Obj → Option Ty
  accepts : Env → Obj → CheckResult
  defeq : Env → Obj → Obj → Bool

/-- A relation chooses the canonical correspondence between PSCore and Lean objects. -/
structure Correspondence (PEnv PObj PTy LEnv LObj LTy : Type) where
  envRel : PEnv → LEnv → Prop
  objRel : PObj → LObj → Prop
  typeRel : PTy → LTy → Prop

/-- Soundness half: PS acceptance never exceeds the Lean baseline. -/
def AcceptanceSoundness
    {PEnv PObj LEnv LObj : Type}
    (psAccept : PEnv → PObj → CheckResult)
    (leanAccept : LEnv → LObj → Bool)
    (envRel : PEnv → LEnv → Prop)
    (objRel : PObj → LObj → Prop) : Prop :=
  ∀ pe po le lo, envRel pe le → objRel po lo →
    psAccept pe po = .accept → leanAccept le lo = true

/-- Completeness is stated only for non-resource semantics: sufficient budget is existential. -/
def AcceptanceCompleteness
    {Budget PEnv PObj LEnv LObj : Type}
    (psAccept : Budget → PEnv → PObj → CheckResult)
    (leanAccept : LEnv → LObj → Bool)
    (envRel : PEnv → LEnv → Prop)
    (objRel : PObj → LObj → Prop) : Prop :=
  ∀ pe po le lo, envRel pe le → objRel po lo →
    leanAccept le lo = true → ∃ b, psAccept b pe po = .accept

/-- Definitional equality must agree in both directions on related, well-formed objects. -/
def DefEqEquivalence
    {PEnv PObj LEnv LObj : Type}
    (psDefEq : PEnv → PObj → PObj → Bool)
    (leanDefEq : LEnv → LObj → LObj → Bool)
    (envRel : PEnv → LEnv → Prop)
    (objRel : PObj → LObj → Prop) : Prop :=
  ∀ pe pa pb le la lb,
    envRel pe le → objRel pa la → objRel pb lb →
    (psDefEq pe pa pb = true ↔ leanDefEq le la lb = true)

end ProofScriptKernelEquivalence
