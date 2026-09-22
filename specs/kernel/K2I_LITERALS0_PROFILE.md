# K2i-literals0 implementation profile

Status: **implemented subset; not full ProofScript v0.1 or Lean 4.33.1 conformance**.

This profile extends K2h without changing the kernel calculus or core wire format.

## Added source/elaboration coverage

- `true` lowers to the checked `Bool.true` constructor.
- `false` lowers to the checked `Bool.false` constructor.
- exact decimal Nat literals `0..4096` lower to `Nat.zero` followed by repeated checked `Nat.succ` applications.
- a literal with an incompatible expected type is reported unsupported rather than reinterpreted.
- curried application elaboration infers the current function type, weak-head reduces it to a Pi, elaborates the argument against the Pi domain, verifies the argument type, and instantiates the codomain for the next argument.
- pending inductive self-applications use the elaborator's explicitly known pending declaration type; the declaration is still admitted only after kernel checking.

## Trust boundary

There is no Nat-literal or Bool-literal kernel expression. Accepted literal syntax is eliminated before core serialization. `psc verify` therefore sees only existing constants/applications and rechecks them normally.

## Deliberate limits

- general Lean `OfNat`/`OfScientific` and typeclass-driven literal overloading are not implemented;
- Nat source numerals are deliberately bounded at 4096 in this linear successor-encoding bootstrap to avoid an accidental resource-amplification path;
- hexadecimal/scientific/other literal classes are deferred;
- implicit, named, default, automatic, and instance argument elaboration remains deferred.

The accepted K2i subset is intended to agree with the corresponding Nat/Bool meanings in the pinned Lean 4.33.1 baseline, but pinned differential execution remains pending in this environment.
