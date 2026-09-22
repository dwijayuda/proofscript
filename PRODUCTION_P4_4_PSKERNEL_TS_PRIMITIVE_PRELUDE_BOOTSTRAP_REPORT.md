# Production P4.4 — pskernel TypeScript Primitive Prelude Bootstrap

## Phase

Phase 4.4 / Phase 5 starter slice: primitive prelude bootstrap and canonical quotient initialization.

## Status

Completed as a trusted-boundary standalone kernel improvement. This does **not** prove full Lean 4 kernel equivalence and does **not** implement the full Lean primitive environment.

## Motivation

The previous TypeScript mirror had quotient primitive shape generation, but it did not expose a small standalone primitive prelude that can be admitted through the normal kernel path. To move toward "ProofScript can live without Lean4", the kernel now has deterministic declaration generators for the minimal core primitive families needed by the current trusted slice.

## Files changed

```txt
packages/kernel/src/PSKernel/Primitive.ts
tools/pskernel-kernel-smoke.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Added APIs

```ts
export function generateUnitDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }>;
export function generateBoolDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }>;
export function generateNatDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }>;
export function generateEqDeclaration(levelParamName?: string): Extract<CoreDeclaration, { kind: "inductive" }>;
export function generateCorePrimitiveDeclarations(): CoreDeclaration[];
export function generateCorePrimitiveDeclarationsWithQuot(): CoreDeclaration[];
export function installCorePrimitives(env: Environment, options?: { quotients?: boolean }): string[];
```

## Implemented primitive slice

```txt
Unit      ordinary inductive: Unit.unit
Bool      ordinary inductive: Bool.false / Bool.true
Nat       ordinary inductive: Nat.zero / Nat.succ
Eq        ordinary inductive matching the quotient initializer guard
Quot      explicit marker installs Quot, Quot.mk, Quot.lift, Quot.ind after canonical Eq exists
```

## Trust-boundary behavior

- Primitive declarations are not smuggled directly into the environment.
- `installCorePrimitives` routes every primitive family through `checkAndAddDeclaration`.
- Quotient primitives are installed only through the canonical `quot` marker after canonical `Eq` / `Eq.refl` have already been admitted.
- Recursors for generated inductives remain registered but fail closed on use until real Lean-style recursor typing/reduction is implemented.
- String/UInt/Float/native primitive reflection remains explicitly unsupported.

## Smoke tests added

```txt
primitive prelude generator + quotient marker accepts after canonical Eq
Nat.zero / Nat.succ can be used to admit a basic Nat definition
primitive installer registers Unit, Bool, Nat, Eq in deterministic order
primitive installer optionally installs quotient primitives
```

## Verification commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Verification result

```txt
build: PASS
test:kernel:smoke: PASS
```

## Progress estimate

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~91% complete
Phase 3: ~43% started
Phase 4: ~41% started
Phase 5: ~20% started through primitive prelude + quotient bootstrap
Phase 6: ~12% started through replay validation
Overall: ~40%
```

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```
