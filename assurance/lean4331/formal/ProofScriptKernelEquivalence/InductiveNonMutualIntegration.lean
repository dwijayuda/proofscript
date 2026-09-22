import ProofScriptKernelEquivalence.InductiveIndexedAdmission
import ProofScriptKernelEquivalence.RecursorIndexed
import ProofScriptKernelEquivalence.TypingConversion

namespace ProofScriptKernelEquivalence
namespace InductiveNonMutualIntegration

open InductiveDirectAdmission InductiveIndexedAdmission RecursorIndexed

/--
ProofScript-side semantic version of Lean's non-parameter constructor-field
universe ceiling.  `result = 0` is the Prop/impredicativity exemption; otherwise
the field's sort universe must be below the inductive result universe under all
universe-parameter valuations.
-/
def PSFieldUniverseOK (result fieldSort : PSLevel) : Prop :=
  result = .zero ∨ ∀ ρ : Lean.Name → Nat, PSLevel.eval ρ fieldSort ≤ PSLevel.eval ρ result

/-- Lean-side image of the same ceiling, stated over no-mvar embedded levels. -/
def LeanFieldUniverseOK (result fieldSort : Lean.Level) : Prop :=
  result = .zero ∨ ∀ (ρ : Lean.Name → Nat) (μ : Lean.LMVarId → Nat),
    PSLevel.evalLean ρ μ fieldSort ≤ PSLevel.evalLean ρ μ result

/-- The constructor-field universe ceiling commutes with Core→Lean level translation. -/
theorem fieldUniverseOK_sound {result fieldSort : PSLevel}
    (h : PSFieldUniverseOK result fieldSort) :
    LeanFieldUniverseOK result.toLean fieldSort.toLean := by
  cases h with
  | inl hzero =>
      subst result
      exact Or.inl rfl
  | inr hle =>
      apply Or.inr
      intro ρ μ
      rw [PSLevel.eval_toLean, PSLevel.eval_toLean]
      exact hle ρ

/--
Uniform parameter matching after WHNF/defEq, not just syntactic de-Bruijn
identity.  This isolates the non-circular premise needed by Lean-style inductive
admission from the later generic `defEq` implementation theorem.
-/
def PSUniformParamDefEq
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr) (args : List PSExpr)
    (numParams fieldDepth : Nat) : Prop :=
  ∀ p arg, p < numParams → args[p]? = some arg →
    OrdinaryDefEq.PSEq env ctx arg (.bvar (fieldDepth + (numParams - 1 - p)))

def LeanUniformParamDefEq
    (env : LeanOrdinaryEqEnv) (ctx : List Lean.Expr) (args : List Lean.Expr)
    (numParams fieldDepth : Nat) : Prop :=
  ∀ p arg, p < numParams → args[p]? = some arg →
    OrdinaryDefEq.LeanEq env ctx arg (.bvar (fieldDepth + (numParams - 1 - p)))

/-- Definitional-equality based uniform parameter matching translates soundly. -/
theorem uniformParamDefEq_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {args : List PSExpr} {numParams fieldDepth : Nat}
    (h : PSUniformParamDefEq psEnv ctx args numParams fieldDepth) :
    LeanUniformParamDefEq leanEnv (ctx.map PSExpr.toLean) (args.map PSExpr.toLean)
      numParams fieldDepth := by
  intro p arg hp hget
  rw [List.getElem?_map] at hget
  cases harg : args[p]? with
  | none => simp [harg] at hget
  | some psArg =>
      simp [harg] at hget
      subst arg
      exact OrdinaryDefEq.sound psEnv leanEnv hEnv (h p psArg hp harg)

/--
An integrated non-mutual constructor field premise: the field itself typechecks
as a sort, satisfies the universe ceiling, and is either nonrecursive or a
normalized strictly-positive recursive field.
-/
def PSIntegratedField
    (env : PSOrdinaryEqEnv) (ctx : List PSExpr)
    (self : Lean.Name) (levels : List PSLevel)
    (numParams numIndices : Nat) (resultLevel : PSLevel)
    (fieldDepth : Nat) (field : PSExpr) : Prop :=
  ∃ fieldSort : PSLevel,
    ConversionTyping.PSTyping env ctx field (.sort fieldSort) ∧
    PSFieldUniverseOK resultLevel fieldSort ∧
    (psContainsConst self field = false ∨
      PSIndexedPositiveField self levels numParams numIndices fieldDepth field)

/-- Lean-side image of the integrated field premise. -/
def LeanIntegratedField
    (env : LeanOrdinaryEqEnv) (ctx : List Lean.Expr)
    (self : Lean.Name) (levels : List Lean.Level)
    (numParams numIndices : Nat) (resultLevel : Lean.Level)
    (fieldDepth : Nat) (field : Lean.Expr) : Prop :=
  ∃ fieldSort : Lean.Level,
    ConversionTyping.LeanTyping env ctx field (.sort fieldSort) ∧
    LeanFieldUniverseOK resultLevel fieldSort ∧
    (leanContainsConst self field = false ∨
      LeanIndexedPositiveField self levels numParams numIndices fieldDepth field)

