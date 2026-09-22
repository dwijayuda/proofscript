import ProofScriptKernelEquivalence.DeclarationOrdinary
import ProofScriptKernelEquivalence.DeclarationInductiveMetadata
import ProofScriptKernelEquivalence.DeclarationRecursorMetadata
import ProofScriptKernelEquivalence.Quotient

namespace ProofScriptKernelEquivalence
namespace DeclarationEnvironment

open DeclarationOrdinary DeclarationInductiveMetadata DeclarationRecursorMetadata
open ProofScriptKernelEquivalence.Quotient

/--
Environment entry kinds whose installation/lookup correspondence is currently
closed: ordinary safe declarations, quotient primitives, and already-formed inductive/constructor/recursor metadata.

Already-formed inductive/constructor/recursor entries are included; their generation/admission proof remains under O-IND.
-/
inductive PSEntry where
  | ordinary (decl : PSOrdDecl)
  | quotient (decl : PSQuotVal)
  | inductInfo (decl : PSInductiveInfo)
  | ctorInfo (decl : PSConstructorInfo)
  | recInfo (decl : PSRecursorInfo)
  deriving Repr

namespace PSEntry

def name : PSEntry → Lean.Name
  | .ordinary d => d.name
  | .quotient q => q.name
  | .inductInfo d => d.name
  | .ctorInfo d => d.name
  | .recInfo d => d.name

def levelParams : PSEntry → List Lean.Name
  | .ordinary d => d.levelParams
  | .quotient q => q.levelParams
  | .inductInfo d => d.levelParams
  | .ctorInfo d => d.levelParams
  | .recInfo d => d.levelParams

def type : PSEntry → PSExpr
  | .ordinary d => d.type
  | .quotient q => q.type
  | .inductInfo d => d.type
  | .ctorInfo d => d.type
  | .recInfo d => d.type

def transparentValue? : PSEntry → Option PSExpr
  | .ordinary d => d.transparentValue?
  | .quotient _ => none
  | .inductInfo _ => none
  | .ctorInfo _ => none
  | .recInfo _ => none

/-- The actual pinned Lean `QuotVal` image of a ProofScript quotient entry. -/
def quotToLeanVal (q : PSQuotVal) : Lean.QuotVal :=
  Lean.QuotVal.mk (Lean.ConstantVal.mk q.name q.levelParams (PSExpr.toLean q.type)) q.kind.toLean

/-- Entry-wise translation into the actual pinned Lean `ConstantInfo` datatype. -/
def toLeanInfo : PSEntry → Lean.ConstantInfo
  | .ordinary d => d.toLeanInfo
  | .quotient q => .quotInfo (quotToLeanVal q)
  | .inductInfo d => .inductInfo d.toLeanVal
  | .ctorInfo d => .ctorInfo d.toLeanVal
  | .recInfo d => .recInfo d.toLeanVal

@[simp] theorem toLeanInfo_name (d : PSEntry) : d.toLeanInfo.name = d.name := by
  cases d with
  | ordinary d => exact PSOrdDecl.toLeanInfo_name d
  | quotient q => rfl
  | inductInfo d => rfl
  | ctorInfo d => rfl
  | recInfo d => rfl

@[simp] theorem toLeanInfo_levelParams (d : PSEntry) : d.toLeanInfo.levelParams = d.levelParams := by
  cases d with
  | ordinary d => exact PSOrdDecl.toLeanInfo_levelParams d
  | quotient q => rfl
  | inductInfo d => rfl
  | ctorInfo d => rfl
  | recInfo d => rfl

@[simp] theorem toLeanInfo_type (d : PSEntry) : d.toLeanInfo.type = PSExpr.toLean d.type := by
  cases d with
  | ordinary d => exact PSOrdDecl.toLeanInfo_type d
  | quotient q => rfl
  | inductInfo d => rfl
  | ctorInfo d => rfl
  | recInfo d => rfl

/-- The quotient branch discharges the previously abstract `Corresponds` relation by construction. -/
theorem quotient_corresponds (q : PSQuotVal) : Corresponds q (quotToLeanVal q) := by
  exact ⟨rfl, rfl, rfl, rfl⟩

@[simp] theorem transparentValue_toLean (d : PSEntry) :
    DeclarationOrdinary.leanTransparentValue? d.toLeanInfo =
      Option.map PSExpr.toLean d.transparentValue? := by
  cases d with
  | ordinary d => exact DeclarationOrdinary.transparentValue_toLean d
  | quotient q => rfl
  | inductInfo d => rfl
  | ctorInfo d => rfl
  | recInfo d => rfl

end PSEntry

/-- Newest entry is searched first, matching the earlier explicit environment model. -/
def PSEnv := List PSEntry
def LeanEnv := List Lean.ConstantInfo

