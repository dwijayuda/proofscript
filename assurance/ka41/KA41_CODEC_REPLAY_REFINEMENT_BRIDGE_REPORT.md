# KA-41 Codec / Replay Refinement Bridge Report

Checkpoint: `proofscript-v1-ka41-codec-replay-refinement-bridge0`

Public version: `1.0.0-pskernel.44`

Baseline: `proofscript-v1-ka40-primitive-literal-policy-bridge0`

## What changed

KA-41 imports real Lean4Lean Replay and adds wrapper obligations for Replay.Context, Replay.State, and replay result-shape surfaces. It also adds a PSKernel codec stability gate for canonical JSON and Core v71 decode round-trip.

## Machine-checked bridge lemmas

- `PSKernelKA41.translated_replay_context_lookup_preserved`
- `PSKernelKA41.translated_replay_state_env_preserved`
- `PSKernelKA41.translated_replay_state_num_added_preserved`
- `PSKernelKA41.translated_replay_context_flags_preserved`
- `PSKernelKA41.translated_replay_result_count_preserved`
- `PSKernelKA41.translated_replay_result_env_preserved`

## Codec gate

- canonical JSON stable: **true**
- decode artifact round-trip: **true**
- profile/version binding: **true**

## Progress

- Feature-surface bridge progress: **61%**
- Executable-kernel equivalence proof progress: **28%**
- Formal Lean4Lean bridge obligations: **120**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full codec/replay refinement: **no**

## Remaining codec/replay gaps

- full PSKernel JSON codec to Lean4Lean olean/NDJSON replay refinement is not proven
- per-declaration dependency replay order correctness is not proven end-to-end
- constructor/recursor replay equality checks are only imported/wrapped, not connected to PSKernel executable replay
- certificate bundle verification is not yet tied to Lean4Lean Replay.replay
- resource/error conservativity for codec/replay is not proven
- full Lean 4 equivalence and same-theory claims remain false
