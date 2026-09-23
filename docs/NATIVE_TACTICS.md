# Native Tactics — Bounded PSC-1 Extension

Branch: `feature/native-tactics`

Status: **implementation assembled; consolidated execution pending**

## Trust boundary

Native tactics are frontend/elaboration conveniences only.

```text
ProofScript tactic syntax
        ↓
untrusted tactic/proof elaboration
        ↓
ordinary Core proof term
        ↓
PSKernel infer/check
```

A tactic is never accepted merely because the tactic engine reports success.
The completed Core proof term must still be accepted by PSKernel.

No trusted kernel primitive, Core format, or certificate format is added by
this branch.

## Syntax

```proofscript
by { show P; exact h }

by {
  have hp : P := h;
  exact hp
}

by { rw h; rfl }
by { rw ← h; rfl }
by { rw <- h; rfl }

by { subst x; rfl }

by { constructor; assumption }

by { cases h; assumption }

by { induction n; rfl }

by { simp }
```

## Bounded semantics

### `show`

The displayed type must be definitionally equal to the current goal. The
following proof is elaborated against the displayed type and kernel-checked.

### proof-local `have`

Typed and inferred forms are supported. The intermediate proof is checked,
then the continuation is elaborated in an extended local context. Lowering
uses the existing nondependent Core `have`/let term; the completed term is
re-inferred against the original goal.

### `rw`

Target-only rewriting by a proof of propositional equality. Both forward and
reverse direction are supported. Rewriting constructs an `Eq.rec` transport
term rather than performing trusted textual replacement.

Arbitrary hypothesis/location rewriting and theorem-set rewriting are deferred.

### `subst`

Bounded target substitution using a direct local equality whose left or right
side is the named local. It reuses the checked `rw` transport.

This slice deliberately keeps the original locals in scope; it is not yet full
Lean context-clearing `subst`.

### `constructor`

Supports one-constructor, non-indexed inductive goals. Uniform parameters are
instantiated from the goal. Explicit constructor fields become generated
subgoals, and one continuation is repeated over those goals.

Multiple-constructor selection, implicit-field synthesis, and named goal
branches are deferred.

### `cases`

Supports nonrecursive, non-indexed inductives through their checked generated
recursor. Constructor fields are added to the generated branch context and the
same continuation is elaborated for every branch.

Recursive cases are rejected rather than silently manufacturing induction
hypotheses.

### `induction`

Supports non-indexed inductives whose checked recursor metadata is available.
The motive is abstracted from the current target, constructor fields and
generated recursive induction hypotheses are added to each branch context,
and one continuation is repeated across branches.

Indexed/dependent induction, named branch scripts, and arbitrary motive
elaboration are deferred.

### `simp`

This is **simp-lite**, not Lean's simplifier. It has a finite bounded strategy:

1. definitional reflexivity;
2. exact local assumption;
3. one local equality rewrite, forward or reverse, followed by reflexivity or
   assumption.

There is no global simp theorem set, congruence engine, recursive saturation,
attribute system, or metaprogramming.

## Evidence status

Already execution-green on Windows at commit
`e60d70f595b18f35d3f0d9d40f3b80944330e1fa`:

- build;
- parser proof extraction;
- proof elaborator extraction;
- native `show`;
- proof-local `have`, including a dependent-local target regression.

Implemented after that checkpoint and awaiting the consolidated execution gate:

- `rw`;
- `subst`;
- `constructor`;
- `cases`;
- `induction`;
- `simp-lite`;
- stronger generated-field / induction-hypothesis regressions;
- Unicode and ASCII reverse-rewrite parsing.

## Consolidated gate

```powershell
npm run assurance:native-tactics
```

The gate performs:

1. workspace build;
2. parser proof regression;
3. proof elaborator/kernel-check regression;
4. standalone-small regression;
5. reference-governance regression.

After a successful build, later tests continue even if an earlier test fails so
one run produces a complete failure inventory.

Default machine-readable report:

```text
.proofscript-native-tactics/summary.json
```

A green result requires all five stages to pass with zero skips.
