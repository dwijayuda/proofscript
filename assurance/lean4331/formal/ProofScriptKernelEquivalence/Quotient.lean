import ProofScriptKernelEquivalence.Projection
import Lean.Declaration

namespace ProofScriptKernelEquivalence
namespace Quotient

open Projection

/-- ProofScript shadow of Lean's four trusted quotient constant kinds. -/
inductive PSQuotKind where
  | type
  | ctor
  | lift
  | ind
  deriving Repr, DecidableEq

namespace PSQuotKind

def toLean : PSQuotKind → Lean.QuotKind
  | .type => .type
  | .ctor => .ctor
  | .lift => .lift
  | .ind => .ind

end PSQuotKind

/--
Reduction/type-relevant metadata for one quotient primitive after the untrusted
name adapter has already produced Lean names.
-/
structure PSQuotVal where
  name : Lean.Name
  levelParams : List Lean.Name
  type : PSExpr
  kind : PSQuotKind
  deriving Repr

/-- Exact correspondence boundary to the actual pinned `Lean.QuotVal`. -/
def Corresponds (ps : PSQuotVal) (lean : Lean.QuotVal) : Prop :=
  lean.name = ps.name ∧
  lean.levelParams = ps.levelParams ∧
  lean.type = PSExpr.toLean ps.type ∧
  lean.kind = ps.kind.toLean

/-- Constant name correspondence is explicit. -/
theorem name_eq {ps : PSQuotVal} {lean : Lean.QuotVal}
    (h : Corresponds ps lean) : lean.name = ps.name := h.1

/-- Universe-parameter correspondence is explicit. -/
theorem levelParams_eq {ps : PSQuotVal} {lean : Lean.QuotVal}
    (h : Corresponds ps lean) : lean.levelParams = ps.levelParams := h.2.1

/-- The entire primitive type is the Core→Lean expression image. -/
theorem type_eq {ps : PSQuotVal} {lean : Lean.QuotVal}
    (h : Corresponds ps lean) : lean.type = PSExpr.toLean ps.type := h.2.2.1

/-- Quotient kind correspondence is explicit. -/
theorem kind_eq {ps : PSQuotVal} {lean : Lean.QuotVal}
    (h : Corresponds ps lean) : lean.kind = ps.kind.toLean := h.2.2.2

/--
The exact trusted quotient computation fragment used by ProofScript.  Both
`Quot.lift` and `Quot.ind` inspect a `Quot.mk` major and pass its representative
to argument position 3.  Extra applications after the major are preserved.
-/
inductive PSQuotIota : PSExpr → PSExpr → Prop where
  | lift
      {u v : PSLevel} {α r β f sound rep : PSExpr} {rest : List PSExpr} :
      PSQuotIota
        (PSMkApps (.const ``Quot.lift [u, v])
          ([α, r, β, f, sound,
            PSMkApps (.const ``Quot.mk [u]) [α, r, rep]] ++ rest))
        (PSMkApps f (rep :: rest))
  | ind
      {u : PSLevel} {α r motive f rep : PSExpr} {rest : List PSExpr} :
      PSQuotIota
        (PSMkApps (.const ``Quot.ind [u])
          ([α, r, motive, f,
            PSMkApps (.const ``Quot.mk [u]) [α, r, rep]] ++ rest))
        (PSMkApps f (rep :: rest))

/-- Lean-expression image of the same pinned quotient computation fragment. -/
inductive LeanQuotIota : Lean.Expr → Lean.Expr → Prop where
  | lift
      {u v : Lean.Level} {α r β f sound rep : Lean.Expr} {rest : List Lean.Expr} :
      LeanQuotIota
        (LeanMkApps (.const ``Quot.lift [u, v])
          ([α, r, β, f, sound,
            LeanMkApps (.const ``Quot.mk [u]) [α, r, rep]] ++ rest))
        (LeanMkApps f (rep :: rest))
  | ind
      {u : Lean.Level} {α r motive f rep : Lean.Expr} {rest : List Lean.Expr} :
      LeanQuotIota
        (LeanMkApps (.const ``Quot.ind [u])
          ([α, r, motive, f,
            LeanMkApps (.const ``Quot.mk [u]) [α, r, rep]] ++ rest))
        (LeanMkApps f (rep :: rest))

/-- Core→Lean translation preserves `Quot.lift` and `Quot.ind` iota exactly. -/
theorem iota_sound {before after : PSExpr} (h : PSQuotIota before after) :
    LeanQuotIota (PSExpr.toLean before) (PSExpr.toLean after) := by
  cases h with
  | @lift u v α r β f sound rep rest =>
      simp only [mkApps_toLean, PSExpr.toLean, List.map_append, List.map_cons, List.map_nil]
      exact LeanQuotIota.lift
  | @ind u α r motive f rep rest =>
      simp only [mkApps_toLean, PSExpr.toLean, List.map_append, List.map_cons, List.map_nil]
      exact LeanQuotIota.ind

end Quotient
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.Quotient.name_eq
#print axioms ProofScriptKernelEquivalence.Quotient.levelParams_eq
#print axioms ProofScriptKernelEquivalence.Quotient.type_eq
#print axioms ProofScriptKernelEquivalence.Quotient.kind_eq
#print axioms ProofScriptKernelEquivalence.Quotient.iota_sound
