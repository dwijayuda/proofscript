# P5.79 Arena Inductive Importer0 Progress Report

Status: WIP candidate, not frozen.

P5.79 continues the Lean Kernel Arena direction by importing a conservative non-mutual inductive and quotient primitive slice from lean4export NDJSON into the existing ProofScript TypeScript/K3-TB kernel path.

This is Arena agreement evidence only. It is not full Lean 4 equivalence, not the same theory as Lean 4, and not fully formal K3. Formal Lean 4 equivalence proven obligations remain 0.

## Baseline

- Started from the P5.78 Arena tutorial harness worktree, whose real uploaded Arena run measured 140/140 tutorial files with 28 accepted-good, 8 rejected-bad, 104 declined, and 0 wrong results.
- Real uploaded Arena corpus: `/mnt/data/arena-corpus-20260915`.
- Uploaded Arena results revision: `a538455e201c1be48a11963cb83058649a36dc0e`.
- Arena tutorial metadata: lean4export `3.1.0`, Lean `4.29.1`.

## Main implementation changes

- `packages/arena-checker/src/translate.ts`
  - Adds a conservative non-mutual `inductive` importer.
  - Validates single-type inductive blocks, constructor membership, constructor inductive target, constructor `numParams`, constructor rule field counts, recursor counters, recursor kind, and derived recursor type for the supported exact slice.
  - Rejects malformed trusted export data with Arena exit 1.
  - Declines unsupported-but-well-formed features with Arena exit 2.
  - Adds quotient primitive import by translating the first `quot kind=type` record to the existing trusted `CoreDeclaration { kind: "quot" }` initializer.
  - Skips duplicate exported `Quot.sound` because ProofScript's quotient initializer already installs it as a trusted primitive axiom.
- `packages/arena-checker/src/classify.ts`
  - Maps known recursor-defeq/eta gaps to explicit unsupported exit 2 instead of reporting them as semantic rejection of valid Arena tests.
- `tools/arena-inductive-importer-tests.ts`
  - Adds RED/GREEN-focused Arena tests for tutorial inductive and quotient import slices.
- Metadata/status files updated to P5.79 WIP labels.

## TDD evidence

RED before implementation:

```text
node packages/arena-checker/dist/main.js /mnt/data/arena-corpus-20260915/good/tutorial/036_empty.ndjson
exit 2 unsupported: lean4export inductive records are intentionally declined by arena-adapter0
```

GREEN after implementation:

```text
npm run test:arena:inductive-importer
ARENA_INDUCTIVE_IMPORTER0=PASS
```

## Real uploaded Arena tutorial result

```text
Total tutorial files executed: 140 / 140
Expected accept: 93
Expected reject: 47
Accepted good: 81 / 93
Rejected bad: 35 / 47
Declined unsupported: 24 / 140
Wrong accepts: 0
Wrong rejects: 0
Checker crashes: 0
Not run: 0
```

Improvement over P5.78 real-corpus baseline:

```text
Accepted good: 28 -> 81 (+53)
Rejected bad: 8 -> 35 (+27)
Declined unsupported: 104 -> 24 (-80)
Wrong accepts: 0 -> 0
Wrong rejects: 0 -> 0
Crashes: 0 -> 0
```

## Verification run in worktree

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:arena:inductive-importer: PASS
npm run test:arena:smoke: PASS
real Arena tutorial runner over uploaded 140 corpus: PASS, 0 wrong results
npm run verify:arena: PASS for smoke + harness + default no-local-corpus run
npm run test:kernel:smoke: PASS
npm run test:p5:baseline: PASS
npm run test:architecture: PASS
npm run test:standalone-small: PASS
```

`npm run test:conformance` was attempted but hit the tool timeout before producing a pass/fail result, so it is not counted as passed in this WIP checkpoint.

Exact Lean differential was not rerun after the P5.79 importer changes before this WIP package. The changes are in Arena translation/classification, not trusted kernel rules, but the release must still rerun differential before any frozen claim.

## Remaining Arena gaps after P5.79

Declined cases are concentrated in:

- RBTree / indexed-recursive recursor exact validator gaps.
- `Exists`, `PSigma`, and `PropStructure` recursor synthesis/import gaps.
- Type singleton recursor/eta reduction.
- `Acc` / recursive K-like recursor edge cases.
- `ProjDataIndex` universe-parameter/recursor-shape validation.
- Quotient cluster is now imported for the tutorial cases, but broader quotient malformed/adversarial import validation still needs a dedicated milestone.
- Unsafe/partial tutorial cases still need an explicit Arena policy milestone.

## Trust boundary

```text
K3-TB trusted-boundary only: YES
Fully formal K3: NO
Full Lean 4 equivalence: NO
ProofScript same theory as full Lean 4: NO
Formal Lean 4 equivalence proven obligations: 0
```
