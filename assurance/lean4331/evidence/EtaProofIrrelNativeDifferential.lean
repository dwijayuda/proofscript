import Lean
open Lean

universe u

axiom etaF (α : Sort u) : α → α
axiom etaG (α : Sort u) : α → α

axiom proofP (α : Sort u) : Prop
axiom proofQ (α : Sort u) : Prop
axiom proofLeft (α : Sort u) : proofP α
axiom proofRight (α : Sort u) : proofP α
axiom proofOther (α : Sort u) : proofQ α

private def mkAlpha (i : Nat) : Level × Expr :=
  let k := Level.ofNat (i % 17)
  (Level.succ k, Expr.sort k)

private def mkFn (name : Name) (i : Nat) : Expr :=
  let (inst, α) := mkAlpha i
  Expr.app (mkConst name [inst]) α

private def mkEta (name : Name) (i : Nat) : Expr :=
  let (_, α) := mkAlpha i
  let f := mkFn name i
  Expr.lam .anonymous α (Expr.app f (.bvar 0)) .default

private def mkProof (name : Name) (i : Nat) : Expr :=
  let (inst, α) := mkAlpha i
  Expr.app (mkConst name [inst]) α

run_cmd do
  Lean.Elab.Command.liftTermElabM do
    let mut etaTrue : Nat := 0
    let mut etaFalse : Nat := 0
    let mut proofTrue : Nat := 0
    let mut proofFalse : Nat := 0
    let mut failures : Nat := 0
    let mut kernelChecks : Nat := 0

    for i in [:250] do
      let j := i * 5 + 1
      let eta := mkEta ``etaF j
      let f := mkFn ``etaF j
      Meta.checkWithKernel eta
      Meta.checkWithKernel f
      kernelChecks := kernelChecks + 2
      etaTrue := etaTrue + 1
      unless ← Meta.isDefEq eta f do failures := failures + 1

    for i in [:250] do
      let j := i * 7 + 3
      let etaGExpr := mkEta ``etaG j
      let f := mkFn ``etaF j
      Meta.checkWithKernel etaGExpr
      Meta.checkWithKernel f
      kernelChecks := kernelChecks + 2
      etaFalse := etaFalse + 1
      if ← Meta.isDefEq etaGExpr f then failures := failures + 1

    for i in [:250] do
      let j := i * 11 + 5
      let p := mkProof ``proofLeft j
      let q := mkProof ``proofRight j
      Meta.checkWithKernel p
      Meta.checkWithKernel q
      kernelChecks := kernelChecks + 2
      proofTrue := proofTrue + 1
      unless ← Meta.isDefEq p q do failures := failures + 1

    for i in [:250] do
      let j := i * 13 + 7
      let p := mkProof ``proofLeft j
      let q := mkProof ``proofOther j
      Meta.checkWithKernel p
      Meta.checkWithKernel q
      kernelChecks := kernelChecks + 2
      proofFalse := proofFalse + 1
      if ← Meta.isDefEq p q then failures := failures + 1

    let total := etaTrue + etaFalse + proofTrue + proofFalse
    logInfo m!"ETA_PROOF_NATIVE_CASES={total} ETA_TRUE={etaTrue} ETA_FALSE={etaFalse} PROOF_TRUE={proofTrue} PROOF_FALSE={proofFalse} FAILURES={failures} KERNEL_CHECKS={kernelChecks}"
    if failures != 0 then throwError "eta/proof-irrelevance native differential failures: {failures}"
