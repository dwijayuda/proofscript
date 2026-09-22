import Lean
open Lean

axiom ConvD : Type
axiom convDValue : ConvD
axiom convF : ConvD → ConvD
axiom convG : ConvD → ConvD
axiom ConvEtaType : (ConvD → ConvD) → Type
axiom convEtaX : ConvEtaType convF

axiom ConvP : Prop
axiom convP1 : ConvP
axiom convP2 : ConvP
axiom ConvProofType : ConvP → Type
axiom ConvOtherProofType : ConvP → Type
axiom convProofX : ConvProofType convP1

def ConvAliasD : Type := ConvD

private def checkExpected (term expected : Expr) (want : Bool) : MetaM Bool := do
  Meta.checkWithKernel term
  Meta.checkWithKernel expected
  let actual ← Meta.inferType term
  let got ← Meta.isDefEq actual expected
  pure (got == want)

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let D := mkConst ``ConvD
    let f := mkConst ``convF
    let g := mkConst ``convG
    let etaF := Expr.lam .anonymous D (Expr.app f (.bvar 0)) .default
    let etaG := Expr.lam .anonymous D (Expr.app g (.bvar 0)) .default
    let etaTyF := Expr.app (mkConst ``ConvEtaType) etaF
    let etaTyG := Expr.app (mkConst ``ConvEtaType) etaG
    let proofTyQ := Expr.app (mkConst ``ConvProofType) (mkConst ``convP2)
    let proofOtherQ := Expr.app (mkConst ``ConvOtherProofType) (mkConst ``convP2)
    let betaD := Expr.app (Expr.lam .anonymous (.sort (.ofNat 1)) (.bvar 0) .default) D
    let zetaD := Expr.letE .anonymous (.sort (.ofNat 1)) D (.bvar 0) false
    let aliasD := mkConst ``ConvAliasD

    let mut etaTrue : Nat := 0
    let mut etaFalse : Nat := 0
    let mut proofTrue : Nat := 0
    let mut proofFalse : Nat := 0
    let mut beta : Nat := 0
    let mut zeta : Nat := 0
    let mut delta : Nat := 0
    let mut failures : Nat := 0

    for _ in [:200] do
      etaTrue := etaTrue + 1
      unless ← checkExpected (mkConst ``convEtaX) etaTyF true do failures := failures + 1
    for _ in [:100] do
      etaFalse := etaFalse + 1
      unless ← checkExpected (mkConst ``convEtaX) etaTyG false do failures := failures + 1
    for _ in [:200] do
      proofTrue := proofTrue + 1
      unless ← checkExpected (mkConst ``convProofX) proofTyQ true do failures := failures + 1
    for _ in [:100] do
      proofFalse := proofFalse + 1
      unless ← checkExpected (mkConst ``convProofX) proofOtherQ false do failures := failures + 1
    for _ in [:150] do
      beta := beta + 1
      unless ← checkExpected (mkConst ``convDValue) betaD true do failures := failures + 1
    for _ in [:150] do
      zeta := zeta + 1
      unless ← checkExpected (mkConst ``convDValue) zetaD true do failures := failures + 1
    for _ in [:100] do
      delta := delta + 1
      unless ← checkExpected (mkConst ``convDValue) aliasD true do failures := failures + 1

    let total := etaTrue + etaFalse + proofTrue + proofFalse + beta + zeta + delta
    logInfo m!"CONVERSION_TYPING_NATIVE_CASES={total} ETA_TRUE={etaTrue} ETA_FALSE={etaFalse} PROOF_TRUE={proofTrue} PROOF_FALSE={proofFalse} BETA={beta} ZETA={zeta} DELTA={delta} FAILURES={failures} KERNEL_CHECKS={total*2}"
    if failures != 0 then throwError "conversion-typing native differential failures: {failures}"
