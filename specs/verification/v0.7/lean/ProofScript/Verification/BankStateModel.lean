import Std.Tactic.Do

open Std.Do

namespace BankStateModel

/-- Account identifiers in the promoted verification example. -/
abbrev AccountId := Nat

/-- A deliberately small bank state: balances are total maps from account IDs to naturals. -/
abbrev Bank := AccountId → Nat

def balanceOf (account : AccountId) (state : Bank) : Nat :=
  state account

def debitState (account : AccountId) (amount : Nat) (state : Bank) : Bank :=
  fun current =>
    if current = account then
      state current - amount
    else
      state current

def creditState (account : AccountId) (amount : Nat) (state : Bank) : Bank :=
  fun current =>
    if current = account then
      state current + amount
    else
      state current

def debit (account : AccountId) (amount : Nat) : StateM Bank Unit :=
  MonadStateOf.modifyGet fun state => ((), debitState account amount state)

def credit (account : AccountId) (amount : Nat) : StateM Bank Unit :=
  MonadStateOf.modifyGet fun state => ((), creditState account amount state)

def audit (_code : Nat) : StateM Bank Unit :=
  MonadStateOf.modifyGet fun state : Bank => ((), state)

@[simp]
theorem balanceOf_debitState_self (state : Bank) (account : AccountId) (amount : Nat) :
    balanceOf account (debitState account amount state) =
      balanceOf account state - amount := by
  simp [balanceOf, debitState]

@[simp]
theorem balanceOf_creditState_self (state : Bank) (account : AccountId) (amount : Nat) :
    balanceOf account (creditState account amount state) =
      balanceOf account state + amount := by
  simp [balanceOf, creditState]

@[simp]
theorem balanceOf_debitState_other
    (state : Bank) (account other : AccountId) (amount : Nat)
    (h : other ≠ account) :
    balanceOf other (debitState account amount state) =
      balanceOf other state := by
  simp [balanceOf, debitState, h]

@[simp]
theorem balanceOf_creditState_other
    (state : Bank) (account other : AccountId) (amount : Nat)
    (h : other ≠ account) :
    balanceOf other (creditState account amount state) =
      balanceOf other state := by
  simp [balanceOf, creditState, h]


/--
Symmetric orientation of the cross-account debit preservation fact.
This lets automation use a source-level distinctness hypothesis `account ≠ other`
without requiring an extra manual symmetry step.
-/
@[simp]
theorem balanceOf_debitState_other_of_account_ne
    (state : Bank) (account other : AccountId) (amount : Nat)
    (h : account ≠ other) :
    balanceOf other (debitState account amount state) =
      balanceOf other state := by
  exact balanceOf_debitState_other state account other amount (Ne.symm h)

/-- Symmetric orientation of the corresponding credit preservation fact. -/
@[simp]
theorem balanceOf_creditState_other_of_account_ne
    (state : Bank) (account other : AccountId) (amount : Nat)
    (h : account ≠ other) :
    balanceOf other (creditState account amount state) =
      balanceOf other state := by
  exact balanceOf_creditState_other state account other amount (Ne.symm h)

/--
A precise schematic specification for debit. Keeping the postcondition abstract lets
`vcgen` instantiate it with the precondition required by the following statement.
-/
@[spec]
theorem debit_triple
    {account : AccountId} {amount : Nat}
    {Q : PostCond Unit (.arg Bank .pure)} :
    ⦃ fun state => Q.1 () (debitState account amount state) ⦄
      debit account amount
    ⦃ Q ⦄ := by
  simpa [debit] using
    (Std.Do.Spec.modifyGet_StateT
      (m := Id)
      (σ := Bank)
      (α := Unit)
      (f := fun state : Bank => ((), debitState account amount state))
      (Q := Q))

/-- Precise schematic specification for credit. -/
@[spec]
theorem credit_triple
    {account : AccountId} {amount : Nat}
    {Q : PostCond Unit (.arg Bank .pure)} :
    ⦃ fun state => Q.1 () (creditState account amount state) ⦄
      credit account amount
    ⦃ Q ⦄ := by
  simpa [credit] using
    (Std.Do.Spec.modifyGet_StateT
      (m := Id)
      (σ := Bank)
      (α := Unit)
      (f := fun state : Bank => ((), creditState account amount state))
      (Q := Q))

/-- Audit leaves the modeled bank state unchanged. -/
@[spec]
theorem audit_triple
    {code : Nat}
    {Q : PostCond Unit (.arg Bank .pure)} :
    ⦃ fun state => Q.1 () state ⦄
      audit code
    ⦃ Q ⦄ := by
  simpa [audit] using
    (Std.Do.Spec.modifyGet_StateT
      (m := Id)
      (σ := Bank)
      (α := Unit)
      (f := fun state : Bank => ((), state))
      (Q := Q))

def runBankState (program : StateM Bank α) (initial : Bank) : α × Bank :=
  StateT.run program initial

/--
Adequacy bridge for the concrete StateM runner: a weakest-precondition fact at the
chosen initial state is sufficient for the corresponding proposition about the
actual runner result.
-/
theorem runBankState_adequate
    {result : α × Bank} {program : StateM Bank α} {initial : Bank}
    (hRun : runBankState program initial = result)
    (P : α × Bank → Prop) :
    (⊢ₛ wp⟦program⟧ (⇓ value final => ⌜P (value, final)⌝) initial) →
      P result := by
  simpa [runBankState] using
    (Std.Do.StateM.of_wp_run_eq (prog := program) (s := initial) hRun P)

end BankStateModel
