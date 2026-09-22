# KA-14 Real Arena Corpus Report

Checkpoint: `proofscript-v1-ka14-real-arena-corpus0`

Public version: `1.0.0-pskernel.17`

Baseline: `proofscript-v1-ka13-vdecl-wf-bridge0`

## Scope

KA-14 removes KA-13's Arena blocker by materializing the uploaded Lean Kernel Arena corpus and running the real corpus gates. It does not change trusted PSKernel semantics, kernel-codec, Core artifact format, certificate format, or Lean4Lean proof obligations.

## Uploaded Arena source

- Results timestamp: `2026-09-15 15:36:44 UTC`
- Arena git revision: `a538455e201c1be48a11963cb83058649a36dc0e`
- GitHub run ID: `34974976650`
- Corpus NDJSON fixtures extracted: `190`

## Results

- Static non-performance: `4/4` good accepted, `22/22` bad rejected, zero wrong, zero not-run.
- Tutorial: `93/93` good accepted, `47/47` bad rejected, zero wrong, zero not-run.
- `verify:arena`: passed.

## Claim boundary

- Full Lean 4 equivalence: **NO**
- Same theory as full Lean 4: **NO**
- Fully formal K3: **NO**
- Formal Lean4 equivalence proven obligations: **2**

The two counted obligations are inherited from KA-13's conditional `VDecl.WF` bridge lemmas. KA-14 adds Arena execution evidence only.
