import Lean

open Lean Elab Command Meta

partial def levelS : Level → String
  | .zero => "0"
  | .succ u => s!"(s {levelS u})"
  | .max a b => s!"(max {levelS a} {levelS b})"
  | .imax a b => s!"(imax {levelS a} {levelS b})"
  | .param n => s!"(p {n})"
  | .mvar _ => "MVAR"

def binderS : BinderInfo → String
  | .default => "E"
  | .implicit => "I"
  | .strictImplicit => "S"
  | .instImplicit => "Inst"

partial def exprS : Expr → String
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

def quotKindS : QuotKind → String
  | .type => "type"
  | .ctor => "ctor"
  | .lift => "lift"
  | .ind => "ind"

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let env ← getEnv
    for n in [``Quot, ``Quot.mk, ``Quot.lift, ``Quot.ind] do
      match env.find? n with
      | some (.quotInfo q) =>
        IO.println s!"Q|{q.name}|{String.intercalate "," (q.levelParams.map toString)}|{quotKindS q.kind}|{exprS q.type}"
      | _ => throwError "missing quotient primitive {n}"

    let u := Level.succ Level.zero
    let nat := mkConst ``Nat
    let rel := mkApp (mkConst ``Eq [u]) nat
    let quotNat := mkApp2 (mkConst ``Quot [u]) nat rel
    let idNat := mkLambda `x BinderInfo.default nat (.bvar 0)
    let sound := mkLambda `a BinderInfo.default nat <|
      mkLambda `b BinderInfo.default nat <|
        mkLambda `h BinderInfo.default (mkApp2 rel (.bvar 1) (.bvar 0)) (.bvar 0)

    let mut liftFailures : Nat := 0
    let mut indFailures : Nat := 0
    let mut kernelChecks : Nat := 0

    -- 250 direct-major cases.
    for i in [:250] do
      let rep := mkNatLit i
      let major := mkApp3 (mkConst ``Quot.mk [u]) nat rel rep
      let liftExpr := mkApp6 (mkConst ``Quot.lift [u, u]) nat rel nat idNat sound major
      Meta.checkWithKernel liftExpr
      kernelChecks := kernelChecks + 1
      let liftTy ← Meta.inferType liftExpr
      unless ← Meta.isDefEq liftTy nat do liftFailures := liftFailures + 1
      let liftWhnf ← Meta.whnf liftExpr
      unless ← Meta.isDefEq liftWhnf rep do liftFailures := liftFailures + 1

      let eqNN := mkApp3 (mkConst ``Eq [u]) nat rep rep
      let motive := mkLambda `q BinderInfo.default quotNat eqNN
      let refl := mkApp2 (mkConst ``Eq.refl [u]) nat rep
      let witness := mkLambda `a BinderInfo.default nat refl
      let indExpr := mkApp5 (mkConst ``Quot.ind [u]) nat rel motive witness major
      Meta.checkWithKernel indExpr
      kernelChecks := kernelChecks + 1
      let indTy ← Meta.inferType indExpr
      unless ← Meta.isDefEq indTy eqNN do indFailures := indFailures + 1
      let indWhnf ← Meta.whnf indExpr
      unless ← Meta.isDefEq indWhnf refl do indFailures := indFailures + 1

    -- 250 cases with an application after the major. This checks Lean's
    -- mkAppRange/rest-argument behavior, not only the basic quotient redex.
    let natToNat := Expr.forallE .anonymous nat nat .default
    let idBody := mkLambda `y BinderInfo.default nat (.bvar 0)
    let f2 := mkLambda `x BinderInfo.default nat idBody
    let reflFn := mkApp2 (mkConst ``Eq.refl [u]) natToNat idBody
    let sound2 := mkLambda `a BinderInfo.default nat <|
      mkLambda `b BinderInfo.default nat <|
        mkLambda `h BinderInfo.default (mkApp2 rel (.bvar 1) (.bvar 0)) reflFn
    for i in [:250] do
      let rep := mkNatLit (i + 250)
      let major := mkApp3 (mkConst ``Quot.mk [u]) nat rel rep
      let liftHead := mkApp6 (mkConst ``Quot.lift [u, u]) nat rel natToNat f2 sound2 major
      let liftExpr := mkApp liftHead rep
      Meta.checkWithKernel liftExpr
      kernelChecks := kernelChecks + 1
      let liftTy ← Meta.inferType liftExpr
      unless ← Meta.isDefEq liftTy nat do liftFailures := liftFailures + 1
      let liftWhnf ← Meta.whnf liftExpr
      unless ← Meta.isDefEq liftWhnf rep do liftFailures := liftFailures + 1

      let eqNN := mkApp3 (mkConst ``Eq [u]) nat rep rep
      let motiveBody := Expr.forallE .anonymous nat eqNN .default
      let motive := mkLambda `q BinderInfo.default quotNat motiveBody
      let refl := mkApp2 (mkConst ``Eq.refl [u]) nat rep
      let witness := mkLambda `a BinderInfo.default nat <| mkLambda `x BinderInfo.default nat refl
      let indHead := mkApp5 (mkConst ``Quot.ind [u]) nat rel motive witness major
      let indExpr := mkApp indHead rep
      Meta.checkWithKernel indExpr
      kernelChecks := kernelChecks + 1
      let indTy ← Meta.inferType indExpr
      unless ← Meta.isDefEq indTy eqNN do indFailures := indFailures + 1
      let indWhnf ← Meta.whnf indExpr
      unless ← Meta.isDefEq indWhnf refl do indFailures := indFailures + 1

    IO.println s!"QUOT_NATIVE_LIFT=500 IND=500 LIFT_FAILURES={liftFailures} IND_FAILURES={indFailures} KERNEL_CHECKS={kernelChecks}"
    if liftFailures + indFailures != 0 then
      throwError "quotient native differential failures: lift={liftFailures}, ind={indFailures}"
