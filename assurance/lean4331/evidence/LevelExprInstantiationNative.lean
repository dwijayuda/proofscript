import Lean
import Lean.Util.InstantiateLevelParams

open Lean

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

def nU : Name := `u
def nV : Name := `v
def nW : Name := `w
def nX : Name := `x

def lvl (i k : Nat) : Level :=
  match (i + k) % 8 with
  | 0 => .zero
  | 1 => .param nU
  | 2 => .param nV
  | 3 => .param nW
  | 4 => .param nX
  | 5 => .succ (.param nU)
  | 6 => .max (.param nV) (.succ (.param nW))
  | _ => .imax (.param nU) (.param nV)

def argLvl (i k : Nat) : Level :=
  match (i * 3 + k) % 6 with
  | 0 => .zero
  | 1 => .succ .zero
  | 2 => .succ (.succ .zero)
  | 3 => .param nX
  | 4 => .max (.param nX) (.succ .zero)
  | _ => .imax (.param nX) (.succ .zero)

def bi (i : Nat) : BinderInfo :=
  match i % 4 with
  | 0 => .default
  | 1 => .implicit
  | 2 => .strictImplicit
  | _ => .instImplicit

def exprFor (i : Nat) : Expr :=
  let s0 := Expr.sort (lvl i 0)
  let s1 := Expr.sort (lvl i 1)
  let c0 := Expr.const `C [lvl i 0, lvl i 1]
  let c1 := Expr.const `D [lvl i 2]
  match i % 8 with
  | 0 => s0
  | 1 => c0
  | 2 => .app c0 s1
  | 3 => .lam .anonymous s0 (.app c1 (.bvar 0)) (bi i)
  | 4 => .forallE .anonymous s0 (.app c0 (.bvar 0)) (bi i)
  | 5 => .letE .anonymous s0 c1 (.app c0 (.bvar 0)) (i % 2 == 0)
  | 6 => .proj `S (i % 3) (.app c0 c1)
  | _ => .app (.lam .anonymous s0 (.letE .anonymous s1 c1 (.app c0 (.bvar 1)) false) (bi i)) c1

run_cmd do
  let ps := [nU, nV, nW]
  for i in [:1000] do
    let us := [argLvl i 0, argLvl i 1, argLvl i 2]
    let lOut := (lvl i 3).instantiateParams ps us
    IO.println s!"L|{i}|{levelS lOut}"
    let eOut := (exprFor i).instantiateLevelParams ps us
    IO.println s!"I|{i}|{exprS eOut}"
  IO.println "LEVEL_NATIVE_CASES=1000 EXPR_NATIVE_CASES=1000"
