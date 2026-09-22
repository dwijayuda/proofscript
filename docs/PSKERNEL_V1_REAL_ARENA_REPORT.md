# PSKernel v1 Real Arena Check Report

Checkpoint: `proofscript-v1-pskernel-real-arena0`  
Public version: `1.0.0-pskernel.2`  
Baseline: `proofscript-v1-pskernel-advancement-audit0`  

## Source/corpus

- Arena corpus: `/mnt/data/lean-arena-tests.tar(4).gz`
- Extracted corpus: `/mnt/data/arena-corpus-20260915`
- NDJSON fixture count: `190`
- Arena results metadata: timestamp `2026-09-15 15:36:44 UTC`, commit `a538455e201c1be48a11963cb83058649a36dc0e`, GitHub run `34974976650`

## Current kernel line

- Active kernel name: `PSKernel`
- Current/default profile: `KERNEL-level-instantiation-conformance1`
- Core artifact format: `71`
- Certificate format: `2`
- Resource-security checkpoint: `KERNEL-resource-bounds0` / accepted
- Checklist metadata: `41/41 implemented; 0 partial; 0 unsupported`

No trusted kernel semantics were changed in this checkpoint. The change is an Arena execution/verification hardening update: the tutorial runner now uses the mounted real corpus by default when present, and stale `/mnt/data/arena-corpus-current` fallbacks were removed.

## Real Arena result

`npm run verify:arena`: **PASS** with real corpus mounted.

### Tutorial corpus

```json
{
  "total": 140,
  "expectedAccept": 93,
  "expectedReject": 47,
  "acceptedGood": 93,
  "rejectedBad": 47,
  "declinedUnsupported": 0,
  "wrongAccepts": 0,
  "wrongRejects": 0,
  "checkerCrashes": 0,
  "notRun": 0
}
```

`fullArenaTutorial`: `true`

### Static non-performance corpus

```json
{
  "total": 26,
  "expectedAccept": 4,
  "expectedReject": 22,
  "acceptedGood": 4,
  "rejectedBad": 22,
  "declinedUnsupported": 0,
  "wrongAccepts": 0,
  "wrongRejects": 0,
  "checkerCrashes": 0,
  "notRun": 0
}
```

`fullStaticAgreement`: `true`

## Verification

- `npm install --offline --no-audit --no-fund`: PASS
- `npm run build -- --pretty false`: PASS
- `npm run verify:arena`: PASS
- `npm run test:pskernel:v1-rename`: PASS
- `npm run test:pskernel:advancement-audit`: PASS
- `npm run test:psc:kernel-status`: PASS
- `npm run test:kernel:smoke`: PASS
- `npm run test:standalone-small`: PASS
- `npm run test:psc:crud-template`: PASS
- `npm run test:psc:runtime-import-crud`: PASS
- `npm run test:psc:conformance-bounded`: PASS

## Claim boundary

- Fresh real Arena pass: YES
- Trusted kernel semantic change: NO
- Kernel codec change: NO
- New trusted computation rule: NO
- Full Lean 4 equivalence: NO
- Same theory as full Lean 4: NO
- Fully formal K3: NO
- Formal Lean 4 equivalence proven obligations: 0

## Next recommended advancement

Do not keep changing the trusted kernel unless a trusted-semantic defect is discovered. The next valuable phase is `KA-1`: a machine-readable Lean 4.33.1 kernel inventory and a formal PSKernel-to-Lean-reference translation/soundness skeleton.
