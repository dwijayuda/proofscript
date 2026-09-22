# PSKernel KA-9 Lean4Lean Compatibility Audit Report

Checkpoint: `proofscript-v1-ka9-lean4lean-compat0`  
Public version: `1.0.0-pskernel.11`  
Baseline: `proofscript-v1-ka8-lean4lean-source-intake0`

## What KA-9 did

KA-9 consumed the uploaded Lean4Lean archive and moved the status from `lean4lean_source_missing` to a concrete compatibility audit.

Detected archive:

```text
name: lean4lean-master.zip
sha256: 295a1f4b23f39be73a27a7617c3fe1c6787892ff799607213b913419819f7383
sizeBytes: 650114
```

Extracted source root:

```text
/mnt/data/lean4lean-intake/lean4lean
```

Required source files are present: `lean-toolchain`, `lakefile.toml`, `Lean4Lean.lean`, and `Lean4Lean/Environment.lean`.

## Current blocker

The uploaded source targets:

```text
leanprover/lean4:v4.33.0-rc2
```

PSKernel's current assurance baseline targets:

```text
leanprover/lean4:v4.33.1
```

So the strict real Lean4Lean import gate remains blocked by:

```text
lean4lean_toolchain_mismatch, external_dependency_fetch_failed_or_dependency_unavailable
```

The Lake build attempt also found this dependency state:

```text
requires: [{"name": "batteries", "git": "https://github.com/leanprover-community/batteries", "rev": "v4.33.0-rc2"}]
```

Build stderr tail:

```text
info: batteries: cloning https://github.com/leanprover-community/batteries
info: stderr:
Cloning into '/mnt/data/lean4lean-intake/lean4lean/.lake/packages/batteries'...
fatal: unable to access 'https://github.com/leanprover-community/batteries/': Could not resolve host: github.com
error: external command 'git' exited with code 128

```

## Claim boundary

```text
Trusted kernel semantic change: NO
Kernel codec change: NO
New trusted computation rule: NO
Core format changed: NO, still 71
Actual Lean4Lean source present: YES
Actual Lean4Lean import bound: NO
Strict actual import passed: NO
Full Lean 4 equivalence: NO
Same theory as full Lean 4: NO
Fully formal K3: NO
Formal Lean 4 equivalence proven obligations: 0
```

## Verification

Passed in this checkpoint:

```text
npm run build -- --pretty false
npm run test:pskernel:ka1
npm run test:pskernel:ka2
npm run test:pskernel:ka3
npm run test:pskernel:ka4
npm run test:pskernel:ka5
npm run test:pskernel:ka6
npm run test:pskernel:ka7
npm run test:pskernel:ka8
npm run test:pskernel:ka9
npm run assurance:ka1..ka9
npm run lean:ka6:check
npm run lean:ka8:intake:soft
npm run lean:ka9:import:soft
npm run verify:arena
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:psc:kernel-status
npm run test:psc:conformance-bounded
npm run test:arena:static-nonperf
```

Expected strict failure:

```text
npm run lean:ka9:import: exits 2 with lean4lean_toolchain_mismatch, external_dependency_fetch_failed_or_dependency_unavailable
```

## Next best milestone

KA-10 should provide a network-independent dependency bundle and version strategy:

1. Either use a Lean4Lean source matching `leanprover/lean4:v4.33.1`, or explicitly rebase/compat-check this v4.33.0-rc2 source.
2. Vendor/materialize `batteries` at the matching revision.
3. Make `lake build Lean4Lean` pass locally.
4. Then make `npm run lean:ka7:import` and `npm run lean:ka9:import` pass strictly.
