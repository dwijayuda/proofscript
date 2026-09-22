import ProofScriptKernelEquivalence.InductiveNonMutualIntegration

namespace ProofScriptKernelEquivalence
namespace RecursorNonMutualGenerated

open InductiveIndexedAdmission RecursorIndexed InductiveNonMutualIntegration Projection

/-- Lean-side image of one ProofScript Core binder. -/
def leanBinder (b : PSExpr × PSBinderInfo) : Lean.Expr × Lean.BinderInfo :=
  (PSExpr.toLean b.1, b.2.toLean)

@[simp] theorem leanBinders_eq_map (bs : List (PSExpr × PSBinderInfo)) :
    leanBinders bs = bs.map leanBinder := by
  simp [leanBinders, leanBinder]

/-- Recursor result shape: applying the motive to all result indices and then the major premise. -/
def PSRecursorResult (motive : PSExpr) (indices : List PSExpr) (major : PSExpr) : PSExpr :=
  PSMkApps motive (indices ++ [major])

def LeanRecursorResult (motive : Lean.Expr) (indices : List Lean.Expr) (major : Lean.Expr) : Lean.Expr :=
  LeanMkApps motive (indices ++ [major])

/-- Core→Lean translation preserves the generated recursor result expression exactly. -/
@[simp] theorem recursorResult_toLean
    (motive : PSExpr) (indices : List PSExpr) (major : PSExpr) :
    PSExpr.toLean (PSRecursorResult motive indices major) =
      LeanRecursorResult (PSExpr.toLean motive) (indices.map PSExpr.toLean) (PSExpr.toLean major) := by
  simp [PSRecursorResult, LeanRecursorResult, Projection.mkApps_toLean, List.map_append]

/-- Family/major type generated for the final major argument of a non-mutual recursor. -/
def PSRecursorMajorType
    (family : Lean.Name) (levels : List PSLevel)
    (params indices : List PSExpr) : PSExpr :=
  PSMkApps (.const family levels) (params ++ indices)

def LeanRecursorMajorType
    (family : Lean.Name) (levels : List Lean.Level)
    (params indices : List Lean.Expr) : Lean.Expr :=
  LeanMkApps (.const family levels) (params ++ indices)

/-- Core→Lean translation preserves generated major-family applications. -/
@[simp] theorem recursorMajorType_toLean
    (family : Lean.Name) (levels : List PSLevel)
    (params indices : List PSExpr) :
    PSExpr.toLean (PSRecursorMajorType family levels params indices) =
      LeanRecursorMajorType family (levels.map PSLevel.toLean)
        (params.map PSExpr.toLean) (indices.map PSExpr.toLean) := by
  simp [PSRecursorMajorType, LeanRecursorMajorType, Projection.mkApps_toLean,
    PSExpr.toLean, List.map_append]

/-- Generated Π-telescope type spine used for recursor and minor-premise types. -/
def PSRecursorTypeSpine (binders : List (PSExpr × PSBinderInfo)) (result : PSExpr) : PSExpr :=
  psMkPiTelescope binders result

def LeanRecursorTypeSpine (binders : List (Lean.Expr × Lean.BinderInfo)) (result : Lean.Expr) : Lean.Expr :=
  leanMkPiTelescope binders result

/-- Core→Lean translation preserves the generated Π-telescope spine exactly. -/
@[simp] theorem recursorTypeSpine_toLean
    (binders : List (PSExpr × PSBinderInfo)) (result : PSExpr) :
    PSExpr.toLean (PSRecursorTypeSpine binders result) =
      LeanRecursorTypeSpine (leanBinders binders) (PSExpr.toLean result) := by
  exact piTelescope_toLean binders result

/--
Generated non-mutual recursor type specification.  For non-mutual families there
is one motive. `prefixBinders` covers parameters, the motive binder and minor
binders; `indexBinders` and `majorBinder` are the final recursor arguments.
-/
structure PSGeneratedRecursorType where
  prefixBinders : List (PSExpr × PSBinderInfo)
  indexBinders : List (PSExpr × PSBinderInfo)
  majorBinder : PSExpr × PSBinderInfo
  motive : PSExpr
  resultIndices : List PSExpr
  major : PSExpr

structure LeanGeneratedRecursorType where
  prefixBinders : List (Lean.Expr × Lean.BinderInfo)
  indexBinders : List (Lean.Expr × Lean.BinderInfo)
  majorBinder : Lean.Expr × Lean.BinderInfo
  motive : Lean.Expr
  resultIndices : List Lean.Expr
  major : Lean.Expr

