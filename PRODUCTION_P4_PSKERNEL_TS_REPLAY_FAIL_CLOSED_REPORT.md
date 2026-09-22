# Production P4 — pskernel TS replay/admission fail-closed hardening

## Status

Completed as a trusted-boundary hardening pass on the pskernel-derived TypeScript kernel.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Work completed

```txt
1. Removed unsafe generated-recursor placeholder typing.
2. Kept generated recursors registered for environment inventory/replay, but made inference fail closed until real Lean-style recursor typing is implemented.
3. Added runtime CoreArtifact validation before replay.
4. Added runtime CoreDeclaration validation before replay.
5. Added runtime Term and Level shape validation before replay.
6. Rejected invalid artifact format markers.
7. Rejected non-pinned Lean semantic baselines.
8. Rejected malformed term/declaration shapes as ordinary trusted-boundary rejection instead of implementation errors.
9. Extended smoke coverage for the new negative boundaries.
```

## Files changed

```txt
packages/kernel/src/PSKernel/Declaration.ts
packages/kernel/src/PSKernel/Environment/Basic.ts
packages/kernel/src/PSKernel/Replay.ts
tools/pskernel-kernel-smoke.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Why this matters

The previous generated recursor registration used the inductive family type as a placeholder recursor type. That made `Family.rec` inferable even though real Lean recursor typing/reduction is not implemented in this TypeScript slice. This pass changes that behavior to fail closed.

Replay also now validates incoming artifact structure before checking declarations. Malformed JSON artifacts should be rejected at the trusted boundary, not crash through TypeScript property access and appear as implementation errors.

## Supported after this pass

```txt
Generated recursor inventory registration
Fail-closed recursor use until implemented
CoreArtifact format validation
Lean semantic baseline validation: only 4.33.1 accepted
Runtime declaration shape validation
Runtime term/level shape validation
Malformed artifact rejection
```

## Explicitly unsupported / fail-closed

```txt
Real Lean-style recursor type synthesis
Inductive recursor reduction/iota reduction
Quotient reduction
Full primitive validation
Full .olean replay
Full parser/elaborator replay
Full formal equivalence with Lean 4
```

## Minimal tests added

```txt
recursor remains registered but cannot be inferred/used with placeholder type
invalid artifact format rejects
non-pinned Lean baseline rejects
malformed term shape rejects
malformed declaration shape rejects
```

## Commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Results

```txt
build: PASS
smoke: PASS
```

## Progress estimate

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~86% complete
Phase 3: ~32% started
Phase 4: ~18% started
Phase 6: ~12% started through replay validation
Overall: ~31%
```

## Next best step

Continue Phase 3/4 by implementing a safe minimal recursor type metadata strategy or deepen declaration admission checks for primitive/quotient constants, while keeping every unimplemented reduction path fail-closed.
