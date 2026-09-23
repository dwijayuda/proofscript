# Tactic Ergonomics

Status: **IN PROGRESS**

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

## Acceptance

Run one consolidated command:

```powershell
npm run assurance:tactic-ergonomics
```

It covers build, parser proof regressions, elaborator/kernel-check proof
regressions, compiler-backed language service, LSP transport,
`standalone-small`, and reference governance.

No green execution evidence is claimed until that command is run on the
committed source and its machine result is recorded.

## Nonclaims

This work does not add general metavariable proof search, indexed/dependent
cases or induction, arbitrary goal focusing, Lean tactic metaprogramming, a
second editor parser, or any new trusted kernel primitive.

Phase 2 does add read-only interactive tactic-state snapshots for successfully
checked proofs. It does **not** yet recover partial states from rejected or
incomplete proof scripts.
