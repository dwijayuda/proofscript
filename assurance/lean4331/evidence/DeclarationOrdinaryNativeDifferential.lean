import Lean

open Lean Elab Command Meta

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
  | .mdata _ e => s!"(mdata {exprS e})"
  | .proj n i e => s!"(proj {n} {i} {exprS e})"

private def hintsS : ReducibilityHints → String
  | .abbrev => "abbrev"
  | .regular h => s!"regular:{h}"
  | .opaque => "opaque-hint"

private def kindS : ConstantInfo → String
  | .axiomInfo _ => "axiom"
  | .defnInfo d => s!"definition:{hintsS d.hints}"
  | .thmInfo _ => "theorem"
  | .opaqueInfo _ => "opaque"
  | .quotInfo _ => "quotient"
  | .inductInfo _ => "inductive"
  | .ctorInfo _ => "constructor"
  | .recInfo _ => "recursor"

private def transparentS : ConstantInfo → String
  | .defnInfo d => exprS d.value
  | _ => "-"

private def cv (n : Name) (ps : List Name) (ty : Expr) : ConstantVal := ConstantVal.mk n ps ty
private def ax (n : Name) (ps : List Name) (ty : Expr) : Declaration :=
  .axiomDecl (AxiomVal.mk (cv n ps ty) false)
private def defn (n : Name) (ps : List Name) (ty val : Expr) (h : ReducibilityHints) : Declaration :=
  .defnDecl (DefinitionVal.mk (cv n ps ty) val h .safe [n])
private def thm (n : Name) (ps : List Name) (ty val : Expr) : Declaration :=
  .thmDecl (TheoremVal.mk (cv n ps ty) val [n])
private def opq (n : Name) (ps : List Name) (ty val : Expr) : Declaration :=
  .opaqueDecl (OpaqueVal.mk (cv n ps ty) val false [n])

private def idType (u : Level) : Expr :=
  Expr.forallE `α (.sort u)
    (Expr.forallE `x (.bvar 0) (.bvar 1) .default) .default
private def idValue (u : Level) : Expr :=
  Expr.lam `α (.sort u)
    (Expr.lam `x (.bvar 0) (.bvar 0) .default) .default

private def expectedInstType (info : ConstantInfo) (us : List Level) : Expr :=
  info.type.instantiateLevelParams info.levelParams us

private def getInfo (env : Environment) (n : Name) : MetaM ConstantInfo := do
  match env.find? n with
  | some info => pure info
  | none => throwError "missing declaration {n}"

run_meta do
  let u := Level.param `u
  let v := Level.param `v
  let prop := Expr.sort .zero
  let pConst := Expr.const `KADecl.P []

  Lean.addDecl (ax `KADecl.Mix [`u, `v] (.sort (.max u v)))
  Lean.addDecl (defn `KADecl.IdReg [`u] (idType u) (idValue u) (.regular 0))
  Lean.addDecl (defn `KADecl.IdAbb [`u] (idType u) (idValue u) .abbrev)
  Lean.addDecl (opq `KADecl.IdOpaque [`u] (idType u) (idValue u))
  Lean.addDecl (ax `KADecl.P [] prop)
  Lean.addDecl (ax `KADecl.p [] pConst)
  Lean.addDecl (thm `KADecl.Thm [] pConst (Expr.const `KADecl.p []))

  let env ← getEnv
  let names := [`KADecl.Mix, `KADecl.IdReg, `KADecl.IdAbb, `KADecl.IdOpaque, `KADecl.P, `KADecl.p, `KADecl.Thm]
  for n in names do
    match env.find? n with
    | none => throwError "missing ordinary declaration {n}"
    | some info =>
      IO.println s!"D|{kindS info}|{info.name}|{String.intercalate "," (info.levelParams.map toString)}|{exprS info.type}|{transparentS info}"

  let mut failures := 0
  let mut kernelChecks := 0
  let mut cases := 0
  -- 400 two-level instantiations exercise cheap max reconstruction.
  for i in [:400] do
    let a := Level.ofNat (i % 6)
    let b := Level.ofNat ((i * 5 + 1) % 7)
    let info ← getInfo env `KADecl.Mix
    let term := Expr.const `KADecl.Mix [a, b]
    Meta.checkWithKernel term
    kernelChecks := kernelChecks + 1
    let actual ← Meta.inferType term
    let expected := expectedInstType info [a, b]
    unless actual == expected do failures := failures + 1
    IO.println s!"I|{cases}|{exprS actual}"
    cases := cases + 1

  -- 450 polymorphic value declarations, including transparent and opaque kinds.
  for i in [:450] do
    let lvl := Level.ofNat (i % 7)
    let n := if i % 3 == 0 then `KADecl.IdReg else if i % 3 == 1 then `KADecl.IdAbb else `KADecl.IdOpaque
    let info ← getInfo env n
    let term := Expr.const n [lvl]
    Meta.checkWithKernel term
    kernelChecks := kernelChecks + 1
    let actual ← Meta.inferType term
    let expected := expectedInstType info [lvl]
    unless actual == expected do failures := failures + 1
    IO.println s!"I|{cases}|{exprS actual}"
    cases := cases + 1

  -- 150 proposition/proof/theorem lookups.
  for i in [:150] do
    let n := if i % 3 == 0 then `KADecl.P else if i % 3 == 1 then `KADecl.p else `KADecl.Thm
    let info ← getInfo env n
    let term := Expr.const n []
    Meta.checkWithKernel term
    kernelChecks := kernelChecks + 1
    let actual ← Meta.inferType term
    unless actual == info.type do failures := failures + 1
    IO.println s!"I|{cases}|{exprS actual}"
    cases := cases + 1

  -- Lean rejects duplicate ordinary names; the failed installation must not alter the original entry.
  let before ← getInfo env `KADecl.Mix
  let mut duplicateRejected := false
  try
    Lean.addDecl (ax `KADecl.Mix [] prop)
  catch _ =>
    duplicateRejected := true
  unless duplicateRejected do throwError "duplicate declaration was accepted"
  let env2 ← getEnv
  let after ← getInfo env2 `KADecl.Mix
  unless before.type == after.type && before.levelParams == after.levelParams do
    throwError "failed duplicate installation changed existing declaration"

  IO.println s!"ORDINARY_DECL_NATIVE_CASES={cases} FAILURES={failures} KERNEL_CHECKS={kernelChecks} DUPLICATE_REJECTED={duplicateRejected}"
  if cases != 1000 || failures != 0 || kernelChecks != 1000 then
    throwError "ordinary declaration native differential failed"
