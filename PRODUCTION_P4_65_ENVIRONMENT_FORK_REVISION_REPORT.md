# Production P4.65 — Environment Fork Revision Integrity

## Trust label

ProofScript pskernel-derived TypeScript kernel — **trusted-boundary K3-TB**, **not fully formal K3**, proof status remains **not-proven**.

## Scope

This pass continues from P4.64 and touches the active kernel package only:

```txt
packages/kernel/src/PSKernel/Environment/Basic.ts
tools/pskernel-context-conformance.ts
kernel-status.json
```

No parser, elaborator, runtime, npm publishing, or formal Lean theorem claim was expanded.

## Root-cause finding

`EnvironmentCore.fork()` copied the checked declarations and constant-info maps, but its private mutation/cache revision restarted at `0`.

That was not an immediate logical soundness bug because the equality cache also partitions by environment object identity and query lifetime. It was still maturity debt: a forked environment containing already-checked declarations reported a revision label inconsistent with its copied content. Temporary admission/replay contexts should preserve the source environment revision before diverging on later fork-local mutations.

## Test-first evidence

Added a regression test before the fix:

```txt
environment fork preserves the source cache revision before diverging
```

Observed red failure before implementation:

```txt
Expected values to be strictly equal:
'0' !== '2'
```

## Change

`EnvironmentCore.fork()` now preserves `#mutationRevision` from the source environment:

```txt
fork source revision == original source revision
fork later mutation != original source revision
fork-only declaration does not mutate original environment
```

This keeps copied-environment evidence honest while preserving isolation of mutable maps.

## Fresh verification

After rebuilding the TypeScript output:

```txt
npm run build -- --pretty false: PASS
npm run test:kernel:typechecker: PASS, 43/43
```

## Boundary

P4.65 does **not** upgrade ProofScript to full formal K3 and does **not** prove complete Lean 4 kernel equivalence. It is a small kernel-integrity hardening step inside the existing v71 K3-TB trusted-boundary release line.
