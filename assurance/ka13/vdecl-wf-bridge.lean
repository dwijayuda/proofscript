import Lean4Lean.Theory.Typing.Env
import PSKernelKA12DirectReference

/-
KA-13 direct Lean4Lean VDecl.WF bridge.

This file deliberately stays conditional: it proves that once the KA-12
translation has produced a real Lean4Lean declaration value and the required
Lean4Lean typing/addition premises are supplied, the declaration satisfies the
real Lean4Lean `VDecl.WF` relation. It does not connect the executable
TypeScript checker to these premises, and it does not prove full Lean 4
equivalence.
-/

namespace PSKernelKA13

open Lean4Lean
open PSKernelKA12

/--
If KA-12 translation produces an axiom `VConstVal`, and Lean4Lean's own
well-formedness/add-constant premises hold, then the translated declaration is
well formed according to the real imported `Lean4Lean.VDecl.WF` relation.
-/
theorem translated_axiom_vdecl_wf
    (env env' : VEnv) (d : PSDecl) (c : VConstVal)
    (_hk : d.kind = .axiom)
    (_htr : translateConstVal? d = some c)
    (_hdecl : translateDecl? d = some (VDecl.axiom c))
    (hType : c.toVConstant.WF env)
    (hAdd : env.addConst c.name c.toVConstant = some env') :
    VDecl.WF env (VDecl.axiom c) env' := by
  exact VDecl.WF.axiom hType hAdd

/--
If KA-12 translation produces a definition `VDefVal`, and Lean4Lean's own
constant-header/body well-formedness plus add-constant premises hold, then the
translated declaration is well formed according to the real imported
`Lean4Lean.VDecl.WF` relation and extends the environment with its defining
equation.
-/
theorem translated_definition_vdecl_wf
    (env env' : VEnv) (d : PSDecl) (v : VDefVal)
    (_hk : d.kind = .definition)
    (_htr : translateDefVal? d = some v)
    (_hdecl : translateDecl? d = some (VDecl.def v))
    (_hType : v.toVConstant.WF env)
    (hBody : v.WF env)
    (hAdd : env.addConst v.name v.toVConstant = some env') :
    VDecl.WF env (VDecl.def v) (env'.addDefEq v.toDefEq) := by
  exact VDecl.WF.def hBody hAdd

/-- The KA-13 bridge intentionally leaves unsupported inductives blocked. -/
theorem ka13_preserves_inductive_block (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  exact unsupported_inductive_direct_blocked d

end PSKernelKA13
