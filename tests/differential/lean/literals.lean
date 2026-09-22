def zeroLit : Nat := 0
def threeLit : Nat := 3
def yesLit : Bool := true
def noLit : Bool := false
def succZeroLit : Nat := Nat.succ 0
def localLiteral : Nat :=
  let x := 2
  Nat.succ x

theorem threeLiteralComputes : threeLit = Nat.succ (Nat.succ (Nat.succ 0)) := rfl
theorem boolLiteralComputes : yesLit = Bool.true := rfl
