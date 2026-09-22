# Phase 0 Findings — pskernel TypeScript Kernel Rewrite

Status: executed and recorded before code rewrite. This repository is not a git checkout, so the work was performed in a copied workspace.

## Current active kernel before rewrite

`packages/kernel/src` previously contained the compact K3-TB kernel files:

```txt
core.ts
index.ts
inductive.ts
kernel.ts
level.ts
quotient.ts
runner.ts
```

Those files are preserved outside the active package at:

```txt
legacy/kernel-k3tb-v71/src
```

## New active kernel after Phase 1 start

`packages/kernel/src` now uses a `pskernel`-mirrored layout. Every uploaded `pskernel` `.lean` file has a corresponding `.ts` file. Core modules have partial implementations; `Theory/` and `Verify/` modules are mirrored as proof-obligation/stub modules rather than fake proofs.

## Source inventory

Total pskernel files mirrored: 112.

Core ported or partially ported first:

```txt
PSKernel/Level.lean
PSKernel/Expr.lean
PSKernel/Declaration.lean
PSKernel/LocalContext.lean
PSKernel/FuelConfig.lean
PSKernel/Environment/Basic.lean
PSKernel/Environment.lean
PSKernel/EquivManager.lean
PSKernel/TypeChecker.lean
PSKernel/Instantiate.lean
PSKernel/ForEachExprV.lean
PSKernel/List.lean
PSKernel/PtrEq.lean
PSKernel/Inductive/Add.lean
PSKernel/Primitive.lean
PSKernel/Quot.lean
PSKernel/Replay.lean
```

## Gap analysis

The old kernel contained broader accumulated K3-TB behavior, but not the pskernel source structure. The new active package prioritizes pskernel structure and fail-closed behavior. Compatibility exports remain only to avoid breaking downstream packages during later rewrite phases.

Unsupported/fail-closed initially:

```txt
full Lean parser
full elaborator
full macro/tactic system
full quotient reduction
full inductive recursor reduction
full primitive reflection
full .olean replay
full formal equivalence with Lean 4
```

## Minimal tests retained

```txt
npm run build
node tools/pskernel-kernel-smoke.ts
```
