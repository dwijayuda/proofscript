# PSKernel KA-8 Lean4Lean Source Intake Report

Checkpoint: `proofscript-v1-ka8-lean4lean-source-intake0`  
Public version: `1.0.0-pskernel.10`  
Baseline: `proofscript-v1-ka7-real-lean4lean-import0`

## Purpose

KA-8 adds an automatic source-intake layer for a future uploaded or mounted Lean4Lean archive. It searches known `/mnt/data`, `vendor`, and `external` archive locations, extracts a matching ZIP/TAR archive into `/mnt/data/lean4lean-intake`, exposes stable candidate source paths to the KA-7 real import gate, and then delegates to the strict KA-7 Lean4Lean import check.

## Boundary

- Trusted kernel semantic change: **NO**
- Kernel codec change: **NO**
- New trusted computation rule: **NO**
- Core artifact format changed: **NO**, still `71`
- Formal Lean 4 equivalence proven obligations: `0`

## Current local result

No actual Lean4Lean source tree/archive is mounted in this environment at checkpoint creation time. Therefore KA-8 reports `lean4lean_source_missing` and the strict import gate remains blocked until a compatible source archive is supplied.

## Why this matters

KA-7 created the strict import gate but required a pre-extracted source tree. KA-8 makes the workflow operational for future uploads: place a compatible `lean4lean*.zip` or `lean4lean*.tar.gz` in `/mnt/data`, run `npm run lean:ka8:intake`, and the gate will extract, discover, and attempt the real KA-7 import check.

## Next step

Upload or mount a Lean4Lean source archive compatible with Lean `4.33.1`, then run:

```bash
npm run lean:ka8:intake
```

Only after that strict command passes can we say the actual Lean4Lean source import is bound.
