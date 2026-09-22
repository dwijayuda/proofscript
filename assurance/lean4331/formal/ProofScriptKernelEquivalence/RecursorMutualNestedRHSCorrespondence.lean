import ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization
import ProofScriptKernelEquivalence.RecursorDirect
import ProofScriptKernelEquivalence.RecursorIndexed
import ProofScriptKernelEquivalence.RecursorNonMutualGenerated

namespace ProofScriptKernelEquivalence
namespace RecursorMutualNestedRHSCorrespondence

open RecursorDirect
open RecursorIndexed
open DeclarationEnvironment
open DeltaTransparency
open InductiveFormedEnvironmentGeneralization

/--
One v71 RHS/iota step in the ProofScript trusted-core model.

The current executable kernel reaches mutual and nested recursor computation by
composing already-certified direct/indexed iota steps across public recursors
and generated helper recursors.  This datatype intentionally captures that
extensional boundary: it does not yet prove full Lean `RecursorRule.rhs`
construction for arbitrary mutual/nested declarations.
-/
inductive PSRHSStep : PSExpr → PSExpr → Prop where
  | direct {before after : PSExpr} :
      PSDirectIota before after → PSRHSStep before after
  | indexed {before after : PSExpr} :
      PSIndexedIota before after → PSRHSStep before after

/-- Lean-expression image of one v71 RHS/iota step. -/
inductive LeanRHSStep : Lean.Expr → Lean.Expr → Prop where
  | direct {before after : Lean.Expr} :
      LeanDirectIota before after → LeanRHSStep before after
  | indexed {before after : Lean.Expr} :
      LeanIndexedIota before after → LeanRHSStep before after

/-- Core→Lean translation preserves one RHS/iota step. -/
theorem rhsStep_toLean {before after : PSExpr} (h : PSRHSStep before after) :
    LeanRHSStep (PSExpr.toLean before) (PSExpr.toLean after) := by
  cases h with
  | direct hd => exact .direct (iota_sound hd)
  | indexed hi => exact .indexed (indexedIota_sound hi)

/-- A linked ProofScript RHS trace, used by mutual/nested helper-recursion paths. -/
inductive PSRHSTrace : PSExpr → PSExpr → Prop where
  | done (e : PSExpr) : PSRHSTrace e e
  | step {before mid after : PSExpr} :
      PSRHSStep before mid → PSRHSTrace mid after → PSRHSTrace before after

/-- Lean-expression image of a linked RHS trace. -/
inductive LeanRHSTrace : Lean.Expr → Lean.Expr → Prop where
  | done (e : Lean.Expr) : LeanRHSTrace e e
  | step {before mid after : Lean.Expr} :
      LeanRHSStep before mid → LeanRHSTrace mid after → LeanRHSTrace before after

/-- Core→Lean translation preserves linked RHS traces exactly. -/
theorem rhsTrace_toLean {before after : PSExpr} (h : PSRHSTrace before after) :
    LeanRHSTrace (PSExpr.toLean before) (PSExpr.toLean after) := by
  induction h with
  | done e => exact .done (PSExpr.toLean e)
  | step hStep hRest ih => exact .step (rhsStep_toLean hStep) ih

/-- A deterministic RHS evaluator represented as its extensional trace. -/
structure PSRHSEval where
  before : PSExpr
  after : PSExpr
  trace : PSRHSTrace before after

structure LeanRHSEval where
  before : Lean.Expr
  after : Lean.Expr
  trace : LeanRHSTrace before after

namespace PSRHSEval

/-- Translate one extensional RHS evaluator into Lean expressions. -/
def toLean (e : PSRHSEval) : LeanRHSEval :=
  { before := PSExpr.toLean e.before
    after := PSExpr.toLean e.after
    trace := rhsTrace_toLean e.trace }

end PSRHSEval

/-- RHS evaluator endpoints commute with Core→Lean translation. -/
theorem rhsTrace_eval_toLean (e : PSRHSEval) :
    e.toLean.before = PSExpr.toLean e.before ∧
    e.toLean.after = PSExpr.toLean e.after := by
  exact ⟨rfl, rfl⟩

/--
A linked recursor RHS package for one public recursor/helper-recursion path.
`helpers` records the generated helper recursors crossed by the trace; it is
metadata for the certificate and is translated name-for-name.
-/
structure PSLinkedRHS where
  publicRecursor : Lean.Name
  helpers : List Lean.Name
  eval : PSRHSEval

structure LeanLinkedRHS where
  publicRecursor : Lean.Name
  helpers : List Lean.Name
  eval : LeanRHSEval

namespace PSLinkedRHS

/-- Translate linked RHS metadata and the extensional evaluator. -/
def toLean (r : PSLinkedRHS) : LeanLinkedRHS :=
  { publicRecursor := r.publicRecursor
    helpers := r.helpers
    eval := r.eval.toLean }

end PSLinkedRHS

