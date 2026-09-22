# Production P6.19 — K3-TB One-Command Doctor Guard

## Status

P6.19 makes `npm run verify:k3tb` use the strict K3-TB Lean environment doctor
before any Lean-dependent release work. The practical/default kernel remains
**Core v71 / KERNEL-level-instantiation-conformance1 / trusted-boundary K3-TB**.
This is not fully formal K3; v72 owns fully formal K3.

## Change

Before P6.19, `npm run verify:k3tb` could fail with an opaque raw assertion when
`PROOFSCRIPT_LEAN_BIN` was missing. The publish preflight had already been guarded
by the doctor, but the one-command verifier still needed the same safety boundary.

Now `npm run verify:k3tb` first runs:

```bash
node tools/kernel-v71-k3tb-lean-env-doctor.ts --strict
```

When Lean is missing or mismatched, it reports the exact expected Lean version,
commit, `lake` requirement, and next action, then fails closed.

## Safety Boundary

- The strict failure is not bypassed.
- The command still requires exact Lean 4.33.1 for K3-TB release verification.
- The command still labels this as trusted-boundary K3-TB, not fully formal K3.
- Local production verification now includes `test:v71:k3tb-one-command-doctor-guard`.

## Verification

Required local commands:

```bash
npm run build
npm run test:v71:k3tb-one-command-doctor-guard
npm run verify:production:no-build
npm run doctor:k3tb
npm run verify:k3tb
npm run verify:k3tb:publish
```

In a sandbox without Lean 4.33.1, the last two strict commands are expected to
block with `K3TB_LEAN_ENV_STATUS=BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN` rather than
an opaque raw assertion.
