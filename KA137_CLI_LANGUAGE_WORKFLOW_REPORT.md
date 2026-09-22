# KA-137 CLI Language Workflow Report

Checkpoint: `proofscript-v1-ka137-cli-language-workflow0`  
Version: `1.0.0-pskernel.140`  
Base: `proofscript-v1-ka136-npm-toolchain-rebase0`

## Purpose

KA-137 moves the real npm package closer to the product target: `npm install proofscript` followed by `npx psc` commands for programming, Core emission, Lean export, contract obligations, certification, verification, and TypeScript build.

## Language implementation progress

| Layer | Progress | Status |
|---|---:|---|
| Small programming language | 54% | implemented alpha |
| Theorem prover surface | 24% | partial Core + Lean export |
| Formal verification contracts | 28% | structural requires/ensures obligations |
| Runtime correspondence/certificates | 22% | structural certificate boundary |
| TypeScript runtime alpha | 35% | npm-installed `psc build --target ts` works |
| Overall conservative dashboard | 87.1% | no full Lean4 equivalence claim |

## New / strengthened CLI surface

- `psc emit-core [file.ps] --out <file.pscore.json>`
- `psc emit-lean <file.ps|core.json|contracts.json> --out <file.lean>`
- `psc certify [file.ps] --core <core.json> --out <cert.json>`
- `psc language status --json`
- stronger installed-package `psc check`, `psc build`, `psc contracts`, `psc obligations`, and `psc verify` path without relying on TypeScript source stripping inside `node_modules`.

## Verification evidence

Fresh gates passed:

- `npm run build`
- `npm run test:ka137`
- `npm run test:ka136`
- `npm pack --ignore-scripts`
- `npm publish --dry-run --ignore-scripts --access public`
- fresh consumer `npm install` from generated tarball
- fresh consumer `npx psc --version`
- fresh consumer `npx psc language status --json`
- fresh app `npx psc init`
- fresh app `npx psc check`
- fresh app `npx psc emit-core`
- fresh app `npx psc emit-lean`
- fresh app `npx psc certify`
- fresh app `npx psc verify`
- fresh app `npx psc contracts`
- fresh app `npx psc obligations`
- fresh app `npx psc build --target ts`

## Boundary

KA-137 is npm-installable and command-complete for the current alpha workflow. It still does not claim full Lean 4 equivalence, full tactic coverage, semantic contract proof discharge, monadic verification, `old`/`ghost`/`assert`/`invariant`, or a fully formal K3 proof.
