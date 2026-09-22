class Marker (A : Type) where
  tag : Nat

class Key (n : Nat) where
  value : Nat

instance natMarker : Marker Nat := { tag := 0 }
instance dependentTarget [m : Marker Nat] : Key (@Marker.tag Nat m) := { value := 0 }
