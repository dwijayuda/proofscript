# Production P6.17 K3-TB Default Consistency Gate

Status: **local production gates passing; publish gate still requires exact Lean 4.33.1**.

Boundary label: **trusted-boundary K3-TB**. This is **not fully formal K3**; v72 owns fully formal K3.

## What changed

P6.17 adds a machine-checked default-kernel consistency guard after the v71 K3-TB default-kernel switch. It verifies that current package/version/status/provenance metadata all point to `KERNEL-level-instantiation-conformance1` / Core v71 / K3-TB, and that the current unified bridge source no longer describes active lowering paths as Core v68.

## Why

After replacing the old practical/default kernel, stale wording is dangerous: it can make reviewers think current artifacts still lower to the old Core v68 profile or that K3-TB is fully formal K3. This gate keeps old work as historical rollback evidence only and prevents package/provenance drift before publish review.

## Added command

```bash
npm run test:v71:k3tb-default-consistency
```

This command is now part of:

```bash
npm run verify:production:no-build
```

## Preserved limits

- No new trusted kernel semantics.
- No publish-gate bypass.
- No claim of fully formal K3.
- Historical Core v68 evidence may remain in rollback docs/artifacts, but current/default bridge and status metadata must identify Core v71 K3-TB.


Reviewer command: `PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:publish`.
