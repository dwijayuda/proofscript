import Lean
open Lean

universe u v

-- Frozen v68 reports A >= B. Exact Lean 4.33.1 reports false.
def A : Lean.Level := Lean.Level.imax (Lean.Level.max (Lean.Level.param `v) (Lean.Level.param `v)) (Lean.Level.param `u)
def B : Lean.Level := Lean.Level.imax
  (Lean.Level.imax Lean.Level.zero (Lean.Level.param `u))
  (Lean.Level.imax (Lean.Level.param `v) (Lean.Level.param `u))

#eval IO.println s!"Lean geq A B = {Lean.Level.geq A B}"
#eval IO.println s!"Lean geq (A+1) (B+1) = {Lean.Level.geq (Lean.Level.succ A) (Lean.Level.succ B)}"

axiom T : Sort ((imax (imax 0 u) (imax v u)) + 1)
inductive I : Sort ((imax (max v v) u) + 1) where
  | mk : T.{u,v} → I
