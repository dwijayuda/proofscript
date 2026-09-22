# Production P4.13 — Cumulativity, Let-Annotated Types, Quotient Reduction, and Replay Metadata Hardening

## Status

Completed a deeper batched standalone-kernel pass after P4.12.

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Scope

This pass intentionally groups multiple high-value kernel/trust-boundary changes instead of another 1–2% metadata-only increment:

1. sort-level cumulativity for type checking;
2. validation that `let` annotation types are themselves types/sorts;
3. exact replay format-version gating;
4. stricter replay metadata validation for typeclass/module side data;
5. first conservative quotient computation rules for `Quot.lift` and `Quot.ind` over `Quot.mk`.

## Changes

### TypeChecker — sort cumulativity

- Added assignment-style checking on top of definitional equality.
- `checkCore` now accepts `Sort u` where expected `Sort v` when `v >= u` using the existing conservative `levelGeq` relation.
- Existing definitional equality remains unchanged; cumulativity is used only by checking, not by `isDefEq` itself.

### TypeChecker — local let validation

- `inferCore` for trusted Core `let` now verifies that the declared local binding type itself infers to a sort before checking the bound value.
- This closes a gap where a malformed local annotation such as `let x : a := v; ...` could pass if `v : a` and the final body had the expected type, even though `a` was not itself a type.

### Replay — format and metadata hardening

- `CoreArtifact.formatVersion` is now exact-version gated at `1`; unknown future versions reject instead of being accepted by the current checker.
- Typeclass metadata now rejects:
  - `numParams` not matching `params.length`;
  - duplicate typeclass metadata names;
  - duplicate instance metadata names;
  - instances whose `className` is not declared in the artifact typeclass metadata.
- Module metadata now rejects:
  - duplicate serialized module names;
  - an `entry` that does not reference one of the serialized modules.

### Quotient computation

- Added `tryQuotReduce` in `PSKernel/Quot.ts`.
- Added quotient reduction hook in `whnfCore` before ordinary recursor reduction.
- Supported quotient beta rules in the current trusted slice:
  - `Quot.lift α r β f sound (Quot.mk α r a)` reduces to `f a`;
  - `Quot.ind α r motive mk (Quot.mk α r a)` reduces to `mk a`.
- Reduction is conservative:
  - head constant must be an installed quotient primitive with `quotInfo` metadata;
  - the base application must typecheck through the normal constant-application guard;
  - α/r in the `Quot.mk` major premise must match the eliminator α/r;
  - extra applications, mismatched representatives, and general quotient behavior remain neutral/fail-closed.

## Red/green smoke additions

The smoke suite was extended with cases that failed before implementation and passed after the changes:

- `Prop : Sort 1` checking against a higher sort using cumulativity;
- rejection of a let binding whose annotation is not itself a type;
- rejection of unknown future core artifact format version;
- rejection of typeclass metadata where `numParams` disagrees with `params.length`;
- rejection of typeclass instance metadata referencing a missing class;
- rejection of module metadata whose `entry` is absent from the serialized module list;
- quotient `Quot.lift` beta reduction over `Quot.mk`;
- quotient `Quot.ind` beta reduction over `Quot.mk`.

## Commands run

```bash
npm install --ignore-scripts
npm run build -- --pretty false
npm run test:kernel:smoke
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

## Supported after this pass

- Sort-level cumulative checking for direct `Sort` assignments.
- Well-formed local `let` annotation validation.
- Exact replay format-version gating for `formatVersion: 1`.
- Stricter replay metadata shape/reference checks.
- First quotient β-reduction rules for `Quot.lift` and `Quot.ind` over `Quot.mk`.

## Still unsupported / fail-closed

- Full Lean universe constraint solving.
- Full Lean quotient theorem/recursor behavior beyond the supported β rules.
- Quotient reduction through mismatched or non-canonical quotient primitives.
- Extra quotient eliminator applications beyond the exact base form.
- Full Lean parser, macro system, elaborator, tactics, `.olean` replay, and native-kernel equivalence proof.

## Progress update

- Phase 0: complete
- Phase 1: complete
- Phase 2: ~97% complete
- Phase 3: ~75% started
- Phase 4: ~76% started
- Phase 5: ~50% started
- Phase 6: ~40% started
- Overall: ~68%

The larger jump is justified by a deeper batch across type checking, replay trust validation, and quotient computation.
