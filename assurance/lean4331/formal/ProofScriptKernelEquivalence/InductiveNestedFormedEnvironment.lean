import ProofScriptKernelEquivalence.DeclarationEnvironment

namespace ProofScriptKernelEquivalence
namespace InductiveNestedFormedEnvironment

open DeclarationEnvironment

/--
A normalized nested-inductive preprocessing package at the current v71 assurance
boundary.

This is deliberately a formed-environment certificate.  The executable checker
has already reduced a Lean-style nested occurrence to trusted auxiliary family,
constructor, recursor and public outer-family entries.  This structure records
those formed entries and the nonempty helper chain; it does not by itself prove
full nested positivity, preprocessing completeness, or recursor RHS
correspondence.
-/
structure PSNestedPackage where
  outerName : Lean.Name
  containerNames : List Lean.Name
  helperNames : List Lean.Name
  recursorNames : List Lean.Name
  entries : List PSEntry
  hasHelper : 1 ≤ helperNames.length

namespace PSNestedPackage

/-- Lean image of the exact formed entries installed by a nested package. -/
def toLeanEntries (p : PSNestedPackage) : List Lean.ConstantInfo :=
  p.entries.map PSEntry.toLeanInfo

/-- ProofScript-side atomic installation of a formed nested package. -/
def installPS (env : PSEnv) (p : PSNestedPackage) : PSEnv :=
  installManyPS env p.entries

/-- Lean-side image of the same atomic nested installation. -/
def installLean (env : LeanEnv) (p : PSNestedPackage) : LeanEnv :=
  installManyLean env p.toLeanEntries

/-- The package contains at least one helper family produced by preprocessing. -/
theorem has_nonempty_helper_chain (p : PSNestedPackage) : 1 ≤ p.helperNames.length :=
  p.hasHelper

/-- Installing one formed nested package commutes with Core→Lean translation. -/
theorem install_preserves (env : PSEnv) (p : PSNestedPackage) :
    toLeanEnv (p.installPS env) = p.installLean (toLeanEnv env) := by
  exact installMany_preserves env p.entries

end PSNestedPackage

/-- Ordered whole-environment construction from formed nested packages. -/
def installNestedPackagesPS : PSEnv → List PSNestedPackage → PSEnv
  | env, [] => env
  | env, p :: ps => installNestedPackagesPS (p.installPS env) ps

/-- Lean image of the same ordered whole-environment construction. -/
def installNestedPackagesLean : LeanEnv → List PSNestedPackage → LeanEnv
  | env, [] => env
  | env, p :: ps => installNestedPackagesLean (p.installLean env) ps

/--
Whole-environment induction for formed nested packages: sequential atomic nested
preprocessing/installations produce the same translated environment on the
ProofScript and Lean sides.
-/
theorem installNestedPackages_preserves (env : PSEnv) (pkgs : List PSNestedPackage) :
    toLeanEnv (installNestedPackagesPS env pkgs) =
      installNestedPackagesLean (toLeanEnv env) pkgs := by
  induction pkgs generalizing env with
  | nil => rfl
  | cons p ps ih =>
      unfold installNestedPackagesPS installNestedPackagesLean
      calc
        toLeanEnv (installNestedPackagesPS (p.installPS env) ps) =
            installNestedPackagesLean (toLeanEnv (p.installPS env)) ps := ih (p.installPS env)
        _ = installNestedPackagesLean (p.installLean (toLeanEnv env)) ps := by
            rw [PSNestedPackage.install_preserves env p]

/-- The final formed-nested environment still supplies direct-typing lookup soundness. -/
theorem directEnvSound_afterNestedPackages (env : PSEnv) (pkgs : List PSNestedPackage) :
    DirectEnvSound
      (asPSDirectEnv (installNestedPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installNestedPackagesPS env pkgs))) := by
  exact directEnvSound (installNestedPackagesPS env pkgs)

/-- The final formed-nested environment still supplies ordinary delta exactness. -/
theorem deltaEnvExact_afterNestedPackages (env : PSEnv) (pkgs : List PSNestedPackage) :
    DeltaEnvExact
      (asPSDeltaEnv (installNestedPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installNestedPackagesPS env pkgs))) := by
  exact deltaEnvExact (installNestedPackagesPS env pkgs)

/-- Exact universe-instantiated type lookup survives formed nested installation. -/
theorem typeLookup_afterNestedPackages_exact
    (env : PSEnv) (pkgs : List PSNestedPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup (installNestedPackagesPS env pkgs) n us) =
      leanTypeLookup (toLeanEnv (installNestedPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact typeLookup_exact (installNestedPackagesPS env pkgs) n us

/-- Exact delta lookup survives formed nested installation. -/
theorem unfoldLookup_afterNestedPackages_exact
    (env : PSEnv) (pkgs : List PSNestedPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup (installNestedPackagesPS env pkgs) n us) =
      leanUnfoldLookup (toLeanEnv (installNestedPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact unfoldLookup_exact (installNestedPackagesPS env pkgs) n us

/--
Combined checkpoint theorem for the current formed nested O-DECL boundary:
ordered atomic nested installation commutes with translation and preserves the
direct constant-typing and ordinary-delta premises used by earlier typing and
reduction proofs.
-/
theorem formedNestedWholeEnvironment_sound
    (env : PSEnv) (pkgs : List PSNestedPackage) :
    toLeanEnv (installNestedPackagesPS env pkgs) =
      installNestedPackagesLean (toLeanEnv env) pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installNestedPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installNestedPackagesPS env pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installNestedPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installNestedPackagesPS env pkgs))) := by
  exact ⟨installNestedPackages_preserves env pkgs,
    directEnvSound_afterNestedPackages env pkgs,
    deltaEnvExact_afterNestedPackages env pkgs⟩

end InductiveNestedFormedEnvironment
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.PSNestedPackage.has_nonempty_helper_chain
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.PSNestedPackage.install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.installNestedPackages_preserves
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.directEnvSound_afterNestedPackages
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.deltaEnvExact_afterNestedPackages
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.typeLookup_afterNestedPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.unfoldLookup_afterNestedPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.formedNestedWholeEnvironment_sound
