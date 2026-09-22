import Lean4Lean.Theory.Typing.Env
import PSKernelKA19EnvDefEqPreservationBridge

/-
KA-20 direct Lean4Lean VDecl.WF bridge for remaining supported ordinary
non-inductive declaration kinds.

KA-13 proved conditional `VDecl.WF` bridge lemmas for translated axioms and
ordinary definitions. KA-20 extends that direct imported Lean4Lean bridge to
three KA-12-supported non-inductive shapes that were deliberately left open:
`theorem`, `example`, and `opaque`. The bridge stays conditional on
Lean4Lean's own well-formedness/addition premises and does not prove executable
PSKernel refinement, quotient soundness, inductive soundness, or full Lean 4
equivalence.
-/

namespace PSKernelKA20

open Lean4Lean
open PSKernelKA12
open PSKernelKA13
open PSKernelKA15
open PSKernelKA16
open PSKernelKA17
open PSKernelKA18
open PSKernelKA19

/--
A translated PSKernel theorem uses the same Lean4Lean `VDecl.def` constructor
shape as an ordinary definition in the KA-12 reference translation. If
Lean4Lean's own body well-formedness and constant-addition premises hold, the
translated theorem declaration is well formed in the real imported
`Lean4Lean.VDecl.WF` relation.
-/
theorem translated_theorem_vdecl_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .theorem)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    VDecl.WF env (VDecl.def v) (env'.addDefEq v.toDefEq) := by
  exact VDecl.WF.def hBody hAdd

/--
A translated PSKernel example is checked against Lean4Lean's real
`VDecl.example` rule. Examples do not extend the environment; the bridge only
requires Lean4Lean's own body well-formedness premise.
-/
theorem translated_example_vdecl_wf
    (env : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .example)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.example v))
    (hBody : v.WF env) :
    VDecl.WF env (VDecl.example v) env := by
  exact VDecl.WF.example hBody

/--
A translated PSKernel opaque declaration is checked against Lean4Lean's real
`VDecl.opaque` rule. The bridge remains conditional on Lean4Lean's own body
well-formedness and successful `addConst` premise.
-/
theorem translated_opaque_vdecl_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .opaque)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.opaque v))
    (hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    VDecl.WF env (VDecl.opaque v) env' := by
  exact VDecl.WF.opaque hBody hAdd

/-- KA-20 still inherits KA-12 through KA-19's inductive block. -/
theorem ka20_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact ka19_preserves_inductive_block d

end PSKernelKA20
