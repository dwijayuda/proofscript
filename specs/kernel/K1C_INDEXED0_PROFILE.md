# K1c-indexed0 implementation profile

This is an implementation-coverage profile of ProofScript Language Reference v0.1, not a language version.

K1c extends the previous restricted inductive kernel with:

- explicit `numParams` and `numIndices`;
- uniform-parameter checks in constructor result applications;
- conservative indexed constructor admission;
- generated recursors for indexed families whose constructors add no local fields;
- conservative elimination of singleton `Prop` families for that slice;
- an ordinary checked `Eq` declaration with generated `Eq.refl` and `Eq.rec`.

It does **not** claim:

- general recursive indexed families;
- mutual or nested inductives;
- Lean-complete positivity;
- all singleton/`Prop` elimination exceptions;
- full Lean recursor metadata parity.

Reject-on-uncertainty is intentional until each wider case is modeled and tested.
