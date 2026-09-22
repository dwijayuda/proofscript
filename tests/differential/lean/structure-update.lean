structure PairNat where
  left : Nat
  right : Nat

def updateLeft (p : PairNat) (left : Nat) : PairNat :=
  { p with left := left }

def updateBoth (p : PairNat) (left : Nat) (right : Nat) : PairNat :=
  { p with left := left, right := right }
