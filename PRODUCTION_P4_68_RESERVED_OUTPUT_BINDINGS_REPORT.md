# Production P4.68 — Reserved Output Binding Guard for PSC-1 JS/TS Emission

## Summary

P4.68 continues the standalone PSC-1 MVP after P4.67 by hardening the JavaScript/TypeScript backend against host-language binding hazards.

The practical problem fixed here: a ProofScript source declaration can legally use a name that is unsafe as a generated JavaScript/TypeScript binding, for example `default`, `class`, `require`, or `__ps`. Before P4.68, the backend could emit invalid code such as `const default = ...`, `export const class = ...`, or accidentally redeclare the emitted runtime binding `__ps`.

P4.68 now maps reserved, strict-mode restricted, CommonJS-wrapper, and backend-runtime names to safe generated bindings while preserving the original ProofScript export keys in the generated module object.

This is an MVP/compiler maturity improvement. It does not upgrade the kernel proof status and does not claim formal Lean 4 equivalence.

## What changed

- Added a reserved output binding table in `packages/backend-typescript/src/index.ts`.
- Changed generated binding name sanitization so unsafe names are prefixed with `ps_`.
- Kept original ProofScript names in runtime exports, e.g. `module.exports.default` and default TypeScript export object keys remain source-faithful.
- Exposed `jsName` in `pslive build-js/build-ts --json` output so audits can see the source name to generated binding map.
- Added regression coverage in `tools/pslive-reserved-identifier-tests.ts`.
- Added `npm run test:pslive:reserved-identifiers`.

## Regression source used by the new test

```proofscript
def default: Nat := { 1 }
def class: Nat := { 2 }
def __ps: Nat := { 3 }
def require: Nat := { 4 }
def total: Nat := { Nat.add(default, Nat.add(class, Nat.add(__ps, require))) }
```

Expected behavior:

- JS emission succeeds.
- TS emission succeeds.
- Generated JS does not contain unsafe user bindings such as `const default`, `const class`, or `const require`.
- Generated output does not redeclare the runtime `__ps` binding.
- Original ProofScript export keys are preserved.
- Generated TypeScript typechecks under `tsc --strict` and the compiled CommonJS output runs.

## Verification

Fresh commands run for P4.68:

```txt
npm run build -- --pretty false                 PASS
npm run test:pslive:reserved-identifiers        PASS
npm run test:pslive:js-name-collision           PASS
npm run test:pslive:build-ts                    PASS
npm run test:standalone-small                   PASS
npm run test:kernel:typechecker                 PASS, 43/43
npm run test:kernel:smoke                       PASS
npm run test:governance                         PASS, checks=27 warnings=0 failures=0
node tools/pskernel.ts status --json           PASS, trusted-boundary / not-proven
npm run verify:k3tb:publish                     BLOCKED, missing PROOFSCRIPT_LEAN_BIN for Lean 4.33.1
```

## Progress estimate after P4.68

These are engineering estimates, not formal proof metrics.

```txt
Standalone PSC-1 without Lean4:                 ~96.4%
PSC-1 small complete programming language:      ~69.0%
PSC-1 small theorem prover:                     ~61.4%
Full ProofScript compiler:                      ~58.6%
Full Lean-like ProofScript without Lean4:       ~13.4%
Formal Lean 4 equivalence:                      0 proven obligations
```

## Trust boundary

P4.68 remains K3-TB: a trusted-boundary kernel/compiler slice with deterministic replay and audit evidence, but not a fully formal K3 kernel and not a formally proved Lean 4 equivalent implementation.
