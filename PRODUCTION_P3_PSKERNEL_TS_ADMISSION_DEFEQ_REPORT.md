# Production P3 — pskernel TypeScript Admission/DefEq Hardening Report

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Scope

This pass continues the Phase 2/Phase 3 bridge after the Phase 1 mirror and Phase 2 core hardening work.

Focus:

- Keep the pskernel folder/file mirror active under `packages/kernel/src/PSKernel/**`.
- Harden inductive declaration admission without claiming full Lean inductive completeness.
- Harden definitional equality for constants with normalized universe arguments.
- Preserve fail-closed behavior for unsupported or ill-formed trusted Core inputs.

## Changes

### TypeChecker / definitional equality

Modified:

- `packages/kernel/src/PSKernel/TypeChecker.ts`

Added:

- Constant-vs-constant definitional equality now compares universe argument lists with `levelDefEqList` instead of raw structural equality.

This closes a practical gap where `C.{max u 0}` and `C.{u}` were not considered definitionally equal even though the level normalizer already collapses `max u 0`.

### Inductive admission

Modified:

- `packages/kernel/src/PSKernel/Environment.ts`

Added:

- Constructor codomain validation:
  - a constructor telescope must end in the inductive family, or a member of the mutual-inductive family set.
  - a constructor ending in an unrelated constant is rejected.
- Constructor dependency validation:
  - constants appearing in constructor types must either be already known in the environment or be one of the inductive-family names currently being admitted.
  - unknown constructor domain dependencies are rejected instead of silently entering the trusted environment.

This is still not full Lean inductive checking. It is a stricter trusted-boundary subset.

### Generated recursor constants

Modified:

- `packages/kernel/src/PSKernel/Declaration.ts`

Added:

- Generated recursor entries now get corresponding `recInfo` constant records.
- `infer(env, [], Const("Family.rec"))` no longer fails with “unknown constant” after a supported inductive declaration is admitted.

The generated recursor type is still a trusted-boundary stub equal to the family type placeholder. Full recursor type generation remains a Phase 5 obligation.

### Smoke tests

Modified:

- `tools/pskernel-kernel-smoke.ts`

Added RED/GREEN coverage for:

- bad constructor codomain target rejection,
- unknown constructor domain dependency rejection,
- generated recursor constant registration,
- normalized universe argument equality for constants.

## Commands run

```bash
npm run test:kernel:smoke
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Result

```txt
npm run build -- --pretty false: PASS
npm run test:kernel:smoke: PASS
```

## Supported after this pass

- pskernel-shaped active kernel package remains buildable.
- Core ADTs remain active.
- Declaration type checking remains stricter than the initial mirror.
- Basic inductive admission is safer:
  - family type must infer to Sort/Type,
  - constructor type must be closed,
  - constructor codomain must target the family,
  - constructor dependencies must be known or in the current inductive block,
  - generated constructors and recursors are registered.
- Constant definitional equality handles normalized universe argument lists.

## Explicitly unsupported / fail-closed

- Full Lean inductive positivity.
- Full mutual/nested inductive correctness.
- Full recursor type generation.
- Full iota reduction.
- Full primitive validation.
- Full quotient reduction equivalence.
- Full Lean parser/elaborator/tactic/meta system.
- Full formal equivalence with Lean 4.

## Progress

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~82% complete
Phase 3: ~25% started
Phase 4: ~10% started through safer declaration admission
Overall: ~28%
```

## Next best step

Continue Phase 3 by improving the TypeChecker around:

- binder-info-aware Pi/lambda comparison,
- let/zeta and beta smoke fixtures,
- simple delta transparency profile,
- resource/fuel option propagation through `TypeChecker` instance methods,
- richer check summary diagnostics.

Do not proceed to claiming formal K3 or Lean equivalence. Keep this as trusted-boundary K3-TB-style standalone work until the proof-obligation system catches up.
