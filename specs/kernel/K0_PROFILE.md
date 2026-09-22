# K0-bootstrap implementation profile

This file describes implementation coverage only. It does not define a dialect or override the language reference.

Supported core constructors: `Sort`, bound variable, constant, `App`, `Lam`, `Pi`.
Supported declarations: `axiom`, `theorem`.
Supported surface: explicit binders, direct theorem proof terms, `fun`, `→`/`->`, `∀`/`forall`, uniform application groups.

Everything else in ProofScript v0.1 is either rejected as malformed source or, when recognized as a valid but unimplemented reference feature, classified `unsupported`.
