# K2b-transparency0 implementation profile

This is implementation coverage of ProofScript Language Reference v0.1, not a new language version.

Implemented declaration slice:

- ordinary `def`: checked value, regular definition metadata, delta-reducible in the current kernel conversion profile;
- `abbrev`: checked value, distinct `abbrev` reducibility metadata, delta-reducible;
- `opaque`: checked value stored in the checked artifact/environment but never delta-reduced by kernel conversion;
- `example`: checked type/value replay item that deliberately does not extend the environment.

The profile does not yet model every Lean transparency mode or attribute, opaque-without-RHS behavior, modifiers, compiler replacement attributes, or full elaborator transparency observations.
