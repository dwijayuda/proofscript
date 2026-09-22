inductive Box (A : Type) : Type where
  | mk (x : A)

class Marker (A : Type) where
  tag : Nat

instance natMarker : Marker Nat := { tag := 3 }
instance (priority := 2000) boxMarker {A : Type} [m : Marker A] : Marker (Box A) := { tag := @Marker.tag A m }

def getBoxNat [m : Marker (Box Nat)] (n : Nat) : Nat := @Marker.tag (Box Nat) m
def automaticBoxTag : Nat := getBoxNat 0
theorem automaticBoxTagIsThree : automaticBoxTag = 3 := rfl
