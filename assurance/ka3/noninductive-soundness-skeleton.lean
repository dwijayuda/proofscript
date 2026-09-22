/-
PSKernel KA-3 non-inductive soundness skeleton.

This file is deliberately self-contained: it binds the KA-2 translation relation
to a small Lean-shaped reference model for ordinary non-inductive declarations.
It is not an imported Lean4Lean proof yet. The container used for this checkpoint
has no `lean` executable, so the release gate records `leanCheckedHere = false`.
-/

namespace PSKernelKA3

inductive PSLevel where
  | zero : PSLevel
  | succ : PSLevel -> PSLevel
  | max  : PSLevel -> PSLevel -> PSLevel
  | imax : PSLevel -> PSLevel -> PSLevel
  | param : Nat -> PSLevel
  | mvar : Nat -> PSLevel

inductive RefLevel where
  | zero : RefLevel
  | succ : RefLevel -> RefLevel
  | max  : RefLevel -> RefLevel -> RefLevel
  | imax : RefLevel -> RefLevel -> RefLevel
  | param : Nat -> RefLevel

inductive PSExpr where
  | sort  : PSLevel -> PSExpr
  | bvar  : Nat -> PSExpr
  | const : Nat -> List PSLevel -> PSExpr
  | app   : PSExpr -> PSExpr -> PSExpr
  | lam   : Nat -> PSExpr -> PSExpr -> PSExpr
  | pi    : Nat -> PSExpr -> PSExpr -> PSExpr
  | letE  : Nat -> PSExpr -> PSExpr -> PSExpr -> PSExpr
  | lit   : Nat -> PSExpr
  | proj  : Nat -> Nat -> PSExpr -> PSExpr
  | mdata : PSExpr -> PSExpr
  | fvar  : Nat -> PSExpr
  | mvar  : Nat -> PSExpr

inductive RefExpr where
  | sort  : RefLevel -> RefExpr
  | bvar  : Nat -> RefExpr
  | const : Nat -> List RefLevel -> RefExpr
  | app   : RefExpr -> RefExpr -> RefExpr
  | lam   : Nat -> RefExpr -> RefExpr -> RefExpr
  | forallE : Nat -> RefExpr -> RefExpr -> RefExpr
  | letE  : Nat -> RefExpr -> RefExpr -> RefExpr -> RefExpr
  | lit   : Nat -> RefExpr
  | proj  : Nat -> Nat -> RefExpr -> RefExpr

inductive PSDeclKind where
  | axiom | definition | theorem | example | opaque | quot | inductive | mutualInductive
  deriving DecidableEq

structure PSDecl where
  kind : PSDeclKind
  typ  : PSExpr
  val? : Option PSExpr

inductive RefDeclKind where
  | axiomInfo | defnInfo | thmInfo | opaqueInfo

structure RefDecl where
  kind : RefDeclKind
  typ  : RefExpr
  val? : Option RefExpr

def isNonInductive : PSDeclKind -> Bool
  | .axiom => true
  | .definition => true
  | .theorem => true
  | .example => true
  | .opaque => true
  | .quot => false
  | .inductive => false
  | .mutualInductive => false

def translateLevel? : PSLevel -> Option RefLevel
  | .zero => some .zero
  | .succ l => (translateLevel? l).map RefLevel.succ
  | .max a b =>
      match translateLevel? a, translateLevel? b with
      | some a', some b' => some (.max a' b')
      | _, _ => none
  | .imax a b =>
      match translateLevel? a, translateLevel? b with
      | some a', some b' => some (.imax a' b')
      | _, _ => none
  | .param n => some (.param n)
  | .mvar _ => none

def translateLevels? : List PSLevel -> Option (List RefLevel)
  | [] => some []
  | l :: ls =>
      match translateLevel? l, translateLevels? ls with
      | some l', some ls' => some (l' :: ls')
      | _, _ => none

def translateExpr? : PSExpr -> Option RefExpr
  | .sort u => (translateLevel? u).map RefExpr.sort
  | .bvar i => some (.bvar i)
  | .const n us => (translateLevels? us).map (RefExpr.const n)
  | .app f a =>
      match translateExpr? f, translateExpr? a with
      | some f', some a' => some (.app f' a')
      | _, _ => none
  | .lam n t b =>
      match translateExpr? t, translateExpr? b with
      | some t', some b' => some (.lam n t' b')
      | _, _ => none
  | .pi n t b =>
      match translateExpr? t, translateExpr? b with
      | some t', some b' => some (.forallE n t' b')
      | _, _ => none
  | .letE n t v b =>
      match translateExpr? t, translateExpr? v, translateExpr? b with
      | some t', some v', some b' => some (.letE n t' v' b')
      | _, _, _ => none
  | .lit n => some (.lit n)
  | .proj s i e => (translateExpr? e).map (RefExpr.proj s i)
  | .mdata e => translateExpr? e
  | .fvar _ => none
  | .mvar _ => none

def translateKind? : PSDeclKind -> Option RefDeclKind
  | .axiom => some .axiomInfo
  | .definition => some .defnInfo
  | .theorem => some .thmInfo
  | .example => some .thmInfo
  | .opaque => some .opaqueInfo
  | .quot => none
  | .inductive => none
  | .mutualInductive => none

def translateDecl? (d : PSDecl) : Option RefDecl :=
  match translateKind? d.kind, translateExpr? d.typ with
  | some k, some t =>
      match d.val? with
      | none => some { kind := k, typ := t, val? := none }
      | some v =>
          match translateExpr? v with
          | some v' => some { kind := k, typ := t, val? := some v' }
          | none => none
  | _, _ => none

theorem noninductive_kind_translation_sound (k : PSDeclKind) :
    isNonInductive k = true -> exists rk, translateKind? k = some rk := by
  intro h
  cases k <;> simp [isNonInductive, translateKind?] at h ⊢

theorem unsupported_kind_translation_blocked (k : PSDeclKind) :
    isNonInductive k = false -> translateKind? k = none := by
  intro h
  cases k <;> simp [isNonInductive, translateKind?] at h ⊢

theorem mdata_erasure_shape (e : PSExpr) :
    translateExpr? (.mdata e) = translateExpr? e := by
  rfl

theorem level_mvar_blocked (n : Nat) :
    translateLevel? (.mvar n) = none := by
  rfl

theorem expr_mvar_blocked (n : Nat) :
    translateExpr? (.mvar n) = none := by
  rfl

theorem fvar_blocked (n : Nat) :
    translateExpr? (.fvar n) = none := by
  rfl

end PSKernelKA3
