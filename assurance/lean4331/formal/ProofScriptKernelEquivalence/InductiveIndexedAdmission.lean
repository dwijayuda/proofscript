import ProofScriptKernelEquivalence.InductiveDirectAdmission

namespace ProofScriptKernelEquivalence
namespace InductiveIndexedAdmission

open InductiveDirectAdmission

/-- Apply a ProofScript Core expression to a list of arguments, left-associatively. -/
def psMkApps : PSExpr → List PSExpr → PSExpr
  | f, [] => f
  | f, a :: as => psMkApps (.app f a) as

/-- Lean-side image of `psMkApps`. -/
def leanMkApps : Lean.Expr → List Lean.Expr → Lean.Expr
  | f, [] => f
  | f, a :: as => leanMkApps (.app f a) as

@[simp] theorem mkApps_toLean (f : PSExpr) (args : List PSExpr) :
    PSExpr.toLean (psMkApps f args) = leanMkApps (PSExpr.toLean f) (args.map PSExpr.toLean) := by
  induction args generalizing f with
  | nil => rfl
  | cons a as ih =>
      simp [psMkApps, leanMkApps, ih, PSExpr.toLean]

/-- Canonical uniform-parameter tuple at a constructor-field depth. -/
def psUniformParams (numParams fieldDepth : Nat) : List PSExpr :=
  (List.range numParams).map fun p => .bvar (fieldDepth + (numParams - 1 - p))

/-- The same tuple in Lean expressions. -/
def leanUniformParams (numParams fieldDepth : Nat) : List Lean.Expr :=
  (List.range numParams).map fun p => .bvar (fieldDepth + (numParams - 1 - p))

@[simp] theorem uniformParams_toLean (numParams fieldDepth : Nat) :
    (psUniformParams numParams fieldDepth).map PSExpr.toLean =
      leanUniformParams numParams fieldDepth := by
  simp [psUniformParams, leanUniformParams, PSExpr.toLean]

/--
Exact terminal family application used by the parameterized/indexed direct slice.
The first `numParams` arguments are the constructor's own uniform parameter
binders at the current field depth; the remaining arguments are exactly the
index tuple.
-/
def PSIndexedResultShape
    (self : Lean.Name) (levels : List PSLevel)
    (numParams numIndices fieldDepth : Nat) (e : PSExpr) : Prop :=
  ∃ indices : List PSExpr,
    indices.length = numIndices ∧
    e = psMkApps (.const self levels)
      (psUniformParams numParams fieldDepth ++ indices)

def LeanIndexedResultShape
    (self : Lean.Name) (levels : List Lean.Level)
    (numParams numIndices fieldDepth : Nat) (e : Lean.Expr) : Prop :=
  ∃ indices : List Lean.Expr,
    indices.length = numIndices ∧
    e = leanMkApps (.const self levels)
      (leanUniformParams numParams fieldDepth ++ indices)

/-- Translation preserves exact uniform-parameter positions and index arity. -/
theorem indexedResult_sound
    {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices fieldDepth : Nat} {e : PSExpr}
    (h : PSIndexedResultShape self levels numParams numIndices fieldDepth e) :
    LeanIndexedResultShape self (levels.map PSLevel.toLean)
      numParams numIndices fieldDepth (PSExpr.toLean e) := by
  rcases h with ⟨indices, hlen, rfl⟩
  refine ⟨indices.map PSExpr.toLean, ?_, ?_⟩
  · simpa using hlen
  · simp [mkApps_toLean, PSExpr.toLean, uniformParams_toLean, List.map_append]

/--
Strict positivity for an indexed recursive field. Internal Pi binders shift the
uniform parameter tuple by one at each codomain step. Recursive occurrences in
indices are excluded explicitly.
-/
inductive PSIndexedPositiveField
    (self : Lean.Name) (levels : List PSLevel)
    (numParams numIndices : Nat) : Nat → PSExpr → Prop where
  | direct {fieldDepth indices} :
      indices.length = numIndices →
      (∀ i ∈ indices, psContainsConst self i = false) →
      PSIndexedPositiveField self levels numParams numIndices fieldDepth
        (psMkApps (.const self levels)
          (psUniformParams numParams fieldDepth ++ indices))
  | pi {fieldDepth domain body bi} :
      psContainsConst self domain = false →
      PSIndexedPositiveField self levels numParams numIndices (fieldDepth + 1) body →
      PSIndexedPositiveField self levels numParams numIndices fieldDepth (.pi domain body bi)

