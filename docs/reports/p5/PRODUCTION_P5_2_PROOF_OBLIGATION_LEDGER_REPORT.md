# Production P5.2 Proof Obligation Ledger Report

## Summary

P5.2 adds a machine-checked proof-obligation ledger to make the formal trust roadmap explicit and enforceable.

This is an architecture/provability cleanup slice, not a language feature. It does not upgrade K3-TB to fully formal K3 and does not prove Lean 4 equivalence.

## Added

```txt
config/proof-obligations-ledger.json
tools/check-proof-obligations.ts
tools/proof-obligation-ledger-tests.ts
docs/PRODUCTION_PROOF_OBLIGATION_LEDGER.md
```

## Integrated

```txt
package.json
package-lock.json
config/verification-matrix.json
tools/production-status.ts
tools/production-status-tests.ts
docs/PRODUCTION_VERIFICATION_MATRIX.md
docs/PRODUCTION_READINESS_STATUS.md
docs/PRODUCTION_ARCHITECTURE_STATUS.md
```

## Proof Obligation Ledger Contents

The ledger tracks 10 obligations:

```txt
kernel-lean4-equivalence
core-type-soundness
elaborator-elaboration-soundness
stdlib-bootstrap-soundness
backend-semantic-preservation
runtime-observable-semantics
artifact-replay-soundness
feature-proof-obligation-coverage
lean-oracle-correspondence-corpus
toolchain-tcb-minimization
```

Eight obligations are required before any strong formal Lean 4 equivalence claim:

```txt
kernel-lean4-equivalence
core-type-soundness
elaborator-elaboration-soundness
stdlib-bootstrap-soundness
backend-semantic-preservation
runtime-observable-semantics
artifact-replay-soundness
feature-proof-obligation-coverage
```

Current state distribution:

```txt
open:                  2
evidence-only:         7
blocked-external-lean: 1
proved:                0
```

## What This Improves

```txt
Production-grade: formal claims now have a checked obligation ledger.
Explainable: the formal roadmap is visible in one config and one doc.
Provable direction: non-proven obligations cannot be silently overclaimed.
Easy features: future features can link proof/kernel/backend/runtime obligations explicitly.
```

## Non-Claims

P5.2 still does not prove:

```txt
fully formal K3
Lean 4 equivalence
type soundness of the full language
elaborator soundness
backend semantic preservation
runtime correctness
self-hosting correctness
```

## Fresh Verification

```txt
node tools/proof-obligation-ledger-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                    PASS
npm run test:proof-obligations                                     PASS
npm run test:architecture:proof-obligations                        PASS
npm run test:verification-matrix                                   PASS
npm run test:production-readiness                                  PASS
npm run test:architecture                                          PASS
npm run production:status:json                                     PASS
```

## Trust Label

```txt
K3-TB trusted-boundary / not-proven
Formal Lean 4 equivalence: 0 proven obligations
```
