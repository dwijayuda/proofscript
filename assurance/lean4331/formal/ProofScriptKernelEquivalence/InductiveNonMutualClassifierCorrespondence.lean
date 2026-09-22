import ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission

namespace ProofScriptKernelEquivalence
namespace InductiveNonMutualClassifierCorrespondence

open InductiveDirectAdmission
open InductiveIndexedAdmission
open InductiveNonMutualGenericAdmission
open InductiveNonMutualIntegration
open EnvironmentNonMutualInduction

/--
A checked constructor-classifier witness for the shipped v71 non-mutual
classifier boundary.

The executable checker may obtain this witness by WHNF, ordinary definitional
equality, field-universe checking, recursive-occurrence classification and
constructor-result analysis.  The formal trust boundary is that a successful
classification exposes exactly the generic constructor-body obligation already
proved in `InductiveNonMutualGenericAdmission`.
-/
structure PSCtorClassifierWitness
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr)
    (f : PSRawNonMutualFamily) (ctor : PSRawCtor) where
  body : PSExpr
  peeled : ctor.type = psMkPiTelescope f.paramBinders body
  bodyAdmission :
    PSGenericCtorBodyAdmission env f.self f.levels f.paramBinders.length
      f.numIndices f.resultLevel ctx 0 body

/-- A successful constructor classifier is exactly enough to discharge generic constructor admission. -/
theorem ctorWitness_to_genericAdmission
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr}
    {f : PSRawNonMutualFamily} {ctor : PSRawCtor}
    (h : PSCtorClassifierWitness env ctx f ctor) :
    PSGenericCtorAdmission env ctx f.self f.levels f.paramBinders
      f.numIndices f.resultLevel ctor := by
  exact ⟨h.body, h.peeled, h.bodyAdmission⟩

/-- Constructor-classifier acceptance is preserved by Core→Lean translation. -/
theorem ctorClassifier_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {f : PSRawNonMutualFamily} {ctor : PSRawCtor}
    (h : PSCtorClassifierWitness psEnv ctx f ctor) :
    LeanGenericCtorAdmission leanEnv (ctx.map PSExpr.toLean) f.self
      (f.levels.map PSLevel.toLean) (leanBinders f.paramBinders)
      f.numIndices f.resultLevel.toLean ctor.toLean := by
  exact genericCtorAdmission_sound psEnv leanEnv hEnv (ctorWitness_to_genericAdmission h)

/-- A family-level classifier witness for every constructor in one raw non-mutual family. -/
structure PSFamilyClassifierWitness
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr) (f : PSRawNonMutualFamily) where
  ctorWitness : ∀ ctor, ctor ∈ f.ctors → PSCtorClassifierWitness env ctx f ctor

/-- A successful family classifier discharges the generic non-mutual admission predicate. -/
theorem familyWitness_to_genericAdmission
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSFamilyClassifierWitness env ctx f) :
    PSGenericNonMutualAdmitted env ctx f := by
  intro ctor hmem
  exact ctorWitness_to_genericAdmission (h.ctorWitness ctor hmem)

/-- Family-level classifier acceptance is preserved by Core→Lean translation. -/
theorem familyClassifier_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSFamilyClassifierWitness psEnv ctx f) :
    LeanGenericNonMutualAdmitted leanEnv (ctx.map PSExpr.toLean) f.toLean := by
  have hg : PSGenericNonMutualAdmitted psEnv ctx f := familyWitness_to_genericAdmission h
  exact genericNonMutualAdmission_sound psEnv leanEnv hEnv hg

/--
Successful classifier output: a raw family, the classifier witness that it
normalizes to checked generic obligations, and the concrete package installed by
the shipped checker.
-/
structure PSClassifierPackage where
  raw : PSRawNonMutualFamily
  psEnv : PSOrdinaryEqEnv
  witness : PSFamilyClassifierWitness psEnv [] raw
  normalizedPackage : PSNonMutualPackage

/-- The classifier witness implies Lean-side generic admission for the translated raw family. -/
theorem classifier_rawAdmission_sound
    (leanEnv : LeanOrdinaryEqEnv)
    (p : PSClassifierPackage)
    (hEnv : OrdinaryEqEnvSound p.psEnv leanEnv) :
    LeanGenericNonMutualAdmitted leanEnv [] p.raw.toLean := by
  exact familyClassifier_sound p.psEnv leanEnv hEnv p.witness

/-- Installing the classifier-produced package uses the already-proved whole-environment theorem. -/
theorem classifierPackage_install_preserves
    (env : DeclarationEnvironment.PSEnv) (p : PSClassifierPackage) :
    DeclarationEnvironment.toLeanEnv (p.normalizedPackage.installPS env) =
      p.normalizedPackage.installLean (DeclarationEnvironment.toLeanEnv env) := by
  exact installPackage_preserves env p.normalizedPackage

/-- A sequence of classifier-produced packages preserves the direct-typing and delta premises. -/
theorem classifierPackages_wholeEnvironment_sound
    (env : DeclarationEnvironment.PSEnv) (pkgs : List PSClassifierPackage) :
    DeclarationEnvironment.toLeanEnv
        (installPackagesPS env (pkgs.map PSClassifierPackage.normalizedPackage)) =
      installPackagesLean (DeclarationEnvironment.toLeanEnv env)
        (pkgs.map PSClassifierPackage.normalizedPackage) ∧
    DirectEnvSound
      (DeclarationEnvironment.asPSDirectEnv
        (installPackagesPS env (pkgs.map PSClassifierPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDirectEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env (pkgs.map PSClassifierPackage.normalizedPackage)))) ∧
    DeltaEnvExact
      (DeclarationEnvironment.asPSDeltaEnv
        (installPackagesPS env (pkgs.map PSClassifierPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDeltaEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env (pkgs.map PSClassifierPackage.normalizedPackage)))) := by
  have h := nonMutualWholeEnvironment_sound env (pkgs.map PSClassifierPackage.normalizedPackage)
  exact ⟨h.1, h.2.1, h.2.2.1⟩

end InductiveNonMutualClassifierCorrespondence
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.ctorWitness_to_genericAdmission
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.ctorClassifier_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.familyWitness_to_genericAdmission
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.familyClassifier_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.classifier_rawAdmission_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.classifierPackage_install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence.classifierPackages_wholeEnvironment_sound
