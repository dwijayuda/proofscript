/- Formal semantic support shipped by proofscript.feature.option. -/
universe u

def psOptionSome {α : Type u} (x : α) : Option α := some x

def psOptionNone {α : Type u} : Option α := none

theorem psOptionSome_value {α : Type u} (x : α) :
    psOptionSome x = some x := rfl

theorem psOptionNone_value {α : Type u} :
    (psOptionNone : Option α) = none := rfl
