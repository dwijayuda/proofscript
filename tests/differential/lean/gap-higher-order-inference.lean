def higher {A : Type} (f : A → Nat) : Nat := 0
def natFn (n : Nat) : Nat := n
def good : Nat := higher natFn
