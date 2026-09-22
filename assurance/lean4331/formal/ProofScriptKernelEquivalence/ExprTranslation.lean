import ProofScriptKernelEquivalence.LevelLeanCorrespondence

namespace ProofScriptKernelEquivalence

/-- Binder information serialized by the ProofScript trusted Core. -/
inductive PSBinderInfo where
  | explicit
  | implicit
  | strictImplicit
  | instImplicit
  deriving Repr, DecidableEq

namespace PSBinderInfo

def toLean : PSBinderInfo → Lean.BinderInfo
  | .explicit => .default
  | .implicit => .implicit
  | .strictImplicit => .strictImplicit
  | .instImplicit => .instImplicit

theorem toLean_injective : Function.Injective toLean := by
  intro a b h
  cases a <;> cases b <;> simp [toLean] at h ⊢

end PSBinderInfo

/--
Canonical comparison representation of the trusted ProofScript expression Core.
Names are already translated to Lean.Name by an untrusted boundary adapter, so
this datatype isolates logical expression correspondence from textual-name parsing.
-/
inductive PSExpr where
  | sort (level : PSLevel)
  | bvar (index : Nat)
  | const (name : Lean.Name) (levels : List PSLevel)
  | app (fn arg : PSExpr)
  | lam (domain body : PSExpr) (binderInfo : PSBinderInfo := .explicit)
  | pi (domain body : PSExpr) (binderInfo : PSBinderInfo := .explicit)
  | letE (type value body : PSExpr) (nondep : Bool)
  | proj (typeName : Lean.Name) (index : Nat) (expr : PSExpr)
  deriving Repr, DecidableEq

namespace PSExpr

/-- Binder names are semantically irrelevant in Core; use anonymous names canonically. -/
def toLean : PSExpr → Lean.Expr
  | .sort u => .sort u.toLean
  | .bvar i => .bvar i
  | .const n us => .const n (us.map PSLevel.toLean)
  | .app f a => .app (toLean f) (toLean a)
  | .lam d b bi => .lam .anonymous (toLean d) (toLean b) bi.toLean
  | .pi d b bi => .forallE .anonymous (toLean d) (toLean b) bi.toLean
  | .letE t v b nondep => .letE .anonymous (toLean t) (toLean v) (toLean b) nondep
  | .proj n i e => .proj n i (toLean e)

end PSExpr

/--
Structural predicate for the exact Lean expression forms represented by the
ProofScript shared Core.  It excludes fvars, expression metavariables, literals,
and metadata, and recursively excludes universe metavariables.
-/
inductive LeanExprShared : Lean.Expr → Prop where
  | sort {u : Lean.Level} : LeanLevelNoMVar u → LeanExprShared (.sort u)
  | bvar (i : Nat) : LeanExprShared (.bvar i)
  | const {n : Lean.Name} {us : List Lean.Level} :
      (∀ u ∈ us, LeanLevelNoMVar u) → LeanExprShared (.const n us)
  | app {f a : Lean.Expr} : LeanExprShared f → LeanExprShared a → LeanExprShared (.app f a)
  | lam {n : Lean.Name} {d b : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanExprShared d → LeanExprShared b → LeanExprShared (.lam n d b bi)
  | forallE {n : Lean.Name} {d b : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanExprShared d → LeanExprShared b → LeanExprShared (.forallE n d b bi)
  | letE {n : Lean.Name} {t v b : Lean.Expr} {nondep : Bool} :
      LeanExprShared t → LeanExprShared v → LeanExprShared b →
      LeanExprShared (.letE n t v b nondep)
  | proj {n : Lean.Name} {i : Nat} {e : Lean.Expr} :
      LeanExprShared e → LeanExprShared (.proj n i e)

namespace PSExpr

private theorem levels_toLean_shared (us : List PSLevel) :
    ∀ u ∈ us.map PSLevel.toLean, LeanLevelNoMVar u := by
  intro u hu
  simp only [List.mem_map] at hu
  rcases hu with ⟨v, hv, rfl⟩
  exact v.toLean_noMVar

/-- Every translated ProofScript Core expression lies inside the declared Lean shared domain. -/
theorem toLean_shared (e : PSExpr) : LeanExprShared (toLean e) := by
  induction e with
  | sort u => exact .sort u.toLean_noMVar
  | bvar i => exact .bvar i
  | const n us => exact .const (levels_toLean_shared us)
  | app f a ihf iha => exact .app ihf iha
  | lam d b bi ihd ihb => exact .lam ihd ihb
  | pi d b bi ihd ihb => exact .forallE ihd ihb
  | letE t v b nondep iht ihv ihb => exact .letE iht ihv ihb
  | proj n i e ihe => exact .proj ihe

/-- Translation preserves the outer expression constructor for sorts. -/
theorem toLean_sort (u : PSLevel) :
    toLean (.sort u) = .sort u.toLean := rfl

/-- Translation preserves de Bruijn indices exactly. -/
theorem toLean_bvar (i : Nat) :
    toLean (.bvar i) = .bvar i := rfl

/-- Translation preserves applications exactly. -/
theorem toLean_app (f a : PSExpr) :
    toLean (.app f a) = .app (toLean f) (toLean a) := rfl

/-- Translation preserves projections exactly after name adaptation. -/
theorem toLean_proj (n : Lean.Name) (i : Nat) (e : PSExpr) :
    toLean (.proj n i e) = .proj n i (toLean e) := rfl

end PSExpr
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSBinderInfo.toLean_injective
#print axioms ProofScriptKernelEquivalence.PSExpr.toLean_shared
#print axioms ProofScriptKernelEquivalence.PSExpr.toLean_sort
#print axioms ProofScriptKernelEquivalence.PSExpr.toLean_bvar
#print axioms ProofScriptKernelEquivalence.PSExpr.toLean_app
#print axioms ProofScriptKernelEquivalence.PSExpr.toLean_proj
