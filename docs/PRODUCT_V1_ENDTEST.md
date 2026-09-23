# Product-v1 end-test

Branch: `product/v1-completion`

This is the closure gate for the bounded Product-v1 plan. It is intentionally
larger than ordinary Product CI because it combines normal JavaScript/TypeScript
product checks, packed-release installation, representative applications, and
real Lean proof-required verification.

## Full Windows/Linux/macOS gate

From a clean checkout of the branch:

```bash
npm ci --ignore-scripts
npm run assurance:product-v1:endtest -- \
  --toolchains 4.33.1,4.34.0,4.35.0-rc2 \
  --out .proofscript-product-v1-endtest/summary.json
```

PowerShell:

```powershell
npm ci --ignore-scripts
npm run assurance:product-v1:endtest -- `
  --toolchains 4.33.1,4.34.0,4.35.0-rc2 `
  --out .proofscript-product-v1-endtest/summary.json
```

The runner streams a start/pass/fail line for each major gate and stops executing
later gates after the first failure. The summary keeps failed/skipped stages
explicit.

## Non-Lean product-only diagnostic run

When debugging ordinary compiler/runtime/editor/release failures:

```bash
npm run assurance:product-v1:endtest -- \
  --skip-lean \
  --out .proofscript-product-v1-endtest/non-lean-summary.json
```

Passing this command does **not** close Product v1. It deliberately omits
proof-required Lean evidence.

## Full gate contents

The current full gate includes:

- repository build/setup;
- no-drift completion contract;
- canonical CLI + software profile;
- software-profile consistency/examples/modules;
- exact runtime representation profile;
- runtime certificate + differential corpus + correspondence-level checks;
- JS/npm FFI and npm dependency identity;
- bounded stdlib;
- canonical formatter;
- source packages;
- JSON/validation;
- compiler-backed language-service, worker, and stdio LSP;
- active VS Code donor adaptation;
- representative CLI/npm-library/HTTP applications;
- packed tarball fresh-install + `psc setup --prebuilt`;
- proof-required Product-v1 verification end-test.

The proof-required verification stage currently covers:

- loop-vc0 across each requested Lean lane;
- stateful debit;
- stateful transfer;
- V-FRAME debit-preservation example;
- compound logical predicate example;
- representative invoice settlement;
- per-run state-model adequacy;
- cross-version provenance consistency.

With three Lean versions, the stateful matrix plans **15** concrete proof cases
(5 semantic cases × 3 lanes), plus the separate loop proof matrix.

## Passing claims

A green full result supports the bounded Product-v1 gates recorded in
`config/proofscript-product-v1-completion.json`.

It still does not claim:

- full Lean 4 language/kernel equivalence;
- arbitrary exceptional/branching stateful verification;
- profile-wide proof discharge beyond the executed matrix/corpora;
- formal Core→TypeScript refinement;
- formal TypeScript→JavaScript refinement;
- end-to-end verified JavaScript from a structural certificate alone.

## Failure policy

Do not weaken semantics or remove a gate merely to obtain green output.

On failure, use the first failed stage and its stdout/stderr from
`proofscript.product-v1-endtest/v1` as the next engineering target. Later
stages are intentionally marked skipped so one root cause does not create noisy
secondary failures.
