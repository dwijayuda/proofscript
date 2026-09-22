# ProofScript v71 K3-TB Reviewer Checklist

Use this checklist after unpacking the release archive.

- [ ] Confirm `PROOFSCRIPT_LEAN_BIN` points to Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- [ ] Run `npm install --offline --ignore-scripts`.
- [ ] Run `PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:audit`.
- [ ] Confirm all K3-TB verification phases pass.
- [ ] Confirm the audit pack reports 21 inherited checkpoints and 0 failures.
- [ ] Confirm the trust-boundary docs say this is not fully formal K3.
- [ ] Confirm `AUDIT_EVIDENCE_INDEX_K3TB.json` lists the checkpoint, formal target, docs, and remaining obligations.
- [ ] Confirm `AUDIT_OVERCLAIM_GUARD_K3TB.json` forbids fully formal K3, complete Lean kernel equivalence, and verified Node runtime semantics.

Passing this checklist supports a K3-TB trusted-boundary release-candidate
claim. It does not establish full formal K3.
