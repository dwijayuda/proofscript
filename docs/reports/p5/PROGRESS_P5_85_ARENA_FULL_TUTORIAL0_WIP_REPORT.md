# P5.85 Arena Full Tutorial0 WIP Report

Status: WIP / not frozen.

## Purpose

Continue the Arena-driven kernel-alignment path without adding tutorial-name shortcuts. P5.85 records the first full uploaded Lean Kernel Arena tutorial agreement for the ProofScript TypeScript/K3-TB Arena checker on the uploaded 2026-09-15 corpus.

## External corpus

Source: uploaded `results(1).json` and `lean-arena-tests.tar.gz`.

- Arena revision: `a538455e201c1be48a11963cb83058649a36dc0e`
- lean4export: `3.1.0`
- Lean: `4.29.1`
- Tutorial tests: 140 total, 93 expected accept, 47 expected reject

This remains an external-test agreement claim only. ProofScript's pinned internal differential oracle remains Lean 4.33.1, so Arena 4.29.1 export agreement and Lean 4.33.1 differential agreement are tracked separately.

## Semantic improvements since P5.81

P5.82 through P5.85 improve the Arena importer/kernel path for remaining tutorial clusters:

1. Transparent recursive constructor fields: recursor validation can see recursive fields through reducible definitions instead of treating them as nonrecursive data.
2. Singleton-recursive recursor eta: nullary one-constructor families can use the existing K-like reconstruction rule only when the reconstructed constructor type is definitionally equal to the major type.
3. Known recursor stuck rejection: Eq.rec and Acc.rec bad cases that remain definitionally stuck are semantic rejections, not unsupported import gaps.
4. RBTree recursive IH order: recursive-field induction hypotheses are inserted in the Lean/Arena-compatible order for the supported non-mutual slice.
5. Acc/quotient/unsafe/partial/duplicate declaration clusters are handled conservatively by existing kernel/importer rules.

No broad full Lean 4 equivalence is claimed. No fully formal K3 claim is made. Formal Lean 4 equivalence proven obligations remain 0.

## No shortcut audit

Implementation grep found no direct `tutorial/...` fixture-name branch in `packages/arena-checker/src` or `packages/kernel/src`. Remaining special cases name real Lean kernel/prelude concepts such as `Eq.rec` and `Acc.rec`, not Arena test filenames.

A comment in the universe-level code mentions `RBTree.{u}` only as an explanatory example for the general fact that universe levels are natural-number-valued and nonzero levels are at least 1; the implementation rule is not keyed to the name `RBTree`.

## TDD / regression gates

Focused Arena gates passed:

- `npm run test:arena:transparent-recursive-field`
- `npm run test:arena:type-singleton-eta`
- `npm run test:arena:known-recursor-stuck-reject`
- `npm run test:arena:rbtree-recursive-ih-order`
- `npm run test:arena:inductive-importer`
- `npm run test:arena:prop-index-large-elim`
- `npm run test:arena:dependent-field-recursor`
- `npm run test:arena:prop-projection-conformance`
- `npm run test:arena:unsafe-partial-reject`
- `npm run test:arena:smoke`

The combined `verify:arena` wrapper timed out in this environment, so it is not counted as passed. The component commands above and the real tutorial corpus were rerun directly.

## Current measured Arena result

Measured with bounded ranges over the real uploaded corpus:

- 140 / 140 tutorial files run
- 93 / 93 expected-good tests accepted
- 47 / 47 expected-bad tests rejected
- 0 declined unsupported
- 0 wrong accepts
- 0 wrong rejects
- 0 checker crashes
- 0 not run

Report: `/mnt/data/P5_85_REAL_ARENA_TUTORIAL_REPORT.json`.

## Other verification completed

- `npm run build -- --pretty false`: PASS
- `npm run test:p5:baseline`: PASS
- `npm run test:kernel:smoke`: PASS
- `npm run test:architecture`: PASS
- `npm run test:standalone-small`: PASS
- K3-TB doctor/default/CI/one-command/practical/publish sub-gates: PASS with exact Lean 4.33.1 configured.
- Exact Lean 4.33.1 differential: 25/25 accepted via bounded manifest reruns.

`npm run test:conformance` timed out as a wrapper and is not counted as passed in this WIP report.

## Trust boundary

K3-TB trusted-boundary only. Not fully formal K3. Not full Lean 4 equivalence. ProofScript same theory as full Lean 4: not claimed. Formal Lean 4 equivalence proven obligations remain 0.
