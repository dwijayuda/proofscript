# Stateful Lean VC Run Evidence v1

Status: **execution evidence schema; semantic claims are promoted only from an actual pinned-Lean run**

Schema:

```text
proofscript.stateful-vc-run/v1
```

This artifact is emitted by either:

- `tools/ps3-stateful-lean-vc-runner.ts` for the pinned debit-only assurance target; or
- the public `psc monadic-vc-run` command for a supplied monadic-lowering artifact plus Lean/Lake project.

The public command form is:

```text
psc monadic-vc-run <monadic-lowering.json> \
  --lean-project <dir> \
  --out <run.json> \
  [--lake-cmd <lake>] \
  [--json]
```

Both surfaces use the same `analyzeStatefulVcExecution` claim-promotion logic from the canonical monadic-lowering package.

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

The public command reports:

- CLI `status = accepted` with `verificationStatus = vcs-generated` when Lean reached the tactic and left residual goals;
- CLI `status = accepted` with `verificationStatus = proved` when the generated request completed;
- CLI `status = rejected` when the run did not reach a valid semantic VC result.

The persisted `proofscript.stateful-vc-run/v1` artifact always retains the underlying semantic status.

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
