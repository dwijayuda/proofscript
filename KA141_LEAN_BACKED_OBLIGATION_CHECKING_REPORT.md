# KA-141 — Lean-backed obligation checking

Checkpoint: `proofscript-v1-ka141-lean-backed-obligation-checking0`  
Version: `1.0.0-pskernel.144`  
Base: `proofscript-v1-ka140-usable-software-verification-alpha0`

## Goal

Move the obligation workflow beyond structural listing by letting `psc` run an external Lean-compatible checker against generated Lean theorem checks for obligations that have explicit Lean proof bodies.

## Implemented

- `psc proof-status <obligations.json> --proofs <proofs.json> --lean-cmd <lean> --emit-lean-check <out.lean> --out <proofstatus.json>`
- `psc check-obligations` alias for the same proof-status + Lean-check workflow.
- `proofscript.lean-proofs.v1` input format.
- generated Lean check file binding in `proofscript.proof-status.v1`.
- `psc verify` rejects stale/tampered bound Lean check files.
- language status now reports `lean-backed-obligation-alpha`.

## Trust boundary

This checkpoint does **not** prove all generated obligations automatically. Only obligations with explicit Lean proof bodies and a successful external `--lean-cmd` run are marked `checked`. Missing proofs remain `unproved`. Full Lean 4 equivalence and fully formal K3 remain false.

## Verification

Fresh gates passed:

```text
npm run build
npm run test:ka141
npm run test:ka140
npm run test:ka139
npm run test:ka138
npm run test:ka137
npm run test:ka136
npm pack --ignore-scripts
npm publish --dry-run --ignore-scripts --access public
fresh npm install from generated tarball
fresh npx psc proof-status --proofs --lean-cmd
fresh npx psc verify proof-status
fresh npx psc check-obligations
```
