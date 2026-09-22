# ProofScript Standalone Kernel Maturity Replacement P4.70

## Slice

P4.70 adds Lean-style whitespace application to the standalone PSC-1 frontend/backend MVP while preserving the trusted-boundary K3-TB claim boundary.

New accepted source examples:

```proofscript
function addTwo(x: Nat): Nat := { Nat.add x 2 }
function inc(x: Nat): Nat := { Nat.succ x }
def seven: Nat := { addTwo 5 }
def nested: Nat := { Nat.add (Nat.succ 2) 4 }
def mixed: Nat := { Nat.add(inc 2, addTwo 3) }
theorem seven_eq: seven = 7 := by { rfl }
```

## Why this was the best next MVP step

PSC-1 already had checked application through `f(x, y)` and executable Nat addition sugar `x + y`, but most Lean-like examples still looked unnatural because ordinary function application needed JavaScript-style parentheses. Supporting `f x` and `Nat.add x 2` makes the small language much more usable for proofs, examples, and documentation without expanding the trusted kernel boundary.

## Implementation

- Added parser support for left-associative whitespace application after ordinary call-postfix parsing.
- Kept existing parenthesized call syntax working.
- Kept application checked by the existing elaborator/kernel path; this is syntax sugar only, not a new trusted primitive.
- Added JS/TS backend regression coverage through `pslive build-js`, `pslive build-ts`, generated `tsc --strict`, and Node execution.
- Added a negative regression proving bad whitespace application, such as `true 1`, rejects before emission.
- Updated the PSC-1 runtime status feature list and implementation profile to P4.70.
- Added bounded process timeout handling to the reference-governance smoke's child-command runner, but the whole smoke remains blocked/hanging in this container and is reported as not freshly verified here.

## TDD evidence

Before the parser change, the new regression source rejected with:

```text
expected '}' at offset 42, found 'x'
```

That confirmed the test targeted missing whitespace application support. After implementation, `npm run test:pslive:lean-application` passes and exercises check, JS emission, TS emission, TypeScript strict compilation, Node runtime execution, and fail-closed rejection.

## Trust boundary

P4.70 remains K3-TB trusted-boundary only:

- not fully formal K3,
- not proven equivalent to Lean 4,
- formal Lean 4 equivalence obligations proven: 0.

The new feature increases practical source-language and compiler usability only.
