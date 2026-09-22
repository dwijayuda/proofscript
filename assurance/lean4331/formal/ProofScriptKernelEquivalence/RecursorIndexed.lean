import ProofScriptKernelEquivalence.RecursorDirect
import ProofScriptKernelEquivalence.InductiveIndexedAdmission

namespace ProofScriptKernelEquivalence
namespace RecursorIndexed

open Projection InductiveIndexedAdmission

/--
Direct indexed induction-hypothesis assembly.  `recursiveIndices` contains one
index tuple for each recursive constructor field, in field order.  The common
`preArgs` are parameters + motive(s) + minors, exactly the prefix used by the
shipped v71 recursor reducer before appending the recursive occurrence's own
indices and major.
-/
inductive PSIndexedIH
    (recursor : PSExpr) (preArgs : List PSExpr) :
    List Bool → List PSExpr → List (List PSExpr) → List PSExpr → Prop where
  | nil : PSIndexedIH recursor preArgs [] [] [] []
  | plain {mask fields recursiveIndices ihs field} :
      PSIndexedIH recursor preArgs mask fields recursiveIndices ihs →
      PSIndexedIH recursor preArgs (false :: mask) (field :: fields)
        recursiveIndices ihs
  | recursive {mask fields recursiveIndices ihs field indices} :
      PSIndexedIH recursor preArgs mask fields recursiveIndices ihs →
      PSIndexedIH recursor preArgs (true :: mask) (field :: fields)
        (indices :: recursiveIndices)
        (PSMkApps recursor (preArgs ++ indices ++ [field]) :: ihs)

inductive LeanIndexedIH
    (recursor : Lean.Expr) (preArgs : List Lean.Expr) :
    List Bool → List Lean.Expr → List (List Lean.Expr) → List Lean.Expr → Prop where
  | nil : LeanIndexedIH recursor preArgs [] [] [] []
  | plain {mask fields recursiveIndices ihs field} :
      LeanIndexedIH recursor preArgs mask fields recursiveIndices ihs →
      LeanIndexedIH recursor preArgs (false :: mask) (field :: fields)
        recursiveIndices ihs
  | recursive {mask fields recursiveIndices ihs field indices} :
      LeanIndexedIH recursor preArgs mask fields recursiveIndices ihs →
      LeanIndexedIH recursor preArgs (true :: mask) (field :: fields)
        (indices :: recursiveIndices)
        (LeanMkApps recursor (preArgs ++ indices ++ [field]) :: ihs)

private theorem map_map_expr (xss : List (List PSExpr)) :
    xss.map (List.map PSExpr.toLean) = xss.map fun xs => xs.map PSExpr.toLean := rfl

/-- Core→Lean translation preserves direct indexed IH assembly exactly. -/
theorem indexedIH_sound
    {recursor : PSExpr} {preArgs : List PSExpr}
    {mask : List Bool} {fields : List PSExpr}
    {recursiveIndices : List (List PSExpr)} {ihs : List PSExpr}
    (h : PSIndexedIH recursor preArgs mask fields recursiveIndices ihs) :
    LeanIndexedIH (PSExpr.toLean recursor) (preArgs.map PSExpr.toLean)
      mask (fields.map PSExpr.toLean)
      (recursiveIndices.map (List.map PSExpr.toLean))
      (ihs.map PSExpr.toLean) := by
  induction h with
  | nil => exact .nil
  | plain h ih => exact .plain ih
  | @recursive mask fields recursiveIndices ihs field indices h ih =>
      have hr := LeanIndexedIH.recursive
        (field := PSExpr.toLean field) (indices := indices.map PSExpr.toLean) ih
      simpa [Projection.mkApps_toLean, List.map_append] using hr

/--
Fields-first indexed iota assembly.  The caller supplies the result index tuple
used in the outer recursor application and each recursive field's own index
tuple used for its induction hypothesis.  Constructor/index extraction is the
separate admission theorem boundary in `InductiveIndexedAdmission`.
-/
inductive PSIndexedIota : PSExpr → PSExpr → Prop where
  | reduce
      {recursor ctor minor : PSExpr}
      {params motives minors resultIndices ctorParams fields ihs rest : List PSExpr}
      {recursiveIndices : List (List PSExpr)} {mask : List Bool} :
      PSIndexedIH recursor (params ++ motives ++ minors)
        mask fields recursiveIndices ihs →
      PSIndexedIota
        (PSMkApps recursor
          (params ++ motives ++ minors ++ resultIndices ++
            [PSMkApps ctor (ctorParams ++ fields)] ++ rest))
        (PSMkApps minor (fields ++ ihs ++ rest))

inductive LeanIndexedIota : Lean.Expr → Lean.Expr → Prop where
  | reduce
      {recursor ctor minor : Lean.Expr}
      {params motives minors resultIndices ctorParams fields ihs rest : List Lean.Expr}
      {recursiveIndices : List (List Lean.Expr)} {mask : List Bool} :
      LeanIndexedIH recursor (params ++ motives ++ minors)
        mask fields recursiveIndices ihs →
      LeanIndexedIota
        (LeanMkApps recursor
          (params ++ motives ++ minors ++ resultIndices ++
            [LeanMkApps ctor (ctorParams ++ fields)] ++ rest))
        (LeanMkApps minor (fields ++ ihs ++ rest))

/-- Translation preserves direct indexed iota assembly exactly. -/
theorem indexedIota_sound {before after : PSExpr} (h : PSIndexedIota before after) :
    LeanIndexedIota (PSExpr.toLean before) (PSExpr.toLean after) := by
  cases h with
  | @reduce recursor ctor minor params motives minors resultIndices ctorParams fields ihs rest recursiveIndices mask hIH =>
      have hIHL := indexedIH_sound hIH
      simp only [Projection.mkApps_toLean, List.map_append, List.map_cons, List.map_nil]
      apply LeanIndexedIota.reduce
      simpa [List.map_append] using hIHL

/--
An admitted terminal indexed recursive occurrence determines an index tuple of
exactly `numIndices`; this is the bridge from the indexed positivity/result
shape to the iota IH premise.
-/
theorem recursiveOccurrence_index_arity
    {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices fieldDepth : Nat} {field : PSExpr}
    (h : PSIndexedPositiveField self levels numParams numIndices fieldDepth field) :
    ∃ terminalIndices : List PSExpr, terminalIndices.length = numIndices := by
  induction h with
  | direct hlen hNo => exact ⟨_, hlen⟩
  | pi hNo hTail ih => exact ih

end RecursorIndexed
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.RecursorIndexed.indexedIH_sound
#print axioms ProofScriptKernelEquivalence.RecursorIndexed.indexedIota_sound
#print axioms ProofScriptKernelEquivalence.RecursorIndexed.recursiveOccurrence_index_arity
