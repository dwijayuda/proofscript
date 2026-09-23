# Tactic Ergonomics

Status: **PHASE 5 COMPLETE; PHASE 6 IMPLEMENTED, ACCEPTANCE PENDING**

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

Phase 2 closes the successfully-checked proof-state slice. Phase 3 below extends
that same observation path across later elaboration failure without introducing
an editor-only elaborator.

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

## Phase 4: canonical syntax-incomplete proof prefix

Phase 4 adds one deliberately narrow parser-failure UX case without source
repair. When a `by { ...` proof step parses completely and the canonical
parser reaches EOF where only the closing `}` is missing, the parser emits a
read-only observation containing the actual theorem/example header and proof
AST it reached. It then throws the same ordinary `ParseError` as before.

The frontend may elaborate that observed declaration prefix through the ordinary
elaborator solely to emit proof-state snapshots. The elaboration result is
discarded and cannot turn the source into an accepted program.

Example:

```proofscript
theorem incomplete(P: Prop, h: P): P := by { assumption
```

At the `assumption` cursor, editor tooling may show:

```text
P : Prop
h : P
⊢ P
```

while the document still reports the missing-`}` parser diagnostic and has no
checked declaration goal.

Proof-state provenance is explicit:

- `checked` — state from a source unit that completed canonical checking;
- `rejected-prefix` — state observed before a later elaboration rejection;
- `syntax-incomplete` — state derived only from the canonical parser prefix
  described above.

Phase 4 does **not** insert a synthetic brace, continue parsing after an error,
recover a missing tactic body/term, create metavariables, or reuse stale editor
state as if it were current. Unrelated parser failures still expose zero proof
states. Parser/frontend observers remain fail-open and have no proof authority.

## Phase 5: proof-free initial goal for empty by-blocks

Phase 5 handles the next common editing state:

```proofscript
axiom P: Prop;
theorem emptyGoal(h: P): P := by {
```

When the canonical parser reaches EOF immediately after `by {`, it emits the
already-parsed theorem/example header plus the complete declaration prefix. It
then throws a normal parser error; the source remains rejected.

The frontend asks `@proofscript/elaborator` to:

1. elaborate the preceding declarations normally;
2. rebuild the same checked environment and same-file structure/class metadata;
3. reject a duplicate theorem/example header just as ordinary elaboration would;
4. elaborate only the binder telescope and result type.

No proof term, axiom, theorem declaration, metavariable, hole, or placeholder
tactic is created. The resulting observational state is explicitly
`kind: "goal"` with `sourceStatus: "syntax-incomplete"`.

At EOF, editor tooling can therefore display:

```text
h : P
⊢ P
```

while diagnostics still report that the proof tactic/body is missing and
`declarationGoal` remains absent.

The goal state is selectable at the exact EOF offset, which is where the cursor
normally sits while the user has only typed `by {`.

Fail-closed boundaries remain:

- unrelated parser errors produce no initial goal;
- a header that fails semantic elaboration (for example a duplicate declaration)
  produces no initial goal;
- parser/frontend observers remain fail-open with respect to acceptance;
- the editor does not repair source or reuse stale proof state;
- the feature does not introduce general parser recovery or metavariable
  interaction.

## Phase 6: proof-state-aware tactic keyword completion

Phase 6 reuses the existing compiler-backed proof-state selection to improve
completion without introducing tactic search.

When a canonical proof state covers the cursor, completion adds the currently
supported native tactic keywords:

```text
rfl
exact
intro
assumption
apply
show
have
rw
subst
constructor
cases
induction
simp
```

These items are ordinary editor completion candidates only. The language
service does not decide that a tactic is applicable, does not run a tactic to
preview success, and does not rank tactics by an independent semantic model.
After insertion the unchanged canonical parser/elaborator/PSKernel path accepts
or rejects the resulting proof.

Outside a canonical proof state, tactic keywords are not injected into normal
source completion.

Transport/UI behavior:

- worker transport reuses the existing completion request;
- LSP emits tactic items as standard `CompletionItemKind.Keyword`;
- no ProofScript-specific completion protocol is added;
- LSP and VS Code register `{` as a completion trigger so typing `by {`
  immediately requests the compiler-backed list;
- existing declaration completion remains available and separate.

This phase deliberately does **not** implement tactic applicability prediction,
proof search, tactic execution during completion, local-hypothesis synthesis,
metavariables, or proof-term generation.

## Acceptance

Run one consolidated command:

```powershell
npm run assurance:tactic-ergonomics
```

For the current Phase 6 source it uses schema
`proofscript.tactic-ergonomics-endtest/v6` and covers nine steps: build,
parser proof regressions, elaborator/kernel-check proof regressions,
compiler-backed language service, the language-worker boundary, LSP transport,
the active VS Code smoke test, `standalone-small`, and reference governance.

The earlier Phase 1 evidence remains the recorded 7/7 v1 result.

### Phase 5 machine acceptance

Phase 5 was executed on committed source
`42d35f1bd3ea5fcc1b70aa4087fa8b30d4b4807d` with
`npm run assurance:tactic-ergonomics`.

Machine result:

- schema: `proofscript.tactic-ergonomics-endtest/v5`
- total steps: 9
- passed: 9
- failed: 0
- skipped: 0
- `allTacticErgonomicsGatesPassed: true`

The v5 run covers the proof-free initial goal for an empty `by {` block
through parser, canonical header elaboration, frontend/compiler, language
service, worker, LSP, and VS Code. The source remains rejected while the
observational `kind: "goal"` state stays selectable at EOF.

### Phase 4 machine acceptance

Phase 4 was executed on committed source
`7573f5cb3aa8196472020d33d4c83430819f2f3e` with
`npm run assurance:tactic-ergonomics`.

Machine result:

- schema: `proofscript.tactic-ergonomics-endtest/v4`
- total steps: 9
- passed: 9
- failed: 0
- skipped: 0
- `allTacticErgonomicsGatesPassed: true`

The v4 run covers the canonical missing-final-brace observation path through
parser, frontend/compiler, language service, worker, LSP, and VS Code. It also
covers the project-layer leading-import scanner so an incomplete editor buffer
can reach the canonical frontend without requiring full project-graph parsing
first.

The source remains rejected on syntax failure; `syntax-incomplete` is editor
provenance only and carries no proof authority.

### Phase 3 machine acceptance

Phase 3 was executed on committed source
`10836538e37f547596cbbbb556bc643d93d17461` with
`npm run assurance:tactic-ergonomics`.

Machine result:

- schema: `proofscript.tactic-ergonomics-endtest/v3`
- total steps: 9
- passed: 9
- failed: 0
- skipped: 0
- `allTacticErgonomicsGatesPassed: true`

The v3 run covers the retained-state path through the canonical compiler,
language service, worker, and LSP, while keeping parser failures outside this
recovery slice. The source remains fail-closed: rejected proofs stay rejected,
and the observation sink has no influence over proof construction or kernel
acceptance.

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

Phase 3 retains already-observed tactic states after later elaboration failure.
Phase 4 additionally handles only the canonical missing-final-brace case.
Phase 5 adds the proof-free initial goal for an empty `by {` block. Phase 6
adds proof-state-scoped tactic keyword completion only. These features still do
**not** provide general parser recovery, invent metavariables/holes, perform
tactic search or applicability prediction, continue parsing/elaboration
speculatively after a failure, or claim general incomplete-proof recovery.
