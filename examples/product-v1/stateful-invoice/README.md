# Product-v1 stateful invoice settlement

This representative business-domain contract reuses the canonical
`BankStateModel` descriptor and real Lean proof pipeline. It is intentionally
not a second state model: the application demonstrates that normal business
logic can consume a previously established verified state model.

The Product-v1 proof matrix must discharge `settleInvoice` on every supported
Lean compatibility lane before this representative app is considered proved.
