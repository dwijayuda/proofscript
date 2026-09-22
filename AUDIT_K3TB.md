# ProofScript v71 K3-TB Independent Audit Pack

This audit pack is for reviewers who want to check the v71 K3-TB release
candidate without relying on a chat transcript. It organizes the executable
verification evidence, the trusted-boundary assumptions, and the remaining
full-formal K3 obligations in one place.

## Audit verdict

- **Release label:** K3-TB, meaning trusted-boundary K3 candidate.
- **Engineering progress:** 99.5% on the v71 K3-TB engineering track.
- **Pinned Lean reference:** Lean 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- **Status:** independent-audit package for a trusted-boundary release candidate.
- **Non-claim:** this is not fully formal K3 and not complete Lean kernel equivalence.

## Minimal independent audit procedure

```bash
npm install --offline --ignore-scripts
PROOFSCRIPT_LEAN_BIN=/path/to/lean-4.33.1/bin/lean npm run verify:k3tb:audit
```

The command checks the existing one-command K3-TB verifier and then runs the
independent-audit-pack gate. The audit gate verifies the Lean formal target,
checkpoint ledger, release docs, evidence index, trust-boundary matrix, and
overclaim guard.

## What the reviewer should confirm

1. `verify:k3tb:audit` exits with status 0.
2. `K3TB_AUDIT_PACK_STATUS=PASS` appears in the output.
3. `K3TB_AUDIT_PACK_PROGRESS_OVERALL=99.5%` appears in the output.
4. `K3TB_AUDIT_PACK_BOUNDARY=INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3` appears in the output.
5. `K3TB_AUDIT_PACK_INHERITED_CHECKPOINTS=21 FAILURES=0` appears in the output.

## Remaining full-formal K3 work

The remaining obligations are unchanged from the K3-TB verification bundle:
verified TypeScript compiler or Lean extraction path, full ECMAScript/Node
runtime semantics, arbitrary Lean acceptance completeness iff ProofScript
acceptance, exhaustive Lean reduction-path completeness, and unconditional final
K3 theorem instantiation.
