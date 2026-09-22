import Lean4Lean.Theory.Typing.Env
import Lean4Lean.Theory.Typing.QuotLemmas
import PSKernelKA26QuotEnvBridge

/-
KA-27 direct Lean4Lean quotient no-overwrite bridge.

KA-26 proved that a successful Lean4Lean `addQuot` exposes the quotient
constants and quotient definitional equation. KA-27 proves the next small
safety layer: successful `addQuot` means the four quotient constant names were
fresh in the input environment, and existing unrelated constant lookups are
preserved across the whole quotient addition.

This remains conditional assurance only. It does not prove quotient semantic
soundness, executable PSKernel refinement, definitional-equality soundness,
inductive soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA27

open Lean4Lean
open PSKernelKA12
open PSKernelKA18
open PSKernelKA26

private theorem quot_ne_quot_mk : (``Quot : Name) ≠ ``Quot.mk := by decide
private theorem quot_ne_quot_lift : (``Quot : Name) ≠ ``Quot.lift := by decide
private theorem quot_ne_quot_ind : (``Quot : Name) ≠ ``Quot.ind := by decide
private theorem quot_mk_ne_quot_lift : (``Quot.mk : Name) ≠ ``Quot.lift := by decide
private theorem quot_mk_ne_quot_ind : (``Quot.mk : Name) ≠ ``Quot.ind := by decide
private theorem quot_lift_ne_quot_ind : (``Quot.lift : Name) ≠ ``Quot.ind := by decide

/-- Successful Lean4Lean quotient addition requires `Quot` to be fresh first. -/
theorem translated_quot_fresh_quot_before_add
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env.constants ``Quot = none := by
  unfold VEnv.addQuot at hAdd
  let step0 := env.addConst ``Quot quotConst
  cases h0 : step0 with
  | none => simp [step0, h0] at hAdd
  | some env1 =>
    exact addConst_success_requires_fresh env env1 ``Quot quotConst h0

/-- Successful Lean4Lean quotient addition requires `Quot.mk` to be fresh first. -/
theorem translated_quot_fresh_quot_mk_before_add
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env.constants ``Quot.mk = none := by
  unfold VEnv.addQuot at hAdd
  let step0 := env.addConst ``Quot quotConst
  cases h0 : step0 with
  | none => simp [step0, h0] at hAdd
  | some env1 =>
    let step1 := env1.addConst ``Quot.mk quotMkConst
    cases h1 : step1 with
    | none => simp [step0, h0, step1, h1] at hAdd
    | some env2 =>
      have hFresh1 : env1.constants ``Quot.mk = none :=
        addConst_success_requires_fresh env1 env2 ``Quot.mk quotMkConst h1
      cases hLookup : env.constants ``Quot.mk with
      | none => rfl
      | some ci =>
        have hPres : env1.constants ``Quot.mk = some ci :=
          addConst_preserves_other_lookup env env1 ``Quot ``Quot.mk quotConst ci h0 quot_ne_quot_mk hLookup
        rw [hFresh1] at hPres
        contradiction

/-- Successful Lean4Lean quotient addition requires `Quot.lift` to be fresh first. -/
theorem translated_quot_fresh_quot_lift_before_add
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env.constants ``Quot.lift = none := by
  unfold VEnv.addQuot at hAdd
  let step0 := env.addConst ``Quot quotConst
  cases h0 : step0 with
  | none => simp [step0, h0] at hAdd
  | some env1 =>
    let step1 := env1.addConst ``Quot.mk quotMkConst
    cases h1 : step1 with
    | none => simp [step0, h0, step1, h1] at hAdd
    | some env2 =>
      let step2 := env2.addConst ``Quot.lift quotLiftConst
      cases h2 : step2 with
      | none => simp [step0, h0, step1, h1, step2, h2] at hAdd
      | some env3 =>
        have hFresh2 : env2.constants ``Quot.lift = none :=
          addConst_success_requires_fresh env2 env3 ``Quot.lift quotLiftConst h2
        cases hLookup : env.constants ``Quot.lift with
        | none => rfl
        | some ci =>
          have hPres1 : env1.constants ``Quot.lift = some ci :=
            addConst_preserves_other_lookup env env1 ``Quot ``Quot.lift quotConst ci h0 quot_ne_quot_lift hLookup
          have hPres2 : env2.constants ``Quot.lift = some ci :=
            addConst_preserves_other_lookup env1 env2 ``Quot.mk ``Quot.lift quotMkConst ci h1 quot_mk_ne_quot_lift hPres1
          rw [hFresh2] at hPres2
          contradiction

