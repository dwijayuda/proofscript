# Production P4.2 — pskernel TypeScript Admission Shape/Telescope Report

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone slice, not fully formally equivalent to Lean 4.

## Scope

This pass continued the Phase 4 admission-boundary hardening without expanding into parser, elaborator, tactics, or runtime work.

## Findings before changes

1. Direct `checkCoreDeclarations` calls could still receive malformed JavaScript object shapes even though replay artifacts were validated first.
2. A malformed direct sort term such as `{ tag: "sort" }` escaped runtime shape validation and produced `implementation_error` instead of a trusted rejection.
3. Constructor telescope domains were not checked as types in a temporary inductive pre-environment.
4. Constructor codomains targeting a universe-polymorphic inductive could omit required universe arguments and still pass the earlier head-name-only target check.
5. Direct inductive admission did not validate negative `numParams` / `numIndices`; replay validation did, but direct API validation should fail closed too.

## Changes

### Environment fork for temporary admission contexts

Added `EnvironmentCore.fork()` so the checker can create a temporary environment containing the current checked declarations plus provisional inductive-family axioms.

This is used only for admission checking and does not commit provisional families to the trusted environment.

### Direct declaration shape validation

Added direct shape validation in `checkAndAddDeclaration` before semantic checking.

Now malformed direct declarations reject as `rejected` instead of surfacing as `implementation_error`.

Validated shape families include:

- declaration object shape,
- nonempty names,
- universe parameter arrays,
- level tags and nested level fields,
- term tags and nested term fields,
- binderInfo values,
- constructor records,
- inductive counters,
- definition reducibility markers.

### Constructor telescope validation

Added temporary pre-environment construction for inductive and mutual-inductive admission.

Constructor types are now checked to infer to `Sort` / `Type` after provisional family constants are available. This catches:

- constructor domains that are terms, not types,
- constructor codomains with wrong universe arity,
- malformed constructor telescope types.

### Direct inductive counter validation

Added direct validation that `numParams` and `numIndices` are nonnegative safe integers.

## Tests added

Added smoke coverage for:

- rejecting constructor telescope domains that do not infer to Sort/Type,
- rejecting constructor codomains with wrong universe arity,
- rejecting negative direct inductive counters,
- rejecting malformed direct declaration term shapes,
- rejecting invalid direct binderInfo values.

## Verification

Commands run fresh:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

Observed result:

```txt
build: PASS
test:kernel:smoke: PASS
```

## Remaining unsupported / fail-closed features

- Full Lean recursor type construction.
- Full inductive positivity.
- Full nested/mutual inductive Lean parity.
- Full quotient reduction.
- Full primitive validation.
- Full parser/elaborator/macros/tactics.
- Full formal equivalence with Lean 4 native kernel.

## Progress

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~88% complete
Phase 3: ~36% started
Phase 4: ~28% started
Phase 6: ~12% started through replay validation
Overall: ~34%
```
