inductive Box (A : Type) : Type where
  | mk (x : A)
class Marker (A : Type) where
  tag : Nat
instance (priority := 2000) boxMarkerHigh {A : Type} : Marker (Box A) := { tag := 7 }
instance (priority := 2000) boxMarkerLater {A : Type} : Marker (Box A) := { tag := 8 }
def getBoxNat [m : Marker (Box Nat)] (n : Nat) : Nat := @Marker.tag (Box Nat) m
def automaticBoxTag : Nat := getBoxNat 0
theorem automaticBoxTagIsEight : automaticBoxTag = 8 := rfl
