# Bounded loop verification — V-INVARIANT / V-DECREASES

Status: Product v1 bounded verification feature, semantic VC generation implemented,
Lean proof evidence pending execution.

## Goal

Promote a small, useful subset of the historical KA142 loop syntax from
"structural obligations only" to real semantic verification conditions.

The historical KA142 parser remains as a fallback prototype for loops outside
this profile. Unsupported loops are never silently treated as verified.

## Surface

Example:

```proofscript
function countTo(n: Nat): Nat
  ensures done: result = n
:= {
  let mut i: Nat := 0;
  while (i < n)
    invariant inv_bound: i <= n
    decreases remaining: n - i
  {
    i := i + 1;
  }
  i
}
```

## Promoted profile: `loop-vc0`

The initial promoted subset is intentionally small:

- exactly one `while` loop;
- function parameters are `Nat`;
- return type is `Nat`;
- one or more mutable locals declared before the loop as
  `let mut x: Nat := <expr>;`;
- one or more named invariants;
- exactly one named `decreases` expression;
- loop body contains sequential assignments to the declared mutable locals;
- admitted expressions are linear `Nat` expressions using identifiers,
  literals, `+`, `-`, and parentheses;
- admitted predicates contain exactly one comparison relation;
- `ghost`, `assert`, and `old` are not yet composed with this loop profile.

Nonlinear arithmetic or other unsupported syntax remains
`ka142-loop-prototype`.

## Semantic VCs

For a loop

```text
initialization
while condition
  invariant I
  decreases M
{
  body
}
result-expression
```

ProofScript generates semantic obligations:

1. **Invariant initialization**
   - requires + initialized locals imply `I`.
2. **Invariant preservation**
   - requires + current invariants + condition imply `I` after sequential body
     assignment substitution.
3. **Strict progress**
   - requires + current invariants + condition imply
     `M_after < M_before`.
4. **Exit/postcondition**
   - requires + current invariants + `¬ condition` imply each function
     `ensures`, with `result` replaced by the final result expression.

The loop-exit theorem owns the stable `<function>.ensures.<name>` obligation
identity. There is no duplicate generic ensures obligation for a promoted loop.

## Example VCs

For `countTo`, the generated targets are:

```text
0 <= n
i + 1 <= n
n - (i + 1) < n - i
i = n
```

The generated Lean file contains no `sorry` or `admit` and uses `omega`
for the bounded linear arithmetic profile.

## Artifact

`proofscript.loop-vc/v1` records:

- parsed mutable locals and initializers;
- final result expression;
- loop condition;
- invariant ASTs;
- decreases AST;
- sequential assignment lowering;
- generated semantic VCs;
- exact Lean theorem names/statements/source;
- explicit claim booleans.

The enclosing `proofscript.contracts.v1` records the artifact under
`loopVerification`.

## Trust boundary

Semantic VC generation is **not** proof discharge.

Before a successful Lean run:

```text
semanticLoopVcGenerationComplete = true
leanTypechecked = false
semanticProofDischarge = false
sourceRuntimeCorrespondenceChecked = false
```

A successful `proofscript.loop-vc-run/v1` may promote
`semanticProofDischarge` for the concrete generated theorem file.

This still does not establish a general proof that the runtime compiler's
imperative-loop implementation corresponds to the verification lowering.
That is a separate Product-v1 runtime-correspondence obligation.

## Fail-closed boundaries

The promoted profile rejects/downgrades:

- zero or multiple loops;
- non-`Nat` parameters, mutable locals, or return value;
- missing invariants;
- zero or multiple decreases measures;
- mutation of parameters or undeclared locals;
- body statements other than sequential admitted assignments;
- nonlinear `*`, `/`, or `%` arithmetic;
- unknown identifiers;
- compound Boolean formulas outside the current one-relation predicate grammar;
- current composition with ghost/assert/old.

## Gates

Static:

```text
npm run test:ps3:loop-vc
npm run test:ps3:loop-lean-runner-selection
npm run test:ps3:loop-lean-proof-matrix
```

Real Lean:

```text
npm run assurance:ps3:loop-lean-vc:proof
npm run assurance:ps3:loop-lean-proof-matrix -- --toolchains 4.33.1,4.34.0,4.35.0-rc2
```

The first proof matrix is one semantic loop case across three Lean lanes.
