import Lean
open Lean Meta

axiom J : Type
axiom A : Type
axiom P : Nat → Prop
axiom Q : Prop

private def expectOK (label : String) (act : MetaM Unit) : MetaM Unit := do
  try
    act
    logInfo m!"PASS {label}"
  catch e =>
    throwError "expected acceptance for {label}, got: {e.toMessageData}"

private def expectReject (label : String) (act : MetaM Unit) : MetaM Unit := do
  let rejected ← try
    act
    pure false
  catch _ =>
    pure true
  unless rejected do
    throwError "expected kernel rejection for {label}"
  logInfo m!"PASS {label}=rejected"

run_meta do
  -- Exact raw kernel metadata: nparams=0, nindices=1, constructor has j then a.
  let depTy := mkForall `j .default (mkConst ``J) (mkSort 1)
  let depCtorTy := mkForall `j .default (mkConst ``J) <|
    mkForall `a .default (mkConst ``A) <|
      mkApp (mkConst `RawDep) (.bvar 1)
  addDecl (.inductDecl [] 0 [{name:=`RawDep,type:=depTy,ctors:=[{name:=`RawDep.mk,type:=depCtorTy}]}] false)

  withLocalDeclD `j (mkConst ``J) fun j =>
    withLocalDeclD `d (mkApp (mkConst `RawDep) j) fun d => do
      expectOK "raw-indexed-proj-0" do
        let e := mkProj `RawDep 0 d
        let ty ← inferType e
        unless (← isDefEq ty (mkConst ``J)) do throwError "proj 0 type mismatch: {ty}"
        checkWithKernel e
      expectOK "raw-indexed-proj-1" do
        let e := mkProj `RawDep 1 d
        let ty ← inferType e
        unless (← isDefEq ty (mkConst ``A)) do throwError "proj 1 type mismatch: {ty}"
        checkWithKernel e
      expectReject "raw-indexed-proj-2" do
        let e := mkProj `RawDep 2 d
        discard <| inferType e
        checkWithKernel e

  -- Prop major, first field is Nat, later proof field depends on that Nat.
  let witTy := mkSort 0
  let witCtorTy := mkForall `n .default (mkConst ``Nat) <|
    mkForall `h .default (mkApp (mkConst ``P) (.bvar 0)) <|
      mkConst `RawWitness
  addDecl (.inductDecl [] 0 [{name:=`RawWitness,type:=witTy,ctors:=[{name:=`RawWitness.mk,type:=witCtorTy}]}] false)
  withLocalDeclD `w (mkConst `RawWitness) fun w => do
    expectReject "prop-data-target" do
      let e := mkProj `RawWitness 0 w
      discard <| inferType e
      checkWithKernel e
    expectReject "prop-dependent-proof-crossing-data" do
      let e := mkProj `RawWitness 1 w
      discard <| inferType e
      checkWithKernel e

  -- Same Prop major shape, but the later proof field does not depend on Nat.
  let wiCtorTy := mkForall `n .default (mkConst ``Nat) <|
    mkForall `h .default (mkConst ``Q) <|
      mkConst `RawWitnessIndependent
  addDecl (.inductDecl [] 0 [{name:=`RawWitnessIndependent,type:=witTy,ctors:=[{name:=`RawWitnessIndependent.mk,type:=wiCtorTy}]}] false)
  withLocalDeclD `w (mkConst `RawWitnessIndependent) fun w => do
    expectReject "prop-independent-data-target" do
      let e := mkProj `RawWitnessIndependent 0 w
      discard <| inferType e
      checkWithKernel e
    expectOK "prop-independent-proof-field" do
      let e := mkProj `RawWitnessIndependent 1 w
      let ty ← inferType e
      unless (← isDefEq ty (mkConst ``Q)) do throwError "independent proof type mismatch: {ty}"
      checkWithKernel e

  logInfo "PASS ProjectionConformanceExact: exact Lean 4.33.1 raw projection semantics"
