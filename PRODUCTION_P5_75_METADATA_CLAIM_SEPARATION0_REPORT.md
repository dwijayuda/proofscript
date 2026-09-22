# Production P5.75 Metadata Claim Separation Report

## Release

- Release: `P5.75 metadata-claim-separation0`
- Baseline: `P5.74 kernel-classical-choice-active0`
- Release kind: governance/status hardening
- Kernel rule change: no new logical rule
- Kernel-codec change: no
- Trust claim: K3-TB trusted-boundary only
- Fully formal K3: NO
- Full Lean 4 equivalence: NO
- ProofScript same theory as full Lean 4: NO
- Formal Lean 4 equivalence proven obligations: 0

## Change

P5.75 separates K3-TB audited checklist completion from full Lean 4 kernel completion. Risky metadata such as `fullKernelComplete: true` is replaced by explicit fields:

- `fullKernelComplete: false`
- `auditedK3TBChecklistComplete: true`
- `fullLean4KernelComplete: false`
- `sameTheoryAsLean4: false`
- `fullLean4Equivalence: false`
- `fullyFormalK3: false`
- `formalLean4EquivalenceProvenObligations: 0`

This prevents release tooling, future agents, and downstream readers from confusing trusted-boundary K3-TB evidence with full Lean 4 kernel equivalence.

## TDD

RED on P5.74:

```text
AssertionError: kernel-status must not use fullKernelComplete=true for K3-TB checklist completion
true !== false
```

GREEN after implementation:

```text
KERNEL_METADATA_CLAIM_SEPARATION0=PASS
```

## Verification summary

The P5.75 worktree and final extract were verified with bounded reruns where long wrappers timed out. Timed-out wrappers were not counted as passed; their sub-gates were rerun directly.

Completed evidence:

- build: PASS
- focused metadata claim separation test: PASS
- P5 baseline/default consistency: PASS
- standalone-small: PASS
- architecture/status sub-gates: PASS
- conformance positive/negative corpora: PASS
- exact Lean 4.33.1 differential: 25/25 accepted through bounded reruns

Exact Lean oracle:

```text
Lean 4.33.1
commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6
```

## PSC-1 counts

- Tracked/supported features: 69 / 69
- Verification matrix claims: 84
- Required verification claims: 82
- Formal Lean 4 equivalence proven obligations: 0

## Release conclusion

P5.75 is safe to use as the next rollback checkpoint once final source ZIP integrity, SHA verification, residue scan, and fresh extract sanity checks pass.
