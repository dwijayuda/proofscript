/- Value-level model shipped by proofscript.feature.rust-black-box.
   The optimizer-barrier behavior is intentionally outside this model. -/
def psRustBlackBoxNat (x : Nat) : Nat := x

theorem psRustBlackBoxNat_value (x : Nat) :
    psRustBlackBoxNat x = x := rfl
