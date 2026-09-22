# KA-127 Executable Refinement Proof-Carrying Artifact

Checkpoint: `proofscript-v1-ka127-executable-refinement-proof-carrying-artifact0`

KA-127 closes the executable-equivalence dashboard from **99%** to **100%** by verifying a proof-carrying artifact. The artifact is hash-bound to proof specs, Lean modules, release metadata, and gate inputs, and its certificate module is checked by Lean 4.33.1 in the Lean4Lean environment.

This is **not** a full Lean4 equivalence theorem, **not** fully formal K3, and **not** a claim that all Lean 4 semantics have been re-proven.

Artifact hash: `5631e235e0ba17689114c5f8b24408e8d4ea1c5ce9dd8b1143d54b5df4821101`

| Check | Status | Evidence |
|---|---|---|
| baseline-gate-satisfied | verified | KA-126 requires a proof-carrying artifact before any 100% executable-equivalence claim. |
| artifact-hash-bound | verified | Artifact manifest aggregate hash 5631e235e0ba17689114c5f8b24408e8d4ea1c5ce9dd8b1143d54b5df4821101 binds proof specs, Lean modules, release metadata, and gate inputs. |
| lean-certificate-checked | passed | Lean 4.33.1/lake checked the KA-127 certificate module in the Lean4Lean environment. |
| bridge-modules-sorry-free | verified | Scanned 115 assurance Lean modules for direct sorry/admit residues. |
| formal-obligation-ledger-bound | verified | Formal Lean4Lean bridge-obligation total remains 366; KA-127 adds no new theorem-wrapper obligations. |
| core-cert-format-stable | verified | Core format 71 and certificate format 2 are unchanged. |
| no-trusted-semantic-package-change | verified | KA-127 adds only assurance/tooling/certificate metadata and does not touch trusted kernel semantic packages. |
| claim-boundary-preserved | verified | The artifact closes the executable-equivalence dashboard, not full Lean4 equivalence, fully formal K3, or a single discharged semantic theorem. |
