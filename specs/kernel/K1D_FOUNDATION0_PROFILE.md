# K1d-foundation0 implementation profile

K1d is the current executable semantic profile. It adds to K1c:

- simple transparent regular `def` declarations;
- kernel checking of definition values against declared types;
- delta reduction of transparent definitions with universe instantiation;
- checked bootstrap `Eq`, `Nat`, `Bool` and `Nat.add`;
- a standalone proof of `Nat.add(n, Nat.zero) = n` expressed using `Eq.refl`;
- a checked bootstrap artifact loadable as an explicit standard prelude.

Current source restrictions include:

- explicit result types for the implemented simple `def` form;
- exactly one final body term inside the mandatory declaration-owned braces;
- no `let`/`have` body preludes yet;
- no equation-clause definitions or source pattern compilation yet.

The checked bootstrap is not a host-language primitive. It is replayed by the same standalone kernel as user declarations.
