# ProofScript Unified Architecture

Status: **P6.16 production integration candidate**  
Semantic baseline: **Lean 4.33.1**  
Trusted Core: **format 71 / KERNEL-level-instantiation-conformance1 / trusted-boundary K3-TB**

## Canonical architecture

```text
.ps source
  ↓
parser / elaborator / typeclass / plugins        UNTRUSTED
  ↓
frontend semantic IR
  ↓
Core lowering adapter                            UNTRUSTED, fail closed
  ↓
explicit ProofScript Core v71
════════════════ TRUST BOUNDARY ════════════════
  ↓
@proofscript/kernel                              TRUSTED
  ↓
accepted checked Core / .pscore
  ↓
standalone @proofscript/verifier
════════════ checked-program boundary ══════════
  ↓
execution/interoperability lowering              UNTRUSTED
  ├─ TypeScript
  └─ Lean 4.33.1 oracle/export
```

The independent kernel repository architecture is canonical. `frontend-next`
contains the richer v0.91 compiler/frontend work while it is migrated above the
trust boundary. It is not a second trusted semantics implementation.

## Non-negotiable invariant

A verified backend build may be produced only after the exact Core associated
with that source/elaboration has been accepted by the standalone kernel.
Semantic IR is an execution/elaboration representation, **not** the proof trust
boundary.

## UI0 supported Core lowering

UI0 intentionally supports only:

- `Nat`
- ordinary nonrecursive `def`
- explicit/hidden parameter telescopes whose lowered types are already in UI0
- local variables
- calls to earlier UI0 declarations
- Nat literals up to the explicit migration bound
- canonical `Nat.add`
- propositional equality over integrated `Nat` terms
- theorem declarations whose proof is exactly independently lowered `rfl`

Everything else fails closed with `UnifiedBridgeUnsupported`.

## Migration policy

Expand the bridge feature-family by feature-family. For each family require:

1. frontend positive and negative tests;
2. deterministic Semantic-IR → Core lowering;
3. standalone Core v71 acceptance;
4. serialized artifact decode + `psverify` replay;
5. historical kernel boundary tests and K3-TB publish-environment doctor unchanged;
6. exact Lean 4.33.1 evidence where meaningful;
7. runtime correspondence for executable TypeScript;
8. unsupported neighboring behavior fails closed.

Do not add kernel hooks for plugins. Do not make Semantic IR a second TCB.


## K3-TB publish gate policy

The practical/default kernel is v71 trusted-boundary K3-TB, not fully formal K3. `npm run verify:k3tb:publish` must run the strict Lean environment doctor first and requires exact Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` plus a matching `lake`. Missing or mismatched Lean is a blocked environment state, not a reason to weaken the gate.
