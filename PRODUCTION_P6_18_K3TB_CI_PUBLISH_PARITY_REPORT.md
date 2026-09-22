# Production P6.18 — K3-TB CI Publish-Parity Gate

## Status

P6.18 makes CI match the local release contract for the practical/default kernel:
**Core v71 / KERNEL-level-instantiation-conformance1 / trusted-boundary K3-TB**.
This is not fully formal K3; v72 is reserved for fully formal K3.

## Change

The GitHub Actions workflow now has two explicit release paths:

1. `production-local` runs `npm run build` and `npm run verify:production:no-build`.
2. `k3tb-publish-preflight-lean-4-33-1` installs exact pinned Lean 4.33.1,
   exports `PROOFSCRIPT_LEAN_BIN`, runs `npm run doctor:k3tb`, and then runs
   `npm run verify:k3tb:publish`.

The workflow pins the Lean archive SHA-256 and checks the expected Lean commit:
`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

## Safety Boundary

- CI does not run `npm publish`.
- CI does not label K3-TB as fully formal K3.
- Local production verification includes a static CI parity gate so drift is caught without needing Lean installed locally.
- The v71 trusted-boundary K3-TB kernel remains the practical/default kernel.

## Verification

Required local commands:

```bash
npm run build
npm run test:v71:k3tb-ci-publish-parity
npm run verify:production:no-build
npm run doctor:k3tb
npm run verify:k3tb:publish
```

`npm run verify:k3tb:publish` still requires exact Lean 4.33.1 via `PROOFSCRIPT_LEAN_BIN`.
When Lean is missing, the strict doctor must block instead of weakening the publish gate.
