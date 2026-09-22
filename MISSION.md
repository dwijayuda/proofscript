# Mission

Build ProofScript into an independently usable programming and theorem-proving language whose implemented semantics are compatible with the pinned ProofScript v0.1 / Lean 4.33.1 baseline, without requiring Lean for ordinary use.

The path is incremental and evidence-based:

1. keep the ProofScript Language Reference v0.1 as the semantic authority;
2. grow a small standalone kernel from K0 toward the kernel features required by the reference;
3. keep parser/elaborator/tactics/compiler outside the logical trusted core;
4. expose extensibility through versioned npm plugin capabilities, never kernel-rule mutation;
5. make strict replay operate on inert checked artifacts in an isolated verifier path;
6. retain Lean 4.33.1 as an optional pinned oracle/differential reference during development and high-assurance verification;
7. publish implementation coverage feature-by-feature; unsupported reference features remain `unsupported`, never reinterpreted;
8. prove execution correspondence separately for each real backend.

The target is not “rewrite Lean quickly.” The target is to implement exactly the Lean-compatible semantics ProofScript needs, small by small, while preserving a production architecture that can scale toward the full reference.
