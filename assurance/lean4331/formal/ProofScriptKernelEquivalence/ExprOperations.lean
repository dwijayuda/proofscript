import ProofScriptKernelEquivalence.ExprTranslation

namespace ProofScriptKernelEquivalence

namespace PSExpr

/-- Positive de Bruijn lift used by the trusted Core. -/
def lift : PSExpr → Nat → Nat → PSExpr
  | .sort u, _, _ => .sort u
  | .bvar i, cutoff, delta => if i < cutoff then .bvar i else .bvar (i + delta)
  | .const n us, _, _ => .const n us
  | .app f a, cutoff, delta => .app (lift f cutoff delta) (lift a cutoff delta)
  | .lam d b bi, cutoff, delta => .lam (lift d cutoff delta) (lift b (cutoff+1) delta) bi
  | .pi d b bi, cutoff, delta => .pi (lift d cutoff delta) (lift b (cutoff+1) delta) bi
  | .letE t v b nondep, cutoff, delta =>
      .letE (lift t cutoff delta) (lift v cutoff delta) (lift b (cutoff+1) delta) nondep
  | .proj n i e, cutoff, delta => .proj n i (lift e cutoff delta)

/--
Direct specification of outer-binder instantiation.  At binder depth `depth`,
the selected bvar is replaced by the argument lifted through that many binders;
looser bvars are lowered by one.
-/
def instantiateAt : PSExpr → PSExpr → Nat → PSExpr
  | .sort u, _, _ => .sort u
  | .bvar i, arg, depth =>
      if i = depth then lift arg 0 depth
      else if depth < i then .bvar (i-1)
      else .bvar i
  | .const n us, _, _ => .const n us
  | .app f a, arg, depth => .app (instantiateAt f arg depth) (instantiateAt a arg depth)
  | .lam d b bi, arg, depth =>
      .lam (instantiateAt d arg depth) (instantiateAt b arg (depth+1)) bi
  | .pi d b bi, arg, depth =>
      .pi (instantiateAt d arg depth) (instantiateAt b arg (depth+1)) bi
  | .letE t v b nondep, arg, depth =>
      .letE (instantiateAt t arg depth) (instantiateAt v arg depth)
        (instantiateAt b arg (depth+1)) nondep
  | .proj n i e, arg, depth => .proj n i (instantiateAt e arg depth)

/-- Instantiate the outermost binder. -/
def instantiate1 (body arg : PSExpr) : PSExpr := instantiateAt body arg 0

end PSExpr

namespace LeanExprSpec

/-- Pure structural reference for Lean's native `liftLooseBVars` on the shared Core. -/
def lift : Lean.Expr → Nat → Nat → Lean.Expr
  | .bvar i, cutoff, delta => if i < cutoff then .bvar i else .bvar (i + delta)
  | .fvar f, _, _ => .fvar f
  | .mvar m, _, _ => .mvar m
  | .sort u, _, _ => .sort u
  | .const n us, _, _ => .const n us
  | .app f a, cutoff, delta => .app (lift f cutoff delta) (lift a cutoff delta)
  | .lam n d b bi, cutoff, delta => .lam n (lift d cutoff delta) (lift b (cutoff+1) delta) bi
  | .forallE n d b bi, cutoff, delta => .forallE n (lift d cutoff delta) (lift b (cutoff+1) delta) bi
  | .letE n t v b nondep, cutoff, delta =>
      .letE n (lift t cutoff delta) (lift v cutoff delta) (lift b (cutoff+1) delta) nondep
  | .lit l, _, _ => .lit l
  | .mdata md e, cutoff, delta => .mdata md (lift e cutoff delta)
  | .proj n i e, cutoff, delta => .proj n i (lift e cutoff delta)

/-- Pure structural reference for Lean's native `instantiate1` on the shared Core. -/
def instantiateAt : Lean.Expr → Lean.Expr → Nat → Lean.Expr
  | .bvar i, arg, depth =>
      if i = depth then lift arg 0 depth
      else if depth < i then .bvar (i-1)
      else .bvar i
  | .fvar f, _, _ => .fvar f
  | .mvar m, _, _ => .mvar m
  | .sort u, _, _ => .sort u
  | .const n us, _, _ => .const n us
  | .app f a, arg, depth => .app (instantiateAt f arg depth) (instantiateAt a arg depth)
  | .lam n d b bi, arg, depth =>
      .lam n (instantiateAt d arg depth) (instantiateAt b arg (depth+1)) bi
  | .forallE n d b bi, arg, depth =>
      .forallE n (instantiateAt d arg depth) (instantiateAt b arg (depth+1)) bi
  | .letE n t v b nondep, arg, depth =>
      .letE n (instantiateAt t arg depth) (instantiateAt v arg depth)
        (instantiateAt b arg (depth+1)) nondep
  | .lit l, _, _ => .lit l
  | .mdata md e, arg, depth => .mdata md (instantiateAt e arg depth)
  | .proj n i e, arg, depth => .proj n i (instantiateAt e arg depth)

def instantiate1 (body arg : Lean.Expr) : Lean.Expr := instantiateAt body arg 0

end LeanExprSpec

namespace PSExpr

/-- The ProofScript-to-Lean embedding commutes with positive de Bruijn lifting. -/
theorem lift_toLean (e : PSExpr) (cutoff delta : Nat) :
    toLean (lift e cutoff delta) = LeanExprSpec.lift (toLean e) cutoff delta := by
  induction e generalizing cutoff with
  | sort u => rfl
  | bvar i =>
      by_cases h : i < cutoff
      · simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, h]
      · simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, h]
  | const n us => rfl
  | app f a ihf iha => simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, ihf, iha]
  | lam d b bi ihd ihb => simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, ihd, ihb]
  | pi d b bi ihd ihb => simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, ihd, ihb]
  | letE t v b nondep iht ihv ihb => simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, iht, ihv, ihb]
  | proj n i e ihe => simp [PSExpr.lift, PSExpr.toLean, LeanExprSpec.lift, ihe]

/-- The embedding commutes with direct binder instantiation at every binder depth. -/
theorem instantiateAt_toLean (body arg : PSExpr) (depth : Nat) :
    toLean (instantiateAt body arg depth) =
      LeanExprSpec.instantiateAt (toLean body) (toLean arg) depth := by
  induction body generalizing depth with
  | sort u => rfl
  | bvar i =>
      by_cases hEq : i = depth
      · simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, hEq, lift_toLean]
      · by_cases hLt : depth < i
        · simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, hEq, hLt]
        · simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, hEq, hLt]
  | const n us => rfl
  | app f a ihf iha => simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, ihf, iha]
  | lam d b bi ihd ihb => simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, ihd, ihb]
  | pi d b bi ihd ihb => simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, ihd, ihb]
  | letE t v b nondep iht ihv ihb =>
      simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, iht, ihv, ihb]
  | proj n i e ihe => simp [PSExpr.instantiateAt, PSExpr.toLean, LeanExprSpec.instantiateAt, ihe]

/-- Outer-binder instantiation commutes with the embedding. -/
theorem instantiate1_toLean (body arg : PSExpr) :
    toLean (instantiate1 body arg) = LeanExprSpec.instantiate1 (toLean body) (toLean arg) := by
  exact instantiateAt_toLean body arg 0

end PSExpr
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSExpr.lift_toLean
#print axioms ProofScriptKernelEquivalence.PSExpr.instantiateAt_toLean
#print axioms ProofScriptKernelEquivalence.PSExpr.instantiate1_toLean
