# Production P5.3 — Feature Proof-Obligation Linkage Report

P5.3 connects the production feature promotion gate to the formal proof-obligation ledger.

## Goal

Make every supported PSC-1 feature explain which proof obligations it depends on before the project can claim stronger formal assurance.

## Main changes

- Added `proofObligationIds` to every supported feature in `config/feature-promotion-gate.json`.
- Added `requiredProofObligations` rules to the feature promotion manifest.
- Extended `tools/check-feature-promotion.ts` so supported production features must link to valid ledger obligations.
- Added `tools/feature-proof-obligation-linkage-tests.ts`.
- Added `feature-proof-obligation-linkage-enforced` to `config/verification-matrix.json`.
- Updated `tools/production-status.ts` to report proof-linked supported features.
- Updated production docs for readiness, feature promotion, verification matrix, and proof obligations.

## Current linkage

All 9 supported feature families are linked to proof obligations.

Executable features must link to:

```text
backend-semantic-preservation
runtime-observable-semantics
```

Checked-bootstrap features must link to:

```text
stdlib-bootstrap-soundness
core-type-soundness
```

Existing-kernel-rules features must link to:

```text
kernel-lean4-equivalence
core-type-soundness
```

All supported production features must link to:

```text
feature-proof-obligation-coverage
elaborator-elaboration-soundness
artifact-replay-soundness
```

## Verification

Fresh commands run for P5.3:

```text
node tools/feature-proof-obligation-linkage-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                             PASS
npm run test:feature-proof-obligation-linkage                               PASS
npm run test:feature-promotion                                              PASS
npm run test:proof-obligations                                              PASS
npm run test:verification-matrix                                            PASS
npm run test:production-readiness                                           PASS
npm run test:architecture                                                   PASS
npm run test:pslive:language-fast                                           PASS
npm run test:reference-governance:json                                      PASS, 94 checks
npm run test:standalone-small                                               PASS
npm run test:kernel:smoke                                                   PASS
node tools/pskernel.ts status --json                                       PASS, trusted-boundary / not-proven
```

## Non-claims

P5.3 does not prove any formal Lean 4 equivalence obligation. It improves traceability from feature support to proof work.

The project remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
