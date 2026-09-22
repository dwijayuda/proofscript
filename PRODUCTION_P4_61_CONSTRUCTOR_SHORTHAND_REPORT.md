# Production P4.61 — Expected-Type Constructor Shorthand

## Status

Trusted-boundary implementation evidence only. Not a formal Lean 4 equivalence proof.

## Feature

P4.61 adds bounded expected-type-directed constructor shorthand for PSC-1 terms. When a declaration or application argument already provides a known expected inductive type, unqualified constructor terms and constructor calls can elaborate to the generated checked constructor name.

Supported examples:

```proofscript
inductive Color: Type where { | red | green | blue }
inductive MaybeNat: Type where { | none | some (value: Nat) }

def redShort: Color := { red }
def greenShort: Color := { green }
def someShort: MaybeNat := { some(11) }
```

This is frontend sugar only:

```text
red      => Color.red
some(11) => MaybeNat.some(11)
```

The generated constructor application is checked by the kernel before JavaScript emission.

## Implementation

- Added `tryElabExpectedTypeConstructorShorthand(...)` in `packages/elaborator/src/index.ts`.
- Integrated the helper into `elab(name)` and `elab(app)` after ordinary local/global resolution fails.
- Normal local/global names keep priority, so shorthand cannot silently override an existing binding.
- Added runtime manifest evidence for the supported PSC-1 frontend feature.
- Added focused TDD coverage in `tools/constructor-shorthand-tests.ts` and `npm run test:constructor-shorthand`.
- Updated standalone smoke, reference-language governance, example program, proof-obligation catalog, and this release report.

## TDD evidence

RED: `red` in `def redShort: Color := { red }` previously rejected as `unknown identifier: red`.

GREEN: `CONSTRUCTOR_SHORTHAND=PASS`; `red`, `green`, and `some(7)` shorthand elaborate, emit JS, and execute through checked constructors and checked user-inductive match runtime.

## Fail-closed evidence

The focused test and governance smoke reject:

- constructor shorthand without a useful expected type,
- wrong expected type,
- wrong constructor arity,
- attempts to let shorthand override an existing local/global name.

## Boundary

This is not full Lean constructor elaboration. It is limited to unqualified constructor terms and fully-applied constructor calls for parameterless/indexless source inductives/structures with an expected type. Parameterized inductives, indexed inductives, partial constructor inference, ambiguous open-namespace behavior, typeclass/macro-driven elaboration, and unchecked JavaScript enum/union literals remain unsupported/fail-closed.
