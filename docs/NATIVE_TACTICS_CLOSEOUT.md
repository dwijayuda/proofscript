# Native Tactics Closeout

Status: **CLOSED**

Source commit validated by the consolidated acceptance run:

`7a98acc8f983b770c6d04c50474c68116b7f483f`

Date: **2026-09-23**

Branch: `feature/native-tactics`

## Acceptance command

```powershell
npm run assurance:native-tactics
```

## Acceptance result

Schema: `proofscript.native-tactics-endtest/v1`

- total stages: **5**
- passed: **5**
- failed: **0**
- skipped: **0**
- `allNativeTacticGatesPassed`: **true**

Stages:

1. build — PASS
2. parser-proof — PASS
3. elaborator-proof — PASS
4. standalone-small — PASS
5. reference-governance — PASS

## Closed bounded tactic surface

- `show`
- proof-local `have`
- target `rw`
- reverse `rw ← h` and ASCII `rw <- h`
- bounded target `subst`
- bounded `constructor`
- bounded nonrecursive `cases`
- bounded recursor-based `induction`
- bounded `simp-lite`

## Important regressions included in the green run

- dependent-local `have` de Bruijn shifting;
- `rw` transport through checked `Eq.rec`;
- exact Nat-numeral rewriting;
- rejection of a false match where normalized numeral `1` appeared only as an internal suffix of the Core constructor encoding for `3`;
- constructor generated-subgoal solving;
- cases exposing constructor fields;
- induction exposing a real recursive induction hypothesis;
- fail-closed recursive `cases`;
- fail-closed unsupported constructor shape;
- fail-closed bounded `simp`.

## Trust statement

This milestone does not add tactic authority to the trusted kernel.

```text
surface tactic
  -> untrusted elaboration
  -> ordinary Core proof term
  -> PSKernel infer/check
```

The tactic implementation may be wrong; a completed proof is accepted only if
the kernel checks the resulting Core term.

## Explicit nonclaims

This closeout does not claim:

- full Lean tactic parity;
- arbitrary metavariable search;
- named Lean-style branch syntax;
- arbitrary hypothesis/location rewriting;
- full Lean `subst` context clearing;
- Lean's global simplifier/theorem database/congruence engine;
- indexed/dependent `cases` or `induction`;
- tactic metaprogramming;
- full Lean 4 equivalence.

Those are follow-up capability milestones rather than hidden assumptions of this
closed bounded slice.
