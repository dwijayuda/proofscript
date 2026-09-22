import Lean
open Lean Meta
axiom J : Type
axiom A : Type
axiom P : Nat → Prop
axiom Q : Prop

private def accepted (act : MetaM Unit) : MetaM Bool := do
  try act; pure true catch _ => pure false
private def rejected (act : MetaM Unit) : MetaM Bool := return !(← accepted act)

run_meta do
  let depTy := mkForall `j .default (mkConst ``J) (mkSort 1)
  let depCtorTy := mkForall `j .default (mkConst ``J) <|
    mkForall `a .default (mkConst ``A) <| mkApp (mkConst `RawDep) (.bvar 1)
  addDecl (.inductDecl [] 0 [{name:=`RawDep,type:=depTy,ctors:=[{name:=`RawDep.mk,type:=depCtorTy}]}] false)
  let witCtorTy := mkForall `n .default (mkConst ``Nat) <|
    mkForall `h .default (mkApp (mkConst ``P) (.bvar 0)) <| mkConst `RawWitness
  addDecl (.inductDecl [] 0 [{name:=`RawWitness,type:=mkSort 0,ctors:=[{name:=`RawWitness.mk,type:=witCtorTy}]}] false)
  let wiCtorTy := mkForall `n .default (mkConst ``Nat) <|
    mkForall `h .default (mkConst ``Q) <| mkConst `RawWitnessIndependent
  addDecl (.inductDecl [] 0 [{name:=`RawWitnessIndependent,type:=mkSort 0,ctors:=[{name:=`RawWitnessIndependent.mk,type:=wiCtorTy}]}] false)

  let record (b : Bool) : MetaM Unit := do
    unless b do throwError "projection differential mismatch"

  withLocalDeclD `j (mkConst ``J) fun j =>
    withLocalDeclD `a (mkConst ``A) fun a =>
      withLocalDeclD `d (mkApp (mkConst `RawDep) j) fun d =>
        withLocalDeclD `w (mkConst `RawWitness) fun w =>
          withLocalDeclD `wi (mkConst `RawWitnessIndependent) fun wi => do
            let built := mkApp (mkApp (mkConst `RawDep.mk) j) a
            for _ in [0:125] do
              record (← accepted do
                let e := mkProj `RawDep 0 d
                let ty ← inferType e
                unless (← isDefEq ty (mkConst ``J)) do throwError "type mismatch"
                checkWithKernel e)
              record (← accepted do
                let e := mkProj `RawDep 1 d
                let ty ← inferType e
                unless (← isDefEq ty (mkConst ``A)) do throwError "type mismatch"
                checkWithKernel e)
              record (← rejected do
                let e := mkProj `RawDep 2 d
                discard <| inferType e
                checkWithKernel e)
              record (← rejected do
                let e := mkProj `RawWitness 0 w
                discard <| inferType e
                checkWithKernel e)
              record (← rejected do
                let e := mkProj `RawWitness 1 w
                discard <| inferType e
                checkWithKernel e)
              record (← rejected do
                let e := mkProj `RawWitnessIndependent 0 wi
                discard <| inferType e
                checkWithKernel e)
              record (← accepted do
                let e := mkProj `RawWitnessIndependent 1 wi
                let ty ← inferType e
                unless (← isDefEq ty (mkConst ``Q)) do throwError "type mismatch"
                checkWithKernel e)
              record (← accepted do
                let e := mkProj `RawDep 1 built
                checkWithKernel e
                let wh ← whnf e
                unless (← isDefEq wh a) do throwError "iota mismatch")
  logInfo "PROJECTION_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKED=1000"
