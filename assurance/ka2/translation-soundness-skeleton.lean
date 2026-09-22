/-
PSKernel KA-2 translation relation skeleton.

KA-2 introduces names for the translation functions and the first non-inductive
soundness target. These definitions are intentionally abstract and do not claim
a proof. The goal is to make the next proof step mechanically nameable without
changing trusted kernel semantics.
-/

namespace PSKernelKA2

opaque PSLevel : Type
opaque PSExpr : Type
opaque PSDecl : Type
opaque PSEnv : Type
opaque L4Level : Type
opaque L4Expr : Type
opaque L4Decl : Type
opaque L4Env : Type

opaque PSCheckDecl : PSEnv → PSDecl → PSEnv → Prop
opaque PSDefEq : PSEnv → PSExpr → PSExpr → Prop
opaque PSNonInductiveCore : PSDecl → Prop
opaque PSSupportedCore : PSDecl → Prop
opaque L4CheckDecl : L4Env → L4Decl → L4Env → Prop
opaque L4DefEq : L4Env → L4Expr → L4Expr → Prop

opaque translateLevelImpl : PSLevel → L4Level
opaque translateExprImpl : PSExpr → L4Expr
opaque translateDeclImpl : PSDecl → L4Decl
opaque translateEnvImpl : PSEnv → L4Env

def translateLevel : PSLevel → L4Level := translateLevelImpl
def translateExpr : PSExpr → L4Expr := translateExprImpl
def translateDecl : PSDecl → L4Decl := translateDeclImpl
def translateEnv : PSEnv → L4Env := translateEnvImpl

/-- KA-2 target: the non-inductive fragment is the first proof slice. -/
theorem target_noninductive_checkDecl_sound : Prop :=
  ∀ (env env' : PSEnv) (d : PSDecl),
    PSNonInductiveCore d →
    PSCheckDecl env d env' →
    L4CheckDecl (translateEnv env) (translateDecl d) (translateEnv env')

/-- Existing target retained from KA-1. -/
theorem target_defEq_sound : Prop :=
  ∀ (env : PSEnv) (t u : PSExpr),
    PSDefEq env t u →
    L4DefEq (translateEnv env) (translateExpr t) (translateExpr u)

/-- Completeness stays explicitly scoped to supported Core only. -/
theorem target_supportedCore_complete : Prop :=
  ∀ (env env' : PSEnv) (d : PSDecl),
    PSSupportedCore d →
    L4CheckDecl (translateEnv env) (translateDecl d) (translateEnv env') →
    PSCheckDecl env d env'

end PSKernelKA2
