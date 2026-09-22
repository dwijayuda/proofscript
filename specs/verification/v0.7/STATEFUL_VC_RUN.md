# Stateful Lean VC Run Evidence v1

Status: **execution evidence schema; semantic claims are promoted only from an actual pinned-Lean run**

Schema:

```text
proofscript.stateful-vc-run/v1
```

This artifact is emitted by `tools/ps3-stateful-lean-vc-runner.ts` for the promoted debit-only semantic target.

## Ordered execution stages

The runner separates the Lean boundary into four stages:

1. `lean-model-build`
   - build `ProofScript.Verification.BankStateModel` in the pinned Lean project;
2. `lean-program-typecheck`
   - typecheck the generated `StateM` program declaration;
3. `lean-triple-target-typecheck`
   - typecheck the concrete generated `Std.Do.Triple` target;
4. VC request execution
   - execute the generated `vcgen`/ `mvcgen` request.

The first failed stage is recorded as one of:

```text
lean-model-build
lean-program-typecheck
lean-triple-target-typecheck
vc-residual-goals
vc-request-execution
```

A successful completed proof has `failedStage = null`.

## Evidence

The report binds hashes for:

- ProofScript source;
- state-model descriptor;
- Lean model module;
- generated Lean program;
- generated Triple target;
- generated VC request.

It also preserves the command result for every stage and the generated program/target identity needed to reproduce the failure.

When Lean leaves residual proof goals, the report records:

- whether an `unsolved goals` marker was observed;
- lines containing a goal turnstile;
- captured trace blocks;
- a SHA-256 hash of the raw request output.

## Claim promotion

The runner must never infer semantic success from source construction alone.

Claims are promoted only by execution evidence:

```text
leanEnvironmentResolved
leanModelTypechecked
leanProgramTypechecked
tripleTargetTypechecked
tacticExecuted
semanticVcDerivationComplete
realVerificationConditionsGenerated
semanticProofDischarge
```

`stateModelAdequacyChecked`, `sourceToLeanProgramEquivalenceChecked`, and `exceptionalPathsCovered` remain independent claims and stay false until separately checked.

A run with no usable pinned Lean installation is `unsupported`; it does not count as semantic evidence.