namespace PSGeneratedRecursorType

def typeExpr (s : PSGeneratedRecursorType) : PSExpr :=
  PSRecursorTypeSpine
    (s.prefixBinders ++ s.indexBinders ++ [s.majorBinder])
    (PSRecursorResult s.motive s.resultIndices s.major)

def toLean (s : PSGeneratedRecursorType) : LeanGeneratedRecursorType :=
  { prefixBinders := leanBinders s.prefixBinders
    indexBinders := leanBinders s.indexBinders
    majorBinder := leanBinder s.majorBinder
    motive := PSExpr.toLean s.motive
    resultIndices := s.resultIndices.map PSExpr.toLean
    major := PSExpr.toLean s.major }

end PSGeneratedRecursorType

namespace LeanGeneratedRecursorType

def typeExpr (s : LeanGeneratedRecursorType) : Lean.Expr :=
  LeanRecursorTypeSpine
    (s.prefixBinders ++ s.indexBinders ++ [s.majorBinder])
    (LeanRecursorResult s.motive s.resultIndices s.major)

end LeanGeneratedRecursorType

/-- The generated recursor type expression commutes with Core→Lean translation. -/
@[simp] theorem generatedRecursorTypeExpr_toLean (s : PSGeneratedRecursorType) :
    PSExpr.toLean s.typeExpr = s.toLean.typeExpr := by
  cases s
  simp [PSGeneratedRecursorType.typeExpr, LeanGeneratedRecursorType.typeExpr,
    PSGeneratedRecursorType.toLean, recursorTypeSpine_toLean, leanBinder,
    leanBinders, List.map_append]

/--
Generated minor-premise type.  Fields come first, then recursive IH binders,
then the motive applied to the constructor result indices and constructed major.
-/
structure PSGeneratedMinorType where
  fieldBinders : List (PSExpr × PSBinderInfo)
  ihBinders : List (PSExpr × PSBinderInfo)
  motive : PSExpr
  ctorResultIndices : List PSExpr
  constructedMajor : PSExpr

structure LeanGeneratedMinorType where
  fieldBinders : List (Lean.Expr × Lean.BinderInfo)
  ihBinders : List (Lean.Expr × Lean.BinderInfo)
  motive : Lean.Expr
  ctorResultIndices : List Lean.Expr
  constructedMajor : Lean.Expr

namespace PSGeneratedMinorType

def typeExpr (s : PSGeneratedMinorType) : PSExpr :=
  PSRecursorTypeSpine
    (s.fieldBinders ++ s.ihBinders)
    (PSRecursorResult s.motive s.ctorResultIndices s.constructedMajor)

def toLean (s : PSGeneratedMinorType) : LeanGeneratedMinorType :=
  { fieldBinders := leanBinders s.fieldBinders
    ihBinders := leanBinders s.ihBinders
    motive := PSExpr.toLean s.motive
    ctorResultIndices := s.ctorResultIndices.map PSExpr.toLean
    constructedMajor := PSExpr.toLean s.constructedMajor }

end PSGeneratedMinorType

namespace LeanGeneratedMinorType

def typeExpr (s : LeanGeneratedMinorType) : Lean.Expr :=
  LeanRecursorTypeSpine
    (s.fieldBinders ++ s.ihBinders)
    (LeanRecursorResult s.motive s.ctorResultIndices s.constructedMajor)

end LeanGeneratedMinorType

/-- The generated minor-premise type expression commutes with Core→Lean translation. -/
@[simp] theorem generatedMinorTypeExpr_toLean (s : PSGeneratedMinorType) :
    PSExpr.toLean s.typeExpr = s.toLean.typeExpr := by
  cases s
  simp [PSGeneratedMinorType.typeExpr, LeanGeneratedMinorType.typeExpr,
    PSGeneratedMinorType.toLean, recursorTypeSpine_toLean, leanBinders, List.map_append]

/--
One generated recursor rule at the extensional boundary: constructor metadata,
minor type, and procedural iota/RHS behavior.  We compare RHS behavior
extensionally because Lean stores a literal `RecursorRule.rhs`, whereas v71 uses
procedural recursor metadata plus iota construction.
-/
structure PSGeneratedRecursorRule where
  ctor : Lean.Name
  nfields : Nat
  minorType : PSGeneratedMinorType
  iota : PSRecursorExtensionalSpec

