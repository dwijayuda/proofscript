# Production P3 Build Report

Checkpoint: PRODUCTION-P3-practical-profile
Status: frozen candidate; immutable replay required before external FROZEN status.

## Source

- Based on frozen Production P2 bytes.
- Core format: 68.
- Kernel profile: KERNEL-resource-bounds0.
- Trusted packages unchanged: kernel, kernel-codec, verifier, certificates.

## Clean reproduction

- node_modules at start: 0
- dist files at start: 0
- tsbuildinfo at start: 0
- generated artifacts at start: 0
- vendored npm tarballs: 3
- offline npm ci: PASS
- build: PASS
- dist files after build: 621

## Gates

- Production P3 focused gates: PASS
  - Option(A): PASS
  - Int mirror/arithmetic: PASS
  - Except(E,A): PASS
  - List(A)/length/map/append: PASS
  - closures/named monomorphic functions: PASS
- Production P2 compatibility: PASS
- Production P1 compatibility: PASS
- WaveA-WaveH compatibility: PASS
- UI0-UI4 compatibility: PASS
- coverage: PASS (69 features; 13 registered Core lowerings)
- architecture: PASS
- conformance K0-K2r: PASS
- recovered frontend regression: 694/694 PASS, 0 expectation changes

## Exact oracle

Pinned Lean: 4.33.1, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6.
Exact Lean checks passed for all P3 focused fixtures.

## Limitations

This milestone does not claim String, Array, IO/effects, fixed-width integers, polymorphic named function values, higher universes, indexed/dependent library datatypes, or full ProofScript/Lean coverage.
