import Lean
open Lean

universe u

def deltaRegular (α : Sort u) (x : α) : α := x
abbrev deltaAbbrev (α : Sort u) (x : α) : α := x
opaque deltaOpaque (α : Sort u) (x : α) : α := x
theorem deltaTheorem : True := True.intro

private def mkPolyCase (name : Name) (i : Nat) : Expr :=
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
    let mut theoremOpaque : Nat := 0
    let mut failures : Nat := 0

    for i in [:400] do
      let e := mkPolyCase ``deltaRegular i
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      let v := Level.ofNat (i % 23)
      let expected := Expr.sort v
      regular := regular + 1
      unless ← Meta.isDefEq r expected do failures := failures + 1

    for i in [:200] do
      let e := mkPolyCase ``deltaAbbrev (i * 7 + 3)
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      let v := Level.ofNat ((i * 7 + 3) % 23)
      let expected := Expr.sort v
      abbrevCount := abbrevCount + 1
      unless ← Meta.isDefEq r expected do failures := failures + 1

    for i in [:200] do
      let e := mkPolyCase ``deltaOpaque (i * 11 + 5)
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      opaqueCount := opaqueCount + 1
      if r != e then failures := failures + 1

    for _ in [:200] do
      let e := mkConst ``deltaTheorem
      Meta.checkWithKernel e
      let r ← Meta.whnf e
      theoremOpaque := theoremOpaque + 1
      if r != e then failures := failures + 1

    let regInfo ← getConstInfo ``deltaRegular
    let abbInfo ← getConstInfo ``deltaAbbrev
    let opaInfo ← getConstInfo ``deltaOpaque
    let thmInfo ← getConstInfo ``deltaTheorem
    unless regInfo.hasValue && abbInfo.hasValue && !opaInfo.hasValue && !thmInfo.hasValue do
      failures := failures + 1

    let total := regular + abbrevCount + opaqueCount + theoremOpaque
    logInfo m!"DELTA_NATIVE_CASES={total} REGULAR={regular} ABBREV={abbrevCount} OPAQUE={opaqueCount} THEOREM_OPAQUE={theoremOpaque} FAILURES={failures} KERNEL_CHECKS={total}"
    if failures != 0 then throwError "delta/transparency native differential failures: {failures}"