/--
The integrated field-admission premise is preserved by Core→Lean translation:
typing uses the current ordinary conversion theorem, the universe ceiling uses
the level theorem above, and the recursive/nonrecursive split uses the indexed
positivity theorem.
-/
theorem integratedField_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices : Nat} {resultLevel : PSLevel}
    {fieldDepth : Nat} {field : PSExpr}
    (h : PSIntegratedField psEnv ctx self levels numParams numIndices resultLevel fieldDepth field) :
    LeanIntegratedField leanEnv (ctx.map PSExpr.toLean) self (levels.map PSLevel.toLean)
      numParams numIndices resultLevel.toLean fieldDepth (PSExpr.toLean field) := by
  rcases h with ⟨fieldSort, hTyping, hUniverse, hClass⟩
  refine ⟨fieldSort.toLean, ?_, ?_, ?_⟩
  · simpa [PSExpr.toLean] using ConversionTyping.typing_sound psEnv leanEnv hEnv hTyping
  · exact fieldUniverseOK_sound hUniverse
  · cases hClass with
    | inl hNo =>
        exact Or.inl (by simpa [containsConst_toLean] using hNo)
    | inr hPos =>
        exact Or.inr (indexedPositiveField_sound hPos)

/-- A generic extensional recursor computation obligation for one non-mutual family. -/
structure PSRecursorExtensionalSpec where
  recursor : PSExpr
  before : PSExpr
  after : PSExpr
  iota : PSIndexedIota before after

structure LeanRecursorExtensionalSpec where
  recursor : Lean.Expr
  before : Lean.Expr
  after : Lean.Expr
  iota : LeanIndexedIota before after

/-- Procedural indexed iota specifications translate extensionally. -/
def PSRecursorExtensionalSpec.toLean (s : PSRecursorExtensionalSpec) : LeanRecursorExtensionalSpec :=
  { recursor := PSExpr.toLean s.recursor
    before := PSExpr.toLean s.before
    after := PSExpr.toLean s.after
    iota := indexedIota_sound s.iota }

@[simp] theorem recursorExtensional_before_toLean (s : PSRecursorExtensionalSpec) :
    s.toLean.before = PSExpr.toLean s.before := rfl

@[simp] theorem recursorExtensional_after_toLean (s : PSRecursorExtensionalSpec) :
    s.toLean.after = PSExpr.toLean s.after := rfl

/--
Compact integrated non-mutual theorem boundary for the current v71 slice:
field universe checking, WHNF/defEq-based uniform parameter matching, indexed
positivity, constructor result shape, and procedural iota all translate to the
same Lean-side obligations.
-/
structure PSNonMutualAdmissionSlice where
  self : Lean.Name
  levels : List PSLevel
  numParams : Nat
  numIndices : Nat
  resultLevel : PSLevel
  ctorResult : PSExpr
  ctorResultShape :
    PSIndexedResultShape self levels numParams numIndices 0 ctorResult
  recursorSpec : Option PSRecursorExtensionalSpec := none

structure LeanNonMutualAdmissionSlice where
  self : Lean.Name
  levels : List Lean.Level
  numParams : Nat
  numIndices : Nat
  resultLevel : Lean.Level
  ctorResult : Lean.Expr
  ctorResultShape :
    LeanIndexedResultShape self levels numParams numIndices 0 ctorResult
  recursorSpec : Option LeanRecursorExtensionalSpec := none

/-- The integrated normalized non-mutual admission boundary translates soundly. -/
def PSNonMutualAdmissionSlice.toLean (s : PSNonMutualAdmissionSlice) : LeanNonMutualAdmissionSlice :=
  { self := s.self
    levels := s.levels.map PSLevel.toLean
    numParams := s.numParams
    numIndices := s.numIndices
    resultLevel := s.resultLevel.toLean
    ctorResult := PSExpr.toLean s.ctorResult
    ctorResultShape := indexedResult_sound s.ctorResultShape
    recursorSpec := s.recursorSpec.map PSRecursorExtensionalSpec.toLean }

@[simp] theorem nonMutualSlice_ctorResult_toLean (s : PSNonMutualAdmissionSlice) :
    s.toLean.ctorResult = PSExpr.toLean s.ctorResult := rfl

@[simp] theorem nonMutualSlice_levels_toLean (s : PSNonMutualAdmissionSlice) :
    s.toLean.levels = s.levels.map PSLevel.toLean := rfl

end InductiveNonMutualIntegration
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.fieldUniverseOK_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.uniformParamDefEq_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.integratedField_sound
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.recursorExtensional_before_toLean
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.recursorExtensional_after_toLean
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.nonMutualSlice_ctorResult_toLean
#print axioms ProofScriptKernelEquivalence.InductiveNonMutualIntegration.nonMutualSlice_levels_toLean
