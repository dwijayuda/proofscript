# ProofScript Product v1 Completion Branch

Branch: `product/v1-completion`

Base commit: `a7d223c421653e2a74753fbfe108c605d393465c`

## Mission

Finish the already-chosen ProofScript product vision:

> a small, Go-like general-purpose language for the JavaScript ecosystem with Lean-compatible dependent types, theorem proving, and formal verification.

This is not a rewrite and not a kernel-parity branch. It reuses the npm-workspaces architecture, canonical compiler/Core/PSKernel path, verification packages, TypeScript/JavaScript backend work, and compiler-backed LSP.

The machine-readable authority is:

```text
config/proofscript-product-v1-completion.json
```

## Fixed completion order

1. **P1 — small general-purpose software profile**
2. **P2 — verification completion:** frames → loops → exceptional/control-flow paths
3. **P3 — exact JS runtime semantics + execution correspondence**
4. **P4 — safe JS/npm interop**
5. **P5 — modules/packages + practical stdlib**
6. **P6 — theorem-prover/LSP/DX completion**
7. **P7 — representative applications + release gate**

P6 may advance in parallel only when it consumes already-stable compiler semantics. Tooling must never create a second parser/type system.

## No-drift rules

Do not start any of these merely because they are interesting:

- full Lean 4 feature parity/equivalence;
- extra non-JS backends;
- arbitrary macro/metaprogramming parity;
- full Lean tactic-engine parity;
- unrelated historical KA assurance expansion;
- syntax additions without a completion-pillar requirement.

A task belongs on this branch only if it closes an explicit pillar gate or fixes a regression blocking those gates.

## Canonical architecture

```text
source
  → @proofscript/compiler
  → canonical frontend
  → checked Core
  → PSKernel
       ├─→ versioned execution/runtime IR → TypeScript/JavaScript
       ├─→ Lean assurance/export
       └─→ compiler-backed language-service → worker → LSP
```

`frontend-next` is donor-only. Useful features must be ported with a specification ID, canonical compiler tests, and replacement gates before they become product-authoritative.

## Baseline

The branch base has been executed locally on Windows across Lean 4.33.1, 4.34.0, and 4.35.0-rc2. Debit + transfer are 6/6 proved, state-model adequacy is checked in every child run, provenance is consistent, and all eight consolidated stateful end-test steps pass.

That evidence does **not** establish source→Lean program equivalence, exceptional-path coverage, general TS/JS runtime correspondence, or full Lean equivalence.

## Definition of finished

"Finished" does not mean every Lean or TypeScript feature exists.

It means every required pillar in the completion manifest is complete, its executable exit gates are green, representative applications use only documented product paths, and every remaining trust assumption is explicit.
