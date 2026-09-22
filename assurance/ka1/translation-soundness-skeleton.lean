/-
PSKernel KA-1 translation/soundness skeleton.

This file is intentionally a target skeleton, not a proof. It records the theorem
surface that the next assurance phase must make real. It is not imported by a
trusted release gate and does not grant any semantic authority to PSKernel.

No trusted kernel semantics are changed by KA-1.
-/

namespace PSKernelKA1

/-- Placeholder names for the source artifact model. KA-2 must replace these
with the formal PSCore v71 syntax and typing judgments. -/
opaque PSLevel : Type
opaque PSExpr : Type
opaque PSDecl : Type
opaque PSEnv : Type
opaque PSCheckDecl : PSEnv → PSDecl → PSEnv → Prop
opaque PSDefEq : PSEnv → PSExpr → PSExpr → Prop
opaque PSSupportedCore : PSDecl → Prop

/-- Placeholder names for the Lean 4.33.1 reference model. KA-2/KA-3 must bind
these to the chosen formal reference relation. -/
opaque L4Level : Type
opaque L4Expr : Type
opaque L4Decl : Type
opaque L4Env : Type
opaque L4CheckDecl : L4Env → L4Decl → L4Env → Prop
opaque L4DefEq : L4Env → L4Expr → L4Expr → Prop

opaque translateLevel : PSLevel → L4Level
opaque translateExpr : PSExpr → L4Expr
opaque translateDecl : PSDecl → L4Decl
opaque translateEnv : PSEnv → L4Env

/-- Target theorem: acceptance soundness for declaration checking.
This is the first critical equivalence obligation and is not a proof yet. -/
theorem target_checkDecl_sound : Prop :=
  ∀ (env env' : PSEnv) (d : PSDecl),
    PSCheckDecl env d env' →
    L4CheckDecl (translateEnv env) (translateDecl d) (translateEnv env')

/-- Target theorem: PSKernel definitional equality soundness. -/
theorem target_defEq_sound : Prop :=
  ∀ (env : PSEnv) (t u : PSExpr),
    PSDefEq env t u →
    L4DefEq (translateEnv env) (translateExpr t) (translateExpr u)

/-- Target theorem: completeness is only for the explicitly supported Core
fragment, not for the full Lean language or frontend. -/
theorem target_supportedCore_complete : Prop :=
  ∀ (env env' : PSEnv) (d : PSDecl),
    PSSupportedCore d →
    L4CheckDecl (translateEnv env) (translateDecl d) (translateEnv env') →
    PSCheckDecl env d env'

end PSKernelKA1
