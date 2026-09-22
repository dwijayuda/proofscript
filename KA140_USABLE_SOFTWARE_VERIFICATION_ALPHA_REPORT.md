# KA-140 Usable Software Verification Alpha

Checkpoint: `proofscript-v1-ka140-usable-software-verification-alpha0`

Version: `1.0.0-pskernel.143`

Base: `proofscript-v1-ka139-proof-obligation-workflow0`

## Purpose

KA-140 turns the npm-installable `proofscript` toolchain into a first usable software-verification alpha. It adds real software examples and a user-facing `psc software-alpha` workflow that binds source files, Core artifacts, Lean exports, TypeScript runtime output, proof obligations, proof-status artifacts, and structural certificates into one manifest.

## New CLI

```bash
npx psc software-alpha --out-dir software-alpha-out --json
```

The command runs over `examples/software/` by default and emits `software-alpha.manifest.json`.

## Included examples

- `examples/software/01-domain-model.ps` — executable validation/domain model example.
- `examples/software/02-state-machine.ps` — executable state-machine example.
- `examples/software/03-bounded-counter-contract.ps` — contract example with `requires`, `ensures`, `ghost`, `old`, and `assert`.
- `examples/software/04-permission-contract.ps` — simple contract example.

## Workflow coverage

Executable examples:

```text
.ps source -> psc check -> .pscore.json -> .lean -> .ts -> .pscert.json -> psc verify
```

Contract examples:

```text
.ps source -> .contracts.json -> .contracts.lean -> .obligations.json -> .proofstatus.json -> psc verify
```

## Progress

```text
Small programming language:          58%
Theorem prover surface:              28%
Formal verification contracts:       50%
Runtime/certificate correspondence:  35%
TypeScript runtime alpha:            42%
Overall conservative dashboard:      88.0%
```

## Trust boundary

KA-140 does not claim semantic proof discharge, full Lean4 equivalence, fully formal K3, or a proved TypeScript execution-correspondence theorem. Proof obligations are generated and bound to artifacts, but remain unproved until a later Lean/PSKernel proof-discharge phase.

## Verification summary

Fresh verification ran:

```text
npm run build
npm run test:ka140
npm run test:ka139
npm run test:ka138
npm run test:ka137
npm run test:ka136
npm pack --ignore-scripts
fresh npm install from generated tarball
fresh npx psc --version
fresh npx psc language status --json
fresh npx psc software-alpha --out-dir software-alpha-out --json
fresh npx psc verify software-alpha-out/01-domain-model.pscert.json --json
fresh npx psc verify software-alpha-out/03-bounded-counter-contract.proofstatus.json --json
npm publish --dry-run --ignore-scripts --access public
fresh full-codebase extract
fresh full-codebase npm install
fresh full-codebase npm run build
fresh full-codebase npm run test:ka140
zip integrity check
SHA checks
```
