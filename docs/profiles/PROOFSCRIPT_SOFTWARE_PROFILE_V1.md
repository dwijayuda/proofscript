# ProofScript Software Profile v1

Status: Product-v1 completion profile.

Machine authority:

```text
config/proofscript-software-profile-v1.json
```

## Product goal

ProofScript v1 is the small everyday language profile for writing JS/TS ecosystem
software while retaining a Lean-semantic dependent-type and proof foundation.

It is intentionally smaller than TypeScript and smaller than full Lean source.
A Product-v1 program should not need to learn a second application language for
ordinary data, functions, modules, contracts, and theorem-backed business logic.

## One canonical path

The Product-v1 source path is:

```text
.ps source
  → @proofscript/compiler
  → @proofscript/frontend
  → checked Core
  → PSKernel
       ├─→ TypeScript / JavaScript backend
       └─→ verification / Lean assurance artifacts where applicable
```

The public `psc` CLI and the retained `pslive` engineering harness both enter
through `@proofscript/compiler`. Neither may own an alternate parser,
elaborator, or type system.

## Smallness

The v1 manifest fixes 31 required constructs/capability groups, inside the
20–35 budget.

Most application code should revolve around:

- definitions and functions;
- structures and inductive data;
- `let`, `if`, `match`, lambdas, application;
- field projection and immutable updates;
- structural recursion;
- dependent function types and ordinary binder forms;
- namespaces/imported modules;
- Nat/Int/Bool/String/Unit plus Option/Except/List/Array;
- theorem/contract constructs when correctness matters.

The verification layer adds `requires`, `ensures`, `result`, `assert`,
`ghost`, `old`, `frame`, bounded `invariant/decreases`, and descriptor-bound
stateful contracts. These do not create new kernel primitives.

## Advanced but not required for ordinary v1 adoption

The implementation contains bounded class/instance functionality, explicit
axiom/opaque declarations, restricted `do`, and a small proof-command subset.
They remain advanced capabilities rather than reasons to expand the everyday
language budget.

## Explicitly deferred

Product v1 does not wait for:

- arbitrary macros/custom elaborators;
- the full Lean tactic engine;
- full Lean typeclass/coercion behavior;
- unrestricted imperative statements;
- a general IO/concurrency runtime;
- arbitrary exceptional-path stateful verification;
- unrestricted JavaScript FFI;
- full Mathlib/Lean source compatibility;
- full Lean kernel equivalence.

Interop, runtime correspondence, package/stdlib work, and editor completion are
tracked by their own Product-v1 pillars rather than being hidden inside this
language-profile claim.

## General-purpose acceptance

"General purpose" is demonstrated by executable capability gates, not by counting
syntax.

The retained software-profile corpus covers:

- business rules;
- state machines;
- security policy logic;
- validation with explicit success/error values;
- finite collections;
- multi-file module behavior;
- TypeScript and JavaScript emission.

These examples must continue to pass through the compiler-backed path.

## Trust boundary

A checked ProofScript program is not automatically a proof that emitted
JavaScript behaves identically. Runtime correspondence is a separate Product-v1
pillar and must stay explicit in artifact/certificate claims.

Likewise, "small Lean-semantic language" does not mean full Lean 4 equivalence.

## P1 completion gates

```text
npm run test:product-v1:canonical-cli
npm run test:product-v1:software-profile
npm run test:profile:software
npm run test:profile:software:examples
npm run test:production-p4:modules
```

P1 is structurally closed only when these gates are green on a clean machine and
the completion manifest contains no untracked required language feature.