/-- Successful Lean4Lean quotient addition requires `Quot.ind` to be fresh first. -/
theorem translated_quot_fresh_quot_ind_before_add
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env.constants ``Quot.ind = none := by
  unfold VEnv.addQuot at hAdd
  let step0 := env.addConst ``Quot quotConst
  cases h0 : step0 with
  | none => simp [step0, h0] at hAdd
  | some env1 =>
    let step1 := env1.addConst ``Quot.mk quotMkConst
    cases h1 : step1 with
    | none => simp [step0, h0, step1, h1] at hAdd
    | some env2 =>
      let step2 := env2.addConst ``Quot.lift quotLiftConst
      cases h2 : step2 with
      | none => simp [step0, h0, step1, h1, step2, h2] at hAdd
      | some env3 =>
        let step3 := env3.addConst ``Quot.ind quotIndConst
        cases h3 : step3 with
        | none => simp [step0, h0, step1, h1, step2, h2, step3, h3] at hAdd
        | some env4 =>
          have hFresh3 : env3.constants ``Quot.ind = none :=
            addConst_success_requires_fresh env3 env4 ``Quot.ind quotIndConst h3
          cases hLookup : env.constants ``Quot.ind with
          | none => rfl
          | some ci =>
            have hPres1 : env1.constants ``Quot.ind = some ci :=
              addConst_preserves_other_lookup env env1 ``Quot ``Quot.ind quotConst ci h0 quot_ne_quot_ind hLookup
            have hPres2 : env2.constants ``Quot.ind = some ci :=
              addConst_preserves_other_lookup env1 env2 ``Quot.mk ``Quot.ind quotMkConst ci h1 quot_mk_ne_quot_ind hPres1
            have hPres3 : env3.constants ``Quot.ind = some ci :=
              addConst_preserves_other_lookup env2 env3 ``Quot.lift ``Quot.ind quotLiftConst ci h2 quot_lift_ne_quot_ind hPres2
            rw [hFresh3] at hPres3
            contradiction

/--
Successful Lean4Lean quotient addition preserves unrelated existing constant
lookups across all four quotient constants and the final quotient defeq.
-/
theorem translated_quot_preserves_other_lookup
    (env env' : VEnv) (d : PSDecl)
    (other : Name) (otherCi : VConstant)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env')
    (hOtherQuot : (``Quot : Name) ≠ other)
    (hOtherQuotMk : (``Quot.mk : Name) ≠ other)
    (hOtherQuotLift : (``Quot.lift : Name) ≠ other)
    (hOtherQuotInd : (``Quot.ind : Name) ≠ other)
    (hLookup : env.constants other = some otherCi) :
    env'.constants other = some otherCi := by
  unfold VEnv.addQuot at hAdd
  let step0 := env.addConst ``Quot quotConst
  cases h0 : step0 with
  | none => simp [step0, h0] at hAdd
  | some env1 =>
    let step1 := env1.addConst ``Quot.mk quotMkConst
    cases h1 : step1 with
    | none => simp [step0, h0, step1, h1] at hAdd
    | some env2 =>
      let step2 := env2.addConst ``Quot.lift quotLiftConst
      cases h2 : step2 with
      | none => simp [step0, h0, step1, h1, step2, h2] at hAdd
      | some env3 =>
        let step3 := env3.addConst ``Quot.ind quotIndConst
        cases h3 : step3 with
        | none => simp [step0, h0, step1, h1, step2, h2, step3, h3] at hAdd
        | some env4 =>
          simp [step0, h0, step1, h1, step2, h2, step3, h3] at hAdd
          subst hAdd
          exact addDefEq_preserves_any_constant_lookup env4 quotDefEq other otherCi
            (addConst_preserves_other_lookup env3 env4 ``Quot.ind other quotIndConst otherCi h3 hOtherQuotInd
              (addConst_preserves_other_lookup env2 env3 ``Quot.lift other quotLiftConst otherCi h2 hOtherQuotLift
                (addConst_preserves_other_lookup env1 env2 ``Quot.mk other quotMkConst otherCi h1 hOtherQuotMk
                  (addConst_preserves_other_lookup env env1 ``Quot other quotConst otherCi h0 hOtherQuot hLookup))))

/-- KA-27 still inherits KA-12's inductive block. -/
theorem ka27_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka26_preserves_inductive_block d

end PSKernelKA27
