inductive Box (A : Type) : Type where
  | mk (x : A)

inductive Pair (A : Type) (B : Type) : Type where
  | mk (a : A) (b : B)

def keepBoxType {A : Type} (b : Box A) : Nat := 0
def keepPairTypes {A : Type} {B : Type} (p : Pair A B) : Nat := 0
def mkNatBox (n : Nat) : Box Nat := Box.mk n
def mkNatBoolPair (n : Nat) (b : Bool) : Pair Nat Bool := Pair.mk n b
def useBox (n : Nat) : Nat := keepBoxType (mkNatBox n)
def usePair (n : Nat) (b : Bool) : Nat := keepPairTypes (mkNatBoolPair n b)
theorem boxComputes (n : Nat) : useBox n = 0 := rfl
theorem pairComputes (n : Nat) (b : Bool) : usePair n b = 0 := rfl