def findPS : PSEnv → Lean.Name → Option PSEntry
  | [], _ => none
  | d :: ds, n => if d.name == n then some d else findPS ds n

def findLean : LeanEnv → Lean.Name → Option Lean.ConstantInfo
  | [], _ => none
  | d :: ds, n => if d.name == n then some d else findLean ds n

def toLeanEnv (env : PSEnv) : LeanEnv := env.map PSEntry.toLeanInfo

@[simp] theorem find_toLean (env : PSEnv) (n : Lean.Name) :
    findLean (toLeanEnv env) n = Option.map PSEntry.toLeanInfo (findPS env n) := by
  induction env with
  | nil => rfl
  | cons d ds ih =>
      simp only [toLeanEnv, List.map_cons, findLean, findPS, PSEntry.toLeanInfo_name]
      by_cases h : d.name == n
      · simp [h]
      · simp [h]
        simpa [toLeanEnv] using ih

/-- Installing any already-related entry preserves the environment translation. -/
theorem install_preserves (env : PSEnv) (d : PSEntry) :
    toLeanEnv (d :: env) = d.toLeanInfo :: toLeanEnv env := rfl

/-- Sequential batch installation; later entries become newer in the explicit list model. -/
def installManyPS : PSEnv → List PSEntry → PSEnv
  | env, [] => env
  | env, d :: ds => installManyPS (d :: env) ds

def installManyLean : LeanEnv → List Lean.ConstantInfo → LeanEnv
  | env, [] => env
  | env, d :: ds => installManyLean (d :: env) ds

/-- Translation commutes with atomic/staged batch construction entry-for-entry. -/
theorem installMany_preserves (env : PSEnv) (ds : List PSEntry) :
    toLeanEnv (installManyPS env ds) =
      installManyLean (toLeanEnv env) (ds.map PSEntry.toLeanInfo) := by
  induction ds generalizing env with
  | nil => rfl
  | cons d ds ih =>
      simp only [installManyPS, List.map_cons, installManyLean]
      exact ih (d :: env)

/-- Exact-arity type lookup over the combined environment. -/
def psTypeLookup (env : PSEnv) (n : Lean.Name) (us : List PSLevel) : Option PSExpr :=
  match findPS env n with
  | none => none
  | some d =>
      if us.length = d.levelParams.length then
        some (PSExprV71.instantiateLevelParams d.type d.levelParams us)
      else none

def leanTypeLookup (env : LeanEnv) (n : Lean.Name) (us : List Lean.Level) : Option Lean.Expr :=
  match findLean env n with
  | none => none
  | some d =>
      if us.length = d.levelParams.length then
        some (LeanExprSpecV71.instantiateLevelParams d.type d.levelParams us)
      else none

/-- Constant type lookup is exact for ordinary + quotient entries. -/
theorem typeLookup_exact (env : PSEnv) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup env n us) =
      leanTypeLookup (toLeanEnv env) n (us.map PSLevel.toLean) := by
  unfold psTypeLookup leanTypeLookup
  rw [find_toLean]
  cases h : findPS env n with
  | none => simp [h]
  | some d =>
      simp only [h, Option.map_some]
      simp only [PSEntry.toLeanInfo_levelParams, PSEntry.toLeanInfo_type, List.length_map]
      by_cases harity : us.length = d.levelParams.length
      · simp only [harity, ↓reduceIte, Option.map_some]
        exact congrArg some (PSExprV71.instantiateLevelParams_toLeanSpec d.type d.levelParams us)
      · simp [harity]

/-- Combined translated environments discharge the direct-typing constant premise. -/
def asPSDirectEnv (env : PSEnv) : PSDirectEnv := ⟨psTypeLookup env⟩
def asLeanDirectEnv (env : LeanEnv) : LeanDirectEnv := ⟨leanTypeLookup env⟩

theorem directEnvSound (env : PSEnv) :
    DirectEnvSound (asPSDirectEnv env) (asLeanDirectEnv (toLeanEnv env)) := by
  intro n us ty h
  change psTypeLookup env n us = some ty at h
  change leanTypeLookup (toLeanEnv env) n (us.map PSLevel.toLean) = some (PSExpr.toLean ty)
  have hx := typeLookup_exact env n us
  rw [h] at hx
  exact hx.symm

/-- Only ordinary definitions expose delta bodies; quotient primitives do not. -/
def psUnfoldLookup (env : PSEnv) (n : Lean.Name) (us : List PSLevel) : Option PSExpr :=
  match findPS env n with
  | none => none
  | some d =>
      match d.transparentValue? with
      | none => none
      | some v =>
          if us.length = d.levelParams.length then
            some (PSExprV71.instantiateLevelParams v d.levelParams us)
          else none

