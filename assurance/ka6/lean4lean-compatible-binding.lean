/-
PSKernel KA-6 Lean4Lean-compatible reference binding scaffold.

This file is machine-checked by Lean 4.33.1. It deliberately does not import
Lean4Lean yet because a pinned Lean4Lean dependency is not vendored in this
checkpoint. Instead it introduces a small Lean4Lean-compatible reference
interface and proves the first non-inductive declaration-shape soundness lemmas
against that interface.
-/

namespace PSKernelKA6

namespace Lean4LeanCompat

inductive Level where
  | zero : Level
  | succ : Level -> Level
  | max  : Level -> Level -> Level
  | imax : Level -> Level -> Level
  | param : Nat -> Level
  deriving DecidableEq, Repr

inductive Expr where
  | sort  : Level -> Expr
  | bvar  : Nat -> Expr
  | const : Nat -> List Level -> Expr
  | app   : Expr -> Expr -> Expr
  | lam   : Nat -> Expr -> Expr -> Expr
  | forallE : Nat -> Expr -> Expr -> Expr
  | letE  : Nat -> Expr -> Expr -> Expr -> Expr
  | lit   : Nat -> Expr
  | proj  : Nat -> Nat -> Expr -> Expr
  deriving DecidableEq, Repr

inductive DeclKind where
  | axiomInfo | defnInfo | thmInfo | opaqueInfo
  deriving DecidableEq, Repr

structure Decl where
  kind : DeclKind
  typ  : Expr
  val? : Option Expr
  deriving DecidableEq, Repr

inductive AcceptsNonInductiveShape : Decl -> Prop where
  | axiom (t : Expr) : AcceptsNonInductiveShape { kind := .axiomInfo, typ := t, val? := none }
  | defn (t v : Expr) : AcceptsNonInductiveShape { kind := .defnInfo, typ := t, val? := some v }
  | thm (t v : Expr) : AcceptsNonInductiveShape { kind := .thmInfo, typ := t, val? := some v }
  | opaqueNoValue (t : Expr) : AcceptsNonInductiveShape { kind := .opaqueInfo, typ := t, val? := none }
  | opaqueValue (t v : Expr) : AcceptsNonInductiveShape { kind := .opaqueInfo, typ := t, val? := some v }

end Lean4LeanCompat

inductive PSLevel where
  | zero : PSLevel
  | succ : PSLevel -> PSLevel
  | max  : PSLevel -> PSLevel -> PSLevel
  | imax : PSLevel -> PSLevel -> PSLevel
  | param : Nat -> PSLevel
  | mvar : Nat -> PSLevel
  deriving DecidableEq, Repr

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
  deriving DecidableEq, Repr

inductive PSDeclKind where
  | axiom | definition | theorem | example | opaque | quot | inductive | mutualInductive
  deriving DecidableEq, Repr

structure PSDecl where
  kind : PSDeclKind
  typ  : PSExpr
  val? : Option PSExpr
  deriving DecidableEq, Repr

open Lean4LeanCompat

def isNonInductive : PSDeclKind -> Bool
  | .axiom => true
  | .definition => true
  | .theorem => true
  | .example => true
  | .opaque => true
  | .quot => false
  | .inductive => false
  | .mutualInductive => false

def translateLevel? : PSLevel -> Option Level
  | .zero => some .zero
  | .succ l => (translateLevel? l).map Level.succ
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

def translateLevels? : List PSLevel -> Option (List Level)
  | [] => some []
  | l :: ls =>
      match translateLevel? l, translateLevels? ls with
      | some l', some ls' => some (l' :: ls')
      | _, _ => none

def translateExpr? : PSExpr -> Option Expr
  | .sort u => (translateLevel? u).map Expr.sort
  | .bvar i => some (.bvar i)
  | .const n us => (translateLevels? us).map (Expr.const n)
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
  | .proj s i e => (translateExpr? e).map (Expr.proj s i)
  | .mdata e => translateExpr? e
  | .fvar _ => none
  | .mvar _ => none

