import ProofScriptKernelEquivalence.ReductionOrdinary
import ProofScriptKernelEquivalence.TypingDirect

namespace ProofScriptKernelEquivalence

/--
Environment bundle for the ordinary definitional-equality assurance slice.
Reduction/transparency and typing are kept as distinct interfaces so this proof
does not silently assume the later declaration/environment theorem.
-/
structure PSOrdinaryEqEnv where
  delta : PSDeltaEnv
  typing : PSDirectEnv

structure LeanOrdinaryEqEnv where
  delta : LeanDeltaEnv
  typing : LeanDirectEnv

/-- Exact assumptions needed to transport the current ordinary equality rules. -/
def OrdinaryEqEnvSound (ps : PSOrdinaryEqEnv) (lean : LeanOrdinaryEqEnv) : Prop :=
  DeltaEnvExact ps.delta lean.delta ∧ DirectEnvSound ps.typing lean.typing

namespace OrdinaryDefEq

/--
ProofScript-side logical fragment of ordinary definitional equality.

This is intentionally a relation, not a model of the shipped search algorithm.
It contains the already-proved ordinary reduction fragment together with the two
remaining ordinary logical rules needed here: function eta and proof
irrelevance. Higher-risk projection/recursor/quotient rules remain separate.
-/
inductive PSEq (env : PSOrdinaryEqEnv) : List PSExpr → PSExpr → PSExpr → Prop where
  | refl (ctx : List PSExpr) (e : PSExpr) : PSEq env ctx e e
  | symm {ctx : List PSExpr} {a b : PSExpr} : PSEq env ctx a b → PSEq env ctx b a
  | trans {ctx : List PSExpr} {a b c : PSExpr} :
      PSEq env ctx a b → PSEq env ctx b c → PSEq env ctx a c
  | reduce {ctx : List PSExpr} {a b : PSExpr} :
      OrdinaryReduction.Steps (OrdinaryReduction.PSStep env.delta) a b →
      PSEq env ctx a b
  | app {ctx : List PSExpr} {f g a b : PSExpr} :
      PSEq env ctx f g → PSEq env ctx a b → PSEq env ctx (.app f a) (.app g b)
  | lamBody {ctx : List PSExpr} {d b₁ b₂ : PSExpr} {bi : PSBinderInfo} :
      PSEq env (d :: ctx) b₁ b₂ → PSEq env ctx (.lam d b₁ bi) (.lam d b₂ bi)
  | piBody {ctx : List PSExpr} {d b₁ b₂ : PSExpr} {bi : PSBinderInfo} :
      PSEq env (d :: ctx) b₁ b₂ → PSEq env ctx (.pi d b₁ bi) (.pi d b₂ bi)
  | eta {ctx : List PSExpr} {f d cod : PSExpr} {bi : PSBinderInfo} :
      DirectTyping.PSTyping env.typing ctx f (.pi d cod bi) →
      PSEq env ctx
        (.lam d (.app (PSExpr.lift f 0 1) (.bvar 0)) bi)
        f
  | proofIrrel {ctx : List PSExpr} {p q P : PSExpr} :
      DirectTyping.PSTyping env.typing ctx p P →
      DirectTyping.PSTyping env.typing ctx q P →
      DirectTyping.PSTyping env.typing ctx P (.sort .zero) →
      PSEq env ctx p q

