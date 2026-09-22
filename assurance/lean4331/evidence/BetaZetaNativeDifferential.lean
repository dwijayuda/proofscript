import Lean
open Lean

private def checkWhnf (e expected : Expr) : MetaM Bool := do
  Meta.checkWithKernel e
  let r ← Meta.whnf e
  Meta.isDefEq r expected

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let mut beta : Nat := 0
    let mut zeta : Nat := 0
    let mut failures : Nat := 0
    for i in [:500] do
      let k := Level.ofNat (i % 9)
      let d := Expr.sort (.succ k)
      let arg := Expr.sort k
      let e := Expr.app (Expr.lam .anonymous d (.bvar 0) .default) arg
      beta := beta + 1
      unless ← checkWhnf e arg do failures := failures + 1
    for i in [:500] do
      let k := Level.ofNat (i % 9)
      let t := Expr.sort (.succ k)
      let value := Expr.sort k
      let e := Expr.letE .anonymous t value (.bvar 0) false
      zeta := zeta + 1
      unless ← checkWhnf e value do failures := failures + 1
    logInfo m!"BETA_CASES={beta} ZETA_CASES={zeta} FAILURES={failures} KERNEL_CHECKS={beta+zeta}"
    if failures != 0 then throwError "beta/zeta native differential failures: {failures}"
