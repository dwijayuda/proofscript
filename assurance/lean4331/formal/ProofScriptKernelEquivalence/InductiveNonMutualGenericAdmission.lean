import ProofScriptKernelEquivalence.EnvironmentNonMutualInduction
import ProofScriptKernelEquivalence.InductiveNonMutualIntegration

namespace ProofScriptKernelEquivalence
namespace InductiveNonMutualGenericAdmission

open InductiveDirectAdmission InductiveIndexedAdmission InductiveNonMutualIntegration
open EnvironmentNonMutualInduction

/--
Raw constructor item at the generic non-mutual admission boundary.  Previous
checkpoints stored the normalized constructor-body witness directly.  This
module instead starts from the raw constructor type and derives the Lean-side
admission obligation from a checked structural predicate.
-/
structure PSRawCtor where
  name : Lean.Name
  type : PSExpr

structure LeanRawCtor where
  name : Lean.Name
  type : Lean.Expr

/-- Translation of a raw constructor item. -/
def PSRawCtor.toLean (c : PSRawCtor) : LeanRawCtor :=
  { name := c.name, type := PSExpr.toLean c.type }

@[simp] theorem rawCtor_toLean_name (c : PSRawCtor) : c.toLean.name = c.name := rfl
@[simp] theorem rawCtor_toLean_type (c : PSRawCtor) : c.toLean.type = PSExpr.toLean c.type := rfl

/--
Checked constructor body admission after the parameter telescope has been
peeled.  The local context is an index, not a fixed inductive parameter, because
every field binder extends the context for the remaining body.
-/
inductive PSGenericCtorBodyAdmission
    (env : PSOrdinaryEqEnv)
    (self : Lean.Name) (levels : List PSLevel)
    (numParams numIndices : Nat) (resultLevel : PSLevel) : List PSExpr → Nat → PSExpr → Prop where
  | result {ctx fieldDepth e} :
      PSIndexedResultShape self levels numParams numIndices fieldDepth e →
      PSGenericCtorBodyAdmission env self levels numParams numIndices resultLevel ctx fieldDepth e
  | field {ctx fieldDepth domain body bi} :
      PSIntegratedField env ctx self levels numParams numIndices resultLevel fieldDepth domain →
      PSGenericCtorBodyAdmission env self levels numParams numIndices resultLevel (domain :: ctx) (fieldDepth + 1) body →
      PSGenericCtorBodyAdmission env self levels numParams numIndices resultLevel ctx fieldDepth (.pi domain body bi)

/-- Lean image of the checked generic constructor-body admission predicate. -/
inductive LeanGenericCtorBodyAdmission
    (env : LeanOrdinaryEqEnv)
    (self : Lean.Name) (levels : List Lean.Level)
    (numParams numIndices : Nat) (resultLevel : Lean.Level) : List Lean.Expr → Nat → Lean.Expr → Prop where
  | result {ctx fieldDepth e} :
      LeanIndexedResultShape self levels numParams numIndices fieldDepth e →
      LeanGenericCtorBodyAdmission env self levels numParams numIndices resultLevel ctx fieldDepth e
  | field {ctx fieldDepth domain body bi} :
      LeanIntegratedField env ctx self levels numParams numIndices resultLevel fieldDepth domain →
      LeanGenericCtorBodyAdmission env self levels numParams numIndices resultLevel (domain :: ctx) (fieldDepth + 1) body →
      LeanGenericCtorBodyAdmission env self levels numParams numIndices resultLevel ctx fieldDepth (.forallE .anonymous domain body bi)

