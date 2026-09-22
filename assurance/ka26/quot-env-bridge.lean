import Lean4Lean.Theory.Typing.Env
import Lean4Lean.Theory.Typing.QuotLemmas
import PSKernelKA25NonDefEnvDefEqPreservationBridge

/-
KA-26 direct Lean4Lean quotient-environment bridge.

KA-12 already maps the ProofScript `.quot` declaration kind to the real
Lean4Lean `VDecl.quot` constructor. KA-26 adds a small conditional bridge over
Lean4Lean's imported quotient environment surface: if Lean4Lean's own
`QuotReady` and `addQuot` premises hold, the translated quotient declaration is
`VDecl.WF`, yields a well-formed environment, extends the original environment,
and exposes the four quotient constants plus the quotient defining equation.

This remains conditional assurance only. It does not prove quotient semantic
soundness, executable PSKernel refinement, definitional-equality soundness,
inductive soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA26

open Lean4Lean
open PSKernelKA12
open PSKernelKA25

/--
A translated PSKernel quotient declaration is a real Lean4Lean `VDecl.WF`
quotient declaration when Lean4Lean's own `QuotReady` and `addQuot` premises
hold.
-/
theorem translated_quot_vdecl_wf
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    VDecl.WF env VDecl.quot env' := by
  exact VDecl.WF.quot hReady hAdd

/--
A translated quotient declaration preserves Lean4Lean environment
well-formedness, conditional on Lean4Lean's own quotient premises.
-/
theorem translated_quot_env_wf
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (hReady : env.QuotReady)
    (hAdd : env.addQuot = some env')
    (hEnv : VEnv.WF env) :
    VEnv.WF env' := by
  rcases hEnv with ⟨ds, hds⟩
  exact ⟨VDecl.quot :: ds,
    VEnv.WF'.decl
      (translated_quot_vdecl_wf env env' d _hk _hdecl hReady hAdd)
      hds⟩

/-- Successful Lean4Lean quotient addition extends the original environment. -/
theorem addQuot_extends
    (env env' : VEnv) (hAdd : env.addQuot = some env') : env ≤ env' := by
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
          exact VEnv.LE.trans
            (PSKernelKA16.addConst_extends env env1 ``Quot quotConst h0)
            (VEnv.LE.trans
              (PSKernelKA16.addConst_extends env1 env2 ``Quot.mk quotMkConst h1)
              (VEnv.LE.trans
                (PSKernelKA16.addConst_extends env2 env3 ``Quot.lift quotLiftConst h2)
                (VEnv.LE.trans
                  (PSKernelKA16.addConst_extends env3 env4 ``Quot.ind quotIndConst h3)
                  (PSKernelKA16.addDefEq_extends env4 quotDefEq))))

/-- A translated quotient declaration is an environment extension. -/
theorem translated_quot_env_extends
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env ≤ env' := by
  exact addQuot_extends env env' hAdd

/-- Lean4Lean's quotient environment addition exposes `Quot`. -/
theorem translated_quot_env_lookup_quot
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env'.constants ``Quot = some quotConst := by
  exact VEnv.addQuot_quot hAdd

/-- Lean4Lean's quotient environment addition exposes `Quot.mk`. -/
theorem translated_quot_env_lookup_quot_mk
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env'.constants ``Quot.mk = some quotMkConst := by
  exact VEnv.addQuot_quotMk hAdd

/-- Lean4Lean's quotient environment addition exposes `Quot.lift`. -/
theorem translated_quot_env_lookup_quot_lift
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env'.constants ``Quot.lift = some quotLiftConst := by
  exact VEnv.addQuot_quotLift hAdd

/-- Lean4Lean's quotient environment addition exposes `Quot.ind`. -/
theorem translated_quot_env_lookup_quot_ind
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env'.constants ``Quot.ind = some quotIndConst := by
  exact VEnv.addQuot_quotInd hAdd

/-- Lean4Lean's quotient environment addition inserts the quotient defining equation. -/
theorem translated_quot_env_defeq_member
    (env env' : VEnv) (d : PSDecl)
    (_hk : d.kind = .quot)
    (_hdecl : translateDecl? d = some VDecl.quot)
    (_hReady : env.QuotReady)
    (hAdd : env.addQuot = some env') :
    env'.defeqs quotDefEq := by
  exact VEnv.addQuot_defeq hAdd

/-- KA-26 still inherits KA-12's inductive block. -/
theorem ka26_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka25_preserves_inductive_block d

end PSKernelKA26
