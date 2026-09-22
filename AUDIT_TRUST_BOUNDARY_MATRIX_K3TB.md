# ProofScript v71 K3-TB Trust-Boundary Matrix

This matrix separates trusted infrastructure from checked release evidence.

| Area | Current v71 K3-TB status | Full-formal K3 status |
| --- | --- | --- |
| Lean baseline | Pinned to Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` | Acceptable as reference baseline, subject to source audit |
| v71 formal stack | 51+ Lean files with the audit target compiling without `sorryAx` | Needs final unconditional K3 theorem instantiation |
| Executable gates | Full six-part Lean gate and inherited checkpoints pass | Needs arbitrary Lean acceptance/reduction completeness |
| TypeScript kernel source | Restricted KernelTS envelope and small-step boundary are checked | Needs line-by-line verified semantics or extraction proof |
| TypeScript compiler | Vendored and offline installed | Still trusted, not verified |
| Node/ECMAScript runtime | Build/runtime vectors are smoke-tested | Still trusted, not fully modeled |
| npm closure | Vendored dependency closure used offline | Still trusted packaging infrastructure |
| Host environment | Linux shell, filesystem, process execution | Still trusted execution environment |

## Safe label

Use **K3-TB trusted-boundary release candidate**. In longer prose, describe it as a trusted-boundary K3 candidate.

## Unsafe labels

Do not call this package fully formal K3, complete Lean kernel equivalence, or
verified Node/TypeScript runtime semantics.
