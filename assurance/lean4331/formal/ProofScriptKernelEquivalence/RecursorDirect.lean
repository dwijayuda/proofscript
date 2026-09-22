import ProofScriptKernelEquivalence.RecursorMetadata
import ProofScriptKernelEquivalence.Projection

namespace ProofScriptKernelEquivalence
namespace RecursorDirect

open RecursorMetadata Projection

/-- Direct recursive induction hypotheses for the non-indexed shared slice. -/
inductive PSDirectIH
    (recursor : PSExpr) (preArgs : List PSExpr) :
    List Bool → List PSExpr → List PSExpr → Prop where
  | nil : PSDirectIH recursor preArgs [] [] []
  | plain {mask : List Bool} {field : PSExpr} {fields ihs : List PSExpr} :
      PSDirectIH recursor preArgs mask fields ihs →
      PSDirectIH recursor preArgs (false :: mask) (field :: fields) ihs
  | recursive {mask : List Bool} {field : PSExpr} {fields ihs : List PSExpr} :
      PSDirectIH recursor preArgs mask fields ihs →
      PSDirectIH recursor preArgs (true :: mask) (field :: fields)
        (PSMkApps recursor (preArgs ++ [field]) :: ihs)

/-- Lean-expression image of the same direct IH construction. -/
inductive LeanDirectIH
    (recursor : Lean.Expr) (preArgs : List Lean.Expr) :
    List Bool → List Lean.Expr → List Lean.Expr → Prop where
  | nil : LeanDirectIH recursor preArgs [] [] []
  | plain {mask : List Bool} {field : Lean.Expr} {fields ihs : List Lean.Expr} :
      LeanDirectIH recursor preArgs mask fields ihs →
      LeanDirectIH recursor preArgs (false :: mask) (field :: fields) ihs
  | recursive {mask : List Bool} {field : Lean.Expr} {fields ihs : List Lean.Expr} :
      LeanDirectIH recursor preArgs mask fields ihs →
      LeanDirectIH recursor preArgs (true :: mask) (field :: fields)
        (LeanMkApps recursor (preArgs ++ [field]) :: ihs)

/-- Core→Lean translation preserves direct IH generation exactly. -/
theorem directIH_sound
    {recursor : PSExpr} {preArgs : List PSExpr}
    {mask : List Bool} {fields ihs : List PSExpr}
    (h : PSDirectIH recursor preArgs mask fields ihs) :
    LeanDirectIH (PSExpr.toLean recursor) (preArgs.map PSExpr.toLean)
      mask (fields.map PSExpr.toLean) (ihs.map PSExpr.toLean) := by
  induction h with
  | nil => exact .nil
  | plain h ih => exact .plain ih
  | recursive h ih =>
      simpa [Projection.mkApps_toLean, List.map_append] using LeanDirectIH.recursive ih

/--
Direct non-indexed recursor iota assembly for the current fields-first profile.
The rule lookup and constructor recognition are explicit premises; the result is
the selected minor applied to all constructor fields followed by recursive IHs.
-/
inductive PSDirectIota : PSExpr → PSExpr → Prop where
  | reduce
      {recursor ctor minor : PSExpr}
      {params motives minors ctorParams fields ihs rest : List PSExpr}
      {mask : List Bool} :
      PSDirectIH recursor (params ++ motives ++ minors) mask fields ihs →
      PSDirectIota
        (PSMkApps recursor
          (params ++ motives ++ minors ++
            [PSMkApps ctor (ctorParams ++ fields)] ++ rest))
        (PSMkApps minor (fields ++ ihs ++ rest))

/-- Lean-expression image of the same direct recursor iota assembly. -/
inductive LeanDirectIota : Lean.Expr → Lean.Expr → Prop where
  | reduce
      {recursor ctor minor : Lean.Expr}
      {params motives minors ctorParams fields ihs rest : List Lean.Expr}
      {mask : List Bool} :
      LeanDirectIH recursor (params ++ motives ++ minors) mask fields ihs →
      LeanDirectIota
        (LeanMkApps recursor
          (params ++ motives ++ minors ++
            [LeanMkApps ctor (ctorParams ++ fields)] ++ rest))
        (LeanMkApps minor (fields ++ ihs ++ rest))

/-- Translation preserves direct recursor iota assembly exactly. -/
theorem iota_sound {before after : PSExpr} (h : PSDirectIota before after) :
    LeanDirectIota (PSExpr.toLean before) (PSExpr.toLean after) := by
  cases h with
  | @reduce recursor ctor minor params motives minors ctorParams fields ihs rest mask hIH =>
      have hIHL := directIH_sound hIH
      simp only [Projection.mkApps_toLean, List.map_append, List.map_cons, List.map_nil]
      apply LeanDirectIota.reduce
      simpa [List.map_append] using hIHL

/-- Abstract K-like major reconstruction premise used by both kernels. -/
inductive PSKMajor (typeEq : PSExpr → PSExpr → Prop) : PSExpr → PSExpr → Prop where
  | replace {major ctor majorTy ctorTy : PSExpr} :
      typeEq majorTy ctorTy → PSKMajor typeEq major ctor

inductive LeanKMajor (typeEq : Lean.Expr → Lean.Expr → Prop) : Lean.Expr → Lean.Expr → Prop where
  | replace {major ctor majorTy ctorTy : Lean.Expr} :
      typeEq majorTy ctorTy → LeanKMajor typeEq major ctor

/-- K-major reconstruction preserves translation relative to a sound type-equality premise. -/
theorem kMajor_sound
    (psEq : PSExpr → PSExpr → Prop) (leanEq : Lean.Expr → Lean.Expr → Prop)
    (hEq : ∀ a b, psEq a b → leanEq (PSExpr.toLean a) (PSExpr.toLean b))
    {major ctor : PSExpr}
    (h : PSKMajor psEq major ctor) :
    LeanKMajor leanEq (PSExpr.toLean major) (PSExpr.toLean ctor) := by
  cases h with
  | replace he => exact .replace (hEq _ _ he)

end RecursorDirect
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.RecursorDirect.directIH_sound
#print axioms ProofScriptKernelEquivalence.RecursorDirect.iota_sound
#print axioms ProofScriptKernelEquivalence.RecursorDirect.kMajor_sound
