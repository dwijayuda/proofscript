def isZeroPattern : Nat → Bool
  | 0 => true
  | _ => false

def isZeroMatch (n : Nat) : Bool :=
  match n with
  | 0 => true
  | _ => false
