# Production P4.9 — pskernel TypeScript Type-Aware Iota Guard Report

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Objective

Harden the Phase 4.8 simple recursor iota-reduction path so raw `whnf` / `defEq` cannot reduce malformed recursor applications that were never type-checked as valid core terms.

## Changes

- Extended `tryInductiveReduceRec` with an optional type-correctness predicate.
- Wired `TypeChecker.whnfCore` to validate the recursor application against the synthesized `recInfo.type` before iota reduction fires.
- The guard instantiates recursor universe levels from the actual recursor constant head.
- The guard checks each supplied recursor argument against the corresponding Pi-domain before allowing reduction.
- Malformed recursor applications now remain neutral under raw `whnf` instead of reducing to arbitrary minor terms.
- Updated recursor smoke fixtures to use well-typed motives/minors for Type-valued recursors.
- Added a negative smoke case proving malformed UnitLike.rec applications do not iota-reduce through raw `whnf`.

## Supported slice after this phase

- Simple non-indexed recursor type synthesis remains supported for:
  - one inductive family,
  - no parameters,
  - no indices,
  - direct positive recursive fields,
  - nondependent constructor fields.
- Simple iota reduction remains supported only when the whole recursor application prefix is type-correct for the synthesized recursor type.

## Unsupported / fail-closed slice

- Parameterized recursors.
- Indexed recursors.
- Mutual recursors.
- Nested/container positivity and recursor reduction.
- Dependent constructor-field recursor synthesis.
- Full Lean recursor K/elimination semantics.
- Formal equivalence with Lean 4 native kernel.

## Verification

Commands run:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

Results:

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Progress estimate

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~94% complete
Phase 3: ~55% started
Phase 4: ~58% started
Phase 5: ~37% started
Phase 6: ~32% started
Overall: ~53%
```

## Next best step

Add conservative reduction support for primitive Nat recursor examples into replay/golden artifacts, then add a proof-obligation record connecting `tryInductiveReduceRec` to the pskernel `Inductive/Reduce.lean` theorem targets.