structure LeanGeneratedRecursorRule where
  ctor : Lean.Name
  nfields : Nat
  minorType : LeanGeneratedMinorType
  iota : LeanRecursorExtensionalSpec

namespace PSGeneratedRecursorRule

def toLean (r : PSGeneratedRecursorRule) : LeanGeneratedRecursorRule :=
  { ctor := r.ctor
    nfields := r.nfields
    minorType := r.minorType.toLean
    iota := r.iota.toLean }

end PSGeneratedRecursorRule

@[simp] theorem generatedRule_minorType_toLean (r : PSGeneratedRecursorRule) :
    PSExpr.toLean r.minorType.typeExpr = r.toLean.minorType.typeExpr := by
  exact generatedMinorTypeExpr_toLean r.minorType

@[simp] theorem generatedRule_iota_before_toLean (r : PSGeneratedRecursorRule) :
    PSExpr.toLean r.iota.before = r.toLean.iota.before := rfl

@[simp] theorem generatedRule_iota_after_toLean (r : PSGeneratedRecursorRule) :
    PSExpr.toLean r.iota.after = r.toLean.iota.after := rfl

/-- Generated non-mutual recursor package: declaration type plus constructor rules. -/
structure PSGeneratedNonMutualRecursor where
  name : Lean.Name
  typeSpec : PSGeneratedRecursorType
  rules : List PSGeneratedRecursorRule

structure LeanGeneratedNonMutualRecursor where
  name : Lean.Name
  typeSpec : LeanGeneratedRecursorType
  rules : List LeanGeneratedRecursorRule

namespace PSGeneratedNonMutualRecursor

def toLean (r : PSGeneratedNonMutualRecursor) : LeanGeneratedNonMutualRecursor :=
  { name := r.name
    typeSpec := r.typeSpec.toLean
    rules := r.rules.map PSGeneratedRecursorRule.toLean }

end PSGeneratedNonMutualRecursor

/-- Generated non-mutual recursor declaration type translates exactly. -/
@[simp] theorem generatedRecursor_declType_toLean (r : PSGeneratedNonMutualRecursor) :
    PSExpr.toLean r.typeSpec.typeExpr = r.toLean.typeSpec.typeExpr := by
  exact generatedRecursorTypeExpr_toLean r.typeSpec

/-- Rule count is preserved by generated recursor translation. -/
@[simp] theorem generatedRecursor_ruleCount_toLean (r : PSGeneratedNonMutualRecursor) :
    r.toLean.rules.length = r.rules.length := by
  simp [PSGeneratedNonMutualRecursor.toLean]

/-- Constructor rule keys are preserved by generated recursor translation. -/
@[simp] theorem generatedRecursor_ruleKeys_toLean (r : PSGeneratedNonMutualRecursor) :
    r.toLean.rules.map (fun x => (x.ctor, x.nfields)) =
      r.rules.map (fun x => (x.ctor, x.nfields)) := by
  simp [PSGeneratedNonMutualRecursor.toLean, PSGeneratedRecursorRule.toLean]

/-- Every generated rule's minor type and extensional iota image translate. -/
theorem generatedRecursor_rules_sound (r : PSGeneratedNonMutualRecursor) :
    ∀ lr ∈ r.toLean.rules,
      ∃ pr ∈ r.rules,
        lr = pr.toLean ∧
        PSExpr.toLean pr.minorType.typeExpr = lr.minorType.typeExpr ∧
        PSExpr.toLean pr.iota.before = lr.iota.before ∧
        PSExpr.toLean pr.iota.after = lr.iota.after := by
  intro lr hlr
  simp [PSGeneratedNonMutualRecursor.toLean] at hlr
  rcases hlr with ⟨pr, hpr, rfl⟩
  refine ⟨pr, hpr, rfl, ?_, rfl, rfl⟩
  exact generatedMinorTypeExpr_toLean pr.minorType

end RecursorNonMutualGenerated
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.recursorResult_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.recursorMajorType_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.recursorTypeSpine_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRecursorTypeExpr_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedMinorTypeExpr_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRule_minorType_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRule_iota_before_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRule_iota_after_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRecursor_declType_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRecursor_ruleCount_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRecursor_ruleKeys_toLean
#print axioms ProofScriptKernelEquivalence.RecursorNonMutualGenerated.generatedRecursor_rules_sound