/-- Generic checked constructor-body admission is preserved by Core→Lean translation. -/
theorem genericCtorBody_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices : Nat} {resultLevel : PSLevel}
    {fieldDepth : Nat} {body : PSExpr}
    (h : PSGenericCtorBodyAdmission psEnv self levels numParams numIndices resultLevel ctx fieldDepth body) :
    LeanGenericCtorBodyAdmission leanEnv self (levels.map PSLevel.toLean)
      numParams numIndices resultLevel.toLean (ctx.map PSExpr.toLean) fieldDepth (PSExpr.toLean body) := by
  induction h with
  | result hshape =>
      exact LeanGenericCtorBodyAdmission.result (indexedResult_sound hshape)
  | field hfield htail ihtail =>
      simpa [PSExpr.toLean] using
        LeanGenericCtorBodyAdmission.field
          (integratedField_sound psEnv leanEnv hEnv hfield)
          ihtail

/--
Raw generic constructor admission: the full constructor type must expose exactly
its copied parameter telescope, then the remaining body must satisfy the checked
generic body predicate.
-/
def PSGenericCtorAdmission
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr)
    (self : Lean.Name) (levels : List PSLevel)
    (paramBinders : List (PSExpr × PSBinderInfo))
    (numIndices : Nat) (resultLevel : PSLevel) (ctor : PSRawCtor) : Prop :=
  ∃ body,
    ctor.type = psMkPiTelescope paramBinders body ∧
    PSGenericCtorBodyAdmission env self levels paramBinders.length numIndices resultLevel ctx 0 body

/-- Lean image of raw generic constructor admission. -/
def LeanGenericCtorAdmission
    (env : LeanOrdinaryEqEnv) (ctx : List Lean.Expr)
    (self : Lean.Name) (levels : List Lean.Level)
    (paramBinders : List (Lean.Expr × Lean.BinderInfo))
    (numIndices : Nat) (resultLevel : Lean.Level) (ctor : LeanRawCtor) : Prop :=
  ∃ body,
    ctor.type = leanMkPiTelescope paramBinders body ∧
    LeanGenericCtorBodyAdmission env self levels paramBinders.length numIndices resultLevel ctx 0 body

/-- Raw generic constructor admission translates soundly after the checked normalizer succeeds. -/
theorem genericCtorAdmission_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {self : Lean.Name} {levels : List PSLevel}
    {paramBinders : List (PSExpr × PSBinderInfo)} {numIndices : Nat} {resultLevel : PSLevel}
    {ctor : PSRawCtor}
    (h : PSGenericCtorAdmission psEnv ctx self levels paramBinders numIndices resultLevel ctor) :
    LeanGenericCtorAdmission leanEnv (ctx.map PSExpr.toLean) self (levels.map PSLevel.toLean)
      (leanBinders paramBinders) numIndices resultLevel.toLean ctor.toLean := by
  rcases h with ⟨body, htype, hbody⟩
  refine ⟨PSExpr.toLean body, ?_, ?_⟩
  · simp [PSRawCtor.toLean, htype, piTelescope_toLean]
  · simpa [leanBinders] using genericCtorBody_sound psEnv leanEnv hEnv hbody

/-- A raw non-mutual family with all constructor types still in Core form. -/
structure PSRawNonMutualFamily where
  self : Lean.Name
  levels : List PSLevel
  paramBinders : List (PSExpr × PSBinderInfo)
  numIndices : Nat
  resultLevel : PSLevel
  ctors : List PSRawCtor

structure LeanRawNonMutualFamily where
  self : Lean.Name
  levels : List Lean.Level
  paramBinders : List (Lean.Expr × Lean.BinderInfo)
  numIndices : Nat
  resultLevel : Lean.Level
  ctors : List LeanRawCtor

/-- Translation of a raw non-mutual family. -/
def PSRawNonMutualFamily.toLean (f : PSRawNonMutualFamily) : LeanRawNonMutualFamily :=
  { self := f.self
    levels := f.levels.map PSLevel.toLean
    paramBinders := leanBinders f.paramBinders
    numIndices := f.numIndices
    resultLevel := f.resultLevel.toLean
    ctors := f.ctors.map PSRawCtor.toLean }

@[simp] theorem rawFamily_toLean_ctors (f : PSRawNonMutualFamily) :
    f.toLean.ctors = f.ctors.map PSRawCtor.toLean := rfl

