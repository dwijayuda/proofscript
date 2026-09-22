import ProofScriptKernelEquivalence.InductiveNonMutualClassifierCorrespondence

namespace ProofScriptKernelEquivalence
namespace InductiveClassifierImplementationTrace

open InductiveNonMutualClassifierCorrespondence
open InductiveNonMutualGenericAdmission
open InductiveIndexedAdmission
open EnvironmentNonMutualInduction

/--
Formal trace interface for the shipped v71 TypeScript non-mutual classifier.

This file does not model JavaScript execution.  It states the exact certificate
that the implementation-correspondence tests must extract from the concrete
`packages/kernel/src/kernel.ts` path: the actual classifier must expose the same
constructor/family witnesses already proved sound in
`InductiveNonMutualClassifierCorrespondence`.
-/
structure PSConstructorImplementationTrace
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr)
    (f : PSRawNonMutualFamily) (ctor : PSRawCtor) where
  witness : PSCtorClassifierWitness env ctx f ctor
  usedWHNF : Bool := true
  usedUniformParamDefEq : Bool := true
  checkedFieldUniverse : Bool := true
  checkedStrictPositivity : Bool := true
  checkedIndexedResultShape : Bool := true

/-- The implementation trace exposes exactly the constructor classifier witness. -/
def constructorTrace_to_witness
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr}
    {f : PSRawNonMutualFamily} {ctor : PSRawCtor}
    (h : PSConstructorImplementationTrace env ctx f ctor) :
    PSCtorClassifierWitness env ctx f ctor :=
  h.witness

/-- A traced implementation constructor branch discharges generic constructor admission. -/
theorem constructorTrace_to_genericAdmission
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr}
    {f : PSRawNonMutualFamily} {ctor : PSRawCtor}
    (h : PSConstructorImplementationTrace env ctx f ctor) :
    PSGenericCtorAdmission env ctx f.self f.levels f.paramBinders
      f.numIndices f.resultLevel ctor :=
  ctorWitness_to_genericAdmission h.witness

/-- A traced implementation constructor branch is sound after Core→Lean translation. -/
theorem constructorTrace_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {f : PSRawNonMutualFamily} {ctor : PSRawCtor}
    (h : PSConstructorImplementationTrace psEnv ctx f ctor) :
    LeanGenericCtorAdmission leanEnv (ctx.map PSExpr.toLean) f.self
      (f.levels.map PSLevel.toLean) (leanBinders f.paramBinders)
      f.numIndices f.resultLevel.toLean ctor.toLean := by
  exact ctorClassifier_sound psEnv leanEnv hEnv h.witness

/-- Family-level implementation trace: every constructor branch exposes a witness. -/
structure PSFamilyImplementationTrace
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr) (f : PSRawNonMutualFamily) where
  ctorTrace : ∀ ctor, ctor ∈ f.ctors → PSConstructorImplementationTrace env ctx f ctor
  atomicFailureBoundary : Bool := true
  sourceFunction : String := "checkSimpleInductive/checkIndexedInductive0/positiveRecursiveFieldType"

/-- A traced family branch exposes the already-proved family classifier witness. -/
def familyTrace_to_witness
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSFamilyImplementationTrace env ctx f) :
    PSFamilyClassifierWitness env ctx f :=
  { ctorWitness := fun ctor hmem => (h.ctorTrace ctor hmem).witness }

/-- A traced implementation family discharges generic non-mutual admission. -/
theorem familyTrace_to_genericAdmission
    {env : PSOrdinaryEqEnv} {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSFamilyImplementationTrace env ctx f) :
    PSGenericNonMutualAdmitted env ctx f := by
  exact familyWitness_to_genericAdmission (familyTrace_to_witness h)

/-- A traced implementation family is sound after Core→Lean translation. -/
theorem familyTrace_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSFamilyImplementationTrace psEnv ctx f) :
    LeanGenericNonMutualAdmitted leanEnv (ctx.map PSExpr.toLean) f.toLean := by
  exact familyClassifier_sound psEnv leanEnv hEnv (familyTrace_to_witness h)

/--
Package-level implementation trace for a successful shipped non-mutual
classifier/admission path.  The runtime test binds this structure to the actual
TypeScript source path and observable `checkAndAddDeclaration` results.
-/
structure PSClassifierImplementationPackage where
  package : PSClassifierPackage
  familyTrace : PSFamilyImplementationTrace package.psEnv [] package.raw
  sourceSha256 : String

/-- The implementation package trace implies Lean-side raw-family admission. -/
theorem implementationPackage_rawAdmission_sound
    (leanEnv : LeanOrdinaryEqEnv)
    (p : PSClassifierImplementationPackage)
    (hEnv : OrdinaryEqEnvSound p.package.psEnv leanEnv) :
    LeanGenericNonMutualAdmitted leanEnv [] p.package.raw.toLean := by
  exact familyTrace_sound p.package.psEnv leanEnv hEnv p.familyTrace

/-- Installing the implementation-produced package preserves translated environments. -/
theorem implementationPackage_install_preserves
    (env : DeclarationEnvironment.PSEnv) (p : PSClassifierImplementationPackage) :
    DeclarationEnvironment.toLeanEnv (p.package.normalizedPackage.installPS env) =
      p.package.normalizedPackage.installLean (DeclarationEnvironment.toLeanEnv env) := by
  exact classifierPackage_install_preserves env p.package

/-- Sequences of implementation-produced packages inherit the whole-environment theorem. -/
theorem implementationPackages_wholeEnvironment_sound
    (env : DeclarationEnvironment.PSEnv) (pkgs : List PSClassifierImplementationPackage) :
    DeclarationEnvironment.toLeanEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)) =
      installPackagesLean (DeclarationEnvironment.toLeanEnv env)
        ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage) ∧
    DirectEnvSound
      (DeclarationEnvironment.asPSDirectEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDirectEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))) ∧
    DeltaEnvExact
      (DeclarationEnvironment.asPSDeltaEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDeltaEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))) := by
  exact classifierPackages_wholeEnvironment_sound env (pkgs.map PSClassifierImplementationPackage.package)

end InductiveClassifierImplementationTrace
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.constructorTrace_to_witness
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.constructorTrace_to_genericAdmission
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.constructorTrace_sound
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.familyTrace_to_genericAdmission
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.familyTrace_sound
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.implementationPackage_rawAdmission_sound
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.implementationPackage_install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace.implementationPackages_wholeEnvironment_sound
