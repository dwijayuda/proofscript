import ProofScriptKernelEquivalence.EnvironmentNonMutualInduction
import ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment
import ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment

namespace ProofScriptKernelEquivalence
namespace InductiveFormedEnvironmentGeneralization

open DeclarationEnvironment
open EnvironmentNonMutualInduction
open InductiveMutualFormedEnvironment
open InductiveNestedFormedEnvironment

/--
A single mixed formed-inductive package at the current v71 assurance boundary.

The constructors intentionally mirror the already-certified formed layers:
non-mutual packages, direct mutual packages, and nested-preprocessing packages.
This is a generalization of environment installation/preservation only.  It is
not a new positivity, admission-completeness, preprocessing-completeness, or
recursor-RHS theorem.
-/
inductive PSFormedInductivePackage where
  | nonMutual (p : PSNonMutualPackage)
  | mutualPkg (p : PSMutualPackage)
  | nestedPkg (p : PSNestedPackage)

namespace PSFormedInductivePackage

/-- ProofScript-side installation for one mixed formed-inductive package. -/
def installPS (env : PSEnv) : PSFormedInductivePackage → PSEnv
  | nonMutual p => p.installPS env
  | mutualPkg p => p.installPS env
  | nestedPkg p => p.installPS env

/-- Lean-side image of the same one-package installation. -/
def installLean (env : LeanEnv) : PSFormedInductivePackage → LeanEnv
  | nonMutual p => p.installLean env
  | mutualPkg p => p.installLean env
  | nestedPkg p => p.installLean env

/--
The current recursor bridge at this boundary is complete only for normalized
non-mutual generated recursors.  Mutual and nested recursor RHS correspondence
remain separate later obligations, so their package-level condition is `True`.
-/
def RecursorBoundarySound : PSFormedInductivePackage → Prop
  | nonMutual p => p.GeneratedRecursorsSound
  | mutualPkg _ => True
  | nestedPkg _ => True

/-- Installing one mixed formed-inductive package commutes with Core→Lean translation. -/
theorem install_preserves (env : PSEnv) (p : PSFormedInductivePackage) :
    toLeanEnv (p.installPS env) = p.installLean (toLeanEnv env) := by
  cases p with
  | nonMutual p => exact installPackage_preserves env p
  | mutualPkg p => exact PSMutualPackage.install_preserves env p
  | nestedPkg p => exact PSNestedPackage.install_preserves env p

/-- Package-level recursor-boundary soundness for the current conservative scope. -/
theorem recursorBoundary_sound (p : PSFormedInductivePackage) :
    p.RecursorBoundarySound := by
  cases p with
  | nonMutual p => exact PSNonMutualPackage.generatedRecursors_sound p
  | mutualPkg _ => trivial
  | nestedPkg _ => trivial

end PSFormedInductivePackage

/-- Ordered whole-environment construction from mixed formed-inductive packages. -/
def installFormedPackagesPS : PSEnv → List PSFormedInductivePackage → PSEnv
  | env, [] => env
  | env, p :: ps => installFormedPackagesPS (p.installPS env) ps

/-- Lean image of the same ordered whole-environment construction. -/
def installFormedPackagesLean : LeanEnv → List PSFormedInductivePackage → LeanEnv
  | env, [] => env
  | env, p :: ps => installFormedPackagesLean (p.installLean env) ps

/--
Mixed whole-environment induction: any ordered sequence of already-formed
non-mutual, mutual, and nested packages installs to the same translated
environment as the corresponding Lean sequence.
-/
theorem installFormedPackages_preserves (env : PSEnv) (pkgs : List PSFormedInductivePackage) :
    toLeanEnv (installFormedPackagesPS env pkgs) =
      installFormedPackagesLean (toLeanEnv env) pkgs := by
  induction pkgs generalizing env with
  | nil => rfl
  | cons p ps ih =>
      unfold installFormedPackagesPS installFormedPackagesLean
      calc
        toLeanEnv (installFormedPackagesPS (p.installPS env) ps) =
            installFormedPackagesLean (toLeanEnv (p.installPS env)) ps := ih (p.installPS env)
        _ = installFormedPackagesLean (p.installLean (toLeanEnv env)) ps := by
            rw [PSFormedInductivePackage.install_preserves env p]

/-- The final mixed formed-inductive environment supplies direct-typing lookup soundness. -/
theorem directEnvSound_afterFormedPackages (env : PSEnv) (pkgs : List PSFormedInductivePackage) :
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS env pkgs))) := by
  exact directEnvSound (installFormedPackagesPS env pkgs)

/-- The final mixed formed-inductive environment supplies ordinary delta exactness. -/
theorem deltaEnvExact_afterFormedPackages (env : PSEnv) (pkgs : List PSFormedInductivePackage) :
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS env pkgs))) := by
  exact deltaEnvExact (installFormedPackagesPS env pkgs)

/-- Exact universe-instantiated type lookup survives mixed formed-package construction. -/
theorem typeLookup_afterFormedPackages_exact
    (env : PSEnv) (pkgs : List PSFormedInductivePackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup (installFormedPackagesPS env pkgs) n us) =
      leanTypeLookup (toLeanEnv (installFormedPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact typeLookup_exact (installFormedPackagesPS env pkgs) n us

/-- Exact delta lookup survives mixed formed-package construction. -/
theorem unfoldLookup_afterFormedPackages_exact
    (env : PSEnv) (pkgs : List PSFormedInductivePackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup (installFormedPackagesPS env pkgs) n us) =
      leanUnfoldLookup (toLeanEnv (installFormedPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact unfoldLookup_exact (installFormedPackagesPS env pkgs) n us

/-- Every mixed formed package satisfies the recursor boundary currently in scope. -/
theorem recursorBoundary_afterFormedPackages
    (pkgs : List PSFormedInductivePackage) :
    ∀ p ∈ pkgs, p.RecursorBoundarySound := by
  intro p hp
  exact PSFormedInductivePackage.recursorBoundary_sound p

/--
Combined checkpoint theorem for the current v71 formed-inductive O-DECL boundary:
ordered mixed installation commutes with translation, the resulting environment
preserves the direct typing and ordinary-delta premises used by existing typing
and reduction theorems, and all in-scope generated recursor obligations remain
sound.  Mutual and nested full recursor RHS correspondence are deliberately left
as later K3 obligations.
-/
theorem formedInductiveWholeEnvironment_sound
    (env : PSEnv) (pkgs : List PSFormedInductivePackage) :
    toLeanEnv (installFormedPackagesPS env pkgs) =
      installFormedPackagesLean (toLeanEnv env) pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS env pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS env pkgs))) ∧
    (∀ p ∈ pkgs, p.RecursorBoundarySound) := by
  exact ⟨installFormedPackages_preserves env pkgs,
    directEnvSound_afterFormedPackages env pkgs,
    deltaEnvExact_afterFormedPackages env pkgs,
    recursorBoundary_afterFormedPackages pkgs⟩

end InductiveFormedEnvironmentGeneralization
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.PSFormedInductivePackage.install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.PSFormedInductivePackage.recursorBoundary_sound
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.installFormedPackages_preserves
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.directEnvSound_afterFormedPackages
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.deltaEnvExact_afterFormedPackages
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.typeLookup_afterFormedPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.unfoldLookup_afterFormedPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.recursorBoundary_afterFormedPackages
#print axioms ProofScriptKernelEquivalence.InductiveFormedEnvironmentGeneralization.formedInductiveWholeEnvironment_sound
