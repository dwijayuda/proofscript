# Tactic Ergonomics

Status: **PHASE 2 COMPLETE; PHASE 3 IMPLEMENTED, ACCEPTANCE PENDING**

Branch: `feature/tactic-ergonomics`

Base closeout: `b542d07ad524a9a38409f2783abf3c4bebdd0923`

Validated native-tactics source ancestor: `7a98acc8f983b770c6d04c50474c68116b7f483f`

## Goal

Improve proof authoring without introducing a second tactic engine or any trusted
tactic primitive. The canonical path remains:

```text
ProofScript proof syntax
  -> canonical parser
  -> surface proof AST
  -> untrusted elaboration against checked recursor metadata
  -> ordinary Core proof term
  -> PSKernel infer/check
```

## Phase 1: named constructor branches

This phase adds branch-aware forms for the already-bounded non-indexed
`cases` and `induction` tactics:

```proofscript
theorem branch_example(h: ChainP): P := by {
  induction h
  | step tail ih => exact ih
  | base value => exact value
}
```

The older shared-continuation forms remain valid:

```proofscript
by { cases h; assumption }
by { induction h; assumption }
```

### Fail-closed rules

Named branches are resolved from checked recursor rule metadata, not from a
parallel source-only model.

- A label may be a full constructor name or its unambiguous short name.
- Branch order is irrelevant.
- Every constructor must have exactly one branch.
- Unknown, duplicate, and missing constructor branches are rejected.
- The branch binder count must equal the checked recursor minor telescope.
- For `induction`, that telescope includes constructor fields plus generated
  recursive induction hypotheses.
- Duplicate user binder names inside one branch are rejected.
- Each branch body elaborates under that generated local telescope and must
  solve the checked minor goal.
- The completed recursor application is checked against the original goal.

The prior bounded restrictions remain: `cases` still rejects recursive
inductives, and both tactics still reject indexed inductives.

## Phase 1 acceptance

Phase 1 was executed on source ancestor
`c4b355d8c01ae52ecddbd8f00d01cedf838e1c25` with
`npm run assurance:tactic-ergonomics`.

Machine result:

- schema: `proofscript.tactic-ergonomics-endtest/v1`
- total steps: 7
- passed: 7
- failed: 0
- skipped: 0
- `allTacticErgonomicsGatesPassed: true`

## Phase 2: compiler-backed proof states

The language service still delegates semantics to `@proofscript/compiler`;
it does not contain a duplicate parser, elaborator, tactic engine, or checker.

Phase 2 threads observational proof-state metadata through:

```text
canonical parser source spans
  -> ordinary proof elaboration
  -> observational Core goal/local snapshots
  -> frontend display metadata
  -> compiler
  -> language-service
  -> language-worker
  -> LSP proofscript/goals
```

The metadata is deliberately outside the trust path:

- snapshots are emitted while the normal elaborator constructs Core terms;
- the observer is fail-open and cannot reject an otherwise valid proof;
- snapshots are never consulted when constructing or checking proof terms;
- branch states come from the checked recursor minor telescope, so induction
  hypotheses are the same locals used by actual elaboration;
- the frontend renders de Bruijn variables with their source local names for
  editor presentation;
- the language service selects the smallest source span containing the cursor,
  so a nested tactic wins over its enclosing branch/tactic state;
- `proofscript/goals` exposes `tacticStateAvailable: true` plus either the
  current compiler-backed state or `null` when the cursor is outside a proof
  tactic.

This first proof-state slice is for successfully checked documents. Recovering
useful partial tactic states from a proof that currently fails elaboration is a
separate later phase and must not introduce an editor-only elaborator.

## Phase 3: retained proof states after elaboration failure

Phase 3 keeps already-observed compiler proof states available when canonical
parsing succeeds but a later proof elaboration step fails.

The implementation adds a read-only `proofStateSink` to frontend/compiler
options. The ordinary elaborator emits each display-safe state to that sink as
soon as the state is observed. Project compilation tags streamed events with
their canonical module/file identity. The language service retains only events
for the document being analyzed and exposes them through the existing
`proofscript/goals` request even when analysis later becomes `rejected`.

Trust and scope rules:

- the normal compiler still throws/rejects exactly as before;
- sink failures are swallowed and cannot alter compilation or proof acceptance;
- no proof term, goal, or local is fabricated by the language service;
- rejected declarations are not reported as checked declaration goals;
- only states actually reached by canonical elaboration are returned;
- parser failures still produce no partial proof states in this phase;
- no metavariable recovery, speculative continuation, syntax repair, or
  editor-only elaborator is introduced.

A representative covered case is:

```proofscript
theorem partial(P: Prop, h: P): P := by { exact missing }
```

The theorem remains rejected because `missing` is unknown, while the cursor on
`exact` can still show the compiler-observed state `P, h : P ⊢ P` that was
emitted before the identifier failure.

## Acceptance

Run one consolidated command:

```powershell
npm run assurance:tactic-ergonomics
```

For the current Phase 3 source it uses schema
`proofscript.tactic-ergonomics-endtest/v3` and covers nine steps: build,
parser proof regressions, elaborator/kernel-check proof regressions,
compiler-backed language service, the language-worker boundary, LSP transport,
the active VS Code smoke test, `standalone-small`, and reference governance.

The earlier Phase 1 evidence remains the recorded 7/7 v1 result.

### Phase 2 machine acceptance

Phase 2 was executed on committed source
`8315cf3e3e1ef467bbdb3f569ebd063895c3cf0f` with
`npm run assurance:tactic-ergonomics`.

Machine result:

- schema: `proofscript.tactic-ergonomics-endtest/v2`
- total steps: 9
- passed: 9
- failed: 0
- skipped: 0
- `allTacticErgonomicsGatesPassed: true`

The nine passing steps were build, parser proof regressions,
elaborator/kernel-check proof regressions, compiler-backed language service,
language worker, LSP transport, active VS Code smoke, standalone-small, and
reference governance.

The acceptance run also exercises the dependent-local regression
`theorem dependent_assumption(P0: Prop, h: P0): P0 := by { assumption }`,
so `assumption` now obtains a local's type through kernel inference in the
current context rather than comparing the stored pre-local declaration type
directly.

Observed tactic/branch goals and local types are normalized to kernel WHNF for
display only. Elaboration and kernel checking continue to use the original
terms, so proof-state presentation remains outside proof acceptance.

## Nonclaims

This work does not add general metavariable proof search, indexed/dependent
cases or induction, arbitrary goal focusing, Lean tactic metaprogramming, a
second editor parser, or any new trusted kernel primitive.

Phase 3 also retains already-observed tactic states after a later elaboration
failure when parsing succeeded. It does **not** recover states across parser
failures, invent metavariables/holes, continue elaboration speculatively after a
failure, or claim general incomplete-proof recovery.
