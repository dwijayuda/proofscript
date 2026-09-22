# Verification status — v0.7.0 candidate

Current claim: **S1 specified**.

Static requirements:
- exact Lean 4.34.0 baseline and commit are recorded;
- 4.35.0-rc2 is explicitly non-normative;
- feature registry/schema parse and agree on v0.7.0 and the exact Lean 4.34 semantic-baseline shape;
- both implementation profiles are registered;
- conformance JSONL remains well formed;
- no stronger proof claim is implied by this rebase.

Stronger claims require Lean-4.34 reference frontend evidence and standalone TypeScript frontend differential/refinement evidence.

- the main reference must state that final Lean 4.34 removed the deprecated native-reduction declarations/hooks;
- Appendix K must be present and name the upstream removal commit.
