# Production P4.31 — Reference-Governed Intro Proof Smoke

## Summary

P4.31 advances the standalone PSC-1 language from closed `rfl`/`exact` proof blocks to a first proof-state refinement slice: `by { intro h; exact h }` for explicit function/forall goals.

The implementation remains governed by the ProofScript v0.2.x reference files in `docs/reference/` and the project constitution in `docs/constitution/`. It does not claim full Lean compatibility or formal equivalence.

## Added Language Capability

```ts
axiom P: Prop;

theorem intro_id_prop: P -> P := by {
  intro h;
  exact h
};
```

The current parser accepts the compact smoke spelling:

```ts
theorem intro_id_prop: P -> P := by { intro h; exact h };
```

## Trust Boundary

- `intro` is frontend elaboration.
- It generates a Core lambda proof.
- The kernel still checks the produced proof term against the declared theorem type.
- Unsupported binders or non-function goals fail closed.

## Negative Smoke

```ts
axiom P: Prop;
axiom Q: Prop;

theorem bad_intro: P -> Q := by { intro h; exact h };
```

Expected result: rejected, because `h : P` is not a proof of `Q`.

## Verification

Run:

```bash
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

Expected result: all pass.

## Status

Standalone PSC-1 remains live without Lean4. P4.31 improves theorem-prover coverage but remains a trusted-boundary smoke subset.
