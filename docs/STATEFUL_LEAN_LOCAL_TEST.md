# Local Stateful Lean Verification

Use this when GitHub-hosted runners are unavailable or when testing a newer Lean release locally.

## Compatibility policy

The active stateful-verification lane accepts:

```text
Lean >= 4.33.1
```

Later stable releases, RCs, and future development/nightly builds are allowed. Historical K3-TB and differential artifacts remain separately pinned where their claim requires an exact release.

The repository default developer toolchain is currently:

```text
leanprover/lean4:v4.34.0
```

The evidence report records the exact Lean version selected by Lake.

The runner's `--strict` flag is a **VC-generation flag**, not an exact-version pin: it fails when the run does not reach real Lean-generated verification conditions, but it can still accept a run with residual goals.

Use `--require-proof` when you need the generated theorem to close completely with zero residual goals. Both modes accept any compatible Lean version at or above 4.33.1.

## Windows / PowerShell: default toolchain

From the repository root:

```powershell
git switch cleanup/ps1-architecture
git pull

npm ci
npm run build
npm run test:ps3:lean-version-compatibility
npm run test:ps3:stateful-lean-model
```

Confirm the actual project toolchain:

```powershell
Push-Location specs/verification/v0.7/lean
lake env lean --version
lake build
Pop-Location
```

Run the full debit-only semantic lane:

```powershell
npm run assurance:ps3:stateful-lean-vc -- --strict --out stateful-vc-run.local.json
```

The important output is:

```text
stateful-vc-run.local.json
```

If the run fails, send that JSON plus the terminal output. The report identifies the first failed stage:

```text
setup
lean-model-build
lean-program-typecheck
lean-triple-target-typecheck
vc-residual-goals
vc-request-execution
```

If Lean reaches `vcgen` and leaves goals, the report also contains stable `proofscript.stateful-vc-goals/v1` goal IDs and traces.

## Test a newer RC

Install the desired Lean release with elan if necessary. Then temporarily change only the verification project's toolchain file.

Example:

```powershell
Set-Content specs/verification/v0.7/lean/lean-toolchain "leanprover/lean4:v4.35.0-rc2"

Push-Location specs/verification/v0.7/lean
lake env lean --version
lake build
Pop-Location

npm run assurance:ps3:stateful-lean-vc -- --strict --out stateful-vc-run.rc.json
```

After testing, restore the repository default:

```powershell
git restore specs/verification/v0.7/lean/lean-toolchain
```

Do not relabel historical 4.33.1 assurance artifacts based on a newer successful run. The stateful run is new compatibility evidence and records its own exact toolchain identity.


## Two-account transfer proof

The canonical transfer contract requires distinct accounts:

```text
requires distinct: from != to
```

The bounded verification AST lowers this to Lean `≠`.

Run the proof-required transfer lane with:

```powershell
npm run assurance:ps3:stateful-lean-transfer-vc:proof -- --out stateful-transfer-vc-run.local.json
```

If it leaves real residual VCs, rerun without `:proof` if you want a successful command exit while inspecting the generated-goal artifact:

```powershell
npm run assurance:ps3:stateful-lean-transfer-vc -- --strict --out stateful-transfer-vc-run.local.json
```


## Consolidated final-machine gate

The repository now has a single cross-platform end-test orchestrator. It keeps
per-run Lean selection inside temporary verification copies, so testing several
versions does **not** rewrite the checked-in `lean-toolchain`.

After pulling the target branch and installing npm dependencies, run:

```powershell
npm run assurance:ps3:stateful-endtest -- --toolchains 4.33.1,4.34.0,4.35.0-rc2 --out .proofscript-stateful-endtest/summary.json
```

This runs, in order:

1. the product build;
2. the Lean compatibility parser gate;
3. the stateful model/lowering regression;
4. generalized runner-selection regression;
5. proof-matrix planning regression;
6. VC evidence invariant regression;
7. public `monadic-vc-run` regression;
8. proof-required debit + transfer runs for every selected Lean lane.

The matrix uses `--require-proof`, not merely `--strict`. Every executed
debit/transfer case must therefore have zero residual goals and
`semanticProofDischarge = true`.

Outputs are written under:

```text
.proofscript-stateful-endtest/
  summary.json
  proof-matrix.json
  evidence/
    debit-<toolchain>.json
    transfer-<toolchain>.json
```

The directory is ignored by the repository's existing `.proofscript-*` rule.

The matrix also checks that source/model/generated-program/generated-Triple/
generated-request provenance hashes remain identical for the same proof case
across Lean versions. A compatibility matrix that checks different generated
theorems in different lanes is rejected.

If a selected Lean version is not installed, install it with elan and rerun the
same end-test command. Example:

```powershell
elan toolchain install leanprover/lean4:v4.33.1
elan toolchain install leanprover/lean4:v4.34.0
elan toolchain install leanprover/lean4:v4.35.0-rc2
```

The exact current stable/RC lanes can move over time; the versions above match
the repository policy snapshot dated 2026-09-23.

### Per-run toolchain override

Both the specialized stateful runner and public VC runner support explicit
temporary selection:

```powershell
npm run assurance:ps3:stateful-lean-transfer-vc:proof -- --lean-toolchain 4.33.1 --out .proofscript-transfer-4331.json
```

For a public lowering artifact:

```text
psc monadic-vc-run <lowering.json> --lean-project <dir> --lean-toolchain 4.33.1 --out <run.json>
```

The override is normalized to `leanprover/lean4:v<version>` and applied only
to a temporary copy of the verification project.


## Confirmed green checkpoint — 2026-09-23

The consolidated command above was executed at commit
`94696c4eb41798583e47b708fa445eb9f84c0d16` on Windows and completed green
for Lean 4.33.1, 4.34.0, and 4.35.0-rc2:

```text
proof matrix: 6/6 proved
proof matrix failures: 0
allProofsDischarged: true
provenanceConsistent: true

end-test steps: 8/8 passed
failed steps: 0
skipped steps: 0
allStaticGatesPassed: true
allLeanProofsDischarged: true
```

The transfer request still uses the normal generated path:

```text
mvcgen [transfer]
all_goals simp_all
```

The model now contains symmetric cross-account preservation lemmas so a source
hypothesis `from ≠ to` is sufficient for automation to simplify both debit and
credit preservation obligations without transfer-specific proof scripting.
