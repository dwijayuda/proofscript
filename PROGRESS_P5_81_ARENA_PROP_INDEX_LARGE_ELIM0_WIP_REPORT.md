# P5.81 WIP — Arena Prop Index Large Elimination 0

Status: WIP / not frozen.

## Goal

Use real Lean Kernel Arena tutorial cases as the development driver and reduce conservative declines without introducing wrong accepts.

This checkpoint targets the `ProjDataIndex` cluster:

- `tutorial/095_projDataIndexRec` expected accept: the recursor may eliminate into `Sort`.
- `tutorial/096_projIndexData` expected reject: data projection is still forbidden even if the data appears as an index.
- `tutorial/097_projIndexData2` expected reject: a proof projection following forbidden data extraction is also rejected.

## TDD

RED on P5.80 WIP baseline:

```text
npm run test:arena:prop-index-large-elim
AssertionError: ProjDataIndex.rec may eliminate into Sort ... expected exit 0, got 2
message: recursor universe-parameter arity for ProjDataIndex is outside arena-inductive-importer0's exact validator
```

GREEN after implementation:

```text
npm run test:arena:prop-index-large-elim
ARENA_PROP_INDEX_LARGE_ELIM0=PASS
```

## Implementation

Kernel-side recursor synthesis now accepts a conservative `knownPropFamilyArities` table. The active environment constructs this table from already-installed constants whose type telescope ends in `Prop`, and passes it into recursor synthesis.

This lets the recursor generator recognize constructor fields such as `p : True` as proof-valued when deciding whether a Prop inductive permits large elimination into `Sort`.

Safety boundary:

- It does not hard-code arbitrary names as propositions.
- It only uses constants already present in the environment with a Prop-valued type telescope.
- Prop-to-data projection remains rejected.
- Unknown/non-inductive projection targets are treated as semantic rejection, not unsupported decline.

Arena-adapter-side recursor validation now passes the same known Prop-family table while reading sequential lean4export records.

## Measured Arena tutorial result

Uploaded real Arena corpus/results:

- revision: `a538455e201c1be48a11963cb83058649a36dc0e`
- lean4export: `3.1.0`
- Lean: `4.29.1`
- tutorial tests: 140 total, 93 expected accept, 47 expected reject

P5.80 delta baseline:

```text
total: 140
accepted good: 85 / 93
rejected bad: 42 / 47
declined unsupported: 13
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
not run: 0
```

P5.81 WIP full rerun:

```text
total: 140
accepted good: 86 / 93
rejected bad: 44 / 47
declined unsupported: 10
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
not run: 0
```

Delta:

```text
accepted good: +1
rejected bad: +2
declined unsupported: -3
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
```

## Verification completed

```text
npm run build -- --pretty false: PASS
npm run test:arena:smoke: PASS
npm run test:arena:dependent-field-recursor: PASS
npm run test:arena:prop-projection-conformance: PASS
npm run test:arena:prop-index-large-elim: PASS
npm run verify:arena: PASS
real Arena tutorial runner over 140 uploaded tests: PASS, 0 wrong results
npm run test:kernel:smoke: PASS
npm run test:p5:baseline: PASS
npm run test:architecture: PASS
npm run test:standalone-small: PASS
```

Attempted but not counted:

```text
npm run test:conformance: timed out
npm run test:differential: timed out after case 13; not counted as a completed pass
```

## Remaining declined tutorial cases

```text
045_rbTreeDef
055_reduceCtorParam.mk
071_rbTreeRef
075_typeSingletonRecReduction
082_RBTree.id_spec
100_ruleKbad
101_ruleKAcc
118_reduceCtorParamRefl.mk
119_reduceCtorParamRefl2.mk
124_accRecNoEta
```

Likely next target: `P5.82 arena-reduced-constructor-params0` for 055/118/119, or a smaller K/Acc negative-rejection classification pass for 100/101/124.

## Trust boundary

```text
K3-TB trusted-boundary only: YES
Fully formal K3: NO
Full Lean 4 equivalence: NO
ProofScript same theory as full Lean 4: NO
Formal Lean 4 equivalence proven obligations: 0
```
