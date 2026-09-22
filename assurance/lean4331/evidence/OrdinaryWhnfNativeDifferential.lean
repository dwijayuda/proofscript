import Lean
open Lean

universe u

def ordinaryId (α : Sort u) (x : α) : α := x
def ordinaryHead (α : Sort u) : α → α := ordinaryId α
abbrev ordinaryAbbrevHead (α : Sort u) : α → α := ordinaryId α
opaque ordinaryOpaqueHead (α : Sort u) : α → α := ordinaryId α

private def mkCase (name : Name) (i : Nat) : Expr :=
  let v := Level.ofNat (i % 23)
  let k := Level.succ v
  let inst := Level.succ k
  let α := Expr.sort k
  let x := Expr.sort v
  Expr.app (Expr.app (mkConst name [inst]) α) x

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let mut regular : Nat := 0
    let mut abbrevCount : Nat := 0
    let mut opaqueCount : Nat := 0
    let mut failures : Nat := 0
    for i in [:500] do
      let e := mkCase ``ordinaryHead (i*5+1)
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      let expected := Expr.sort (Level.ofNat ((i*5+1)%23))
      regular := regular + 1
      unless ← Meta.isDefEq r expected do failures := failures + 1
    for i in [:250] do
      let e := mkCase ``ordinaryAbbrevHead (i*7+3)
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      let expected := Expr.sort (Level.ofNat ((i*7+3)%23))
      abbrevCount := abbrevCount + 1
      unless ← Meta.isDefEq r expected do failures := failures + 1
    for i in [:250] do
      let e := mkCase ``ordinaryOpaqueHead (i*11+5)
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      opaqueCount := opaqueCount + 1
      if r != e then failures := failures + 1
    let total := regular + abbrevCount + opaqueCount
    logInfo m!"ORDINARY_WHNF_NATIVE_CASES={total} REGULAR={regular} ABBREV={abbrevCount} OPAQUE={opaqueCount} FAILURES={failures} KERNEL_CHECKS={total}"
    if failures != 0 then throwError "ordinary WHNF native differential failures: {failures}"
