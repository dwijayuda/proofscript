set_option linter.unusedSectionVars false
universe u
section
  variable {A : Type u}
  variable (x : A)
  variable (n : Nat)

  def keep : A := x
  def bodyOnly : Nat := n
  theorem headerUse : x = x := rfl

  include x
  theorem forced : (0 : Nat) = 0 := rfl
  omit x
  theorem afterOmit : (0 : Nat) = 0 := rfl
end
