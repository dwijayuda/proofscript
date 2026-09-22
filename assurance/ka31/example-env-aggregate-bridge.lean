import Lean4Lean.Theory.Typing.Env
import PSKernelKA22NonDefEnvExtensionBridge

/-
KA-31 direct Lean4Lean example environment aggregate bridge.

KA-20 through KA-22 established separate conditional facts for translated
ProofScript examples against real Lean4Lean environment surfaces: `VDecl.WF`,
`VEnv.WF`, and reflexive `VEnv.LE`. Examples intentionally do not add a
constant or definitional equation, so KA-23 through KA-25 lookup / no-overwrite
/ defeq-preservation obligations do not apply to examples. KA-31 packages the
three applicable facts into one aggregate bridge theorem for the `.example`
declaration kind.

This remains conditional assurance only. It does not prove executable PSKernel
refinement, definitional-equality soundness, inductive soundness, quotient
semantic soundness, or full Lean 4 equivalence.
-/

namespace PSKernelKA31

open Lean4Lean
open PSKernelKA12
open PSKernelKA20
open PSKernelKA21
open PSKernelKA22

/--
Aggregate KA-20..KA-22 bridge package for a translated example: declaration
well-formedness, unchanged-environment well-formedness, and reflexive
environment extension. Examples are non-adding, so there is deliberately no
constant lookup or definitional-equation insertion claim here.
-/
theorem translated_example_env_aggregate_bridge
    (env : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .example)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.example v))
    (hBody : v.WF env)
    (hEnv : VEnv.WF env) :
    VDecl.WF env (VDecl.example v) env
      ∧ VEnv.WF env
      ∧ env ≤ env := by
  constructor
  · exact translated_example_vdecl_wf env d v _hk _htr _hdecl hBody
  constructor
  · exact translated_example_env_wf env d v _hk _htr _hdecl hBody hEnv
  · exact translated_example_env_extends env d v _hk _htr _hdecl hBody

/-- KA-31 still inherits KA-12's inductive block. -/
theorem ka31_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka22_preserves_inductive_block d

end PSKernelKA31
