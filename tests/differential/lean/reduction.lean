def doubleNat : Nat → Nat
  | 0 => 0
  | Nat.succ k => Nat.succ (Nat.succ (doubleNat k))

theorem doubleOne : doubleNat 1 = 2 := rfl
