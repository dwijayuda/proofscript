# P5.74 Kernel Classical.choice Active Report

## Scope

P5.74 extends the optional primitive prelude with Lean 4.33.1-style `Nonempty` and `Classical.choice` when classical support is requested.

- `Nonempty.{u} : Sort u → Prop`
- `Nonempty.intro.{u} : ∀ {α : Sort u}, α → Nonempty α`
- generated `Nonempty.rec`, restricted to Prop motives by the existing Prop-elimination rules because the constructor carries a data field
- trusted primitive axiom `Classical.choice.{u} : {α : Sort u} → Nonempty α → α`

`Classical.choice` is intentionally an explicit trusted axiom slice, not a checked theorem and not a computational reduction rule. This aligns the active kernel/prelude more closely with Lean's initialized classical environment while preserving K3-TB trusted-boundary labeling.

## TDD evidence

RED on P5.73:

```text
SyntaxError: Named export 'classicalChoiceAxiom' not found
```

GREEN on P5.74:

```text
npm run test:kernel:classical-choice-active0
KERNEL_CLASSICAL_CHOICE_ACTIVE0=PASS exact-lean=PASS
```

## Exact Lean 4.33.1 evidence

The focused oracle uses exact Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` and checks `#print Nonempty`, `#print Classical.choice`, `@Nonempty`, `@Nonempty.intro`, `@Nonempty.rec`, `@Classical.choice`, plus a `noncomputable def picked {α : Sort u} (h : Nonempty α) : α := Classical.choice h` use-site.

## Verification commands

- `npm run build -- --pretty false`
- `npm run test:kernel:classical-choice-active0`
- inherited P5.71-P5.73 kernel-prelude tests
- inherited quotient/recursor/HEq/mutual/nonmutual/smoke tests
- `npm run test:differential` or bounded exact-differential reruns if the wrapper times out
- `npm run verify:k3tb:publish` or bounded publish sub-gates if the wrapper times out
- architecture, conformance, standalone-small, source-release integrity, and fresh-extract gates

## Non-claims

- P5.74 is K3-TB trusted-boundary evidence only.
- P5.74 does not prove full Lean 4 equivalence.
- P5.74 does not make K3 fully formal.
- Formal Lean 4 equivalence proven obligations remain 0.
- `Classical.choice` is noncomputable/classical; runtime execution support for arbitrary choice is not claimed.
