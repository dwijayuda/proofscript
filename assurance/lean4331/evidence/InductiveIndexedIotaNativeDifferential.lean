import Lean

open Lean Elab Command Meta

namespace KAIdxIota

set_option inductive.autoPromoteIndices false

axiom J : Type
axiom j0 : J
axiom j1 : J
axiom K : Type
axiom k0 : K
axiom k1 : K
axiom F : J → Type
axiom N : Type
axiom n0 : N
axiom Alpha : Type

inductive I : J → Type where
  | at0 : I j0
  | step : I j0 → I j1

inductive IX (A : Type) : J → Type where
  | step : IX A j0 → IX A j1

inductive DI (A : Type) : (j : J) → F j → Type where
  | mk : (j : J) → (x : F j) → DI A j x → DI A j x

inductive HOIX (A : Type) : J → Type where
  | mk : (N → HOIX A j0) → HOIX A j1

inductive MIX (A : Type) : J → K → Type where
  | step : MIX A j0 k0 → MIX A j0 k1 → MIX A j1 k1

universe u
inductive EqX (A : Sort u) (a : A) : A → Prop where
  | refl : EqX A a a

axiom i0 : I j0
axiom xIX : IX Alpha j0
axiom x0 : F j0
axiom d0 : DI Alpha j0 x0
axiom fHO : N → HOIX Alpha j0
axiom m0 : MIX Alpha j0 k0
axiom m1 : MIX Alpha j0 k1
axiom a0 : Alpha

end KAIdxIota

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
  | .mdata _ e => exprS e
  | .proj n i e => s!"(proj {n} {i} {exprS e})"

private def apps (f : Expr) (as : List Expr) : Expr := as.foldl mkApp f
private def lam (d b : Expr) : Expr := Expr.lam .anonymous d b .default

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let L1 := Level.succ Level.zero
    let J := mkConst ``KAIdxIota.J
    let j0 := mkConst ``KAIdxIota.j0
    let j1 := mkConst ``KAIdxIota.j1
    let K := mkConst ``KAIdxIota.K
    let k0 := mkConst ``KAIdxIota.k0
    let k1 := mkConst ``KAIdxIota.k1
    let F := mkConst ``KAIdxIota.F
    let N := mkConst ``KAIdxIota.N
    let n0 := mkConst ``KAIdxIota.n0
    let Alpha := mkConst ``KAIdxIota.Alpha

    let checkPrint (id : String) (e : Expr) : MetaM Unit := do
      Meta.checkWithKernel e
      let w ← Meta.whnf e
      IO.println s!"IOTA|{id}|{exprS w}"

    -- I.step: expose recursive index j0 in the IH.
    let iMotive := lam J (lam (apps (mkConst ``KAIdxIota.I) [.bvar 0]) N)
    let iMinor0 := n0
    let iFieldTy := apps (mkConst ``KAIdxIota.I) [j0]
    let iMinorStep := lam iFieldTy (lam N (.bvar 0))
    let iMajor := apps (mkConst ``KAIdxIota.I.step) [mkConst ``KAIdxIota.i0]
    let iApp := apps (mkConst ``KAIdxIota.I.rec [L1]) [iMotive, iMinor0, iMinorStep, j1, iMajor]
    checkPrint "index-only-step" iApp

    -- IX.step: parameter + recursive index transition j0 -> j1.
    let ix0 := apps (mkConst ``KAIdxIota.IX) [Alpha, j0]
    let ixMotive := lam J (lam (apps (mkConst ``KAIdxIota.IX) [Alpha, .bvar 0]) N)
    let ixMinor := lam ix0 (lam N (.bvar 0))
    let ixMajor := apps (mkConst ``KAIdxIota.IX.step) [Alpha, mkConst ``KAIdxIota.xIX]
    let ixApp := apps (mkConst ``KAIdxIota.IX.rec [L1]) [Alpha, ixMotive, ixMinor, j1, ixMajor]
    checkPrint "param-index-step" ixApp

    -- DI.mk: dependent recursive index tuple (j, x).
    let di0 := apps (mkConst ``KAIdxIota.DI) [Alpha, j0, mkConst ``KAIdxIota.x0]
    let diMotive := lam J <| lam (mkApp F (.bvar 0)) <|
      lam (apps (mkConst ``KAIdxIota.DI) [Alpha, .bvar 1, .bvar 0]) N
    let diMinor := lam J <| lam (mkApp F (.bvar 0)) <|
      lam (apps (mkConst ``KAIdxIota.DI) [Alpha, .bvar 1, .bvar 0]) <| lam N (.bvar 0)
    let diMajor := apps (mkConst ``KAIdxIota.DI.mk) [Alpha, j0, mkConst ``KAIdxIota.x0, mkConst ``KAIdxIota.d0]
    let diApp := apps (mkConst ``KAIdxIota.DI.rec [L1]) [Alpha, diMotive, diMinor, j0, mkConst ``KAIdxIota.x0, diMajor]
    checkPrint "dependent-index-mk" diApp

    -- Higher-order recursive field: pointwise IH is evaluated at n0.
    let hoFieldTy := Expr.forallE .anonymous N (apps (mkConst ``KAIdxIota.HOIX) [Alpha, j0]) .default
    let hoMotive := lam J (lam (apps (mkConst ``KAIdxIota.HOIX) [Alpha, .bvar 0]) N)
    let hoIHType := Expr.forallE .anonymous N N .default
    let hoMinor := lam hoFieldTy (lam hoIHType (mkApp (.bvar 0) n0))
    let hoMajor := apps (mkConst ``KAIdxIota.HOIX.mk) [Alpha, mkConst ``KAIdxIota.fHO]
    let hoApp := apps (mkConst ``KAIdxIota.HOIX.rec [L1]) [Alpha, hoMotive, hoMinor, j1, hoMajor]
    checkPrint "higher-order-index-mk" hoApp

    -- Multiple indices and two recursive fields: select second IH.
    let mix0 := apps (mkConst ``KAIdxIota.MIX) [Alpha, j0, k0]
    let mix1 := apps (mkConst ``KAIdxIota.MIX) [Alpha, j0, k1]
    let mixMotive := lam J <| lam K <|
      lam (apps (mkConst ``KAIdxIota.MIX) [Alpha, .bvar 1, .bvar 0]) N
    let mixMinor := lam mix0 <| lam mix1 <| lam N <| lam N (.bvar 0)
    let mixMajor := apps (mkConst ``KAIdxIota.MIX.step) [Alpha, mkConst ``KAIdxIota.m0, mkConst ``KAIdxIota.m1]
    let mixApp := apps (mkConst ``KAIdxIota.MIX.rec [L1]) [Alpha, mixMotive, mixMinor, j1, k1, mixMajor]
    checkPrint "multi-index-step" mixApp

    -- Eq-like K/singleton indexed recursor computation.
    let a0 := mkConst ``KAIdxIota.a0
    let eqMajor := apps (mkConst ``KAIdxIota.EqX.refl [L1]) [Alpha, a0]
    let eqFamily := fun b => apps (mkConst ``KAIdxIota.EqX [L1]) [Alpha, a0, b]
    let eqMotive := lam Alpha (lam (eqFamily (.bvar 0)) N)
    let eqMinor := n0
    let eqApp := apps (mkConst ``KAIdxIota.EqX.rec [L1, L1]) [Alpha, a0, eqMotive, eqMinor, a0, eqMajor]
    checkPrint "eq-like-refl" eqApp

    IO.println "INDUCTIVE_INDEXED_IOTA_NATIVE_CASES=6 FAILURES=0 KERNEL_CHECKS=6"
