# Stateful Lean Proof Matrix v1

Status: **local/CI assurance harness; proof claims arise only from child Lean evidence**

Schemas:

```text
proofscript.stateful-proof-matrix/v1
proofscript.stateful-endtest/v1
```

## Matrix purpose

The proof matrix executes the same canonical stateful theorem inputs across
multiple compatible Lean versions without editing the repository's checked-in
Lean toolchain.

Current canonical cases:

- `examples/software/07-bank-debit-stateful-vc.ps`;
- `examples/software/06-bank-transfer-monadic-contract.ps`.

Every matrix child uses `--require-proof`. A residual-VC-only result is useful
diagnostic evidence but does not pass the matrix.

## Toolchain selection

Selectors such as:

```text
4.33.1
v4.34.0
leanprover/lean4:v4.35.0-rc2
```

normalize to the full `leanprover/lean4:v...` form. The selected value is
written only into the runner's temporary verification copy.

## Child evidence

Every child report must satisfy
`validateStatefulVcRunEvidence(report, { requireProof: true })`.

A passing case therefore requires:

```text
status = proved
failedStage = null
leanEnvironmentResolved = true
leanModelTypechecked = true
leanProgramTypechecked = true
tripleTargetTypechecked = true
tacticExecuted = true
realVerificationConditionsGenerated = true
semanticProofDischarge = true
residual goal count = 0
```

## Cross-version identity

For each case name, these hashes must be identical across toolchains:

```text
sourceSha256
stateModelDescriptorSha256
leanModelSha256
generatedProgramSha256
generatedTripleTargetSha256
generatedRequestSha256
```

This prevents a compatibility result from comparing different generated
programs or proof requests.

## End-test orchestrator

`proofscript.stateful-endtest/v1` runs the build and bounded stateful
regression gates before invoking the proof matrix. If a static gate fails, the
real proof matrix is skipped and the summary records the failure.

The end-test is an assurance convenience surface, not a new trust authority.

## Explicit non-claims

A green matrix does not by itself prove:

- state-model adequacy;
- source-to-Lean program equivalence;
- exceptional/abrupt path coverage;
- profile-wide proof discharge;
- full Lean 4 equivalence.
