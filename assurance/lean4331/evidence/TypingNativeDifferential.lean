import Lean
open Lean

private def checkOne (e expected : Expr) : MetaM Bool := do
  let ty ← Meta.inferType e
  Meta.checkWithKernel e
  Meta.isDefEq ty expected

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let mut total : Nat := 0
    let mut failures : Nat := 0
    for i in [:250] do
      let u := Level.ofNat (i % 7)
      let e := Expr.sort u
      let expected := Expr.sort (.succ u)
      total := total + 1
      unless ← checkOne e expected do failures := failures + 1
    for i in [:250] do
      let u := Level.ofNat (i % 7)
      let v := Level.ofNat ((i*3+1) % 7)
      let d := Expr.sort u
      let b := Expr.sort v
      let e := Expr.forallE .anonymous d b .default
      let expected := Expr.sort (.imax (.succ u) (.succ v))
      total := total + 1
      unless ← checkOne e expected do failures := failures + 1
    for i in [:250] do
      let k := Level.ofNat (i % 7)
      let d := Expr.sort (.succ k)
      let e := Expr.lam .anonymous d (.bvar 0) .default
      let expected := Expr.forallE .anonymous d d .default
      total := total + 1
      unless ← checkOne e expected do failures := failures + 1
    for i in [:125] do
      let k := Level.ofNat (i % 7)
      let d := Expr.sort (.succ k)
      let arg := Expr.sort k
      let f := Expr.lam .anonymous d (.bvar 0) .default
      let e := Expr.app f arg
      let expected := d
      total := total + 1
      unless ← checkOne e expected do failures := failures + 1
    for i in [:125] do
      let k := Level.ofNat (i % 7)
      let t := Expr.sort (.succ k)
      let value := Expr.sort k
      let e := Expr.letE .anonymous t value (.bvar 0) false
      let expected := t
      total := total + 1
      unless ← checkOne e expected do failures := failures + 1
    logInfo m!"TYPING_NATIVE_CASES={total} FAILURES={failures} KERNEL_CHECKS={total}"
    if failures != 0 then throwError "typing native differential failures: {failures}"