/-- Linked RHS endpoints and helper-recursion names translate exactly. -/
theorem linkedRHS_toLean (r : PSLinkedRHS) :
    r.toLean.publicRecursor = r.publicRecursor ∧
    r.toLean.helpers = r.helpers ∧
    r.toLean.eval.before = PSExpr.toLean r.eval.before ∧
    r.toLean.eval.after = PSExpr.toLean r.eval.after := by
  exact ⟨rfl, rfl, rfl, rfl⟩

/-- The conservative v71 classification of RHS evidence. -/
inductive RHSBoundaryKind where
  | mutual
  | nested
  | mutualNested
  deriving Repr, DecidableEq

/-- One ProofScript mutual/nested RHS correspondence boundary item. -/
structure PSMixedRHSBoundary where
  kind : RHSBoundaryKind
  rhs : PSLinkedRHS

structure LeanMixedRHSBoundary where
  kind : RHSBoundaryKind
  rhs : LeanLinkedRHS

namespace PSMixedRHSBoundary

/-- Translate one mixed RHS boundary. -/
def toLean (b : PSMixedRHSBoundary) : LeanMixedRHSBoundary :=
  { kind := b.kind
    rhs := b.rhs.toLean }

end PSMixedRHSBoundary

/-- Mutual RHS boundary soundness at the current linked-iota trace layer. -/
theorem mutualRHSBoundary_sound (b : PSMixedRHSBoundary) (h : b.kind = RHSBoundaryKind.mutual) :
    b.toLean.kind = RHSBoundaryKind.mutual ∧
    b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
    b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after := by
  cases b
  simp [PSMixedRHSBoundary.toLean, PSLinkedRHS.toLean, PSRHSEval.toLean] at h ⊢
  exact h

/-- Nested RHS boundary soundness at the current linked-iota trace layer. -/
theorem nestedRHSBoundary_sound (b : PSMixedRHSBoundary) (h : b.kind = RHSBoundaryKind.nested) :
    b.toLean.kind = RHSBoundaryKind.nested ∧
    b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
    b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after := by
  cases b
  simp [PSMixedRHSBoundary.toLean, PSLinkedRHS.toLean, PSRHSEval.toLean] at h ⊢
  exact h

/-- Mixed mutual+nested RHS boundary soundness at the current linked-iota trace layer. -/
theorem mixedRHSBoundary_sound (b : PSMixedRHSBoundary) :
    b.toLean.kind = b.kind ∧
    b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
    b.toLean.rhs.helpers = b.rhs.helpers ∧
    b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
    b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after := by
  cases b
  simp [PSMixedRHSBoundary.toLean, PSLinkedRHS.toLean, PSRHSEval.toLean]

/-- Every RHS boundary in an ordered mixed certificate translates soundly. -/
theorem allMixedRHSBoundaries_sound (bs : List PSMixedRHSBoundary) :
    ∀ b ∈ bs,
      b.toLean.kind = b.kind ∧
      b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
      b.toLean.rhs.helpers = b.rhs.helpers ∧
      b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
      b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after := by
  intro b hb
  exact mixedRHSBoundary_sound b

/--
Combined formed-environment plus linked-RHS certificate.

This binds the previous mixed formed-inductive environment theorem to the new
RHS trace correspondence.  It remains deliberately below K3: full mutual/nested
admission completeness, positivity completeness, and arbitrary Lean stored-RHS
reconstruction are later obligations.
-/
structure PSFormedEnvironmentWithRHS where
  env : PSEnv
  pkgs : List PSFormedInductivePackage
  rhsBoundaries : List PSMixedRHSBoundary

/-- The current v71 combined environment/RHS checkpoint theorem. -/
theorem formedEnvironmentWithRHS_sound (s : PSFormedEnvironmentWithRHS) :
    toLeanEnv (installFormedPackagesPS s.env s.pkgs) =
      installFormedPackagesLean (toLeanEnv s.env) s.pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS s.env s.pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS s.env s.pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS s.env s.pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS s.env s.pkgs))) ∧
    (∀ p : PSFormedInductivePackage, p ∈ s.pkgs → p.RecursorBoundarySound) ∧
    (∀ b : PSMixedRHSBoundary, b ∈ s.rhsBoundaries →
      b.toLean.kind = b.kind ∧
      b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
      b.toLean.rhs.helpers = b.rhs.helpers ∧
      b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
      b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after) := by
  rcases formedInductiveWholeEnvironment_sound s.env s.pkgs with ⟨hEnv, hDirect, hDelta, hRec⟩
  exact ⟨hEnv, hDirect, hDelta, hRec, allMixedRHSBoundaries_sound s.rhsBoundaries⟩

end RecursorMutualNestedRHSCorrespondence
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.rhsStep_toLean
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.rhsTrace_toLean
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.rhsTrace_eval_toLean
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.linkedRHS_toLean
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.mutualRHSBoundary_sound
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.nestedRHSBoundary_sound
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.mixedRHSBoundary_sound
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.allMixedRHSBoundaries_sound
#print axioms ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence.formedEnvironmentWithRHS_sound
