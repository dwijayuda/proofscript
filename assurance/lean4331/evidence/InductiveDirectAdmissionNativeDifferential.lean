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

private partial def exprS : Expr → String
  | .bvar i => s!"(b {i})"
  | .fvar _ => "FVAR"
  | .mvar _ => "MVAR"
  | .sort u => s!"(sort {levelS u})"
  | .const n us => s!"(c {n} [{String.intercalate "," (us.map levelS)}])"
  | .app f a => s!"(a {exprS f} {exprS a})"
  | .lam _ d b bi => s!"(lam {binderS bi} {exprS d} {exprS b})"
  | .forallE _ d b bi => s!"(pi {binderS bi} {exprS d} {exprS b})"
  | .letE _ t v b nondep => s!"(let {nondep} {exprS t} {exprS v} {exprS b})"
  | .lit _ => "LIT"
  | .mdata _ e => s!"(mdata {exprS e})"
  | .proj n i e => s!"(proj {n} {i} {exprS e})"

private def namesS (xs : List Name) : String := String.intercalate "," (xs.map toString)
private def boolS (b : Bool) : String := if b then "1" else "0"
private def rulesS (rs : List RecursorRule) : String :=
  String.intercalate "," (rs.map fun r => s!"{r.ctor}:{r.nfields}")

private def pi (n : Name) (d b : Expr) : Expr := mkForall n BinderInfo.default d b
private def ctor (name : Name) (ty : Expr) : Constructor := { name, type := ty }
private def ind (name : Name) (ty : Expr) (ctors : List Constructor) : InductiveType := { name, type := ty, ctors }
private def ax (n : Name) (ty : Expr) : Declaration :=
  .axiomDecl (AxiomVal.mk (ConstantVal.mk n [] ty) false)

private def runCore {α : Type} (env : Environment) (m : CoreM α) : IO (Except Exception (α × Core.State)) := do
  let ctx : Core.Context := { fileName := "<inductive-direct-admission>", fileMap := "".toFileMap }
  let state : Core.State := { env := env }
  EIO.toIO' (StateRefT'.run (ReaderT.run m ctx) state)

