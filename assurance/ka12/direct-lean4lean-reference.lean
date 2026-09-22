import Lean4Lean.Theory.VDecl

/-
KA-12 direct Lean4Lean reference skeleton.

This file intentionally imports Lean4Lean theory modules directly and targets
real Lean4Lean structures (`VLevel`, `VExpr`, `VDecl`) instead of the prior
`Lean4LeanCompat` interface. It proves a first shape-preservation slice for
non-inductive declarations. It does not prove full Lean 4 equivalence.
-/

namespace PSKernelKA12

open Lean4Lean

inductive PSLevel where
  | zero  : PSLevel
  | succ  : PSLevel -> PSLevel
  | max   : PSLevel -> PSLevel -> PSLevel
  | imax  : PSLevel -> PSLevel -> PSLevel
  | param : Nat -> PSLevel
  | mvar  : Nat -> PSLevel

inductive PSExpr where
  | bvar    : Nat -> PSExpr
  | sort    : PSLevel -> PSExpr
  | const   : Name -> List PSLevel -> PSExpr
  | app     : PSExpr -> PSExpr -> PSExpr
  | lam     : PSExpr -> PSExpr -> PSExpr
  | forallE : PSExpr -> PSExpr -> PSExpr
  | letE    : PSExpr -> PSExpr -> PSExpr -> PSExpr
  | lit     : Nat -> PSExpr
  | proj    : Name -> Nat -> PSExpr -> PSExpr
  | mdata   : PSExpr -> PSExpr
  | fvar    : Nat -> PSExpr
  | mvar    : Nat -> PSExpr

inductive PSDeclKind where
  | axiom | definition | theorem | example | opaque | quot | inductive | mutualInductive
  deriving DecidableEq, Repr

structure PSDecl where
  name  : Name
  uvars : Nat
  kind  : PSDeclKind
  typ   : PSExpr
  val?  : Option PSExpr

def translateLevel? (arity : Nat) : PSLevel -> Option VLevel
  | .zero => some .zero
  | .succ l => (translateLevel? arity l).map VLevel.succ
  | .max a b =>
      match translateLevel? arity a, translateLevel? arity b with
      | some a', some b' => some (.max a' b')
      | _, _ => none
  | .imax a b =>
      match translateLevel? arity a, translateLevel? arity b with
      | some a', some b' => some (.imax a' b')
      | _, _ => none
  | .param i => if i < arity then some (.param i) else none
  | .mvar _ => none

def translateLevels? (arity : Nat) : List PSLevel -> Option (List VLevel)
  | [] => some []
  | l :: ls =>
      match translateLevel? arity l, translateLevels? arity ls with
      | some l', some ls' => some (l' :: ls')
      | _, _ => none

def translateExpr? (arity : Nat) : PSExpr -> Option VExpr
  | .bvar i => some (.bvar i)
  | .sort u => (translateLevel? arity u).map VExpr.sort
  | .const n us => (translateLevels? arity us).map (VExpr.const n)
  | .app f a =>
      match translateExpr? arity f, translateExpr? arity a with
      | some f', some a' => some (.app f' a')
      | _, _ => none
  | .lam t b =>
      match translateExpr? arity t, translateExpr? arity b with
      | some t', some b' => some (.lam t' b')
      | _, _ => none
  | .forallE t b =>
      match translateExpr? arity t, translateExpr? arity b with
      | some t', some b' => some (.forallE t' b')
      | _, _ => none
  | .mdata e => translateExpr? arity e
  | .letE .. | .lit .. | .proj .. | .fvar .. | .mvar .. => none

def translateConstVal? (d : PSDecl) : Option VConstVal :=
  match translateExpr? d.uvars d.typ with
  | some t => some { name := d.name, uvars := d.uvars, type := t }
  | none => none

def translateDefVal? (d : PSDecl) : Option VDefVal :=
  match translateExpr? d.uvars d.typ, d.val? with
  | some t, some v =>
      match translateExpr? d.uvars v with
      | some v' => some { name := d.name, uvars := d.uvars, type := t, value := v' }
      | none => none
  | _, _ => none

def translateDecl? (d : PSDecl) : Option VDecl :=
  match d.kind with
  | .axiom => (translateConstVal? d).map VDecl.axiom
  | .definition => (translateDefVal? d).map VDecl.def
  | .theorem => (translateDefVal? d).map VDecl.def
  | .example => (translateDefVal? d).map VDecl.example
  | .opaque => (translateDefVal? d).map VDecl.opaque
  | .quot => some VDecl.quot
  | .inductive | .mutualInductive => none

theorem level_mvar_blocked (arity n : Nat) :
    translateLevel? arity (.mvar n) = none := by
  rfl

theorem expr_mvar_blocked (arity n : Nat) :
    translateExpr? arity (.mvar n) = none := by
  rfl

theorem expr_fvar_blocked (arity n : Nat) :
    translateExpr? arity (.fvar n) = none := by
  rfl

theorem metadata_erasure_direct (arity : Nat) (e : PSExpr) :
    translateExpr? arity (.mdata e) = translateExpr? arity e := by
  rfl

theorem unsupported_inductive_direct_blocked (d : PSDecl) :
    d.kind = .inductive ∨ d.kind = .mutualInductive -> translateDecl? d = none := by
  intro h
  cases d with
  | mk name uvars kind typ val? =>
    cases h with
    | inl h1 => subst h1; rfl
    | inr h2 => subst h2; rfl

theorem translated_axiom_is_real_vdecl (d : PSDecl) (c : VConstVal)
    (hk : d.kind = .axiom) (h : translateConstVal? d = some c) :
    translateDecl? d = some (VDecl.axiom c) := by
  cases d with
  | mk name uvars kind typ val? =>
    subst hk
    simp [translateDecl?, h]

theorem translated_definition_is_real_vdecl (d : PSDecl) (v : VDefVal)
    (hk : d.kind = .definition) (h : translateDefVal? d = some v) :
    translateDecl? d = some (VDecl.def v) := by
  cases d with
  | mk name uvars kind typ val? =>
    subst hk
    simp [translateDecl?, h]

def sampleType : PSExpr := .sort (.succ .zero)
def sampleValue : PSExpr := .lam sampleType (.bvar 0)
def sampleDecl : PSDecl :=
  { name := `PSKernel.sample, uvars := 0, kind := .definition, typ := sampleType, val? := some sampleValue }

#guard (translateDecl? sampleDecl).isSome

end PSKernelKA12
