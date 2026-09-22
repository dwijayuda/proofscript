# Production P6.16 K3-TB Lean Environment Doctor Report

Status: **LOCAL_PRODUCTION_GATES_PASSING; PUBLISH_GATE_BLOCKED_BY_SANDBOX_LEAN_ENV**

Boundary label: **trusted-boundary K3-TB**. This is **not fully formal K3**; v72 owns fully formal K3.

## What changed

- Added `tools/kernel-v71-k3tb-lean-env-doctor.ts`.
- Added `tools/kernel-v71-k3tb-lean-env-doctor-tests.ts`.
- Added `npm run doctor:k3tb`.
- Added `npm run test:v71:k3tb-lean-env-doctor`.
- Updated `npm run verify:k3tb:publish` so it runs the K3-TB Lean environment doctor in strict mode before the release/publish preflight chain.
- Added the doctor regression to `npm run verify:production:no-build`, increasing the production wrapper from 26 to 27 gates.

## Doctor behavior

`doctor:k3tb` is diagnostic and non-fatal by default. It reports whether the publish preflight can run without claiming publication success.

The strict mode used by `verify:k3tb:publish` fails unless all of these are true:

- `PROOFSCRIPT_LEAN_BIN` is set.
- The configured binary exists and runs `--version`.
- Lean version is exactly `4.33.1`.
- Lean commit is exactly `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- A matching `lake` executable is available next to Lean or on `PATH`.

## Verification performed

```bash
npm install --ignore-scripts
npm run build
npm run doctor:k3tb
npm run test:v71:k3tb-lean-env-doctor
npm run verify:production:no-build
npm run verify:k3tb:publish
```

Observed passing checks:

```text
K3TB_LEAN_ENV_DOCTOR_TEST_STATUS=PASS
✓ production verification passed (27 gates)
```

Observed publish blocker in this sandbox:

```text
K3TB_LEAN_ENV_STATUS=BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN
K3TB_LEAN_ENV_EXPECTED_VERSION=4.33.1
K3TB_LEAN_ENV_EXPECTED_COMMIT=819816b2e0a3bf405af45ae5c7af2491d8f5bee6
K3TB_LEAN_ENV_PUBLISH_PREFLIGHT_CAN_RUN=false
```

This is the intended blocked state for a sandbox without exact Lean 4.33.1. The publish gate was not weakened or bypassed.

## Progress accounting

- Current P6 bounded String slice: ~92%.
- v71 trusted-boundary K3-TB default-kernel integration: ~96% locally integrated; publish gate pending exact Lean 4.33.1 execution.
- Production verification pipeline: ~92%.
- Overall production-grade ProofScript MVP: ~57%.


## P6.17 supersession note

P6.17 preserves this doctor and adds a separate default-kernel consistency guard, bringing the local production wrapper to 28 gates. This remains trusted-boundary K3-TB, not fully formal K3.