/-- Lean-expression image of the same ordinary logical equality fragment. -/
inductive LeanEq (env : LeanOrdinaryEqEnv) : List Lean.Expr → Lean.Expr → Lean.Expr → Prop where
  | refl (ctx : List Lean.Expr) (e : Lean.Expr) : LeanEq env ctx e e
  | symm {ctx : List Lean.Expr} {a b : Lean.Expr} : LeanEq env ctx a b → LeanEq env ctx b a
  | trans {ctx : List Lean.Expr} {a b c : Lean.Expr} :
      LeanEq env ctx a b → LeanEq env ctx b c → LeanEq env ctx a c
  | reduce {ctx : List Lean.Expr} {a b : Lean.Expr} :
      OrdinaryReduction.Steps (OrdinaryReduction.LeanStep env.delta) a b →
      LeanEq env ctx a b
  | app {ctx : List Lean.Expr} {f g a b : Lean.Expr} :
      LeanEq env ctx f g → LeanEq env ctx a b → LeanEq env ctx (.app f a) (.app g b)
  | lamBody {ctx : List Lean.Expr} {d b₁ b₂ : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanEq env (d :: ctx) b₁ b₂ →
      LeanEq env ctx (.lam .anonymous d b₁ bi) (.lam .anonymous d b₂ bi)
  | forallBody {ctx : List Lean.Expr} {d b₁ b₂ : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanEq env (d :: ctx) b₁ b₂ →
      LeanEq env ctx (.forallE .anonymous d b₁ bi) (.forallE .anonymous d b₂ bi)
  | eta {ctx : List Lean.Expr} {f d cod : Lean.Expr} {bi : Lean.BinderInfo} :
      DirectTyping.LeanTyping env.typing ctx f (.forallE .anonymous d cod bi) →
      LeanEq env ctx
        (.lam .anonymous d (.app (LeanExprSpec.lift f 0 1) (.bvar 0)) bi)
        f
  | proofIrrel {ctx : List Lean.Expr} {p q P : Lean.Expr} :
      DirectTyping.LeanTyping env.typing ctx p P →
      DirectTyping.LeanTyping env.typing ctx q P →
      DirectTyping.LeanTyping env.typing ctx P (.sort .zero) →
      LeanEq env ctx p q

/-- The canonical eta expansion commutes with Core→Lean translation. -/
theorem etaExpansion_toLean (f d : PSExpr) (bi : PSBinderInfo) :
    PSExpr.toLean (.lam d (.app (PSExpr.lift f 0 1) (.bvar 0)) bi) =
      .lam .anonymous (PSExpr.toLean d)
        (.app (LeanExprSpec.lift (PSExpr.toLean f) 0 1) (.bvar 0)) bi.toLean := by
  simp [PSExpr.toLean, PSExpr.lift_toLean]

/--
Machine-checked PS→Lean refinement for the current ordinary definitional-equality
fragment: beta/zeta/delta/application-head reduction, structural congruence,
function eta, and proof irrelevance.
-/
theorem sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {a b : PSExpr}
    (h : PSEq psEnv ctx a b) :
    LeanEq leanEnv (ctx.map PSExpr.toLean) (PSExpr.toLean a) (PSExpr.toLean b) := by
  rcases hEnv with ⟨hDelta, hTyping⟩
  induction h with
  | refl ctx e => exact .refl _ _
  | symm h ih => exact .symm ih
  | trans hab hbc ihab ihbc => exact .trans ihab ihbc
  | reduce hSteps =>
      exact .reduce (OrdinaryReduction.steps_sound psEnv.delta leanEnv.delta hDelta hSteps)
  | app hf ha ihf iha => exact .app ihf iha
  | lamBody hBody ih =>
      simpa [PSExpr.toLean] using LeanEq.lamBody ih
  | piBody hBody ih =>
      simpa [PSExpr.toLean] using LeanEq.forallBody ih
  | eta hf =>
      have hfLean := DirectTyping.typing_sound psEnv.typing leanEnv.typing hTyping hf
      simpa [PSExpr.toLean, PSExpr.lift_toLean] using LeanEq.eta hfLean
  | proofIrrel hp hq hP =>
      have hpLean := DirectTyping.typing_sound psEnv.typing leanEnv.typing hTyping hp
      have hqLean := DirectTyping.typing_sound psEnv.typing leanEnv.typing hTyping hq
      have hPLean := DirectTyping.typing_sound psEnv.typing leanEnv.typing hTyping hP
      simpa [PSExpr.toLean, PSLevel.toLean] using LeanEq.proofIrrel hpLean hqLean hPLean

end OrdinaryDefEq
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.OrdinaryDefEq.etaExpansion_toLean
#print axioms ProofScriptKernelEquivalence.OrdinaryDefEq.sound
