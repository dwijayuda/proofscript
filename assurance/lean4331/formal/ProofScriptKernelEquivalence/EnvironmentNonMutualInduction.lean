import ProofScriptKernelEquivalence.DeclarationEnvironment
import ProofScriptKernelEquivalence.RecursorNonMutualGenerated

namespace ProofScriptKernelEquivalence
namespace EnvironmentNonMutualInduction

open DeclarationEnvironment RecursorNonMutualGenerated

/--
A normalized non-mutual declaration package at the current assurance boundary.

The package stores the already-generated environment entries that will be
installed atomically (family, constructors, recursor and any auxiliary safe
entries represented by v71), plus the generated recursor specifications whose
types/rules/iota behavior are checked extensionally by the recursor theorem.

Admission/positivity is proved in the preceding normalized direct/indexed
slices; this module proves that once such a package is formed, installing a
sequence of packages preserves the Core→Lean environment relation.
-/
structure PSNonMutualPackage where
  entries : List PSEntry
  generatedRecursors : List PSGeneratedNonMutualRecursor

namespace PSNonMutualPackage

def toLeanEntries (p : PSNonMutualPackage) : List Lean.ConstantInfo :=
  p.entries.map PSEntry.toLeanInfo

def installPS (env : PSEnv) (p : PSNonMutualPackage) : PSEnv :=
  installManyPS env p.entries

def installLean (env : LeanEnv) (p : PSNonMutualPackage) : LeanEnv :=
  installManyLean env p.toLeanEntries

/-- Generated recursor obligations carried by a normalized package. -/
def GeneratedRecursorsSound (p : PSNonMutualPackage) : Prop :=
  ∀ r ∈ p.generatedRecursors,
    PSExpr.toLean r.typeSpec.typeExpr = r.toLean.typeSpec.typeExpr ∧
    r.toLean.rules.length = r.rules.length ∧
    r.toLean.rules.map (fun x => (x.ctor, x.nfields)) =
      r.rules.map (fun x => (x.ctor, x.nfields)) ∧
    (∀ lr ∈ r.toLean.rules,
      ∃ pr ∈ r.rules,
        lr = pr.toLean ∧
        PSExpr.toLean pr.minorType.typeExpr = lr.minorType.typeExpr ∧
        PSExpr.toLean pr.iota.before = lr.iota.before ∧
        PSExpr.toLean pr.iota.after = lr.iota.after)

/-- Every generated recursor inside a formed package satisfies the structural/extensional bridge. -/
theorem generatedRecursors_sound (p : PSNonMutualPackage) : p.GeneratedRecursorsSound := by
  intro r hr
  refine ⟨?_, ?_, ?_, ?_⟩
  · exact generatedRecursor_declType_toLean r
  · exact generatedRecursor_ruleCount_toLean r
  · exact generatedRecursor_ruleKeys_toLean r
  · exact generatedRecursor_rules_sound r

end PSNonMutualPackage

/-- Installing one normalized non-mutual package commutes with Core→Lean translation. -/
theorem installPackage_preserves (env : PSEnv) (p : PSNonMutualPackage) :
    toLeanEnv (p.installPS env) = p.installLean (toLeanEnv env) := by
  exact installMany_preserves env p.entries

/-- Ordered whole-environment construction from normalized non-mutual packages. -/
def installPackagesPS : PSEnv → List PSNonMutualPackage → PSEnv
  | env, [] => env
  | env, p :: ps => installPackagesPS (p.installPS env) ps

/-- Lean image of the same ordered whole-environment construction. -/
def installPackagesLean : LeanEnv → List PSNonMutualPackage → LeanEnv
  | env, [] => env
  | env, p :: ps => installPackagesLean (p.installLean env) ps

/--
Whole-environment induction: a sequence of normalized non-mutual packages installs
to the same translated environment as the corresponding Lean sequence.
-/
theorem installPackages_preserves (env : PSEnv) (pkgs : List PSNonMutualPackage) :
    toLeanEnv (installPackagesPS env pkgs) =
      installPackagesLean (toLeanEnv env) pkgs := by
  induction pkgs generalizing env with
  | nil => rfl
  | cons p ps ih =>
      unfold installPackagesPS installPackagesLean
      calc
        toLeanEnv (installPackagesPS (p.installPS env) ps) =
            installPackagesLean (toLeanEnv (p.installPS env)) ps := ih (p.installPS env)
        _ = installPackagesLean (p.installLean (toLeanEnv env)) ps := by
            rw [installPackage_preserves env p]

/-- The final installed environment still supplies the direct-typing constant lookup premise. -/
theorem directEnvSound_afterPackages (env : PSEnv) (pkgs : List PSNonMutualPackage) :
    DirectEnvSound
      (asPSDirectEnv (installPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installPackagesPS env pkgs))) := by
  exact directEnvSound (installPackagesPS env pkgs)

/-- The final installed environment still supplies the delta/transparency premise. -/
theorem deltaEnvExact_afterPackages (env : PSEnv) (pkgs : List PSNonMutualPackage) :
    DeltaEnvExact
      (asPSDeltaEnv (installPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installPackagesPS env pkgs))) := by
  exact deltaEnvExact (installPackagesPS env pkgs)

/-- Exact universe-instantiated type lookup survives whole non-mutual environment construction. -/
theorem typeLookup_afterPackages_exact
    (env : PSEnv) (pkgs : List PSNonMutualPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup (installPackagesPS env pkgs) n us) =
      leanTypeLookup (toLeanEnv (installPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact typeLookup_exact (installPackagesPS env pkgs) n us

/-- Exact delta lookup survives whole non-mutual environment construction. -/
theorem unfoldLookup_afterPackages_exact
    (env : PSEnv) (pkgs : List PSNonMutualPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup (installPackagesPS env pkgs) n us) =
      leanUnfoldLookup (toLeanEnv (installPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact unfoldLookup_exact (installPackagesPS env pkgs) n us

/--
Combined checkpoint theorem for the current O-DECL/O-IND non-mutual boundary:
ordered installation commutes with translation, the installed environment supplies
the typing and delta premises used by earlier theorems, and every generated
recursor package satisfies the structural/extensional recursor bridge.
-/
theorem nonMutualWholeEnvironment_sound
    (env : PSEnv) (pkgs : List PSNonMutualPackage) :
    toLeanEnv (installPackagesPS env pkgs) =
      installPackagesLean (toLeanEnv env) pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installPackagesPS env pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installPackagesPS env pkgs))) ∧
    (∀ p ∈ pkgs, p.GeneratedRecursorsSound) := by
  refine ⟨installPackages_preserves env pkgs, ?_, ?_, ?_⟩
  · exact directEnvSound_afterPackages env pkgs
  · exact deltaEnvExact_afterPackages env pkgs
  · intro p hp
    exact PSNonMutualPackage.generatedRecursors_sound p

end EnvironmentNonMutualInduction
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.PSNonMutualPackage.generatedRecursors_sound
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.installPackage_preserves
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.installPackages_preserves
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.directEnvSound_afterPackages
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.deltaEnvExact_afterPackages
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.typeLookup_afterPackages_exact
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.unfoldLookup_afterPackages_exact
#print axioms ProofScriptKernelEquivalence.EnvironmentNonMutualInduction.nonMutualWholeEnvironment_sound
