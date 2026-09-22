# Next implementation tasks

1. Preserve **KERNEL-level-instantiation-conformance1 / Core v71** as the practical/default trusted-boundary K3-TB kernel. Preserve **KERNEL-resource-bounds0 / Core v68** only as historical rollback/legacy evidence.
2. Do not introduce new kernel semantics without a new explicit audited profile/version and historical-isolation tests.
3. Resume Project A work above the trust boundary: close source/frontend implementation coverage against ProofScript Language Reference v0.1.6 while keeping the v68 kernel unchanged unless a genuine missing trusted semantic is discovered.
4. Keep exact Lean 4.33.1 differential validation as an optional development oracle, never a runtime/verifier dependency.
5. Continue non-blocking fuzzing/adversarial maintenance against v68; any discovered soundness/conformance defect reopens the relevant explicit checklist row rather than being hidden as ordinary maintenance.
6. Faster Project A cadence: prefer vertical production slices above the trust boundary. Each slice should add parser/elaborator behavior, unified Core lowering/replay, TypeScript runtime evidence, fail-closed neighboring negative tests, and status docs together.
7. Next safe P6 candidates after P6.5: package-level separate Core library artifacts, literal-only String contains-style predicates if specified, or a deliberately bounded String-to-Nat/Bool constant-folding family. Avoid arbitrary String append or runtime String APIs until the representation is no longer a finite literal-domain inductive.
