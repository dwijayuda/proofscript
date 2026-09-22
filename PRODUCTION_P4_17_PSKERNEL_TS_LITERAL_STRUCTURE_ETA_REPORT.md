# Production P4.17 — PSKernel TS Nat Literal + Structure Eta Report

## Scope

This pass deepened the standalone trusted-boundary kernel instead of adding another small metadata-only increment.

Implemented slices:

- trusted Core `lit` term support in the public `Term` ADT;
- Nat literal inference, validation, WHNF constructor normalization, and definitional equality;
- fail-closed String literal behavior until String logical/runtime semantics are ported;
- simple single-constructor structure eta in definitional equality for the same projection-supported structure slice introduced in P4.15;
- exported kernel status update for the newly supported slices.

## Files changed

```txt
packages/kernel/src/PSKernel/Expr.ts
packages/kernel/src/PSKernel/TypeChecker.ts
packages/kernel/src/PSKernel/Environment.ts
packages/kernel/src/PSKernel/Environment/Basic.ts
packages/kernel/src/PSKernel/Declaration.ts
packages/elaborator/src/index.ts
packages/lean-export/src/index.ts
packages/unified-bridge/src/index.ts
packages/kernel/src/Main.ts
tools/pskernel-kernel-smoke.ts
docs/PROOF_OBLIGATIONS.md
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Red-green evidence

### Structure eta

Before implementation, the new smoke assertion failed:

```txt
AssertionError: simple single-constructor structure eta should make x defeq to Box.mk Nat (proj Box 0 x)
false !== true
```

After implementation, the smoke suite passes.

### Nat literals

Nat literals are now part of trusted Core shape validation and participate in the ordinary typechecker path:

```txt
infer(2) = Nat
whnf(2) = Nat.succ (Nat.succ Nat.zero)
defEq(2, Nat.succ (Nat.succ Nat.zero)) = true
```

String literals remain unsupported and return the normal trusted-boundary unsupported status.

## Trust boundary

Still not claimed:

```txt
full Lean 4 kernel equivalence
full literal semantics for String/UInt/Float
full parser/elaborator/macro/tactic behavior
full structure/projection eta for dependent/indexed/multi-constructor cases
```

The new structure eta rule is deliberately restricted to:

```txt
single constructor family
no indices
constructor app expansion headed by the registered constructor
field args equal to raw projections from the same major premise
family parameters match by defeq
candidate expansion type matches the major premise type
```

All other cases remain ordinary structural/WHNF/proof-irrelevance defeq behavior or fail closed.

## Verification commands

Fresh commands run after implementation:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- status --json
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

## Progress estimate

```txt
Previous overall: ~80%
Current overall: ~84%

Phase 2: ~99% complete
Phase 3: ~96% started
Phase 4: ~94% started
Phase 5: ~72% started
Phase 6: ~58% started
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```
