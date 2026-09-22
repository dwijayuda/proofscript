# ProofScript PS2 — v0.6.1 Reference Conformance

## Goal

Earn genuine normative v0.6.1 C1 and C2 evidence using an independent reference frontend.

PS2 deliberately does not reuse the production parser for C1/C2.

## Completion criteria

PS2 is complete when:

- an independent v0.6.1 reference frontend exists;
- the reference frontend has zero dependencies on production parser/elaborator/frontend/compiler/kernel packages;
- C1: it accepts all positive and rejects all negative authoritative corpus cases;
- C2: it emits canonical Lean exactly matching every authoritative lowering case;
- feature ownership is surfaced through registered v0.6.1 feature IDs;
- unknown/unregistered syntax fails closed;
- product/PS1 regression gates remain green;
- claims remain limited to implementation conformance; no S2/S3 or Lean-equivalence claim is added.

## Required gates

```bash
npm run build
npm run test:architecture:package-classification
npm run test:reference:v061:c0
npm run test:reference:v061:c1-c2
npm run test:reference:v061:production-surface
npm run test:ps1:compiler-facade
npm run test:ps1:language-service
npm run test:ps1:language-worker
npm run test:ps1:lsp
npm run test:ka137
npm run test:ka140
npm run test:ka146
```

## Explicit non-goals

- C3 production-vs-reference proof;
- C4 machine-checked parser/lowering theorems;
- full Lean parser coverage;
- new ProofScript language features;
- v0.7 contracts semantics;
- full Lean kernel equivalence.

## After PS2

The next narrow milestone is C3: compare production frontend behavior and canonical lowering against this reference frontend on the frozen corpus.