inductive LeanIndexedPositiveField
    (self : Lean.Name) (levels : List Lean.Level)
    (numParams numIndices : Nat) : Nat → Lean.Expr → Prop where
  | direct {fieldDepth indices} :
      indices.length = numIndices →
      (∀ i ∈ indices, leanContainsConst self i = false) →
      LeanIndexedPositiveField self levels numParams numIndices fieldDepth
        (leanMkApps (.const self levels)
          (leanUniformParams numParams fieldDepth ++ indices))
  | forallE {fieldDepth domain body bi} :
      leanContainsConst self domain = false →
      LeanIndexedPositiveField self levels numParams numIndices (fieldDepth + 1) body →
      LeanIndexedPositiveField self levels numParams numIndices fieldDepth
        (.forallE .anonymous domain body bi)

/-- Translation preserves indexed/higher-order strict positivity. -/
theorem indexedPositiveField_sound
    {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices fieldDepth : Nat} {field : PSExpr}
    (h : PSIndexedPositiveField self levels numParams numIndices fieldDepth field) :
    LeanIndexedPositiveField self (levels.map PSLevel.toLean)
      numParams numIndices fieldDepth (PSExpr.toLean field) := by
  induction h with
  | @direct fieldDepth indices hlen hNo =>
      have hd : LeanIndexedPositiveField self (levels.map PSLevel.toLean) numParams numIndices fieldDepth
          (leanMkApps (.const self (levels.map PSLevel.toLean))
            (leanUniformParams numParams fieldDepth ++ indices.map PSExpr.toLean)) := by
        apply LeanIndexedPositiveField.direct
        · simpa using hlen
        · intro i hi
          simp only [List.mem_map] at hi
          rcases hi with ⟨ps, hps, rfl⟩
          simpa [containsConst_toLean] using hNo ps hps
      simpa [mkApps_toLean, PSExpr.toLean, uniformParams_toLean, List.map_append] using hd
  | @pi fieldDepth domain body bi hNo hPos ih =>
      apply LeanIndexedPositiveField.forallE
      · simpa [containsConst_toLean] using hNo
      · exact ih

/--
Constructor body after the copied uniform-parameter telescope has been removed.
Every local field is either nonrecursive or a checked positive recursive field;
the final result has exact parameter positions and index arity.
-/
inductive PSIndexedCtorBodyShape
    (self : Lean.Name) (levels : List PSLevel)
    (numParams numIndices : Nat) : Nat → PSExpr → Prop where
  | result {fieldDepth indices} :
      indices.length = numIndices →
      PSIndexedCtorBodyShape self levels numParams numIndices fieldDepth
        (psMkApps (.const self levels)
          (psUniformParams numParams fieldDepth ++ indices))
  | plain {fieldDepth domain body bi} :
      psContainsConst self domain = false →
      PSIndexedCtorBodyShape self levels numParams numIndices (fieldDepth + 1) body →
      PSIndexedCtorBodyShape self levels numParams numIndices fieldDepth (.pi domain body bi)
  | recursive {fieldDepth domain body bi} :
      PSIndexedPositiveField self levels numParams numIndices fieldDepth domain →
      PSIndexedCtorBodyShape self levels numParams numIndices (fieldDepth + 1) body →
      PSIndexedCtorBodyShape self levels numParams numIndices fieldDepth (.pi domain body bi)

inductive LeanIndexedCtorBodyShape
    (self : Lean.Name) (levels : List Lean.Level)
    (numParams numIndices : Nat) : Nat → Lean.Expr → Prop where
  | result {fieldDepth indices} :
      indices.length = numIndices →
      LeanIndexedCtorBodyShape self levels numParams numIndices fieldDepth
        (leanMkApps (.const self levels)
          (leanUniformParams numParams fieldDepth ++ indices))
  | plain {fieldDepth domain body bi} :
      leanContainsConst self domain = false →
      LeanIndexedCtorBodyShape self levels numParams numIndices (fieldDepth + 1) body →
      LeanIndexedCtorBodyShape self levels numParams numIndices fieldDepth
        (.forallE .anonymous domain body bi)
  | recursive {fieldDepth domain body bi} :
      LeanIndexedPositiveField self levels numParams numIndices fieldDepth domain →
      LeanIndexedCtorBodyShape self levels numParams numIndices (fieldDepth + 1) body →
      LeanIndexedCtorBodyShape self levels numParams numIndices fieldDepth
        (.forallE .anonymous domain body bi)