def leanUnfoldLookup (env : LeanEnv) (n : Lean.Name) (us : List Lean.Level) : Option Lean.Expr :=
  match findLean env n with
  | none => none
  | some d =>
      match DeclarationOrdinary.leanTransparentValue? d with
      | none => none
      | some v =>
          if us.length = d.levelParams.length then
            some (LeanExprSpecV71.instantiateLevelParams v d.levelParams us)
          else none

/-- Delta lookup remains exact after quotient constants are present in the environment. -/
theorem unfoldLookup_exact (env : PSEnv) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup env n us) =
      leanUnfoldLookup (toLeanEnv env) n (us.map PSLevel.toLean) := by
  unfold psUnfoldLookup leanUnfoldLookup
  rw [find_toLean]
  cases hfind : findPS env n with
  | none => simp [hfind]
  | some d =>
      simp only [hfind, Option.map_some, PSEntry.transparentValue_toLean,
        PSEntry.toLeanInfo_levelParams, List.length_map]
      cases hv : d.transparentValue? with
      | none => simp [hv]
      | some v =>
          simp only [hv, Option.map_some]
          by_cases harity : us.length = d.levelParams.length
          · simp only [harity, ↓reduceIte, Option.map_some]
            exact congrArg some (PSExprV71.instantiateLevelParams_toLeanSpec v d.levelParams us)
          · simp [harity]

def asPSDeltaEnv (env : PSEnv) : PSDeltaEnv := ⟨psUnfoldLookup env⟩
def asLeanDeltaEnv (env : LeanEnv) : LeanDeltaEnv := ⟨leanUnfoldLookup env⟩

theorem deltaEnvExact (env : PSEnv) :
    DeltaEnvExact (asPSDeltaEnv env) (asLeanDeltaEnv (toLeanEnv env)) := by
  intro n us
  exact unfoldLookup_exact env n us



/-- Kernel names reserved by quotient initialization. -/
def quotientNames : List Lean.Name := [`Quot, `Quot.mk, `Quot.lift, `Quot.ind]

/--
Normalized ProofScript-side quotient admission precondition: canonical Eq/Eq.refl
are installed and every quotient primitive name is fresh.
-/
def PSQuotReady (env : PSEnv) : Prop :=
  findPS env `Eq = some (.inductInfo DeclarationInductiveMetadata.canonicalEqInfo) ∧
  findPS env `Eq.refl = some (.ctorInfo DeclarationInductiveMetadata.canonicalEqReflInfo) ∧
  ∀ n ∈ quotientNames, findPS env n = none

/-- Lean image of the same normalized quotient admission precondition. -/
def LeanQuotReady (env : LeanEnv) : Prop :=
  findLean env `Eq = some (PSEntry.toLeanInfo (.inductInfo DeclarationInductiveMetadata.canonicalEqInfo)) ∧
  findLean env `Eq.refl = some (PSEntry.toLeanInfo (.ctorInfo DeclarationInductiveMetadata.canonicalEqReflInfo)) ∧
  ∀ n ∈ quotientNames, findLean env n = none

/-- Canonical Eq/Eq.refl presence and quotient-name freshness are preserved exactly. -/
theorem quotReady_toLean {env : PSEnv} (h : PSQuotReady env) : LeanQuotReady (toLeanEnv env) := by
  rcases h with ⟨hEq, hRefl, hFresh⟩
  constructor
  · have hx := find_toLean env `Eq
    rw [hEq] at hx
    exact hx
  constructor
  · have hx := find_toLean env `Eq.refl
    rw [hRefl] at hx
    exact hx
  · intro n hn
    have hx := find_toLean env n
    rw [hFresh n hn] at hx
    exact hx

/-- Convert a formed quotient primitive list into combined environment entries. -/
def psQuotEntries (qs : List PSQuotVal) : List PSEntry := qs.map PSEntry.quotient

def leanQuotEntries (qs : List PSQuotVal) : List Lean.ConstantInfo :=
  (psQuotEntries qs).map PSEntry.toLeanInfo

/--
Once the primitive values are formed, atomic/staged quotient installation commutes
with translation. The exact four primitive values are separately bound to the
shipped generator by the native structural differential.
-/
theorem quotientBatch_preserves (env : PSEnv) (qs : List PSQuotVal) :
    toLeanEnv (installManyPS env (psQuotEntries qs)) =
      installManyLean (toLeanEnv env) (leanQuotEntries qs) := by
  exact installMany_preserves env (psQuotEntries qs)

end DeclarationEnvironment
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.PSEntry.quotient_corresponds
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.find_toLean
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.installMany_preserves
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.typeLookup_exact
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.directEnvSound
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.unfoldLookup_exact
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.deltaEnvExact
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.quotReady_toLean
#print axioms ProofScriptKernelEquivalence.DeclarationEnvironment.quotientBatch_preserves