/-- Successful ProofScript-side generic non-mutual admission for the checked fragment. -/
def PSGenericNonMutualAdmitted
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr) (f : PSRawNonMutualFamily) : Prop :=
  ∀ ctor ∈ f.ctors,
    PSGenericCtorAdmission env ctx f.self f.levels f.paramBinders f.numIndices f.resultLevel ctor

/-- Lean-side image of successful generic non-mutual admission. -/
def LeanGenericNonMutualAdmitted
    (env : LeanOrdinaryEqEnv) (ctx : List Lean.Expr) (f : LeanRawNonMutualFamily) : Prop :=
  ∀ ctor ∈ f.ctors,
    LeanGenericCtorAdmission env ctx f.self f.levels f.paramBinders f.numIndices f.resultLevel ctor

/--
If the generic ProofScript non-mutual checker accepts all raw constructors, the
translated Lean-side checker accepts the translated raw family under the same
environment correspondence.
-/
theorem genericNonMutualAdmission_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {f : PSRawNonMutualFamily}
    (h : PSGenericNonMutualAdmitted psEnv ctx f) :
    LeanGenericNonMutualAdmitted leanEnv (ctx.map PSExpr.toLean) f.toLean := by
  intro ctor hmem
  simp only [PSRawNonMutualFamily.toLean, List.mem_map] at hmem
  rcases hmem with ⟨psCtor, hpsMem, rfl⟩
  exact genericCtorAdmission_sound psEnv leanEnv hEnv (h psCtor hpsMem)

/--
A generic admitted family together with the normalized package produced by the
checker.  This connects the new raw-admission layer to the existing
whole-environment theorem without changing the trusted kernel.
-/
structure PSGenericNonMutualPackage where
  raw : PSRawNonMutualFamily
  psEnv : PSOrdinaryEqEnv
  admitted : PSGenericNonMutualAdmitted psEnv [] raw
  normalizedPackage : PSNonMutualPackage

/-- Installing the checker-produced package preserves the existing environment theorem. -/
theorem genericPackage_install_preserves
    (env : DeclarationEnvironment.PSEnv) (p : PSGenericNonMutualPackage) :
    DeclarationEnvironment.toLeanEnv (p.normalizedPackage.installPS env) =
      p.normalizedPackage.installLean (DeclarationEnvironment.toLeanEnv env) := by
  exact installPackage_preserves env p.normalizedPackage

/-- A sequence of checker-produced generic non-mutual packages preserves the environment relation. -/
theorem genericPackages_wholeEnvironment_sound
    (env : DeclarationEnvironment.PSEnv) (pkgs : List PSGenericNonMutualPackage) :
    DeclarationEnvironment.toLeanEnv
        (installPackagesPS env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)) =
      installPackagesLean (DeclarationEnvironment.toLeanEnv env)
        (pkgs.map PSGenericNonMutualPackage.normalizedPackage) ∧
    DirectEnvSound
      (DeclarationEnvironment.asPSDirectEnv
        (installPackagesPS env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDirectEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)))) ∧
    DeltaEnvExact
      (DeclarationEnvironment.asPSDeltaEnv
        (installPackagesPS env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)))
      (DeclarationEnvironment.asLeanDeltaEnv
        (DeclarationEnvironment.toLeanEnv
          (installPackagesPS env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)))) := by
  have h := nonMutualWholeEnvironment_sound env (pkgs.map PSGenericNonMutualPackage.normalizedPackage)
  exact ⟨h.1, h.2.1, h.2.2.1⟩

end InductiveNonMutualGenericAdmission
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.rawCtor_toLean_name
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.rawCtor_toLean_type
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.genericCtorBody_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.genericCtorAdmission_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.genericNonMutualAdmission_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.genericPackage_install_preserves
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualGenericAdmission.genericPackages_wholeEnvironment_sound
