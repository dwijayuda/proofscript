import ProofScriptKernelEquivalence.ExprLevelInstantiationV71
import ProofScriptKernelEquivalence.TypingDirect
import ProofScriptKernelEquivalence.DeltaTransparency
import Lean.Declaration

namespace ProofScriptKernelEquivalence
namespace DeclarationOrdinary

/-- The ordinary safe declaration kinds installed by the trusted Core slice. -/
inductive PSReducibility where
  | regular
  | abbrev
  deriving Repr, DecidableEq

inductive PSOrdDecl where
  | axiom (name : Lean.Name) (levelParams : List Lean.Name) (type : PSExpr)
  | definition (name : Lean.Name) (levelParams : List Lean.Name)
      (type value : PSExpr) (reducibility : PSReducibility)
  | theorem (name : Lean.Name) (levelParams : List Lean.Name) (type value : PSExpr)
  | opaque (name : Lean.Name) (levelParams : List Lean.Name) (type value : PSExpr)
  deriving Repr

namespace PSOrdDecl

def name : PSOrdDecl → Lean.Name
  | .axiom n _ _ | .definition n _ _ _ _ | .theorem n _ _ _ | .opaque n _ _ _ => n

def levelParams : PSOrdDecl → List Lean.Name
  | .axiom _ ps _ | .definition _ ps _ _ _ | .theorem _ ps _ _ | .opaque _ ps _ _ => ps

def type : PSOrdDecl → PSExpr
  | .axiom _ _ ty | .definition _ _ ty _ _ | .theorem _ _ ty _ | .opaque _ _ ty _ => ty

def transparentValue? : PSOrdDecl → Option PSExpr
  | .definition _ _ _ v _ => some v
  | _ => none

private def reducibilityToLean : PSReducibility → Lean.ReducibilityHints
  | .regular => .regular 0
  | .abbrev => .abbrev

/-- Structural translation into the actual pinned Lean `ConstantInfo` datatype. -/
def toLeanInfo : PSOrdDecl → Lean.ConstantInfo
  | .axiom n ps ty =>
      .axiomInfo (Lean.AxiomVal.mk (Lean.ConstantVal.mk n ps (PSExpr.toLean ty)) false)
  | .definition n ps ty v r =>
      .defnInfo (Lean.DefinitionVal.mk
        (Lean.ConstantVal.mk n ps (PSExpr.toLean ty))
        (PSExpr.toLean v) (reducibilityToLean r) .safe [n])
  | .theorem n ps ty v =>
      .thmInfo (Lean.TheoremVal.mk
        (Lean.ConstantVal.mk n ps (PSExpr.toLean ty)) (PSExpr.toLean v) [n])
  | .opaque n ps ty v =>
      .opaqueInfo (Lean.OpaqueVal.mk
        (Lean.ConstantVal.mk n ps (PSExpr.toLean ty)) (PSExpr.toLean v) false [n])

@[simp] theorem toLeanInfo_name (d : PSOrdDecl) : d.toLeanInfo.name = d.name := by
  cases d <;> rfl

@[simp] theorem toLeanInfo_levelParams (d : PSOrdDecl) : d.toLeanInfo.levelParams = d.levelParams := by
  cases d <;> rfl

@[simp] theorem toLeanInfo_type (d : PSOrdDecl) : d.toLeanInfo.type = PSExpr.toLean d.type := by
  cases d <;> rfl

end PSOrdDecl

/-- Persistent ordinary environment model; newest declaration is searched first. -/
def PSOrdEnv := List PSOrdDecl
def LeanOrdEnv := List Lean.ConstantInfo


def findPS : PSOrdEnv → Lean.Name → Option PSOrdDecl
  | [], _ => none
  | d :: ds, n => if d.name == n then some d else findPS ds n

def findLean : LeanOrdEnv → Lean.Name → Option Lean.ConstantInfo
  | [], _ => none
  | d :: ds, n => if d.name == n then some d else findLean ds n

/-- Environment translation is declaration-wise and preserves installation order. -/
def toLeanEnv (env : PSOrdEnv) : LeanOrdEnv := env.map PSOrdDecl.toLeanInfo

@[simp] theorem find_toLean (env : PSOrdEnv) (n : Lean.Name) :
    findLean (toLeanEnv env) n = Option.map PSOrdDecl.toLeanInfo (findPS env n) := by
  induction env with
  | nil => rfl
  | cons d ds ih =>
      simp only [toLeanEnv, List.map_cons, findLean, findPS, PSOrdDecl.toLeanInfo_name]
      by_cases h : d.name == n
      · simp [h]
      · simp [h]
        simpa [toLeanEnv] using ih

/-- Adding one corresponding declaration preserves the structural environment relation. -/
theorem install_preserves (env : PSOrdEnv) (d : PSOrdDecl) :
    toLeanEnv (d :: env) = d.toLeanInfo :: toLeanEnv env := rfl

/-- Type lookup with the exact-arity boundary used by trusted constant instantiation. -/
def psTypeLookup (env : PSOrdEnv) (n : Lean.Name) (us : List PSLevel) : Option PSExpr :=
  match findPS env n with
  | none => none
  | some d =>
      if us.length = d.levelParams.length then
        some (PSExprV71.instantiateLevelParams d.type d.levelParams us)
      else none

