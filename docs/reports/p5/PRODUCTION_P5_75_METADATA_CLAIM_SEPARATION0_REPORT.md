# Production P5.75 — Metadata Claim Separation 0

P5.75 is a governance/status hardening release. It does not add a kernel reduction rule, constructor admission rule, parser feature, backend feature, or formal Lean proof. Its purpose is to remove an ambiguous metadata claim that could make K3-TB checklist completion look like full Lean 4 kernel completion.

## Change

`fullKernelComplete is deprecated` as a positive status claim. In `kernel-status.json`, it is now always `false` unless a future release actually proves/earns full Lean 4 kernel completion under an explicit completion gate.

A new explicit field records the narrower status:

```json
{
  "auditedK3TBChecklistComplete": true,
  "fullLean4KernelComplete": false,
  "sameTheoryAsLean4": false,
  "fullLean4Equivalence": false,
  "fullyFormalK3": false,
  "formalLean4EquivalenceProvenObligations": 0
}
```

## What this proves

- The current K3-TB audited checklist is complete for its bounded internal profile.
- The repository has a machine-checked guard preventing accidental positive `fullKernelComplete` wording from reappearing.

## What this does not prove

- It does not prove ProofScript is the same theory as Lean 4.
- It does not prove full Lean 4 equivalence.
- It does not make K3 fully formal.
- It does not add formal Lean 4 equivalence proofs.
- It does not change kernel-codec.

## Verification

Focused gate: `npm run test:kernel:metadata-claim-separation0`.

The trust boundary remains K3-TB trusted-boundary evidence only.

## Final release validation

- TDD RED: P5.74 failed `tools/kernel-metadata-claim-separation0-tests.ts` because `kernel-status.json` still used a positive `fullKernelComplete` value for bounded K3-TB checklist completion.
- TDD GREEN: `npm run test:kernel:metadata-claim-separation0` passed after introducing `auditedK3TBChecklistComplete` and making `fullKernelComplete` false/deprecated.
- Build: `npm run build -- --pretty false` passed.
- Architecture/traceability: passed with 69 supported features, 84 verification claims, 10 proof obligations, and 0 formal Lean 4 equivalence obligations proven.
- Exact Lean differential: 25/25 accepted against Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` via bounded reruns; long wrapper timeout was not counted.
- K3-TB publish boundary: strict doctor, practical-release, and publish-preflight sub-gates passed; long wrapper timeout was not counted.
- Fresh extract: offline `npm ci`, build, focused metadata guard, baseline/default consistency, standalone-small, architecture/status, conformance positive/negative corpora, K3-TB sub-gates, and exact differential passed.

## PSC-1 counts after P5.75

- Tracked/supported features: 69 / 69
- Executable supported features: 65
- Verification matrix claims: 84
- Required verification claims: 82
- Verification commands tracked: 245
- Traceability sources checked: 146 / 146
- Proof obligations: 10
- Required for formal Lean 4 equivalence: 8
- Formal Lean 4 equivalence proven obligations: 0
