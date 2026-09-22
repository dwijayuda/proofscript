-- const-value
def answer : Nat := 42

-- const-function-value
def increment : Nat -> Nat := fun x => x + 1

-- function-add
def add (x : Nat) (y : Nat) : Nat := x + y

-- def-general
def mul (x : Nat) (y : Nat) : Nat := x * y

-- adjacent-call-two
add 1 2

-- tuple-argument
f (x, y)

-- braced-if
if x > y then x else y

-- structure-body
structure Point where
  x : Float
  y : Float

-- structure-implicit-field
structure Box where
  {α : Type}
  value : α

-- inductive-body
inductive Option (α : Type) where
  | none
  | some (value : α)

-- match-body
match value with
  | .none => 0
  | .some x => f x

-- where-body
def f (x : Nat) : Nat := helper x where
  helper (y : Nat) : Nat := y + 1