/-- Lean-side structural lookup using the explicit v71 instantiation specification. -/
def leanTypeLookup (env : LeanOrdEnv) (n : Lean.Name) (us : List Lean.Level) : Option Lean.Expr :=
  match findLean env n with
  | none => none
  | some d =>
      if us.length = d.levelParams.length then
        some (LeanExprSpecV71.instantiateLevelParams d.type d.levelParams us)
      else none

/-- Exact type-lookup correspondence for every translated ordinary environment. -/
theorem typeLookup_exact (env : PSOrdEnv) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup env n us) =
      leanTypeLookup (toLeanEnv env) n (us.map PSLevel.toLean) := by
  unfold psTypeLookup leanTypeLookup
  rw [find_toLean]
  cases h : findPS env n with
  | none => simp [h]
  | some d =>
      simp only [h, Option.map_some]
      simp only [PSOrdDecl.toLeanInfo_levelParams, PSOrdDecl.toLeanInfo_type, List.length_map]
      by_cases harity : us.length = d.levelParams.length
      · simp only [harity, ↓reduceIte, Option.map_some]
        exact congrArg some (PSExprV71.instantiateLevelParams_toLeanSpec d.type d.levelParams us)
      · simp [harity]

/-- Ordinary translated environments discharge the typing theorem's constant-lookup premise. -/
def asPSDirectEnv (env : PSOrdEnv) : PSDirectEnv := ⟨psTypeLookup env⟩
def asLeanDirectEnv (env : LeanOrdEnv) : LeanDirectEnv := ⟨leanTypeLookup env⟩

theorem directEnvSound (env : PSOrdEnv) :
    DirectEnvSound (asPSDirectEnv env) (asLeanDirectEnv (toLeanEnv env)) := by
  intro n us ty h
  change psTypeLookup env n us = some ty at h
  change leanTypeLookup (toLeanEnv env) n (us.map PSLevel.toLean) = some (PSExpr.toLean ty)
  have hx := typeLookup_exact env n us
  rw [h] at hx
  exact hx.symm

/-- Delta lookup exposes only ordinary definitions; axioms/theorems/opaque declarations stay stuck. -/
def psUnfoldLookup (env : PSOrdEnv) (n : Lean.Name) (us : List PSLevel) : Option PSExpr :=
  match findPS env n with
  | none => none
  | some d =>
      match d.transparentValue? with
      | none => none
      | some v =>
          if us.length = d.levelParams.length then
            some (PSExprV71.instantiateLevelParams v d.levelParams us)
          else none

/-- Lean image of the same logical transparency projection over actual `ConstantInfo`. -/
def leanTransparentValue? : Lean.ConstantInfo → Option Lean.Expr
  | .defnInfo d => some d.value
  | _ => none

@[simp] theorem transparentValue_toLean (d : PSOrdDecl) :
    leanTransparentValue? d.toLeanInfo = Option.map PSExpr.toLean d.transparentValue? := by
  cases d <;> rfl


def leanUnfoldLookup (env : LeanOrdEnv) (n : Lean.Name) (us : List Lean.Level) : Option Lean.Expr :=
  match findLean env n with
  | none => none
  | some d =>
      match leanTransparentValue? d with
      | none => none
      | some v =>
          if us.length = d.levelParams.length then
            some (LeanExprSpecV71.instantiateLevelParams v d.levelParams us)
          else none

/-- Exact delta-body correspondence for every translated ordinary environment. -/
theorem unfoldLookup_exact (env : PSOrdEnv) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup env n us) =
      leanUnfoldLookup (toLeanEnv env) n (us.map PSLevel.toLean) := by
  unfold psUnfoldLookup leanUnfoldLookup
  rw [find_toLean]
  cases hfind : findPS env n with
  | none => simp [hfind]
  | some d =>
      simp only [hfind, Option.map_some, transparentValue_toLean,
        PSOrdDecl.toLeanInfo_levelParams, List.length_map]
      cases hv : d.transparentValue? with
      | none => simp [hv]
      | some v =>
          simp only [hv, Option.map_some]
          by_cases harity : us.length = d.levelParams.length
          · simp only [harity, ↓reduceIte, Option.map_some]
            exact congrArg some (PSExprV71.instantiateLevelParams_toLeanSpec v d.levelParams us)
          · simp [harity]


def asPSDeltaEnv (env : PSOrdEnv) : PSDeltaEnv := ⟨psUnfoldLookup env⟩
def asLeanDeltaEnv (env : LeanOrdEnv) : LeanDeltaEnv := ⟨leanUnfoldLookup env⟩

theorem deltaEnvExact (env : PSOrdEnv) :
    DeltaEnvExact (asPSDeltaEnv env) (asLeanDeltaEnv (toLeanEnv env)) := by
  intro n us
  exact unfoldLookup_exact env n us

end DeclarationOrdinary
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DeclarationOrdinary.find_toLean
#print axioms ProofScriptKernelEquivalence.DeclarationOrdinary.typeLookup_exact
#print axioms ProofScriptKernelEquivalence.DeclarationOrdinary.directEnvSound
#print axioms ProofScriptKernelEquivalence.DeclarationOrdinary.unfoldLookup_exact
#print axioms ProofScriptKernelEquivalence.DeclarationOrdinary.deltaEnvExact
