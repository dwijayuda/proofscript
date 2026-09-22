import ProofScriptKernelEquivalence.DeclarationEnvironment

namespace ProofScriptKernelEquivalence
namespace InductiveMutualFormedEnvironment

open DeclarationEnvironment

/--
A normalized mutual-inductive package at the current v71 assurance boundary.

This is deliberately a formed-environment certificate, not a full positivity or
recursor-generation theorem.  It records the family, constructor, recursor and
auxiliary entries that the executable mutual checker has already produced
atomically.  Admission, positivity and recursor RHS correspondence remain the
separate mutual O-IND/O-REC obligations.
-/
structure PSMutualPackage where
  blockName : Lean.Name
  memberNames : List Lean.Name
  constructorNames : List Lean.Name
  recursorNames : List Lean.Name
  entries : List PSEntry
  minTwoMembers : 2 ≤ memberNames.length

namespace PSMutualPackage

/-- Lean image of the exact formed entries installed by a mutual package. -/
def toLeanEntries (p : PSMutualPackage) : List Lean.ConstantInfo :=
  p.entries.map PSEntry.toLeanInfo

/-- ProofScript-side atomic installation of a formed mutual package. -/
def installPS (env : PSEnv) (p : PSMutualPackage) : PSEnv :=
  installManyPS env p.entries

/-- Lean-side image of the same atomic mutual installation. -/
def installLean (env : LeanEnv) (p : PSMutualPackage) : LeanEnv :=
  installManyLean env p.toLeanEntries

/-- The formed package exposes at least two mutually-defined members. -/
theorem has_at_least_two_members (p : PSMutualPackage) : 2 ≤ p.memberNames.length :=
  p.minTwoMembers

/-- Installing one formed mutual package commutes with Core→Lean translation. -/
theorem install_preserves (env : PSEnv) (p : PSMutualPackage) :
    toLeanEnv (p.installPS env) = p.installLean (toLeanEnv env) := by
  exact installMany_preserves env p.entries

end PSMutualPackage

/-- Ordered whole-environment construction from formed mutual packages. -/
def installMutualPackagesPS : PSEnv → List PSMutualPackage → PSEnv
  | env, [] => env
  | env, p :: ps => installMutualPackagesPS (p.installPS env) ps

/-- Lean image of the same ordered whole-environment construction. -/
def installMutualPackagesLean : LeanEnv → List PSMutualPackage → LeanEnv
  | env, [] => env
  | env, p :: ps => installMutualPackagesLean (p.installLean env) ps

/--
Whole-environment induction for formed mutual packages: sequential atomic mutual
installation produces the same translated environment on the ProofScript and
Lean sides.
-/
theorem installMutualPackages_preserves (env : PSEnv) (pkgs : List PSMutualPackage) :
    toLeanEnv (installMutualPackagesPS env pkgs) =
      installMutualPackagesLean (toLeanEnv env) pkgs := by
  induction pkgs generalizing env with
  | nil => rfl
  | cons p ps ih =>
      unfold installMutualPackagesPS installMutualPackagesLean
      calc
        toLeanEnv (installMutualPackagesPS (p.installPS env) ps) =
            installMutualPackagesLean (toLeanEnv (p.installPS env)) ps := ih (p.installPS env)
        _ = installMutualPackagesLean (p.installLean (toLeanEnv env)) ps := by
            rw [PSMutualPackage.install_preserves env p]

/-- The final formed-mutual environment still supplies direct-typing lookup soundness. -/
theorem directEnvSound_afterMutualPackages (env : PSEnv) (pkgs : List PSMutualPackage) :
    DirectEnvSound
      (asPSDirectEnv (installMutualPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installMutualPackagesPS env pkgs))) := by
  exact directEnvSound (installMutualPackagesPS env pkgs)

/-- The final formed-mutual environment still supplies ordinary delta exactness. -/
theorem deltaEnvExact_afterMutualPackages (env : PSEnv) (pkgs : List PSMutualPackage) :
    DeltaEnvExact
      (asPSDeltaEnv (installMutualPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installMutualPackagesPS env pkgs))) := by
  exact deltaEnvExact (installMutualPackagesPS env pkgs)

/-- Exact universe-instantiated type lookup survives formed mutual installation. -/
theorem typeLookup_afterMutualPackages_exact
    (env : PSEnv) (pkgs : List PSMutualPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psTypeLookup (installMutualPackagesPS env pkgs) n us) =
      leanTypeLookup (toLeanEnv (installMutualPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact typeLookup_exact (installMutualPackagesPS env pkgs) n us

/-- Exact delta lookup survives formed mutual installation. -/
theorem unfoldLookup_afterMutualPackages_exact
    (env : PSEnv) (pkgs : List PSMutualPackage) (n : Lean.Name) (us : List PSLevel) :
    Option.map PSExpr.toLean (psUnfoldLookup (installMutualPackagesPS env pkgs) n us) =
      leanUnfoldLookup (toLeanEnv (installMutualPackagesPS env pkgs)) n (us.map PSLevel.toLean) := by
  exact unfoldLookup_exact (installMutualPackagesPS env pkgs) n us

/--
Combined checkpoint theorem for the current formed-mutual O-DECL boundary:
ordered atomic installation commutes with translation and preserves the direct
constant-typing and ordinary-delta premises used by earlier typing/reduction
proofs.
-/
theorem formedMutualWholeEnvironment_sound
    (env : PSEnv) (pkgs : List PSMutualPackage) :
    toLeanEnv (installMutualPackagesPS env pkgs) =
      installMutualPackagesLean (toLeanEnv env) pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installMutualPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installMutualPackagesPS env pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installMutualPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installMutualPackagesPS env pkgs))) := by
  exact ⟨installMutualPackages_preserves env pkgs,
    directEnvSound_afterMutualPackages env pkgs,
    deltaEnvExact_afterMutualPackages env pkgs⟩

end InductiveMutualFormedEnvironment
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.PSMutualPackage.has_at_least_two_members
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.PSMutualPackage.install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.installMutualPackages_preserves
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.directEnvSound_afterMutualPackages
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.deltaEnvExact_afterMutualPackages
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.typeLookup_afterMutualPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.unfoldLookup_afterMutualPackages_exact
#print axioms ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.formedMutualWholeEnvironment_sound
