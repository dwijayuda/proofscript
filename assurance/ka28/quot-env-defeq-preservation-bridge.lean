import Lean4Lean.Theory.Typing.Env
import Lean4Lean.Theory.Typing.QuotLemmas
import PSKernelKA27QuotEnvNoOverwriteBridge

/-
KA-28 direct Lean4Lean quotient definitional-equation preservation bridge.

KA-26 proved successful Lean4Lean `addQuot` inserts the quotient defining
 equation. KA-27 proved quotient constants are fresh and unrelated constant
lookups are preserved. KA-28 adds the corresponding definitional-equation
preservation layer: a successful quotient addition preserves every existing
`VEnv.defeqs` member while also exposing the quotient defining equation.

This remains conditional assurance only. It does not prove quotient semantic
soundness, executable PSKernel refinement, definitional-equality soundness,
inductive soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA28

open Lean4Lean
open PSKernelKA12
open PSKernelKA19
open PSKernelKA26
open PSKernelKA27

/--
Successful Lean4Lean quotient addition preserves every pre-existing
 definitional-equation membership across its four constant insertions and final
 quotient defining-equation insertion.
-/
theorem translated_quot_preserves_existing_defeq
    (env env' : VEnv) (d : PSDecl) (df : VDefEq)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env')
    (hDefEq : env.defeqs df) :
    env'.defeqs df := by
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
          exact addDefEq_preserves_existing_defeq env4 quotDefEq df
            (addConst_preserves_existing_defeq env3 env4 ``Quot.ind quotIndConst df h3
              (addConst_preserves_existing_defeq env2 env3 ``Quot.lift quotLiftConst df h2
                (addConst_preserves_existing_defeq env1 env2 ``Quot.mk quotMkConst df h1
                  (addConst_preserves_existing_defeq env env1 ``Quot quotConst df h0 hDefEq))))

/--
Successful Lean4Lean quotient addition preserves an existing definitional
 equation and inserts the quotient defining equation.
-/
theorem translated_quot_preserves_existing_and_adds_quot_defeq
    (env env' : VEnv) (d : PSDecl) (df : VDefEq)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env')
    (hDefEq : env.defeqs df) :
    env'.defeqs df ∧ env'.defeqs quotDefEq := by
  constructor
  · exact translated_quot_preserves_existing_defeq env env' d df
      _hk _hdecl _hReady hAdd hDefEq
  · exact translated_quot_env_defeq_member env env' d
      _hk _hdecl _hReady hAdd

/-- KA-28 still inherits KA-12's inductive block. -/
theorem ka28_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka27_preserves_inductive_block d

end PSKernelKA28
