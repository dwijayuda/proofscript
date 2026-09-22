# Stateful Lean VC Run Evidence v1

Status: **execution evidence schema; semantic claims are promoted only from an actual compatible-Lean run**

Schema:

```text
proofscript.stateful-vc-run/v1
```

This artifact is emitted by either:

- `tools/ps3-stateful-lean-vc-runner.ts` for the debit-only compatibility target; or
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

The runner's `--strict` mode means "require real Lean-generated verification conditions"; it does **not** mean "require exactly Lean 4.33.1". Version compatibility is governed separately by the `Lean >= 4.33.1` policy.

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

The stateful verification compatibility floor is Lean **4.33.1**. Lean 4.33.1 and any later stable, RC, or development build are admissible inputs. The evidence must record the exact observed Lean version used for the run.

A run with no usable Lean installation, an unparsable version, or Lean older than 4.33.1 is `unsupported`; it does not count as semantic evidence. Historical K3-TB / differential artifacts remain separately pinned where their claim requires an exact release.


## Tactic identity

The report records the tactic actually selected by the request artifact. For the current public `Std.Do.Triple` stateful profile this is `mvcgen`.

A failure inside Lean's experimental `vcgen` implementation is not accepted as evidence that a `Std.Do.Triple` target is invalid. Tactic selection is constrained by the Triple metatheory before execution.


## Checked proof finisher

The generated request may include a checked Lean finisher after VC generation. In the current bounded `Std.Do.Triple` profile this is `all_goals simp_all`.

A successful finisher does not bypass the trust boundary: Lean typechecks the resulting theorem. If the request exits successfully with no residual goals, `semanticProofDischarge = true` applies only to that concrete generated theorem/evidence record.
