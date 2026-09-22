# Production P4.3 — pskernel TypeScript Positivity and Quotient Guards

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Scope

This pass continued the replacement kernel rewrite by strengthening admission boundaries rather than expanding parser/elaborator/runtime features.

## Changes

- Added family telescope arity validation for inductive and mutual-inductive family types.
- Added family telescope codomain validation: the current trusted slice only admits inductive family telescopes whose final codomain is a direct `Sort`/`Type` expression.
- Added constructor target argument-count validation against `numParams + numIndices`.
- Added conservative constructor-field positivity validation:
  - direct recursive fields such as `T -> T` constructor telescopes remain accepted;
  - negative recursive occurrences such as `(T -> A) -> T` are rejected;
  - nested/container/index-recursive positivity remains fail-closed as unsupported until the pskernel proof obligations are ported.
- Ported the quotient primitive type generator structure into `PSKernel/Quot.ts`.
- Added canonical quotient initialization guard:
  - arbitrary `{ kind: "quot" }` names reject;
  - `Quot` initialization rejects unless canonical `Eq` / `Eq.refl` are already present;
  - quotient primitive installation is staged and only committed after validation succeeds.
- Added `EnvironmentCore.replaceWith` and `EnvironmentCore.addQuotientPrimitive` for staged primitive installation.
- Extended smoke tests for family arity mismatch, parameterized family positive admission, non-sort family codomain rejection, positive recursive fields, negative recursive fields, and quotient marker rejection.

## Fresh verification

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

Result:

```txt
build: PASS
test:kernel:smoke: PASS
```

## Current progress

- Phase 0: complete
- Phase 1: complete
- Phase 2: ~90% complete
- Phase 3: ~42% started
- Phase 4: ~38% started
- Phase 5: ~12% started through quotient primitive shape work
- Phase 6: ~12% started through replay validation
- Overall: ~38%

## Remaining fail-closed / unsupported areas

- Full Lean recursor type synthesis.
- Full iota/recursor reduction.
- Full positivity for nested/container recursive occurrences.
- Full quotient reduction.
- Full Lean parser, elaborator, tactic, macro, and `.olean` replay compatibility.
- Formal equivalence with Lean 4 native kernel.
