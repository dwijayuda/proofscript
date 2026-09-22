# Kernel v71 KernelTS Semantics-Boundary Certificate 1

Status: **PASS**

Overall v71 K3-track progress: **93%**

This checkpoint audits the trusted TypeScript kernel source envelope and binds it to the existing Lean-checked v71 certificates. It is intentionally not a full line-by-line TypeScript operational semantics and not final K3 whole-kernel equivalence.

## Formal target

- Target: `ProofScriptKernelEquivalence.KernelV71KernelTSSemanticsBoundary`
- Source: `assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71KernelTSSemanticsBoundary.lean`
- Formal stack files: 45
- Reported `sorryAx`: 0

## Trusted KernelTS source envelope

- Trusted files: 5
- Total lines audited: 8454
- Local import closure: PASS
- Dynamic execution excluded: PASS
- Ambient nondeterminism excluded: PASS
- Banned feature checks: 17
- Banned feature hits: 0
- TCB source ledger hash: `59bd57ff628afab1938afedb2faac8556f2bf02d5db97b7c25f37672058d32c1`

## Inherited evidence

- Full Lean 4.33.1 gate: 6 parts PASS
- TypeScript classifier implementation trace: PASS
- TypeScript nested preprocessor refinement-boundary: 80% prior progress
- Positivity completeness-boundary: 85% prior progress
- Stored RecursorRule.rhs reconstruction-boundary: 90% prior progress

## Boundary

This certificate improves the implementation-refinement story by excluding dynamic/runtime-unsafe TypeScript features from the trusted kernel source envelope and hash-binding the audited source files. It does not yet prove arbitrary JavaScript/TypeScript execution semantics, verified compilation, arbitrary Lean acceptance completeness, or final K3 equivalence.
