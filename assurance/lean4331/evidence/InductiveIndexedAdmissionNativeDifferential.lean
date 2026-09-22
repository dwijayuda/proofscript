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

private def pi (d b : Expr) : Expr := mkForall .anonymous BinderInfo.default d b
private def app (f a : Expr) : Expr := mkApp f a
private def apps (f : Expr) (as : List Expr) : Expr := as.foldl mkApp f
private def ctor (name : Name) (ty : Expr) : Constructor := { name, type := ty }
private def ind (name : Name) (ty : Expr) (ctors : List Constructor) : InductiveType := { name, type := ty, ctors }
private def ax (n : Name) (ty : Expr) : Declaration :=
  .axiomDecl (AxiomVal.mk (ConstantVal.mk n [] ty) false)

private def runCore {α : Type} (env : Environment) (m : CoreM α) : IO (Except Exception (α × Core.State)) := do
  let ctx : Core.Context := { fileName := "<inductive-indexed-admission>", fileMap := "".toFileMap }
  let state : Core.State := { env := env }
  EIO.toIO' (StateRefT'.run (ReaderT.run m ctx) state)

private def setupBase : CoreM Unit := do
  Lean.addDecl (ax `KAIdx.J (.sort (.succ .zero)))
  Lean.addDecl (ax `KAIdx.j0 (.const `KAIdx.J []))
  Lean.addDecl (ax `KAIdx.j1 (.const `KAIdx.J []))
  Lean.addDecl (ax `KAIdx.K (.sort (.succ .zero)))
  Lean.addDecl (ax `KAIdx.k0 (.const `KAIdx.K []))
  Lean.addDecl (ax `KAIdx.k1 (.const `KAIdx.K []))
  Lean.addDecl (ax `KAIdx.F (pi (.const `KAIdx.J []) (.sort (.succ .zero))))
  Lean.addDecl (ax `KAIdx.N (.sort (.succ .zero)))
  Lean.addDecl (ax `KAIdx.Alpha (.sort (.succ .zero)))

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
  | .error _ => throw <| IO.userError s!"{id}: exact Lean unexpectedly rejected positive indexed inductive"
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
  let prop := Expr.sort .zero
  let J := Expr.const `KAIdx.J []
  let j0 := Expr.const `KAIdx.j0 []
  let j1 := Expr.const `KAIdx.j1 []
  let K := Expr.const `KAIdx.K []
  let k0 := Expr.const `KAIdx.k0 []
  let k1 := Expr.const `KAIdx.k1 []
  let N := Expr.const `KAIdx.N []
  let Alpha := Expr.const `KAIdx.Alpha []
  let F := Expr.const `KAIdx.F []

  -- I : J → Type; constructors at j0 and j1 with direct recursion.
  runPositive "index-only" `KAIdx.I [`KAIdx.I.at0, `KAIdx.I.step]
    (.inductDecl [] 0 [ind `KAIdx.I (pi J type0) [
      ctor `KAIdx.I.at0 (apps (.const `KAIdx.I []) [j0]),
      ctor `KAIdx.I.step (pi (apps (.const `KAIdx.I []) [j0]) (apps (.const `KAIdx.I []) [j1]))
    ]] false)

  -- IX (A : Type) : J → Type; uniform parameter + recursive index change.
  runPositive "param-index" `KAIdx.IX [`KAIdx.IX.step]
    (.inductDecl [] 1 [ind `KAIdx.IX (pi type0 (pi J type0)) [
      ctor `KAIdx.IX.step
        (pi type0
          (pi (apps (.const `KAIdx.IX []) [.bvar 0, j0])
            (apps (.const `KAIdx.IX []) [.bvar 1, j1])))
    ]] false)

  -- DI (A : Type) : (j : J) → F j → Type; dependent two-index recursion.
  runPositive "dependent-index" `KAIdx.DI [`KAIdx.DI.mk]
    (.inductDecl [] 1 [ind `KAIdx.DI
      (pi type0 (pi J (pi (app F (.bvar 0)) type0))) [
        ctor `KAIdx.DI.mk
          (pi type0
            (pi J
              (pi (app F (.bvar 0))
                (pi (apps (.const `KAIdx.DI []) [.bvar 2, .bvar 1, .bvar 0])
                  (apps (.const `KAIdx.DI []) [.bvar 3, .bvar 2, .bvar 1])))))
      ]] false)

  -- Higher-order indexed recursive occurrence, preserving A beneath the inner Pi.
  runPositive "higher-order-index" `KAIdx.HOIX [`KAIdx.HOIX.mk]
    (.inductDecl [] 1 [ind `KAIdx.HOIX (pi type0 (pi J type0)) [
      ctor `KAIdx.HOIX.mk
        (pi type0
          (pi (pi N (apps (.const `KAIdx.HOIX []) [.bvar 1, j0]))
            (apps (.const `KAIdx.HOIX []) [.bvar 1, j1])))
    ]] false)

  -- Two indices and two recursive fields with distinct index tuples.
  runPositive "multi-index" `KAIdx.MIX [`KAIdx.MIX.step]
    (.inductDecl [] 1 [ind `KAIdx.MIX (pi type0 (pi J (pi K type0))) [
      ctor `KAIdx.MIX.step
        (pi type0
          (pi (apps (.const `KAIdx.MIX []) [.bvar 0, j0, k0])
            (pi (apps (.const `KAIdx.MIX []) [.bvar 1, j0, k1])
              (apps (.const `KAIdx.MIX []) [.bvar 2, j1, k1]))))
    ]] false)

  -- Eq-like universe-polymorphic dependent parameter/index family.
  let u := Level.param `u
  runPositive "eq-like" `KAIdx.EqX [`KAIdx.EqX.refl]
    (.inductDecl [`u] 2 [ind `KAIdx.EqX
      (pi (.sort u) (pi (.bvar 0) (pi (.bvar 1) prop))) [
        ctor `KAIdx.EqX.refl
          (pi (.sort u)
            (pi (.bvar 0)
              (apps (.const `KAIdx.EqX [u]) [.bvar 1, .bvar 0, .bvar 0])))
      ]] false)

  -- Parameter telescope differs from the family parameter telescope.
  runNegative "parameter-telescope" `KAIdx.BadTel [`KAIdx.BadTel.mk]
    (.inductDecl [] 1 [ind `KAIdx.BadTel (pi type0 (pi J type0)) [
      ctor `KAIdx.BadTel.mk (pi J (apps (.const `KAIdx.BadTel []) [.bvar 0, j0]))
    ]] false)

  -- Result uses a constructor-local J field instead of the uniform J parameter.
  runNegative "result-parameter" `KAIdx.BadResultParam [`KAIdx.BadResultParam.mk]
    (.inductDecl [] 1 [ind `KAIdx.BadResultParam (pi J (pi J type0)) [
      ctor `KAIdx.BadResultParam.mk
        (pi J (pi J (apps (.const `KAIdx.BadResultParam []) [.bvar 0, j0])))
    ]] false)

  -- Recursive field uses a constructor-local J value instead of the uniform parameter.
  runNegative "recursive-parameter" `KAIdx.BadRecParam [`KAIdx.BadRecParam.mk]
    (.inductDecl [] 1 [ind `KAIdx.BadRecParam (pi J (pi J type0)) [
      ctor `KAIdx.BadRecParam.mk
        (pi J
          (pi J
            (pi (apps (.const `KAIdx.BadRecParam []) [.bvar 0, j0])
              (apps (.const `KAIdx.BadRecParam []) [.bvar 2, j1]))))
    ]] false)

  -- Constructor result under-applies the indexed family.
  runNegative "result-arity" `KAIdx.BadArity [`KAIdx.BadArity.mk]
    (.inductDecl [] 1 [ind `KAIdx.BadArity (pi type0 (pi J type0)) [
      ctor `KAIdx.BadArity.mk (pi type0 (app (.const `KAIdx.BadArity []) (.bvar 0)))
    ]] false)

  -- Constructor result supplies a Type where the index expects J.
  runNegative "index-type" `KAIdx.BadIndexType [`KAIdx.BadIndexType.mk]
    (.inductDecl [] 1 [ind `KAIdx.BadIndexType (pi type0 (pi J type0)) [
      ctor `KAIdx.BadIndexType.mk
        (pi type0 (apps (.const `KAIdx.BadIndexType []) [.bvar 0, Alpha]))
    ]] false)

  -- Constructor result uses an incompatible universe instantiation of the family.
  runNegative "universe-instance" `KAIdx.BadLevel [`KAIdx.BadLevel.mk]
    (.inductDecl [`u] 1 [ind `KAIdx.BadLevel
      (pi (.sort u) (pi J (.sort (.succ u)))) [
        ctor `KAIdx.BadLevel.mk
          (pi (.sort u)
            (apps (.const `KAIdx.BadLevel [.zero]) [.bvar 0, j0]))
      ]] false)

  IO.println "INDUCTIVE_INDEXED_NATIVE_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6"