/-- Translation preserves the normalized indexed constructor body admission shape. -/
theorem indexedCtorBody_sound
    {self : Lean.Name} {levels : List PSLevel}
    {numParams numIndices fieldDepth : Nat} {ctorBody : PSExpr}
    (h : PSIndexedCtorBodyShape self levels numParams numIndices fieldDepth ctorBody) :
    LeanIndexedCtorBodyShape self (levels.map PSLevel.toLean)
      numParams numIndices fieldDepth (PSExpr.toLean ctorBody) := by
  induction h with
  | @result fieldDepth indices hlen =>
      have hr : LeanIndexedCtorBodyShape self (levels.map PSLevel.toLean) numParams numIndices fieldDepth
          (leanMkApps (.const self (levels.map PSLevel.toLean))
            (leanUniformParams numParams fieldDepth ++ indices.map PSExpr.toLean)) := by
        apply LeanIndexedCtorBodyShape.result
        simpa using hlen
      simpa [mkApps_toLean, PSExpr.toLean, uniformParams_toLean, List.map_append] using hr
  | @plain fieldDepth domain body bi hNo hTail ih =>
      apply LeanIndexedCtorBodyShape.plain
      · simpa [containsConst_toLean] using hNo
      · exact ih
  | @recursive fieldDepth domain body bi hPos hTail ih =>
      exact LeanIndexedCtorBodyShape.recursive (indexedPositiveField_sound hPos) ih

/-- A compact binder telescope used to express copied uniform parameters. -/
def psMkPiTelescope : List (PSExpr × PSBinderInfo) → PSExpr → PSExpr
  | [], body => body
  | (domain, bi) :: rest, body => .pi domain (psMkPiTelescope rest body) bi

def leanMkPiTelescope : List (Lean.Expr × Lean.BinderInfo) → Lean.Expr → Lean.Expr
  | [], body => body
  | (domain, bi) :: rest, body => .forallE .anonymous domain (leanMkPiTelescope rest body) bi

def leanBinders (bs : List (PSExpr × PSBinderInfo)) : List (Lean.Expr × Lean.BinderInfo) :=
  bs.map fun b => (PSExpr.toLean b.1, b.2.toLean)

@[simp] theorem piTelescope_toLean (bs : List (PSExpr × PSBinderInfo)) (body : PSExpr) :
    PSExpr.toLean (psMkPiTelescope bs body) =
      leanMkPiTelescope (leanBinders bs) (PSExpr.toLean body) := by
  induction bs with
  | nil => rfl
  | cons b bs ih =>
      rcases b with ⟨domain, bi⟩
      simp [psMkPiTelescope, leanMkPiTelescope, leanBinders, ih, PSExpr.toLean]

/--
A complete normalized direct parameterized/indexed constructor shape: the
constructor begins with exactly the same parameter telescope and its remaining
body satisfies the indexed admission shape at field depth zero.
-/
def PSParameterizedIndexedCtorShape
    (self : Lean.Name) (levels : List PSLevel)
    (paramBinders : List (PSExpr × PSBinderInfo)) (numIndices : Nat)
    (ctorType : PSExpr) : Prop :=
  ∃ body,
    ctorType = psMkPiTelescope paramBinders body ∧
    PSIndexedCtorBodyShape self levels paramBinders.length numIndices 0 body

def LeanParameterizedIndexedCtorShape
    (self : Lean.Name) (levels : List Lean.Level)
    (paramBinders : List (Lean.Expr × Lean.BinderInfo)) (numIndices : Nat)
    (ctorType : Lean.Expr) : Prop :=
  ∃ body,
    ctorType = leanMkPiTelescope paramBinders body ∧
    LeanIndexedCtorBodyShape self levels paramBinders.length numIndices 0 body

/-- Translation preserves copied parameter telescopes plus the indexed constructor body. -/
theorem parameterizedIndexedCtor_sound
    {self : Lean.Name} {levels : List PSLevel}
    {paramBinders : List (PSExpr × PSBinderInfo)} {numIndices : Nat} {ctorType : PSExpr}
    (h : PSParameterizedIndexedCtorShape self levels paramBinders numIndices ctorType) :
    LeanParameterizedIndexedCtorShape self (levels.map PSLevel.toLean)
      (leanBinders paramBinders) numIndices (PSExpr.toLean ctorType) := by
  rcases h with ⟨body, rfl, hbody⟩
  refine ⟨PSExpr.toLean body, ?_, ?_⟩
  · exact piTelescope_toLean paramBinders body
  · simpa [leanBinders] using indexedCtorBody_sound hbody

end InductiveIndexedAdmission
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.mkApps_toLean
#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.uniformParams_toLean
#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.indexedResult_sound
#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.indexedPositiveField_sound
#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.indexedCtorBody_sound
#print axioms ProofScriptKernelEquivalence.InductiveIndexedAdmission.parameterizedIndexedCtor_sound
