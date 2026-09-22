# PSKernel KA-10 Lean Target Policy Report

Checkpoint: `proofscript-v1-ka10-lean-target-policy0`  
Public version: `1.0.0-pskernel.12`  
Baseline: `proofscript-v1-ka9-lean4lean-compat0`

## Implemented policy change

The strict external Lean4Lean source target was changed from exact:

```text
leanprover/lean4:v4.33.1
```

to policy:

```text
leanprover/lean4:v4.33.x-or-later
```

The uploaded Lean4Lean source declares:

```text
leanprover/lean4:v4.33.0-rc2
```

KA-10 accepts that source toolchain under the new policy. It would have failed the old exact policy: `True`.

## Batteries dependency audit

Lean4Lean requires:

```json
{
  "name": "batteries",
  "git": "https://github.com/leanprover-community/batteries",
  "rev": "v4.33.0-rc2",
  "path": null
}
```

The uploaded batteries archive was found:

```json
{
  "name": "batteries-main.zip",
  "resolved": "/mnt/data/batteries-main.zip",
  "sizeBytes": 484543,
  "mtimeMs": 1789715197521.306,
  "sha256": "af9ba371d1580f6ed5f04c773c9fa4539c68e812d0ab385e6bfe9e401f785f81"
}
```

Its source toolchain is:

```text
leanprover/lean4:v4.35.0-rc2
```

This is accepted by the broad Lean source policy, but it is **not** the exact required `batteries` revision `v4.33.0-rc2`. Therefore KA-10 does not claim the dependency is materialized exactly.

## Strict import status

```text
Actual Lean4Lean source present: True
Source toolchain accepted by policy: True
Exact required batteries bundle materialized: False
Strict actual import passed: False
Blocked reasons: lean4lean_dependency_batteries_required_rev_unavailable, external_dependency_fetch_failed_or_dependency_unavailable
```

The previous `lean4lean_toolchain_mismatch` reason is no longer a KA-10 blocker. The remaining blockers are dependency/materialization related.

## Boundary

```text
Trusted kernel semantic change: NO
Kernel codec change: NO
New trusted computation rule: NO
Core format changed: NO, still 71
Actual Lean4Lean import bound: NO
Full Lean 4 equivalence: NO
Same theory as full Lean 4: NO
Fully formal K3: NO
Formal Lean4 equivalence proven obligations: 0
```

## Verification

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:pskernel:ka1..ka10: PASS
npm run assurance:ka1..ka10: PASS
npm run lean:ka6:check: PASS
npm run lean:ka10:import:soft: PASS
npm run lean:ka10:import: expected fail exit 2 with dependency blockers
npm run verify:arena: PASS
npm run test:kernel:smoke: PASS
npm run test:standalone-small: PASS
npm run test:psc:kernel-status: PASS
npm run test:psc:conformance-bounded: PASS
npm run test:arena:static-nonperf: PASS
```

## Next milestone

KA-11 should materialize the exact required `batteries` dependency (`v4.33.0-rc2`) or provide a separately proven-compatible offline dependency bundle, then make `npm run lean:ka10:import` pass strictly.