private def setupBase : CoreM Unit :=
  Lean.addDecl (ax `KAInd.N (.sort (.succ .zero)))

private def dumpAccepted (id : String) (env : Environment) (n : Name) (ctors : List Name) : IO Unit := do
  match env.find? n with
  | some (.inductInfo d) =>
      IO.println s!"IND|{id}|{d.name}|lp={namesS d.levelParams}|ty={exprS d.type}|np={d.numParams}|ni={d.numIndices}|all={namesS d.all}|ctors={namesS d.ctors}|nested={d.numNested}|rec={boolS d.isRec}|unsafe={boolS d.isUnsafe}"
  | _ => throw <| IO.userError s!"{id}: missing inductive info"
  for cn in ctors do
    match env.find? cn with
    | some (.ctorInfo c) =>
        IO.println s!"CTOR|{id}|{c.name}|lp={namesS c.levelParams}|ty={exprS c.type}|ind={c.induct}|cidx={c.cidx}|np={c.numParams}|nf={c.numFields}|unsafe={boolS c.isUnsafe}"
    | _ => throw <| IO.userError s!"{id}: missing constructor {cn}"
  let rn := n ++ `rec
  match env.find? rn with
  | some (.recInfo r) =>
      IO.println s!"REC|{id}|{r.name}|lp={namesS r.levelParams}|ty={exprS r.type}|all={namesS r.all}|np={r.numParams}|ni={r.numIndices}|nm={r.numMotives}|nmin={r.numMinors}|k={boolS r.k}|unsafe={boolS r.isUnsafe}|rules={rulesS r.rules}"
  | _ => throw <| IO.userError s!"{id}: missing recursor {rn}"

private def runPositive (id : String) (n : Name) (ctors : List Name) (d : Declaration) : IO Unit := do
  let empty ← mkEmptyEnvironment
  let r ← runCore empty do
    setupBase
    Lean.addDecl d
    getEnv
  match r with
  | .error _ => throw <| IO.userError s!"{id}: exact Lean unexpectedly rejected positive direct inductive"
  | .ok (env, _) =>
      IO.println s!"ADM|{id}|ACCEPT|atomic=1"
      dumpAccepted id env n ctors

private def runNegative (id : String) (n : Name) (ctors : List Name) (d : Declaration) : IO Unit := do
  let empty ← mkEmptyEnvironment
  let r ← runCore empty do
    setupBase
    let rejected ← try
      Lean.addDecl d
      pure false
    catch _ => pure true
    let env ← getEnv
    let leaked := (env.find? n).isSome || (ctors.any fun cn => (env.find? cn).isSome) || (env.find? (n ++ `rec)).isSome
    pure (rejected, leaked)
  match r with
  | .error _ => throw <| IO.userError s!"{id}: outer CoreM failure"
  | .ok ((rejected, leaked), _) =>
      unless rejected && !leaked do throw <| IO.userError s!"{id}: rejection mismatch or non-atomic leak"
      IO.println s!"ADM|{id}|REJECT|atomic=1"

def main : IO Unit := do
  let type0 := Expr.sort (.succ .zero)
  let nTy := Expr.const `KAInd.N []

  runPositive "unit" `KAInd.Unitish [`KAInd.Unitish.mk]
    (.inductDecl [] 0 [ind `KAInd.Unitish type0 [ctor `KAInd.Unitish.mk (.const `KAInd.Unitish [])]] false)

  runPositive "list" `KAInd.Listish [`KAInd.Listish.nil, `KAInd.Listish.cons]
    (.inductDecl [] 0 [ind `KAInd.Listish type0 [
      ctor `KAInd.Listish.nil (.const `KAInd.Listish []),
      ctor `KAInd.Listish.cons (pi `x nTy (pi `xs (.const `KAInd.Listish []) (.const `KAInd.Listish [])))]] false)

  runPositive "ho" `KAInd.HO [`KAInd.HO.mk]
    (.inductDecl [] 0 [ind `KAInd.HO type0 [
      ctor `KAInd.HO.mk (pi `f (pi `x nTy (.const `KAInd.HO [])) (.const `KAInd.HO []))]] false)

  runPositive "void" `KAInd.Voidish []
    (.inductDecl [] 0 [ind `KAInd.Voidish type0 []] false)

  runPositive "prop" `KAInd.Propish [`KAInd.Propish.mk]
    (.inductDecl [] 0 [ind `KAInd.Propish (.sort .zero) [
      ctor `KAInd.Propish.mk (pi `x nTy (.const `KAInd.Propish []))]] false)

  let u := Level.param `u
  runPositive "poly" `KAInd.Poly [`KAInd.Poly.mk]
    (.inductDecl [`u] 0 [ind `KAInd.Poly (.sort (.succ u)) [
      ctor `KAInd.Poly.mk (.const `KAInd.Poly [u])]] false)

  let negSelf := Expr.const `KAInd.Neg []
  runNegative "negative-position" `KAInd.Neg [`KAInd.Neg.mk]
    (.inductDecl [] 0 [ind `KAInd.Neg type0 [
      ctor `KAInd.Neg.mk (pi `f (pi `x negSelf nTy) negSelf)]] false)

  runNegative "bad-result" `KAInd.BadResult [`KAInd.BadResult.mk]
    (.inductDecl [] 0 [ind `KAInd.BadResult type0 [
      ctor `KAInd.BadResult.mk nTy]] false)

  let bigSelf := Expr.const `KAInd.BigField []
  runNegative "field-universe" `KAInd.BigField [`KAInd.BigField.mk]
    (.inductDecl [] 0 [ind `KAInd.BigField type0 [
      ctor `KAInd.BigField.mk (pi `A type0 bigSelf)]] false)

  let dupSelf := Expr.const `KAInd.DupCtor []
  runNegative "duplicate-constructor" `KAInd.DupCtor [`KAInd.DupCtor.mk]
    (.inductDecl [] 0 [ind `KAInd.DupCtor type0 [
      ctor `KAInd.DupCtor.mk dupSelf,
      ctor `KAInd.DupCtor.mk dupSelf]] false)

  IO.println "INDUCTIVE_DIRECT_NATIVE_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4"
