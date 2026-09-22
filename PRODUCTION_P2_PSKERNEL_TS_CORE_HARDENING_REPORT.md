# Production P2 pskernel TypeScript Core Hardening Report

## Phase

Phase 2 core ADT/admission hardening, with small Phase 3 naming alignment.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Changes completed

- Added Lean-shaped universe metavariable representation (`Level` tag `mvar`) while preserving fail-closed trusted-boundary behavior.
- Added Lean.Level-style traversal helpers:
  - `forEachLevel`
  - `getUndefParam`
  - `levelDefEqList`
- Strengthened declaration admission:
  - declaration types must infer to a sort/type;
  - unresolved universe metavariables are rejected;
  - loose de Bruijn variables are rejected before admission;
  - generated declaration batches reject duplicate generated names before mutation;
  - inductive and mutual-inductive result types must infer to a sort/type.
- Added dependency-assumption propagation:
  - definitions/theorems/opaques record assumptions inherited from referenced checked constants;
  - axioms/opaques still record their own assumption identity;
  - environment stores assumptions on checked declarations for replay summaries.
- Added pskernel Expr helper surface:
  - `ExprProp`
  - `exprArrow`
  - `exprLam0`
  - `getAppFn`
  - `getAppArgs`
  - `replaceNoCacheTerm`
  - `replaceNoCacheExpr`
  - `natZeroExpr`
  - `natSuccExpr`
  - `natLitToConstructorExpr`
  - `literalToConstructorExpr`
  - `literalTypeName`
  - `containsLooseBVar`
- Added TypeChecker naming aliases closer to pskernel:
  - `inferType`
  - `checkType`
  - `isDefEq`
  - `isDefEqCore`
  - `whnfCore`
  - `deltaValue`
  - `unfoldDefinition`
- Removed stale old-kernel compiled outputs from `packages/kernel/dist` and rebuilt a clean dist from the pskernel-shaped source tree.

## Smoke coverage added

`tools/pskernel-kernel-smoke.ts` now covers:

- level normalization smoke;
- undefined universe parameter detection;
- declaration admission of axiom + definition;
- duplicate declaration rejection;
- assumption propagation from an axiom into a dependent definition;
- rejection when a declaration type is a term rather than a type/sort;
- rejection of unresolved universe metavariables;
- rejection of malformed inductive result type;
- rejection of duplicate generated constructor names;
- expression replacement traversal smoke.

## Commands run

```bash
npm run test:kernel:smoke
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
```

## Results

```txt
build: PASS
forced clean kernel dist rebuild: PASS
test:kernel:smoke: PASS
stale old packages/kernel/dist/kernel.js: absent
stale old packages/kernel/dist/core.js: absent
```

## Supported kernel features after this pass

- trusted Core Sort/Const/App/Lam/Pi/Let typing for the currently implemented slice;
- simple beta/zeta/delta WHNF;
- basic definitional equality for sorts, structural terms, apps, lambdas, and Pi types;
- declaration admission for axiom/definition/theorem/example/opaque in the implemented slice;
- partial inductive/mutual-inductive admission gate with stronger name/type validation;
- deterministic replay summary for checked core declaration arrays.

## Explicit unsupported/fail-closed areas

- full quotient reduction;
- full primitive reflection;
- full inductive recursor generation and iota reduction;
- full Lean parser/elaborator/macro/tactic stack;
- full `.olean` replay;
- full Lean 4 kernel equivalence proof.

## Completion

Phase 2: approximately 70% complete.
Phase 3: approximately 15% started.
Overall: approximately 24% complete.

## Next best step

Continue Phase 3 TypeChecker conformance: improve WHNF/definitional equality around lazy delta, app spines, reducibility/opacity, projection fail-closed behavior, and small Nat/String literal constructor expansion boundaries without claiming full primitive support.
