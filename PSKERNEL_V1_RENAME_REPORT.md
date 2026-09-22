# ProofScript PSKernel v1 Rename / Arena Check Report

Status: **FROZEN**.

Baseline: `proofscript-software-profile-v0-p5-104-kernel-status-truth0.zip`.

Final checkpoint: `proofscript-v1-pskernel-rename0`.

## What changed

- Renamed the active kernel source layout from the old kernel label to `PSKernel`.
- Renamed paths, filenames, exports, imports, scripts, documentation text, reports, and generated dist references that used the old kernel label.
- Reset public project/package version naming to `1.0.0-pskernel.0`.
- Kept serialized Core artifact compatibility at Core format `71`; this is an artifact schema/profile number, not the public project version.
- Added `tools/pskernel-v1-rename-tests.ts` and `npm run test:pskernel:v1-rename`.
- Fixed the Arena tutorial harness spawn path so it can execute the TypeScript runner under Node 22 with strip-types flags.

## Kernel semantics boundary

Trusted kernel semantic implementation changed: **NO**.

Kernel codec changed: **NO**.

Verifier/certificates changed semantically: **NO**.

New trusted computation rule: **NO**.

Full Lean 4 equivalence claimed: **NO**.

Same theory as full Lean 4 claimed: **NO**.

Formal Lean 4 equivalence proof obligations: **0**.

## Current codebase analysis

The active kernel entrypoint is now:

```text
packages/kernel/src/PSKernel.ts
packages/kernel/src/PSKernel/
```

The package exports `PSKernel` from `packages/kernel/src/index.ts`.

The older K3-TB implementation remains quarantined as evidence under:

```text
legacy/kernel-k3tb-v71/
```

The status command reports:

```text
implementationProfile=KERNEL-level-instantiation-conformance1
coreFormat=71
certificateFormat=2
resourceSecurityProfile=KERNEL-resource-bounds0
resourceSecurityStatus=accepted
checklist=41/41 implemented;0 partial;0 unsupported;0 blocked;0 needs_validation
auditedK3TBChecklistComplete=true
fullLean4Equivalence=false
sameTheoryAsFullLean4=false
fullyFormalK3=false
standaloneRequiresLean=false
```

## Rename completeness

After the migration:

```text
case-insensitive old-label path hits: 0
case-insensitive old-label text hits: 0
```

The source tree now uses `PSKernel` / `pskernel` / `PSKERNEL` naming.

## Arena check

Executed after the rename:

```text
npm run test:arena:smoke: PASS
npm run test:arena:tutorial-harness: PASS
npm run test:arena:static-nonperf: EXIT 0 but not a real corpus pass here
npm run test:arena:tutorial: EXIT 0 but not a real corpus pass here
npm run verify:arena: BLOCKED/FAILED because /mnt/data/arena-corpus-20260915 is absent
```

Important detail: in this container, the real Arena fixture directory `/mnt/data/arena-corpus-20260915` is absent. Therefore the tutorial/static runners exit successfully while reporting `notRun` counts, which must not be counted as a fresh full Arena pass.

Observed post-rename runner output:

```text
static: total=26, notRun=26, strictAgreement=false, noWrongResults=true
tutorial: total=140, notRun=140, fullArenaTutorial=false
```

Historical bundled reports still record prior real Arena evidence, including 140/140 tutorial and 26/26 static agreement in earlier frozen Arena checkpoints. This release does not newly re-run those corpora.

## Verification passed

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:pskernel:v1-rename: PASS
npm run test:psc:kernel-status: PASS
npm run test:kernel:smoke: PASS
npm run test:standalone-small: PASS
npm run test:psc:crud-template: PASS
npm run test:psc:runtime-import-crud: PASS
npm run test:psc:conformance-bounded: PASS
npm run test:arena:smoke: PASS
npm run test:arena:tutorial-harness: PASS
```

## Verification not claimed

```text
npm run verify:arena: NOT PASSED; missing external Arena fixture corpus
npm run test:architecture: NOT PASSED; existing wrapper spawns TypeScript checker files without strip-types flags under Node 22
fresh full Lean 4 equivalence proof: NOT DONE
fresh exact-Lean source differential: NOT RUN in this checkpoint
```

## Best next step

Do not reopen trusted kernel semantics for naming work. The next useful follow-up is a fixture-management checkpoint:

```text
PSKernel v1.1 — arena-fixture-resolution0
```

Goal: make Arena fixture discovery explicit, fail closed when the corpus is absent for strict checks, and distinguish historical evidence from fresh corpus execution.
