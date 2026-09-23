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

## Editor/LSP architecture

The language service delegates semantics to `@proofscript/compiler`; it does
not contain a duplicate parser, elaborator, or checker. Phase 1 adds a
regression that a branch-aware induction proof is accepted through this
compiler-backed editor path.

The goal API still reports `tacticStateAvailable: false`. Phase 1 deliberately
does not invent editor-side proof states. A later phase should expose generated
branch goals from canonical elaborator state and thread those through:

```text
compiler -> language-service -> language-worker -> LSP
```

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

This phase does not add general metavariable proof search, indexed/dependent
cases or induction, arbitrary goal focusing, Lean tactic metaprogramming,
interactive tactic-state snapshots, a second editor parser, or any new trusted
kernel primitive.
