import Lean

open Lean Elab Command

/-!
Exact Lean 4.33.1 recursor-metadata differential fixture for the ProofScript
v70 shared direct-inductive slice.  These declarations are submitted directly
through `Lean.addDecl`; no surface-inductive parameter inference is involved.
-/

axiom KARec.N : Type

private def pi (n : Name) (d b : Expr) : Expr := mkForall n BinderInfo.default d b
private def app (f a : Expr) : Expr := mkApp f a
private def apps (f : Expr) (as : List Expr) : Expr := mkAppN f as.toArray
private def boolStr (b : Bool) : String := if b then "true" else "false"
private def ruleStr (r : RecursorRule) : String := s!"{r.ctor.toString}:{r.nfields}"
private def ruleKeys (rs : List RecursorRule) : List (Name × Nat) := rs.map fun r => (r.ctor, r.nfields)
private def ind (name : Name) (ty : Expr) (ctors : List Constructor) : InductiveType :=
  { name, type := ty, ctors }
private def ctor (name : Name) (ty : Expr) : Constructor := { name, type := ty }

private def checkRec
    (env : Environment) (n : Name)
    (p i mot min firstMinor firstIndex major : Nat)
    (k : Bool) (rules : List (Name × Nat)) : MetaM Unit := do
  match env.find? n with
  | some (.recInfo r) =>
      unless r.numParams == p do throwError "{n}: numParams mismatch: {r.numParams} != {p}"
      unless r.numIndices == i do throwError "{n}: numIndices mismatch: {r.numIndices} != {i}"
      unless r.numMotives == mot do throwError "{n}: numMotives mismatch: {r.numMotives} != {mot}"
      unless r.numMinors == min do throwError "{n}: numMinors mismatch: {r.numMinors} != {min}"
      unless r.getFirstMinorIdx == firstMinor do throwError "{n}: firstMinor mismatch: {r.getFirstMinorIdx} != {firstMinor}"
      unless r.getFirstIndexIdx == firstIndex do throwError "{n}: firstIndex mismatch: {r.getFirstIndexIdx} != {firstIndex}"
      unless r.getMajorIdx == major do throwError "{n}: major mismatch: {r.getMajorIdx} != {major}"
      unless r.k == k do throwError "{n}: K mismatch: {r.k} != {k}"
      unless ruleKeys r.rules == rules do throwError "{n}: rule metadata mismatch"
      let rendered := String.intercalate "," (r.rules.map ruleStr)
      logInfo m!"REC_META {n.toString} p={p} i={i} mot={mot} min={min} firstMinor={firstMinor} firstIndex={firstIndex} major={major} k={boolStr k} rules=[{rendered}]"
  | _ => throwError "missing recursor {n}"

run_meta do
  let type0 := Expr.sort (.succ .zero)
  let propE := Expr.sort .zero
  let nTy := Expr.const `KARec.N []
  let add (lps : List Name) (np : Nat) (it : InductiveType) :=
    Lean.addDecl (.inductDecl lps np [it] false)

  add [] 0 (ind `KARec.U type0 [ctor `KARec.U.mk (.const `KARec.U [])])
  add [] 0 (ind `KARec.B type0 [ctor `KARec.B.mk (pi `x nTy (.const `KARec.B []))])
  add [] 0 (ind `KARec.L type0 [
    ctor `KARec.L.nil (.const `KARec.L []),
    ctor `KARec.L.cons (pi `x nTy (pi `xs (.const `KARec.L []) (.const `KARec.L [])))])
  add [] 1 (ind `KARec.W (pi `α type0 type0) [
    ctor `KARec.W.mk
      (pi `α type0 (pi `x (.bvar 0) (app (.const `KARec.W []) (.bvar 1))))])
  add [] 0 (ind `KARec.Ix (pi `n nTy type0) [
    ctor `KARec.Ix.mk (pi `n nTy (app (.const `KARec.Ix []) (.bvar 0)))])

  let u := Level.param `u
  let sortu := Expr.sort u
  let eqHead := Expr.const `KARec.Eqish [u]
  let eqTy := pi `α sortu (pi `a (.bvar 0) (pi `b (.bvar 1) propE))
  let eqCtor := pi `α sortu
    (pi `a (.bvar 0) (apps eqHead [.bvar 1, .bvar 0, .bvar 0]))
  add [`u] 2 (ind `KARec.Eqish eqTy [ctor `KARec.Eqish.refl eqCtor])
  add [] 0 (ind `KARec.Has propE [ctor `KARec.Has.mk (pi `x nTy (.const `KARec.Has []))])

  let env ← getEnv
  checkRec env `KARec.U.rec 0 0 1 1 1 2 2 false [(`KARec.U.mk, 0)]
  checkRec env `KARec.B.rec 0 0 1 1 1 2 2 false [(`KARec.B.mk, 1)]
  checkRec env `KARec.L.rec 0 0 1 2 1 3 3 false [(`KARec.L.nil, 0), (`KARec.L.cons, 2)]
  checkRec env `KARec.W.rec 1 0 1 1 2 3 3 false [(`KARec.W.mk, 1)]
  checkRec env `KARec.Ix.rec 0 1 1 1 1 2 3 false [(`KARec.Ix.mk, 1)]
  checkRec env `KARec.Eqish.rec 2 1 1 1 3 4 5 true [(`KARec.Eqish.refl, 0)]
  checkRec env `KARec.Has.rec 0 0 1 1 1 2 2 false [(`KARec.Has.mk, 1)]
  logInfo "RECURSOR_METADATA_NATIVE_CASES=7 FAILURES=0 RAW_KERNEL_DECLARATIONS=7"
