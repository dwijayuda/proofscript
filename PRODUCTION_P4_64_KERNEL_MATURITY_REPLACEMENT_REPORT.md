# Production P4.64 — Kernel Maturity Replacement from Uploaded P4.48 Comparison

## Decision

The uploaded `proofscript-standalone-p4-48-kernel-comparison(1).zip` is **more mature in core-kernel checker internals**, but it is **not more mature as a whole ProofScript release**.

Therefore P4.64 does **not** roll the project back wholesale to P4.48. Instead it performs a selective kernel replacement:

- Replace the current core checker internals with the mature uploaded P4.48 implementations where they improve kernel behavior.
- Preserve all newer P4.49–P4.63 frontend/runtime/release evidence.
- Preserve the current fail-closed opaque-transparency boundary, because adopting P4.48 opaque unfolding caused the current kernel smoke to fail and would weaken the current trusted-boundary contract.

## Uploaded artifact audit

Uploaded artifact:

```txt
/mnt/data/proofscript-standalone-p4-48-kernel-comparison(1).zip
```

Verified uploaded P4.48 gates:

```txt
npm run build -- --pretty false: PASS
npm run test:standalone-small: PASS
npm run test:reference-governance: PASS, checks=29
npm run test:kernel:smoke: PASS
npm run test:governance: PASS, checks=27, warnings=0, failures=0
```

P4.63 feature probe against uploaded P4.48:

```txt
uploaded check p63 feature probe: FAIL
uploaded build-js p63 feature probe: FAIL
uploaded run p63 feature probe: FAIL
reason: expected '=>' at offset 153, found 'value'
```

Current P4.63 supports the same probe:

```txt
current check p63 feature probe: PASS
current build-js p63 feature probe: PASS
current run listTwoLength: PASS
current run fromMkDefault: PASS
```

## Why the uploaded kernel was still useful

Recovered mature core-kernel capabilities from P4.48:

```txt
- query-scoped structural equality cache with context and environment revision
- bounded structural equality key construction with fail-closed cache skips
- local let-definition unfolding during inference and normalization
- unit-like equality
- neutral projection congruence
- structural reflexivity before reduction
- function eta equality with de Bruijn binder shifting
- Pi/lambda equality independent of binder annotations
- dependent single-constructor projection typing/reduction with Prop restrictions
- local kernel loader preference for reported local dist over stale installed package
- reference comparison runner and paired TypeScript/Lean-oracle corpus
```

## Files replaced or recovered

Kernel implementation files replaced from uploaded P4.48, then adjusted only to preserve current opaque fail-closed behavior:

```txt
packages/kernel/src/PSKernel/TypeChecker.ts
packages/kernel/src/PSKernel/EquivManager.ts
packages/kernel/src/PSKernel/LocalContext.ts
packages/kernel/src/PSKernel/Environment/Basic.ts
```

Recovered assurance files:

```txt
tools/pskernel-typechecker-conformance.ts
tools/pskernel-context-conformance.ts
tools/pskernel-reference-runner-tests.ts
tools/pskernel-reference-compare.ts
tools/lib/pskernel-reference-corpus.ts
assurance/KERNEL_REFERENCE_LOCK.json
```

Recovered package scripts:

```txt
npm run test:kernel:typechecker
npm run test:kernel:reference
npm run test:kernel:reference:if-available
```

## Intentional deviation from uploaded P4.48

Uploaded P4.48 allowed opaque declarations to unfold in `all` transparency. Current P4.63 smoke requires opaque declarations to remain closed even under `all` transparency for this trusted slice.

P4.64 keeps the current fail-closed behavior:

```txt
opaque default: closed
opaque all: closed
opaque defeq with value under all: false
```

This keeps current trusted-boundary semantics stable.

## Proof obligation

Added:

```txt
ProofScript.Kernel.CoreMaturity.P48ConformanceReplacement
```

Proof status remains:

```txt
not-proven
```

## Verification summary

Fresh verification after selective replacement:

```txt
npm run build -- --pretty false: PASS
npm run test:kernel:typechecker: PASS, 42/42
npm run test:kernel:reference:if-available: PASS/BLOCKED as expected without Lean oracle, TS 11/11
npm run test:user-recursive-inductive-runtime: PASS
npm run test:user-inductive-match-runtime: PASS
npm run test:constructor-partial-shorthand: PASS
npm run test:constructor-shorthand: PASS
npm run test:standalone-small: PASS
npm run test:reference-governance: PASS
npm run test:kernel:smoke: PASS
npm run test:governance: PASS
```

## Boundary

P4.64 is still trusted-boundary evidence only. It does not prove formal Lean 4 kernel equivalence.

Still unsupported/fail-closed:

```txt
- full K3 equivalence
- arbitrary native .olean replay
- full Lean elaboration
- indexed/mutual/nested inductive completeness
- dependent motive runtime execution
- unchecked JavaScript union interop
- opaque unfolding
```
