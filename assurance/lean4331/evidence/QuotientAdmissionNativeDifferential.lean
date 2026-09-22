import Lean

open Lean

private partial def levelS : Level → String
  | .zero => "0"
  | .succ u => s!"(s {levelS u})"
  | .max a b => s!"(max {levelS a} {levelS b})"
  | .imax a b => s!"(imax {levelS a} {levelS b})"
  | .param n => s!"(p {n})"
  | .mvar _ => "MVAR"

private def binderS : BinderInfo → String
  | .default => "E"
  | .implicit => "I"
  | .strictImplicit => "S"
  | .instImplicit => "Inst"

-- Keep lambda serialization exactly aligned with the TypeScript differential.
private partial def exprSExact : Expr → String
  | .bvar i => s!"(b {i})"
  | .fvar _ => "FVAR"
  | .mvar _ => "MVAR"
  | .sort u => s!"(sort {levelS u})"
  | .const n us => s!"(c {n} [{String.intercalate "," (us.map levelS)}])"
  | .app f a => s!"(a {exprSExact f} {exprSExact a})"
  | .lam _ d b bi => s!"(lam {binderS bi} {exprSExact d} {exprSExact b})"
  | .forallE _ d b bi => s!"(pi {binderS bi} {exprSExact d} {exprSExact b})"
  | .letE _ t v b nondep => s!"(let {nondep} {exprSExact t} {exprSExact v} {exprSExact b})"
  | .lit _ => "LIT"
  | .mdata _ e => s!"(mdata {exprSExact e})"
  | .proj n i e => s!"(proj {n} {i} {exprSExact e})"

private def quotKindS : QuotKind → String
  | .type => "type"
  | .ctor => "ctor"
  | .lift => "lift"
  | .ind => "ind"

private def pi (n : Name) (d b : Expr) : Expr := mkForall n BinderInfo.default d b
private def apps (f : Expr) (as : List Expr) : Expr := mkAppN f as.toArray

private def canonicalEq : Declaration :=
  let u := Level.param `u
  let sortu := Expr.sort u
  let prop := Expr.sort .zero
  let eqHead := Expr.const `Eq [u]
  let eqTy := pi `α sortu (pi `a (.bvar 0) (pi `b (.bvar 1) prop))
  let reflTy := pi `α sortu (pi `a (.bvar 0) (apps eqHead [.bvar 1, .bvar 0, .bvar 0]))
  .inductDecl [`u] 2 [{ name := `Eq, type := eqTy, ctors := [{ name := `Eq.refl, type := reflTy }] }] false

private def eqWithoutRefl : Declaration :=
  let u := Level.param `u
  let sortu := Expr.sort u
  let prop := Expr.sort .zero
  let eqTy := pi `α sortu (pi `a (.bvar 0) (pi `b (.bvar 1) prop))
  .inductDecl [`u] 2 [{ name := `Eq, type := eqTy, ctors := [] }] false

private def ax (n : Name) (ty : Expr) : Declaration :=
  .axiomDecl (AxiomVal.mk (ConstantVal.mk n [] ty) false)

private def runCore {α : Type} (env : Environment) (m : CoreM α) : IO (Except Exception (α × Core.State)) := do
  let ctx : Core.Context := { fileName := "<quot-admission>", fileMap := "".toFileMap }
  let state : Core.State := { env := env }
  EIO.toIO' (StateRefT'.run (ReaderT.run m ctx) state)

private def hasAnyQuot (env : Environment) : Bool :=
  [``Quot, ``Quot.mk, ``Quot.lift, ``Quot.ind].any fun n => (env.find? n).isSome

private def hasQuotTail (env : Environment) : Bool :=
  [``Quot.mk, ``Quot.lift, ``Quot.ind].any fun n => (env.find? n).isSome

private def rejectedQuot (setup : CoreM Unit) : IO (Bool × Environment) := do
  let env ← mkEmptyEnvironment
  let r ← runCore env do
    setup
    let rejected ← try
      Lean.addDecl .quotDecl
      pure false
    catch _ => pure true
    let env ← getEnv
    pure (rejected, env)
  match r with
  | .error _ => throw <| IO.userError "unexpected outer CoreM failure in quotient rejection fixture"
  | .ok ((rejected, finalEnv), _) => pure (rejected, finalEnv)

def main : IO Unit := do
  -- Positive: canonical Eq + Eq.refl must atomically install all four quotient primitives.
  let empty ← mkEmptyEnvironment
  let ok ← runCore empty do
    Lean.addDecl canonicalEq
    Lean.addDecl .quotDecl
    getEnv
  let goodEnv ← match ok with
    | .error _ => throw <| IO.userError "canonical Eq + quotDecl unexpectedly rejected"
    | .ok (env, _) => pure env
  for n in [``Quot, ``Quot.mk, ``Quot.lift, ``Quot.ind] do
    match goodEnv.find? n with
    | some (.quotInfo q) =>
      IO.println s!"QF|{q.name}|{String.intercalate "," (q.levelParams.map toString)}|{quotKindS q.kind}|{exprSExact q.type}"
    | _ => throw <| IO.userError s!"fresh quotDecl missing quotient primitive {n}"

  -- Negative 1: no Eq at all.
  let (noEqRejected, noEqEnv) ← rejectedQuot (pure ())
  unless noEqRejected && !hasAnyQuot noEqEnv do
    throw <| IO.userError "quotDecl without Eq was not cleanly/atomically rejected"

  -- Negative 2: a constant named Eq exists, but it is not the canonical inductive.
  let (wrongEqRejected, wrongEqEnv) ← rejectedQuot (Lean.addDecl (ax `Eq (.sort .zero)))
  unless wrongEqRejected && !hasAnyQuot wrongEqEnv do
    throw <| IO.userError "quotDecl with non-inductive Eq was not cleanly/atomically rejected"

  -- Negative 3: Eq is an inductive but the canonical Eq.refl constructor is absent.
  let (noReflRejected, noReflEnv) ← rejectedQuot (Lean.addDecl eqWithoutRefl)
  unless noReflRejected && !hasAnyQuot noReflEnv do
    throw <| IO.userError "quotDecl without Eq.refl was not cleanly/atomically rejected"

  -- Negative 4: canonical Eq is present, but Quot already exists. No tail primitive may leak in.
  let collisionPrefix : CoreM Unit := do
    Lean.addDecl canonicalEq
    Lean.addDecl (ax `Quot (.sort (.succ .zero)))
  let (collisionRejected, collisionEnv) ← rejectedQuot collisionPrefix
  unless collisionRejected && (collisionEnv.find? `Quot).isSome && !hasQuotTail collisionEnv do
    throw <| IO.userError "quotDecl name collision was not atomic"

  IO.println "QUOT_ADMISSION_NATIVE_POSITIVE=1 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4"