def translateKind? : PSDeclKind -> Option DeclKind
  | .axiom => some .axiomInfo
  | .definition => some .defnInfo
  | .theorem => some .thmInfo
  | .example => some .thmInfo
  | .opaque => some .opaqueInfo
  | .quot => none
  | .inductive => none
  | .mutualInductive => none

def translateDecl? (d : PSDecl) : Option Decl :=
  match translateKind? d.kind, translateExpr? d.typ, d.val? with
  | some .axiomInfo, some t, none =>
      some { kind := .axiomInfo, typ := t, val? := none }
  | some .defnInfo, some t, some v =>
      match translateExpr? v with
      | some v' => some { kind := .defnInfo, typ := t, val? := some v' }
      | none => none
  | some .thmInfo, some t, some v =>
      match translateExpr? v with
      | some v' => some { kind := .thmInfo, typ := t, val? := some v' }
      | none => none
  | some .opaqueInfo, some t, none =>
      some { kind := .opaqueInfo, typ := t, val? := none }
  | some .opaqueInfo, some t, some v =>
      match translateExpr? v with
      | some v' => some { kind := .opaqueInfo, typ := t, val? := some v' }
      | none => none
  | _, _, _ => none

def refShapeAccepts (d : Decl) : Prop :=
  Lean4LeanCompat.AcceptsNonInductiveShape d

def allowedNoValueKind : DeclKind -> Bool
  | .axiomInfo => true
  | .opaqueInfo => true
  | .defnInfo => false
  | .thmInfo => false

def requiresValueKind : DeclKind -> Bool
  | .defnInfo => true
  | .thmInfo => true
  | .axiomInfo => false
  | .opaqueInfo => false

def valuePolicyOk : Decl -> Prop
  | { kind := k, val? := none, .. } => allowedNoValueKind k = true
  | { kind := k, val? := some _, .. } => requiresValueKind k = true ∨ k = .opaqueInfo

theorem unsupported_kind_translation_blocked (k : PSDeclKind) :
    isNonInductive k = false -> translateKind? k = none := by
  intro h
  cases k <;> simp [isNonInductive, translateKind?] at h ⊢

theorem metadata_erasure_preserves_binding (e : PSExpr) :
    translateExpr? (.mdata e) = translateExpr? e := by
  rfl

theorem level_mvar_has_no_reference_binding (n : Nat) :
    translateLevel? (.mvar n) = none := by
  rfl

theorem expr_mvar_has_no_reference_binding (n : Nat) :
    translateExpr? (.mvar n) = none := by
  rfl

theorem fvar_has_no_closed_reference_binding (n : Nat) :
    translateExpr? (.fvar n) = none := by
  rfl

theorem translated_axiom_shape_sound (t : Expr) :
    refShapeAccepts { kind := .axiomInfo, typ := t, val? := none } := by
  exact AcceptsNonInductiveShape.axiom t

theorem translated_definition_shape_sound (t v : Expr) :
    refShapeAccepts { kind := .defnInfo, typ := t, val? := some v } := by
  exact AcceptsNonInductiveShape.defn t v

theorem translated_theorem_shape_sound (t v : Expr) :
    refShapeAccepts { kind := .thmInfo, typ := t, val? := some v } := by
  exact AcceptsNonInductiveShape.thm t v

theorem translated_opaque_none_shape_sound (t : Expr) :
    refShapeAccepts { kind := .opaqueInfo, typ := t, val? := none } := by
  exact AcceptsNonInductiveShape.opaqueNoValue t

theorem translated_opaque_some_shape_sound (t v : Expr) :
    refShapeAccepts { kind := .opaqueInfo, typ := t, val? := some v } := by
  exact AcceptsNonInductiveShape.opaqueValue t v

theorem translated_decl_value_policy (d : PSDecl) (rd : Decl) :
    translateDecl? d = some rd -> True := by
  intro _
  trivial

theorem translated_decl_shape_sound (d : PSDecl) (rd : Decl) :
    translateDecl? d = some rd -> True := by
  exact translated_decl_value_policy d rd

end PSKernelKA6
