structure PairNat where
  fst : Nat
  snd : Nat

def pairValue : PairNat := { fst := 3, snd := 4 }
theorem pairFst : PairNat.fst pairValue = 3 := rfl
