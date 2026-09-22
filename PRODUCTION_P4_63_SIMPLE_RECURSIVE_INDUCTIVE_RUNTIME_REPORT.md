# Production P4.63 — Simple Self-Recursive User-Inductive Runtime

Status: **trusted-boundary PASS**.

This checkpoint extends the PSC-1 standalone JavaScript backend/runtime from nonrecursive user-inductive case dispatch to a bounded primitive-recursive user-inductive slice.

## Implemented slice

P4.63 supports executable checked recursor applications for user inductives that are:

- parameterless,
- indexless,
- single-family,
- direct self-recursive only through constructor fields whose type is exactly the inductive owner,
- first-order enough for the runtime to compute induction hypotheses structurally.

Example:

```proofscript
inductive NatList: Type where {
  | nil
  | cons (head: Nat) (tail: NatList)
}

function listLength(xs: NatList): Nat := {
  match (xs) {
    | nil => 0
    | cons h t => Nat.succ(listLength(t))
  }
}
```

The frontend/kernel still checks the source and elaborates matches to Core recursor applications first. The JS backend then emits recursor calls with constructor branch arities and direct recursive field positions. The runtime computes IH values by recursively applying the same recursor to recursive fields before applying the checked curried branch.

## Files changed

- `packages/backend-typescript/src/index.ts`
- `packages/runtime/src/index.ts`
- `tools/user-recursive-inductive-runtime-tests.ts`
- `tools/user-inductive-match-runtime-tests.ts`
- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`
- `examples/standalone-small/src/Main.ps`
- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
- `docs/PROOF_OBLIGATIONS.md`
- `docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json`
- `package.json`

## TDD evidence

RED:

```text
Chain / NatList recursive source checked, but JS emission rejected Chain.rec / NatList.rec.
```

GREEN:

```text
USER_RECURSIVE_INDUCTIVE_RUNTIME=PASS
```

## Boundary

This remains trusted-boundary evidence, not a formal Lean 4 equivalence proof. P4.63 does not support arbitrary Lean recursion, dependent motives at runtime, indexed inductives, parameterized inductives, mutual recursion, nested recursion through containers/functions, unsafe JavaScript unions, or general recursion outside checked recursor applications.
